"use strict";

import { simple_promise_fetch, wrap_method } from "./util";
import BuiltinPlugin, { PluginInfo } from "./builtin-plugin";
import Plugin, { PluginState } from "./plugin";
import HookManager from "./hook-manager";
import registerPlugins from "./plugins";

import toposort = require("toposort");
import semver = require("semver");

import * as HTTP_HOOK from "./hook-providers/http";
import * as REGISTER_ELEMENT_HOOK from "./hook-providers/register-element";
import * as TEMPLATE_CONTENT_HOOK from "./hook-providers/template-content";
import * as EMBER_COMPONENT_HOOK from "./hook-providers/ember-component";
import * as EMBER_SERVICE_HOOK from "./hook-providers/ember-service";

// Mainly notification styles.
import "./style";

export type LifecycleCallback = (plugin: BuiltinPlugin) => void;

export default class Ace {
    pendingOnloads: any[];
    builtinPlugins: BuiltinPlugin[];
    hookManager: HookManager;

    plugins: Plugin[];
    initializationOrder: string[];
    toggledPlugins: string[];

    // If we encountered something that definitely _shouldn't_ happen, this is
    // set to true. If we are dormant, we will not inject into anything, to
    // prevent any further errors.
    dormant: boolean;

    preinitHooks: { [name: string]: LifecycleCallback[] };
    postinitHooks: { [name: string]: LifecycleCallback[] };

    // These notifications are mainly for errors during startup.
    // Since we cannot be sure that _any_ plugin is loaded, including uikit's ToastManager,
    // we have to create a completely different notification system.
    notificationElement: HTMLDivElement;

    constructor() {
        this.pendingOnloads = [];
        this.builtinPlugins = [];
        this.preinitHooks = {};
        this.postinitHooks = {};
        this.dormant = false;

        this.notificationElement = document.createElement("div");
        this.notificationElement.className = "ace-notifications";
        document.body.appendChild(this.notificationElement);

        try {
            this.plugins = [];
            this.toggledPlugins = [];
            this.initializationOrder = [];
            registerPlugins(this);
        } catch (e) {
            this.addNotification("error", "Error", `Unrecoverable error initializing Ace: '${e}'. Ace will disable itself.`);
            console.error(e);
            this.dormant = true;
            return;
        }

        this.fetchBuiltinPluginInformation().then(() => this.fetchToggledPlugins()).then(() => {
            (<any>window).$AcePending === undefined || (<any>window).$AcePending.forEach((p: any) => this.handleOnLoad(p));
            delete (<any>window).$AcePending;
            const clone = this.pendingOnloads.slice();
            this.pendingOnloads = [];
            clone.forEach(pending => this.handleOnLoad(pending));
            if (this.dormant) return;

            this.hookManager = new HookManager(this);
            this.hookManager.registerHookProvider(HTTP_HOOK);
            this.hookManager.registerHookProvider(REGISTER_ELEMENT_HOOK);
            this.hookManager.registerHookProvider(TEMPLATE_CONTENT_HOOK);
            this.hookManager.registerHookProvider(EMBER_COMPONENT_HOOK);
            this.hookManager.registerHookProvider(EMBER_SERVICE_HOOK);

            this.resolvePluginDependencies();
            this.initializePlugins().then(() => {
                const activePlugins = this.plugins.filter(x => x.state !== PluginState.DISABLED);
                const initializedCount = activePlugins.filter(x => x.state === PluginState.ENABLED).length;
                if (initializedCount !== activePlugins.length) {
                    this.addNotification("warning", "Ace Warning", `${activePlugins.length - initializedCount} plugin(s) were not loaded because of version mismatches or other errors during initialization.`);
                }
            });
        }).catch(e => {
            // Log error to console.
            console.error(e);

            this.addNotification("error", "Ace Error", `Unrecoverable error initializing Ace: '${e}'. Ace will disable itself.`);
            this.dormant = true;
            (<any>window).$AcePending === undefined || (<any>window).$AcePending.forEach((p: any) => this.handleOnLoad(p));
            delete (<any>window).$AcePending;
            return;
        });
    }

