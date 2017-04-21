"use strict";

import { PluginDescription } from "../../plugin";

const plugin: PluginDescription = {
    name: "fancy-select",
    version: "2.0.0",
    description: "Gives champion select a different, fancier current champion layout.",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-champ-select": "~1.0.753-hotfix01"
    },
    setup() {
        require("./style");
        this.preinit("rcp-fe-lol-champ-select", () => {
            let unregisterPlayer = this.hook("ember-component", Ember => {
                unregisterPlayer();
                return PlayerMixin(Ember);
            }, "player-object-medium");
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember);
            }, "champion-select");
        });
    }
};
export default plugin;

const PlayerMixin = (Ember: any) => ({
    onChampionChange: Ember.observer("championForIcon", function() {
        Ember.run.scheduleOnce('afterRender', this, function() {
            const id = this.get("championForIcon.id");
            const el = this.$(".video-magic-background")[0];

            if (!id) {
                el.style.backgroundImage = null;
                return;
            }
            
            el.style.backgroundImage =
                `linear-gradient(to left, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.9) 100%), url(/lol-game-data/assets/v1/champion-splashes/${id}/${id}000.jpg)`;
        });
    })
});

const Mixin = (Ember: any) => ({
    classNameBindings: ["session.timer.inFinalizationPhase:ace-override-grid"]
});