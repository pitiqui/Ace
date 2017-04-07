"use strict";

import { PluginDescription } from "../../plugin";
import { RegisterElementParams } from "../../hook-providers/register-element";
import { simple_promise_fetch } from "../../util";

import ROSTER_HTML = require("./roster.html");
import GROUP_HTML = require("./group.html");
import GROUP_NAME_HTML = require("./group-name.html");
import "./style";

export default (<PluginDescription>{
    name: "recently-played",
    version: "2.0.0",
    description: "Adds a recent summoners group in your friends list that allows you to view, invite and add anyone you recently played with.",
    disableByDefault: true,
    builtinDependencies: {
        "rcp-fe-lol-social": "~1.0.693-hotfix01"
    },
    setup() {
        let unregisterRoster = this.hook("template-content", (doc: DocumentFragment) => {
            if (doc.querySelector("lol-uikit-scrollable.list")) {
                let div = document.createElement('div');
                div.innerHTML = ROSTER_HTML;
                if (div.firstChild) {
                    (<HTMLElement>doc.querySelector("lol-uikit-scrollable.list .list-content:not(#no-friends):not(#no-online-friends)")).appendChild(div.firstChild);
                }
                unregisterRoster();
            }
        });

        let unregisterGroup = this.hook("template-content", (doc: DocumentFragment) => {
            if (doc.querySelector(".group > .group-header")) {
                (<HTMLElement>doc.querySelector(".group")).innerHTML = GROUP_HTML;
                unregisterGroup();
            }
        });

        let unregisterGroupName = this.hook("template-content", (doc: DocumentFragment) => {
            if (doc.querySelector(".group-name-text > .group-label")) {
                (<HTMLElement>doc.querySelector(".group-name-text > .group-label")).innerHTML = GROUP_NAME_HTML;
                unregisterGroupName();
            }
        });

        let unregisterElement = this.hook("register-element", (args: RegisterElementParams) => {
            const proto: any = args.prototype;

            proto.loading = false;
            proto.startedInitialLoad = false;
            proto.toggled = false;

            proto.oldToggleOpen = proto.toggleOpen;
            proto.toggleOpen = function() {
                proto.oldToggleOpen.call(this);

                this.toggled = !this.toggled;
            }

            proto.startLoad = function(event?: MouseEvent) {
                if (this.loading) return;
                if (event) event.stopPropagation();
                this.recentPlayers = [];
                this.loading = true;
                this.startedInitialLoad = true;

                simple_promise_fetch("/lol-match-history/v1/recently-played-summoners").then(json => {
                    this.loading = false;
                    this.loaded = true;

                    this.recentPlayers = JSON.parse(json).filter((p: any) => {
                        // Remove players we are friends with or have blocked.
                        return !this.data.friends.byId[p.summonerId] && !this.data.blockedPlayers.byId[p.summonerId]
                    }).sort((a: any, b: any) => {
                        // Sort by newest first.
                        return new Date(b.gameCreationDate).getTime() - new Date(a.gameCreationDate).getTime();
                    });
                    this.recentPlayers.forEach((p: any) => {
                        // Add champion icon url to data player object.
                        p.championIconUrl = "/lol-game-data/assets/v1/champion-icons/" + p.championId + ".png";
                    });
                    this.queueRepaint();
                });

                return "";
            };

            proto.onRecentDragStart = function(event: DragEvent, member: any) {
                const dataTransfer = event.dataTransfer;
                this.sounds.drag.play();
                
                // We don't want to set this as recently played members shouldn't be draggable to roster groups
                /*dataTransfer.setData("application/riot.roster-member+json", JSON.stringify({
                    type: "roster-member",
                    id: member.summonerId,
                    name: member.summonerName
                }));*/
                
                dataTransfer.setData("application/riot.chat-user+json", JSON.stringify({
                    type: "chat-user",
                    id: member.summonerId,
                    name: member.summonerName
                }));

                dataTransfer.setData("application/riot.player+json", JSON.stringify({
                    type: "player",
                    id: member.summonerId,
                    name: member.summonerName
                }));
            };

            proto.onRecentClick = function(event: MouseEvent, member: any) {
                this.activeMember = member;
                this.viewRecentProfile();
            }

            proto.onRecentRightClick = function(event: MouseEvent, member: any) {
                // There must be a lobby, not in queue, you must be able to invite, the player cannot already be in the lobby.
                const canInvite = this.data.lobby && !this.data.gameSearch && this.data.lobby.members.some((lobbyMember: any) => {
                    return lobbyMember.id === this.data.me.id && lobbyMember.canInviteOthers;
                }) && !this.data.lobby.members.some((lobbyMember: any) => {
                    return lobbyMember.id === member.summonerId;
                });

                const actions = [{
                    action: "inviteRecent",
                    target: this,
                    label: this.t("context_menu_invite_to_game"),
                    disabled: !canInvite
                }, {
                    action: "viewRecentProfile",
                    target: this,
                    label: this.t("context_menu_view_profile")
                }, {
                    action: "addRecent",
                    target: this,
                    label: this.t("tooltip_new_friend")
                }];

                this.data.contextMenuManager.close();
                if (this.data.contextMenuManager.filterVisible(actions).length) {
                    this.activeMember = member;
                    this.data.contextMenuManager.setMenuItems(actions);
                    this.data.contextMenuManager.openAtEvent(event);
                }
            };

            proto.viewRecentProfile = function() {
                this.data.profilePlugin.showOverlay({
                    summonerId: this.activeMember.summonerId
                });
            };

            proto.inviteRecent = function() {
                this.data.queueEligibility.getEligibility(this.activeMember.summonerId).then((result: any) => {
                    if (result.eligible) {
                        this.data.inviteToGame(this.activeMember.summonerId);
                    } else {
                        if (!result.restrictions) {
                            // Player was not online or there was no good reason.
                            this.sounds.gameInviteFailed.play();
                            this.toast(this.t("parties_player_ineligible_to_join", {
                                player: this.activeMember.summonerName
                            }));
                        } else {
                            const restriction = result.restrictions[0];
                            this.sounds.gameInviteFailed.play();
                            this.toast(this.t("parties_queue_restriction_player_prefix", {
                                player: this.activeMember.summonerName,
                                reason: this.t("parties_queue_restriction_player_" + restriction.restrictionCode, restriction.restrictionArgs || {})
                            }));
                        }
                    }
                });
            };

            proto.addRecent = function() {
                simple_promise_fetch("/lol-chat/v1/friend-requests", "POST", JSON.stringify({name: this.activeMember.summonerName}), "application/json");
            }

            unregisterElement();
        }, "lol-social-roster-group");
    }
});