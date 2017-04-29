"use strict";

const HOOKED = Symbol("ace-ember-hooked");

import { wrap_method } from "../../util";
import Ace from "../../ace";

import * as emberComponent from "../ember-component";
import * as emberService from "../ember-service";

var emberHooks = [
    emberComponent,
    emberService,
]

export function wrap_ember(ace: Ace) {
    ace.getBuiltinApi("rcp-fe-ember-libs").then(api => {
        // We need to do a little dance here to make sure we hook before the first invocation.
        // Since rcp-fe-ember-libs is async, we cannot guarantee that we are the first to receive
        // the Ember instance if we simply hook the result of api.getEmber. Instead, we need to
        // make sure we modify the Ember instance before we return it to the plugin requesting it.
        wrap_method(api, "getEmber", function(original, args) {
            const res: Promise<any> = original(...args);

            return res.then(Ember => {
                // No point in hooking twice.
                if (Ember[HOOKED]) return Ember;

                Ember[HOOKED] = true;
                if (window.ACE_DEV) {
                    Ember.run.backburner.DEBUG = true; // Enable in depth stack traces from backburner
                }
                wrap_method(Ember, "get", function(original, args) {
                    let ret = original.call(this, ...args);
                    if (Array.isArray(ret) && !(<any>ret).findBy) {
                        ret = Ember.A(ret);
                    }
                    return ret;
                });

                emberHooks.forEach(emberHook => {
                    // Call each ember hook
                    emberHook.hookEmber(Ember);
                })
                return Ember;
            });
        });
    })
}