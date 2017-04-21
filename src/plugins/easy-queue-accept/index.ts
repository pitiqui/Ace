"use strict";

import { PluginDescription } from "../../plugin";

const plugin: PluginDescription = {
    name: "easy-queue-accept",
    version: "2.0.0",
    description: "Allows you to press the enter key to accept queue ready check.",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-ready-check": "1.0.x"
    },
    setup() {
        this.preinit("rcp-fe-lol-ready-check", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember);
            }, "ready-check-component");
            let unregisterStatic = this.hook("ember-component", Ember => {
                unregisterStatic();
                return Mixin(Ember);
            }, "ready-check-component-static");
            let unregisterNew = this.hook("ember-component", Ember => {
                unregisterNew();
                return MixinNew(Ember);
            }, "ready-check-root-element");
        });
    }
};
export default plugin;

const Mixin = (Ember: any) => ({
    didInsertElement() {
        this._super();

        Ember.run.scheduleOnce('afterRender', this, function() {
            this.$(document).on("keypress", (e: KeyboardEvent) => {
                if (e.which === 13 && this.get("readyCheck.state") === "InProgress") {
                    this.send("accept");
                    e.preventDefault();
                }
            });
        });
    }
});

const MixinNew = (Ember: any) => ({
    didInsertElement() {
        this._super();

        Ember.run.scheduleOnce('afterRender', this, function() {
            this.$(document).on("keypress", (e: KeyboardEvent) => {
                if (e.which === 13 && this.get("readyCheck.isStateMachineStateInProgress")) {
                    this.get("readyCheck").accept();
                    e.preventDefault();
                }
            });
        });
    }
})