    /**
     * Registers a new plugin
     */
    registerPlugin(plugin: Plugin) {
        if (this.plugins.filter(x => x.name === plugin.name).length) {
            this.addNotification("warning", "Ace Warning", `Duplicate plugin '${plugin.name}'. Ignoring the second one.`);
        }
        this.plugins.push(plugin);
    }

    /**
     * Returns the built-in plugin with the specified `fullName`, or `null` otherwise.
     */
    getBuiltinPluginWithName(fullName: string): BuiltinPlugin | null {
        const matching = this.builtinPlugins.filter(x => x.info.fullName === fullName);
        return matching.length > 0 ? matching[0] : null;
    }

    /**
     * Returns the plugin with the specified name, or `null` otherwise.
     */
    getPluginWithName(name: String): Plugin | null {
        const matching = this.plugins.filter(x => x.name === name);
        return matching.length > 0 ? matching[0] : null;
    }

    /**
     * Returns a promise that resolves when the API for the specified built-in
     * plugin is loaded and available.
     */
    getBuiltinApi(name: string): Promise<any> {
        if (this.getBuiltinPluginWithName(name)!.isInitialized) {
            return Promise.resolve(this.getBuiltinPluginWithName(name)!.api);
        }

        return new Promise(resolve => {
            (this.postinitHooks[name] = (this.postinitHooks[name] || [])).push(plugin => {
                resolve(plugin.api);
            });
        });
    }

    /**
     * Uses the built-in LCU api to gather information on the currently running "native" plugins.
     */
    private fetchBuiltinPluginInformation(): Promise<void> {
        return simple_promise_fetch("/plugin-manager/v2/plugins").then(json => {
            const plugins = JSON.parse(json) as PluginInfo[];
            this.builtinPlugins = plugins.map(p => new BuiltinPlugin(p));

            // Resolve dependencies.
            this.builtinPlugins.forEach(plugin => {
                plugin.dependencies = plugin.info.dependencies.map(x => {
                    const dep = this.getBuiltinPluginWithName(x.fullName);
                    if (!dep) this.addNotification("warning", "Ace Warning", `Native plugin ${plugin.info.fullName} specified missing dependency ${x.fullName}.`);
                    return dep!;
                });
            });
        }).catch(e => {
            // Log error to console.
            console.error(e);

            this.addNotification("error", "Ace Error", `Unrecoverable error while communicating with server: ${e}. Ace will disable itself.`);
            this.dormant = true;
        });
    }

    /**
     * Uses the built-in LCU api to fetch a list of disabled plugins.
     */
    private fetchToggledPlugins(): Promise<void> {
        // This call seems to 404 if Ace starts abnormally fast.
        // We retry up to 5 times before giving up.
        return new Promise<void>((resolve, reject) => {
            const self = this;
            let retries = 0;
            function attempt() {
                simple_promise_fetch("/lol-settings/v1/local/ace").then(json => {
                    const data = JSON.parse(json).data || {};

                    // This key used to be `disabledPlugins`.
                    // If the user has this, it means they have not yet upgraded.
                    const oldData = data.disabledPlugins || [];
                    const newData = data.toggledPlugins;
                    
                    self.toggledPlugins = typeof newData !== "undefined" ? newData : oldData;
                    resolve();
                }).catch(err => {
                    retries++;
                    retries >= 5 ? reject(err) : attempt();
                });
            }
            attempt();
        });
    }

    /**
     * This is called by the injected code whenever the script tag has loaded
     * or by Ace if there were plugins loaded prior to Ace loading.
     * We then perform some dark magic to intercept the provider and api.
     */
    /*private*/ handleOnLoad(entry: { pluginName: string, document: Document, originalLoad: () => void }) {
        if (this.dormant) {
            entry.originalLoad();
            return;
        }

        // If we haven't loaded the plugin info yet, delay the initialization.
        if (this.builtinPlugins.length === 0) {
            this.pendingOnloads.push(entry);
            return;
        }

        // If we had plugins we hadn't yet initialized, do it now.
        if (this.pendingOnloads.length) {
            const clone = this.pendingOnloads.slice();
            this.pendingOnloads = [];
            clone.forEach(pending => this.handleOnLoad(pending));
        }

        const nativePlugin = this.getBuiltinPluginWithName(entry.pluginName);
        if (!nativePlugin) {
            this.addNotification("error", "Ace Error", `Ace encountered a native plugin it didn't recognize and cannot continue. Ace will disable itself.`);
            this.dormant = true;
            return;
        }

        this.initializeBuiltinPlugin(nativePlugin, entry.document, entry.originalLoad);
    }

