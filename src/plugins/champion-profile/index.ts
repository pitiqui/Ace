"use strict";

import { PluginDescription } from "../../plugin";
import Ace from "../../ace";
import SettingsApi from "../settings/api";

import replacementHTML = require("./drop.html");
import SKINS = require("./skins.json");

let settings: SettingsApi;

const plugin: PluginDescription = {
    name: "champion-profile",
    version: "1.2.0",
    description: "Adds a dropdown for choosing the champion in the background in your profile.",
    builtinDependencies: {
        "rcp-fe-lol-profiles": "~0.0.306"
    },
    setup() {
        settings = this.getPlugin("settings").api;
        this.preinit("rcp-fe-lol-profiles", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Buttons(Ember, this.ace);
            }, "profile-wrapper-component");
        });
    }
};
export default plugin;

const Buttons = (Ember: any, ace: Ace) => ({
    didInsertElement() {
        this._super();

        const onDropChampionChange = (data: any) => {
            let elementClicked = data["target"];
            if(elementClicked.nodeName == "SPAN") {
                elementClicked = elementClicked.parentElement;
            }

            const newId = elementClicked.getAttribute("value");
            const name = elementClicked.getAttribute("name");
            elementClicked.parentElement.parentElement.setAttribute("champ-id", newId);
            const img = document.getElementsByClassName("masked-image")[0].children[0];
            let sId = elementClicked.parentElement.parentElement.getAttribute("skin-id");
            if(sId === null) {
                sId = "0";
            }

            let newURL = "/lol-game-data/assets/v1/champion-splashes/" + newId + "/" + newId + "000.jpg";

            img.setAttribute("src", newURL);
            document.getElementsByClassName("skin-dropdown-list")[0].innerHTML="";
            Object.keys(SKINS[name].skins[0]).forEach(keySkin => {
                let drop = document.createElement("lol-uikit-dropdown-option");
                drop.className = "item-dropdown-skin";
                drop.setAttribute("value", keySkin);
                drop.textContent = SKINS[name]["skins"][0][keySkin];
                this.$(".skin-dropdown-list")[0].appendChild(drop);
            });

            const itemsSkin = this.$("#dropdown-profile-skin")[0].children;
            for(let i = 0; i<itemsSkin.length; i++) {
                itemsSkin[i].onclick = onDropSkinChange;
            }

            settings.mergeSettings({
                championProfile: {
                    champion: newId,
                    skin: 0
                }
            });
            settings.save();
            }

            const onDropSkinChange = (data: any) => {
                let elementClicked = data["target"];
                if(elementClicked.nodeName == "SPAN") {
                    elementClicked = elementClicked.parentElement;
                }

                const newId = elementClicked.getAttribute("value");
                elementClicked.parentElement.parentElement.setAttribute("skin-id", newId);
            const img = document.getElementsByClassName("masked-image")[0].children[0];
            const src = img.getAttribute("src");
            if (src) {
                let cId = src.split("/")[5];
                let newURL = "";
                if(newId.length == 1) {
                    newURL = "/lol-game-data/assets/v1/champion-splashes/" + cId + "/" + newId + ".jpg";
                } else {
                    newURL = "/lol-game-data/assets/v1/champion-splashes/" + cId + "/" + newId + ".jpg";
                }
                img.setAttribute("src", newURL);

                settings.mergeSettings({
            championProfile: {
                champion: cId,
                skin: newId
            }
            });
            settings.save();
            }
        }

        Ember.run.scheduleOnce('afterRender', this, () => {
            const profileDom = this.$(".profile-uikit-page-contents")[0];
            const div = document.createElement("div");
            div.className = "champion-dropdown";
            div.innerHTML = replacementHTML;

            profileDom.appendChild(div, profileDom.firstChild);
            const items = this.$("#dropdown-profile-champion")[0].children;
            Object.keys(SKINS).forEach(key => {
                let drop = document.createElement("lol-uikit-dropdown-option");
                drop.className = "item-dropdown-champion";
                drop.setAttribute("name", key);
                drop.setAttribute("value", SKINS[key].id);
                drop.textContent = key;

                if(SKINS[key].id == settings.get("championProfile.champion", "")) {
                    drop.setAttribute("selected", "true");

                    Object.keys(SKINS[key].skins[0]).forEach(keySkin => {
                        let dropS = document.createElement("lol-uikit-dropdown-option");
                        dropS.className = "item-dropdown-skin";
                        dropS.setAttribute("value", keySkin);
                        dropS.textContent = SKINS[key]["skins"][0][keySkin];

                        if(keySkin == settings.get("championProfile.skin", "")) {
                            dropS.setAttribute("selected", "true");
                        }

                        this.$(".skin-dropdown-list")[0].appendChild(dropS);
                    });
                }

                this.$(".champion-dropdown-list")[0].appendChild(drop);
            });

            for(let i = 0; i<items.length; i++) {
                items[i].onclick = onDropChampionChange;
            }

            const itemsSkin = this.$("#dropdown-profile-skin")[0].children;
            for(let i = 0; i<itemsSkin.length; i++) {
                itemsSkin[i].onclick = onDropSkinChange;
            }

            if(settings.get("championProfile.champion", "") != "" || settings.get("championProfile.skin", "") != "") {
                Ember.run.later(this, () => {
                    const img = document.getElementsByClassName("masked-image")[0].children[0];
                    const src = img.getAttribute("src");
                    if (src) {
                        let newURL = "/lol-game-data/assets/v1/champion-splashes/" + settings.get("championProfile.champion", "") + "/" + settings.get("championProfile.skin", "") + ".jpg";
                        img.setAttribute("src", newURL);
                    }
                }, 250);
            }
        });
    }
});
