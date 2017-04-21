"use strict";

import { PluginDescription } from "../../plugin";
import Ace from "../../ace";

import DESCRIPTIONS = require("./descriptions.json");

const plugin: PluginDescription = {
    name: "summoner-icon-description",
    version: "2.0.0",
    description: "Adds descriptions to your summoner icons.",
    builtinDependencies: {
        "rcp-fe-lol-summoner-icon-picker": "~0.0.26",
        "rcp-fe-lol-uikit": "~0.3.480-hotfix01"
    },
    setup() {
        // Expand ranges.
        Object.keys(DESCRIPTIONS).forEach(key => {
            if (key.indexOf("-") === -1) return;

            const begin = parseInt(key.split("-")[0]);
            const end = parseInt(key.split("-")[1]);
            for (let i = begin; i <= end; i++) {
                DESCRIPTIONS[i + ""] = DESCRIPTIONS[key];
            }
        });

        this.preinit("rcp-fe-lol-summoner-icon-picker", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, this.ace);
            }, "update-icon-component");
        });
    }
};
export default plugin;

const Mixin = (Ember: any, ace: Ace) => ({
    // We need to re-add the icons both on the initial render and when
    // the selected icon changes. Since the selected icon triggers a 
    // rerender, all of our previous tooltips get lost.
    onIconsLoad: Ember.observer("visible", "selectedIconId", function() {
        Ember.run.scheduleOnce('afterRender', this, function() {
            // We need the uikit api for the tooltips.
            ace.getBuiltinApi("rcp-fe-lol-uikit").then(uikit => {
                this.get("icons").forEach((icon: any) => {
                    const el = this.$(".update-icon-list-item[data-icon-id='" + icon.id + "']");
                    uikit.getTooltipManager().assign(el, RenderTooltip(uikit, DESCRIPTIONS[icon.id]), {}, {
                        targetAnchor: {
                            x: "center",
                            y: "top"
                        },
                        tooltipAnchor: {
                            x: "center",
                            y: "bottom"
                        },
                        offset: {
                            x: 0,
                            y: -2
                        },
                        hideEvent: "mouseleave"
                    });
                });
            });
        });
    })
});

const RenderTooltip = (api: any, tooltip: string) => () => {
    const el = document.createElement("lol-uikit-tooltip");
    el.appendChild(api.getTemplateHelper().contentBlockTooltip("About", tooltip, "tooltip-large"));
    return el;
};