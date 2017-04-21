"use strict";

import Ace from "../ace";
import Plugin, { PluginDescription } from "../plugin";

import Settings from "./settings";
import Changelog from "./changelog";
import NoShutdownPrompt from "./no-shutdown-prompt";
import OwnedSkins from "./owned-skins";
import SummonerIconDescription from "./summoner-icon-description";
//import Resize from "./resize"; //Broken
import ChampionGroups from "./champion-groups";
import ClassicCurrency from "./classic-currency";
import FancySelect from "./fancy-select";
import RecentlyPlayed from "./recently-played";
import EasyQueueDodge from "./easy-queue-dodge";
import EasyQueueAccept from "./easy-queue-accept";
import PracticeToolExtraBots from "./practice-tool-extra-bots";
import AppearMobile from "./appear-mobile";
import ChatCommands from "./chat-commands";

export const PLUGINS: PluginDescription[] = [
    Settings,
    Changelog,
    NoShutdownPrompt,
    OwnedSkins,
    SummonerIconDescription,
    //Resize,
    ChampionGroups,
    ClassicCurrency,
    FancySelect,
    RecentlyPlayed,
    EasyQueueDodge,
    EasyQueueAccept,
    PracticeToolExtraBots,
    AppearMobile,
    ChatCommands,
];

export default function register(ace: Ace) {
    PLUGINS.forEach(des => {
        const inst = new Plugin(ace, des);
        ace.registerPlugin(inst);
    });
}