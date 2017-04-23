"use strict";

import Vue = require("vue/dist/vue.min.js");
import Component from "../../../util/component-decorator";
import SettingsAPI from "../../settings/api";
import Ace from "../../../ace";
import { simple_promise_fetch } from "../../../util"

import LAYOUT = require("./layout.html");
import "./style";

/**
 * Wrapped in a closure so we get access to the settings api.
 */
export default function(ace: Ace, settings: SettingsAPI) {
    @Component({
        template: LAYOUT
    })
    class InstaLockConfigPanel extends Vue {
        pickChampion: boolean;
        sendMessage: boolean;

        champion: number;
        message: string;

        champions: { name: string, id: number, ownership: { owned: boolean } }[];

        loading: boolean;
        errored: boolean;
        error: string | null;

        filter: string;

        data() {
            return {
                pickChampion: settings.get("instaLock.pickChampion", false),
                sendMessage: settings.get("instaLock.sendMessage", false),
                champion: settings.get("instaLock.champion", 0),
                message: settings.get("instaLock.message", ""),
                champions: [],
                loading: true,
                errored: false,
                error: null,
                filter: ""
            };
        }

        created() {
            simple_promise_fetch("/lol-login/v1/session").then(data => {
                const summonerId = JSON.parse(data).summonerId;
                return simple_promise_fetch(`/lol-collections/v1/inventories/${summonerId}/champions`);
            }, err => {
                this.loading = false;
                this.errored = true;
                this.error = err;
            }).then(champs => {
                if (!champs) return;
                this.champions = JSON.parse(champs).filter(filterOwned).sort(sortAlphabetically);
                this.loading = false;
            });
        }

        beforeDestroy() {
            settings.mergeSettings({
                instaLock: {
                    pickChampion: this.pickChampion,
                    sendMessage: this.sendMessage,
                    champion: this.champion,
                    message: this.message
                }
            });
            settings.save();
        }

        isSelected(champ: { id: number }) {
            return this.champion === champ.id;
        }

        isFiltered(champ: { name: string }) {
            return champ.name.toLowerCase().indexOf(this.filter.toLowerCase()) !== -1;
        }

        chooseChampion(champ: { id: number }) {
            this.champion = champ.id;
        }
    };

    return InstaLockConfigPanel;
}

function sortAlphabetically(a: { name: string }, b: { name: string }) {
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    return 0;
}

function filterOwned(x: { ownership: { owned: boolean } }) {
    return x.ownership.owned;
}