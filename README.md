![Ace Logo](assets/ace_logo.png?raw=true)  
[![Build Status](https://travis-ci.org/ZombieWizzard/Ace.svg?branch=master)](https://travis-ci.org/ZombieWizzard/Ace)
[![Ace Discord](https://img.shields.io/badge/discord-Ace-738bd7.svg?style=flat)](https://discord.gg/bfxdsRC)

Ace - Alpha Client Enhancer.  
A project that aims to get useful features into the new League of Legends client that Riot Games has been developing.  

Ace currently in beta and might not completely stable. Steps have been taken to ensure that Ace does not crash the client and day-to-day usage should be as stable as the normal client, but you should not be surprised if something goes wrong.

# Plugins

- **no-shutdown-prompt**: Removes the `Are you sure you want to quit?` prompt that normally comes up when closing the client.
- **owned-skins**: Adds a new tab in `Collections` that shows all of your owned skins, along with some general statistics.  
![GIF of owned-skins](https://thumbs.gfycat.com/AgedSlowDiamondbackrattlesnake-size_restricted.gif)
<!--- **resize**: Allows you to resize the client to any size, as long as it keeps the same aspect ratio.-->
- **summoner-icon-description**: Adds a simple tooltip on each summoner icon, detailing where it came from.
![Image of summoner-icon-description](http://i.imgur.com/f2S0tYX.png)
<!--- **summoner-tooltip**: Adds a tooltip in champion select that shows some ranked statistics about the player, including current rank, W/L and promo status.  
![Image of summoner-tooltip](http://i.imgur.com/dA5Sedw.png)-->
- **easy-queue-dodge**: Adds a quit button to all queues, to allow you to dodge champion select without closing the client. (WARNING: LP Loss and leaving restrictions will still incur)
- **insta-lock**: Allows you to configure a champion to pick and/or a message to send automatically in champion select.

The entire list of plugins can be found [here](/PLUGINS.md)

# Installing/Using Ace

To Install Ace download the latest release of Ace [here](https://github.com/ZombieWizzard/Ace-Windows/releases/latest) and run it. It may ask you for admin access if it is your first time running Ace v2+, this is normal and is required for Ace to work.

If you find any bugs or need any assistance with installing Ace feel free to create an issue [here](https://github.com/ZombieWizzard/Ace/issues) and I will attempt to assist you with your problem.

# Developing Ace

Ace uses TypeScript and Stylus as main languages, with Webpack as bundling tool. The webpack development server can be started using `npm run watch`, which will start a server over at `https://localhost:8080`. The easiest way to develop with this server is to run the launcher with the argument `--ace-dev` which will automatically use a javascript file that loads from the webpack server and disables HTTPS certificate checking.

Once you are confident with your changes, running `npm run bundle` will create a bundled version of Ace in `src/built/bundle.js`. This file can then be distributed with the launcher to create a single package that anyone can run.

# License

Ace is released under the [MIT](/LICENSE) license. Feel free to browse through the code as you like, and if you end up making any improvements or changes, please do not hesitate to make a pull request. :)
