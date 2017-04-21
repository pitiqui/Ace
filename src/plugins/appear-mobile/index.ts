"use strict";

import { PluginDescription } from "../../plugin";
import { RegisterElementParams } from "../../hook-providers/register-element";
import { simple_promise_fetch, redefine } from "../../util";

import SettingsApi from "../settings/api";
import BuiltinPlugin from "../../builtin-plugin";

import DROPDOWN_HTML = require("./dropdown.html");

const plugin: PluginDescription = {
    name: "appear-mobile",
    version: "2.0.0",
    description: "Allows you to hide your status in the social options menu.",
    dependencies: {
        "settings": "^2.0.0"
    },
    builtinDependencies: {
        "rcp-fe-lol-social": "~1.0.693-hotfix01"
    },
    setup() {
        const settings: SettingsApi = this.getPlugin("settings").api;
        let appearMobile = settings.get("appearMobile.toggled", false);
        let availability = "chat";

        this.postinit("rcp-fe-lol-social", (plugin: BuiltinPlugin) => {
            const socket = plugin.provider.getSocket();

            socket.subscribe("OnJsonApiEvent", (_: any, data: any) => {
                if (data.uri === "/lol-chat/v1/me") {
                    let me = data.data;
                    if (appearMobile && (me.availability !== "mobile" || me.lol.gameStatus !== "outOfGame")) {
                        simple_promise_fetch("/lol-chat/v1/me", "PUT", {
                            ...me,
                            availability: "mobile",
                            lol: {
                                ...me.lol,
                                gameStatus: "outOfGame"
                            }
                        });
                    }
                }
            });
        });

        this.hook("http", () => {}, "/lol-chat/v1/me", (req: XMLHttpRequest, url: string, ...args: any[]) => {
            let data = args[0];

            if (typeof data === "string") {
                var me = JSON.parse(data);
                me = {
                    ...me,
                    availability: appearMobile ? "mobile" : me.availability,
                    lol: {
                        ...me.lol,
                        gameStatus: appearMobile ? "outOfGame" : me.lol.gameStatus || "outOfGame"
                    }
                }
            }

            args[0] = JSON.stringify(me) || data;

            return args;
        });

        let unregisterDropdown = this.hook("template-content", (doc: DocumentFragment) => {
            if (doc.querySelector("lol-social-menu.options-menu")) {
                let div = document.createElement('div');
                div.innerHTML = DROPDOWN_HTML;
                if (div.firstChild) {
                    (<HTMLElement>doc.querySelector("lol-social-menu.options-menu")).appendChild(div.firstChild);
                }
                unregisterDropdown();
            }
        });

        let unregisterElement = this.hook("register-element", (args: RegisterElementParams) => {
            const proto: any = args.prototype;

            proto.appearMobileLoad = function() {
                this.appearMobile = appearMobile;
            }

            proto.appearMobileChanged = function(event: Event) {
                appearMobile = (<any>event.target).checked;
                this.data.me.lol.gameStatus = appearMobile ? "outOfGame" : this.data.me.lol.gameStatus;
                this.data.saveMe();

                settings.mergeSettings({
                    appearMobile: {
                        toggled: appearMobile
                    }
                });
                settings.save();
            }

            proto.data.me.availability = availability;
            redefine(proto.data.me, "availability", () => { // Fixes an issue with you looking like your online when your really appearing mobile
                return appearMobile ? "mobile" : availability
            }, (newVal) => {
                if (newVal !== "mobile") {
                    availability = newVal
                }
            });

            unregisterElement();
        }, "lol-social-actions-bar");
    }
};
export default plugin;