    /**
     * Initializes the previously intercepted built-in plugin.
     */
    private initializeBuiltinPlugin(plugin: BuiltinPlugin, doc: Document, onload: () => void) {
        const self = this;

        // Step 1: Intercept document.dispatchEvent to get access to the riotPlugin.announce event.
        // This event contains the provider that has various bindings interesting to us.
        wrap_method(doc, "dispatchEvent", function(original: (ev: AnnounceEvent) => void, [event]: [AnnounceEvent]) {
            // If the event being dispatched is not announce, such as the various lifecycle methods,
            // we are not interested in it and let the native code take over.
            if (event.type !== "riotPlugin.announce") {
                return original(event);
            }
            
            const oldHandler: any = event.registrationHandler;
            event.registrationHandler = function(handler) {
                return oldHandler.call(this, (p: any) => {
                    let result = handler(p);
                    result = result && result.then ? result : Promise.resolve(result);
                    return result.then((api: any) => {
                        plugin.isInitialized = true;
                        plugin.api = api;
                        plugin.provider = p;
                        if (self.postinitHooks[plugin.info.fullName]) {
                            self.postinitHooks[plugin.info.fullName].forEach(f => f(plugin));
                        }
                        return Promise.resolve(api);
                    });
                });
            };
            (<any>event.registrationHandler).withAffinity = oldHandler.withAffinity;
            if (self.preinitHooks[plugin.info.fullName]) {
                self.preinitHooks[plugin.info.fullName].forEach(f => f(plugin));
            }
            original(event);
        });

        // This call here informs `rcp-fe-plugin-loader` that our plugin is ready to initialize.
        // This will (eventually) call document.dispatchEvent, thus arriving at the code above.
        onload();
    }

