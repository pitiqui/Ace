"use strict";

import { PluginDescription } from "../../plugin";

const plugin: PluginDescription = {
    name: "practice-tool-extra-bots",
    version: "2.0.0",
    description: "Allows you to add extra bots to the practice tool lobby.",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-parties": "~0.2.34"
    },
    setup() {
        this.preinit("rcp-fe-lol-parties", () => {
            let unregister = this.hook("ember-service", Ember => {
                unregister();
                return Mixin(Ember);
            }, "generateCustomGamePayload");
        });
    }
};
export default plugin;

const Mixin = (Ember:any) => ({
    generateCustomGamePayload: function() { // Default functionality
        var e = this.get("playerInputs.subcategoryIndex")
          , t = this.get("subcategories");
        if (!t[e])
            return console.error("Tried to create custom game with invalid subcategory index: " + e),
            !1;
        var n = t[e]
          , r = this.get("playerInputs.password").trim();
        return "" === r && (r = null ),
        {
            customGameLobby: {
                configuration: {
                    gameMode: n.get("gameMode"),
                    gameMutator: n.get("gameMutator"),
                    gameServerRegion: this.get("playerInputs.gameServerRegion"),
                    mapId: n.get("mapId"),
                    mutators: {
                        id: this.get("playerInputs.mutatorId")
                    },
                    spectatorPolicy: this.get("playerInputs.spectatorType"),
                    teamSize: n.get("gameMutator") === "PracticeTool" ? 5 : this.get("playerInputs.numPlayersPerTeam") // Modified teamsize if it is practice tool
                },
                lobbyName: this.get("playerInputs.name") ? this.get("playerInputs.name") : this.get("defaultGameName"),
                lobbyPassword: r
            },
            isCustom: !0
        }
    }
})