"use strict";

import { PluginDescription } from "../../plugin";

const plugin: PluginDescription = {
    name: "classic-currency",
    version: "2.0.0",
    description: "Replaces the RP and IP icons with their Legacy Client equivalents.",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-navigation": "~0.0.193"
    },
    setup() {
        require("./style");
    }
};
export default plugin;