    /**
     * Checks if every plugin dependency is statisfied and topologically sorts `this.plugins`
     * so that the order of initialization statisfies the dependencies. Errors if there is a
     * cyclic dependency or if a dependency is not statisfied by the current plugins. Should
     * not be called more than once, and should only be called once all plugins are initialized.
     */
    private resolvePluginDependencies() {
        // Step 1: Resolve plugin dependencies.
        this.plugins.forEach(plugin => {
            Object.keys(plugin.description.dependencies || {}).forEach(depName => {
                const dep = this.getPluginWithName(depName);

                if (!dep) {
                    plugin.state = PluginState.UNMET_DEPENDENCY;
                    return;
                }

                plugin.dependencies.push(dep);
                dep.dependents.push(plugin);
            });
        });

        // Step 2: Mark plugins disabled by default as disabled.
        this.plugins.filter(x => x.description.disableByDefault).forEach(p => {
            p.state = PluginState.DISABLED;
        });

        // Step 3: Mark disabled plugins as disabled.
        this.toggledPlugins.forEach(p => {
            const plugin = this.getPluginWithName(p);

            // We don't warn since it normally isn't a problem if an old plugin has been removed.
            if (!plugin) return;
            
            plugin.state = plugin.state === PluginState.LOADED ? PluginState.DISABLED : PluginState.LOADED;
        });

        // Step 4: Resolve and version check built-in dependencies.
        this.plugins.forEach(plugin => {
            if (plugin.state !== PluginState.LOADED) return;

            Object.keys(plugin.description.builtinDependencies || {}).forEach(depName => {
                // Anonymous function for easier control flow.
                plugin.state = (() => {
                    const depVer = plugin.description.builtinDependencies![depName];

                    const dep = this.getBuiltinPluginWithName(depName);
                    if (!dep) return PluginState.UNMET_BUILTIN_DEPENDENCY; // Builtin dep not found.

                    const range = semver.validRange(depVer);
                    if (!range) return PluginState.UNMET_BUILTIN_DEPENDENCY; // Invalid version range.
                    // We remove the - and onwards (alpha release tag) because rito the indie game dev company doesn't get how semver works.
                    if (!semver.satisfies(dep.info.version.split("-")[0], range)) return PluginState.UNMET_BUILTIN_DEPENDENCY; // Not statisfied.

                    // Everything is fine.
                    return PluginState.LOADED;
                })();
            });
        });

        // Step 5: Resolve and version check normal dependencies.
        this.plugins.forEach(plugin => {
            if (plugin.state !== PluginState.LOADED) return;

            plugin.dependencies.forEach(dep => {
                const depVer = plugin.description.dependencies![dep.name];
                const range = semver.validRange(depVer);

                plugin.state =
                    range && semver.satisfies(dep.description.version, range)
                    ? PluginState.LOADED
                    : PluginState.UNMET_DEPENDENCY;
            });
        });

        // Step 6: Topologically sort plugins to find a correct initialization order.
        // Yes, I am aware this is some real interesting code.
        const dependencies: [string, string][] = Array.prototype.concat(...this.plugins.filter(x => x.state === PluginState.LOADED).map(p => {
            return p.dependencies.map(x => [p.name, x.name]);
        }));

        try {
            this.initializationOrder = toposort(dependencies).reverse();
            this.initializationOrder =
                this.initializationOrder.concat(this.plugins.filter(x => x.state === PluginState.LOADED && this.initializationOrder.indexOf(x.name) === -1).map(x => x.name));
        } catch (e) {
            // Cyclic dependency, disable anything that depends on something else since we can't easily figure out the loop.
            this.plugins.filter(x => x.state === PluginState.LOADED && (x.dependents.length !== 0 || x.dependencies.length !== 0)).forEach(p => {
                p.state = PluginState.UNMET_DEPENDENCY;
            });

            // Just initialize non-dependents/depended plugins normally.
            this.initializationOrder = this.plugins.filter(x => x.state === PluginState.LOADED && x.dependents.length === 0 && x.dependencies.length === 0).map(x => x.name);

            this.addNotification("warning", "Ace Warning", "Cyclic dependency found. Disabling all plugins that depend on something.");
        }
    }

    /**
     * Simply calls initialize on every Plugin instance.
     */
    private initializePlugins(): Promise<void> {
        if (this.dormant) return Promise.resolve();

        let promiseChain = Promise.resolve();

        this.initializationOrder.map(x => this.getPluginWithName(x)!).forEach(plugin => {
            promiseChain = promiseChain.then(() => {
                if (plugin.state !== PluginState.LOADED) return;
                
                try {
                    return plugin.setup();
                } catch (e) {
                    // Log error to console.
                    console.error(e);

                    // Disable plugins that depend on this one.
                    plugin.state = PluginState.ERRORED;

                    this.addNotification("warning", "Ace Warning", `Error during initialization of '${plugin}': ${e}.`);
                }
            });
        });

        return promiseChain;
    }

    /**
     * Adds a new notification that deletes itself when the X is pressed.
     */
    private addNotification(type: string, title: string, contents: string) {
        const html = `<div class="notification ${type}">
            <span class="title">${title}</span>
            <span class="not-message">${contents}</span>
              <span class="close"><span class="cl1"></span><span class="cl2"></span></span>
        </div>`;

        const tmp = document.createElement("div");
        tmp.innerHTML = html;

        const el = tmp.children[0];        
        el.querySelector(".close")!.addEventListener("click", () => {
            el.parentElement!.removeChild(el);
        });
        this.notificationElement.appendChild(el);
    }
}

interface AnnounceEvent extends Event {
    registrationHandler: (takesProvider: (provider: any) => Promise<any> | any) => void;
    errorHandler: () => any;
    uiIsReady: () => any;
}