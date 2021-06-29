import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
const electron = (<any>window).require('electron');

interface FetchResponse {
    id: number;
    file: string;
    error?: Error;
    data?: Buffer;
}

export type ConfigValue = string | number | boolean | undefined;

interface ConfigRequest {
    name: string;
    value?: ConfigValue;
}

interface OnceRequest {
    id: number;
    resolved: boolean;
    sub?: any;
}

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private data: { [key: string]: ConfigValue } | undefined;
    private subjects: { [key: string]: ReplaySubject<ConfigValue> | undefined };
    private requests: ConfigRequest[];
    private onces: OnceRequest[];
    private onceId: number;

    constructor() {
        this.requests = [];
        this.onces = [];
        this.onceId = 0;
        this.subjects = {};

        electron.ipcRenderer.on("fetchResponse", (event: Event, data: FetchResponse) => {
            if (data.file !== "config.json")
                return;

            if (data.data) {
                this.data = JSON.parse(new TextDecoder().decode(data.data));
            } else {
                this.data = {};
            }
            this.processRequests();

            if (this.data === undefined)
                throw new Error("can't happen");

            // fire any subjects
            for (const name of Object.keys(this.subjects)) {
                if (name in this.data) {
                    const s = this.subjects[name];
                    if (s) {
                        s.next(this.data[name]);
                    }
                }
            }
        });
        electron.ipcRenderer.send("fetch", 0, "config.json", true);
    }

    getValue(name: string): ReplaySubject<ConfigValue> {
        let s = this.subjects[name];
        if (s === undefined) {
            s = new ReplaySubject<ConfigValue>();
            this.subjects[name] = s;
            process.nextTick(() => {
                if (s && this.data) {
                    s.next(this.data[name]);
                }
            });
        }
        return s;
    }

    getOneValue(name: string): Promise<ConfigValue> {
        const id = this.onceId++;
        this.onces.push({ id: id, resolved: false });
        return new Promise((resolve, reject) => {
            let resolved = false;
            const sub = this.getValue(name).subscribe(val => {
                if (resolved)
                    return;
                resolve(val);
                this.resolveOnce(id);
                this.cleanup();
            });
            this.addOnceSubscription(id, sub);
        });
    }

    setValue(name: string, value: ConfigValue) {
        if (this.data) {
            this.data[name] = value;
            electron.ipcRenderer.send("write", 0, "config.json", Buffer.from(JSON.stringify(this.data) + "\n", "utf8"), true);

            const s = this.subjects[name];
            if (s) {
                s.next(value);
            }
        } else {
            this.requests.push({
                name: name,
                value: value
            });
        }
    }

    private addOnceSubscription(id: number, sub: any) {
        for (const k of this.onces) {
            if (k.id === id) {
                k.sub = sub;
                return;
            }
        }
    }

    private resolveOnce(id: number) {
        for (const k of this.onces) {
            if (k.id === id) {
                k.resolved = true;
                return;
            }
        }
    }

    private cleanup() {
        setTimeout(() => {
            let retry = false;
            for (let i = 0; i < this.onces.length; ++i) {
                if (this.onces[i].resolved) {
                    if (this.onces[i].sub !== undefined) {
                        this.onces[i].sub.unsubscribe();
                        this.onces.splice(i, 1);
                    } else {
                        retry = true;
                    }
                }
            }
            if (retry)
                this.cleanup();
        }, 100);
    }

    private processRequests() {
        if (!this.data) {
            throw new Error("can't happen");
        }

        let written = false;
        for (const req of this.requests) {
            // write request
            this.data[req.name] = req.value;
            written = true;
        }
        this.requests = [];

        if (written)
            electron.ipcRenderer.send("write", 0, "config.json", Buffer.from(JSON.stringify(this.data) + "\n", "utf8"));
    }
}
