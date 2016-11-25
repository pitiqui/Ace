 "use strict";

import { PluginDescription } from "../../plugin";
import Ace from "../../ace";

import replacementHTML = require("./drop.html");
import IDS = require("./ids.json");
import SKINS = require("./skins.json");

export default (<PluginDescription>{
    name: "champion-profile",
    version: "1.1.0",
    description: "Adds a dropdown for choosing the champion in the background.",
    builtinDependencies: {
        "rcp-fe-lol-profiles": "0.0.232"
    },
    setup() {
        this.preinit("rcp-fe-lol-profiles", () => {
            let unregister = this.hook("ember-component", Ember => {
                unregister();
                return Mixin(Ember, this.ace);
            }, "profile-wrapper-component");
        });
    }
});

const Mixin = (Ember: any, ace: Ace) => ({
    didInsertElement() {
        this._super();

        const onDropChampionChange = (data: any) => {
            let elementClicked = data["target"];
            if(elementClicked.nodeName == "SPAN") {
                elementClicked = elementClicked.parentElement;
            }

            const newId = elementClicked.getAttribute("value");
            elementClicked.parentElement.parentElement.setAttribute("champ-id", newId);
            const img = document.getElementsByClassName("masked-image")[0].children[0];
            let sId = elementClicked.parentElement.parentElement.getAttribute("skin-id");
            if(sId === null) {
                sId = "0";
            }
            if(sId.length == 1) {
                const newURL = "/lol-game-data/assets/v1/champion-splashes/" + newId + "/" + newId + "000.jpg";
            } else {
                const newURL = "/lol-game-data/assets/v1/champion-splashes/" + newId + "/" + newId + "000.jpg";
            }
            img.setAttribute("src", newURL);
            document.getElementsByClassName("skin-dropdown-list")[0].innerHTML="";
            let drop = document.createElement("lol-uikit-dropdown-option");
            drop.className = "item-dropdown-skin";
            drop.setAttribute("value", 0);
            drop.textContent = "Default";
            this.$(".skin-dropdown-list")[0].appendChild(drop);

            Object.keys(SKINS[newId]["skins"]).forEach(keySkin => {
                let drop = document.createElement("lol-uikit-dropdown-option");
                drop.className = "item-dropdown-skin";
                drop.setAttribute("value", keySkin);
                drop.textContent = SKINS[newId]["skins"][keySkin];
                this.$(".skin-dropdown-list")[0].appendChild(drop);
            });

            const itemsSkin = this.$("#dropdown-profile-skin")[0].children;
            for(let i = 0; i<itemsSkin.length; i++) {
                itemsSkin[i].onclick = onDropSkinChange;
            }
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
                if(newId.length == 1) {
                    const newURL = "/lol-game-data/assets/v1/champion-splashes/" + cId + "/" + cId + "00" + newId + ".jpg";
                } else {
                    const newURL = "/lol-game-data/assets/v1/champion-splashes/" + cId + "/" + cId + "0" + newId + ".jpg";
                }
                img.setAttribute("src", newURL);
            }
        }

        Ember.run.scheduleOnce('afterRender', this, function () {
            const profileDom = this.$(".profile-uikit-page-contents")[0];
            const div = document.createElement("div");
            div.className = "champion-dropdown";
            div.innerHTML = replacementHTML;

            profileDom.appendChild(div, profileDom.firstChild);
            const items = this.$("#dropdown-profile-champion")[0].children;
            Object.keys(IDS).forEach(key => {
                let drop = document.createElement("lol-uikit-dropdown-option");
                drop.className = "item-dropdown-champion";
                drop.setAttribute("value", IDS[key]);
                drop.textContent = key;
                this.$(".champion-dropdown-list")[0].appendChild(drop);
            });

            for(let i = 0; i<items.length; i++) {
                items[i].onclick = onDropChampionChange;
            }
        });
    }
});
