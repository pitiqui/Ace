"use strict";

import { PluginDescription } from "../../plugin";
import { simple_promise_fetch } from "../../util";
import settingsAPI from "../settings/api";
import createConfigPanel from "./config-panel";
import BuiltinPlugin from "../../builtin-plugin";

const plugin: PluginDescription = {
    name: "insta-lock",
    version: "2.0.0",
    description: "Picks the chosen champion automatically when it is your turn to pick and/or sends a message as soon as champion select loads.",
    dependencies: {
        "settings": "^2.0.0"
    },
    builtinDependencies: {
        "rcp-fe-lol-social": "~1.0.693-hotfix01",
        "rcp-fe-lol-champ-select": "~1.0.753-hotfix01"
    },
    setup() {
        let lastConversationId = "";
        const settings: settingsAPI = this.getPlugin("settings").api;
        settings.addSettingsView(this, createConfigPanel(this.ace, settings));

        function tryToSend(conversation: {id: string}, retries: number = 0): Promise<String> {
            return simple_promise_fetch(`/lol-chat/v1/conversations/${conversation.id}/messages`, "POST", {
                body: settings.get("instaLock.message", ""),
                type: "chat"
            }).catch(err => {
                if (retries >= 5) {
                    throw Error(`Retried 5 times: ${err}`);
                }
                return tryToSend(conversation, retries + 1);
            });
        }

        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, settings);
            }, "champion-select");
        });

        this.postinit("rcp-fe-lol-social", (plugin: BuiltinPlugin) => {
            const socket = plugin.provider.getSocket();

            socket.subscribe("OnJsonApiEvent", (_: any, data: { data: any, eventType: string, uri: string }) => {
                if (/^\/lol-chat\/v1\/conversations\/.*$/.test(data.uri) && data.eventType === "Update") {
                    let conversation: {id: string, type: "chat" | "club" | "championSelect"} = data.data;
                    if (conversation.type === "championSelect" && lastConversationId != conversation.id) {
                        tryToSend(conversation);
                        lastConversationId = conversation.id;
                    }
                }
            });
        });
    }
};
export default plugin;

const Mixin = (Ember: any, settings: settingsAPI) => ({
    isPickingNowObserver: Ember.observer("currentSummoner.isPickingNow", function() {
        if (this.get("currentSummoner.isPickingNow")
            && settings.get("instaLock.pickChampion", false)
            && settings.get("instaLock.champion", 0))
        {
            simple_promise_fetch(`/lol-champ-select/v1/session/actions/${this.get("currentSummoner.activeAction.id")}`, "PATCH", {
                championId: settings.get("instaLock.champion", 0),
                completed: true
            });
        }
    })
});