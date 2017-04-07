"use strict";

import { wrap_method } from "../util";
import { wrap_ember } from "./util/ember";
import Ace from "../ace";

export const NAME = "ember-service";

type Callback = (Ember: any, args: any[]) => any;
const HOOKS: { matcher: string, fun: Callback }[] = [];

// TODO: Match by something other than key name (What though?)

export function register(fun: Callback, matcher: string) {
    const obj = { matcher, fun };
    HOOKS.push(obj);
    return () => {
        HOOKS.splice(HOOKS.indexOf(obj), 1);
    };
}

export function initialize(ace: Ace) {
    wrap_ember(ace);
}

export function hookEmber(Ember: any) {
    wrap_method(Ember.Service, "extend", function(original, args: any[]) {
        let res = original(...args);

        HOOKS.forEach(hook => {
            args.forEach(arg => {
                if (arg !== null && typeof arg === "object" && arg.hasOwnProperty(hook.matcher)) {
                    const hookResult = hook.fun(Ember, args);
                    if (hookResult) {
                        res = res.extend(hookResult);
                    }
                }
            })
        });

        return res;
    });
}