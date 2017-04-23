"use strict";

import { PluginDescription } from "../../plugin"

import API from "./api";

export type ChatCommand = (msg: string, id: string) => string;
export type CommandList = { [commandName: string]: ChatCommand };

let chatCommands: CommandList = { // List of commands
    shrug(msg: string) {
        return msg + " ¯\\_(ツ)_/¯";
    },
    tableflip(msg: string) {
        return msg + " (╯°□°）╯︵ ┻━┻";
    },
    reverse(msg: string) {
        return msg.split("").reverse().join("");
    },
    printid(msg: string, id: string) {
        return id;
    }
}

export default (<PluginDescription>{
    name: "chat-commands",
    version: "2.0.0",
    description: "Adds chat commands to messaging, prefixed by forward-slash.",
    builtinDependencies: {
        "rcp-fe-lol-social": "~1.0.693-hotfix01"
    },
    setup() {
        const api = new API(chatCommands);

        this.hook("http", () => {}, /^\/lol-chat\/v1\/conversations\/.*\/messages$/, (req: XMLHttpRequest, url: string, ...args: any[]) => {
            let data = args[0];
            let match = url.match(/^\/lol-chat\/v1\/conversations\/(.*)\/messages$/);
            let id = match && match[1] || "";

            if (typeof data === "string") {
                var msg = JSON.parse(data);
                var text: string = msg.body;

                if (text.indexOf("/") === 0) {
                    text = text.substring(1);
                    let command = text.split(" ")[0];
                    text = text.split(" ").slice(1).join(" ")

                    if (chatCommands[command]) {
                        msg = {
                            ...msg,
                            body: chatCommands[command](text, id)
                        };
                    }
                }
            }

            args[0] = JSON.stringify(msg) || data;

            return args;
        });

        return api;
    }
})