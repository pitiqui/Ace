"use strict";

import { ChatCommand, CommandList } from "./";

export default class API {
    private chatCommands: CommandList

    constructor(chatCommands: CommandList) {
        this.chatCommands = chatCommands;
    }

    /**
     * Registers a chat command.
     */
    addCommand(commandName: string, command: ChatCommand) {
        this.chatCommands[commandName] = command;
    }

    /**
     * Returns the chat command with the given name, or null if it doesn't exist.
     */
    getCommand(commandName: string) {
        return this.chatCommands[commandName] || null;
    }
}