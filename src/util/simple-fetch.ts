"use strict";

export default function simple_fetch(url: string, cb: (contents: string) => void): Promise<string>
export default function simple_fetch(url: string, method: string, cb: (contents: string) => void): Promise<string>
export default function simple_fetch(url: string, method: string, body: string | Object, cb: (contents: string) => void): Promise<string>
export default function simple_fetch(url: string, method: string, body: string | Object, content_type: string, cb: (contents: string) => void): Promise<string>
export default function simple_fetch(...args: any[]): Promise<string> {
    let cb: (contents: string) => void = args.pop();

    return simple_promise_fetch.call(null, ...args).then((contents: string) => {
        cb(contents);
        return contents;
    });
}

export function simple_promise_fetch(url: string, method: string = "GET", body?: string | Object, content_type: string = "application/json"): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.addEventListener('load', () => {
            // resolve(req.responseText)
            if (req.readyState === 4) {
                if (req.status >= 200 && req.status < 300 || req.status === 304) resolve(req.responseText);
                else reject(new Error(`simple_promise_fetch: Error, status ${req.status}`));
            }
        });
        req.addEventListener('error', err => reject(err));
        req.open(method, url, true);
        req.setRequestHeader('Content-Type', content_type);
        req.send(body instanceof Object ? JSON.stringify(body) : body);
    });
}