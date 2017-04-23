"use strict";

import { PluginDescription } from "../../plugin";
import { simple_promise_fetch } from "../../util";

const plugin: PluginDescription = {
    name: "easy-queue-dodge",
    version: "2.0.0",
    description: "Adds a quit button to champ select to easily dodge (LP loss and leaving restrictions will still apply)",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-champ-select": "~1.0.753-hotfix01"
    },
    setup() {
        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember);
            }, "champion-select");
        });
    }
};
export default plugin;

const Mixin = (Ember: any) => ({
    didInsertElement() {
        this._super();

        Ember.run.scheduleOnce('afterRender', this, function() {
            this.$(document).on("click", ".quit-button", () => {
                simple_promise_fetch("/lol-login/v1/session/invoke?destination=gameService&method=quitGame", "POST", "args=[]", "application/x-www-form-urlencoded");
                simple_promise_fetch("/lol-lobby/v1/lobby", "DELETE");
                simple_promise_fetch("/lol-gameflow/v1/battle-training/stop", "POST");
            });
        });
    },
    showQuitButton: Ember.computed("queue.type", function() {
        return this.get("queue.type") !== "TUTORIAL_GAME";
    }),
    disableQuitButton: Ember.computed("queue.type", function() {
        return this.get("queue.type") === "TUTORIAL_GAME";
    })
});