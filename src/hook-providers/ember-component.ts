"use strict";

import { wrap_method } from "../util";
import { wrap_ember } from "./util/ember";
import Ace from "../ace";

export const NAME = "ember-component";

type Callback = (Ember: any, args: any[]) => any;
const HOOKS: { matcher: string, fun: Callback }[] = [];

// TODO(molenzwiebel): Is there a better matching mechanism than class names?
// They seem to be present on most (if not all) components someone would want to
// hook.

/**
 * Registers a new hook for the specified class name that gets called when an
 * Ember component with the specified name gets created. If the function returns
 * any results, the component is `extend`ed with said properties, effectively
 * changing the result.
 */
export function register(fun: Callback, matcher: string) {
    const obj = { matcher, fun };
    HOOKS.push(obj);
    return () => {
        HOOKS.splice(HOOKS.indexOf(obj), 1);
    };
}

/**
 * Exports the ember wrapper from util/ember.ts.
 */

export function initialize(ace: Ace) {
    wrap_ember(ace);
}

export function hookEmber(Ember: any) {
    wrap_method(Ember.Component, "extend", function(original, args) {
        // Find the classNames component, in case there were mixins present.
        const name = (<any[]>args).filter(x => (typeof x === "object") && x.classNames && Array.isArray(x.classNames)).map(x => x.classNames.join(" "));
        let res = original(...args);

        if (name.length) {
            HOOKS.filter(x => x.matcher === name[0]).forEach(hook => {
                const hookResult = hook.fun(Ember, args);
                if (hookResult) {
                    res = res.extend(hookResult);
                }
            });
        }

        return res;
    });
}