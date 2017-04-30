"use strict";

const WRAPPED = Symbol("ace-wrapped");

/**
 * Utility method to wrap an existing method.
 */
export default function wrap_method<C extends {[key: string]: any }, K extends keyof C>(container: C, name: K, replacement: (original: (...args: any[]) => any, ...args: any[]) => any) {
    if (!container || typeof container[name] !== "function") return;
    if (container[name][WRAPPED]) return;
    const old = <Function>container[name];

    container[name] = function(...args: any[]) {
        return replacement.call(this, (...a: any[]) => old && old.apply(this, a), args);
    };
    container[name][WRAPPED] = true;
}