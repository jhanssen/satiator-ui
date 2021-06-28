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

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private data: { [key: string]: ConfigValue } | undefined;
    private subjects: { [key: string]: ReplaySubject<ConfigValue> | undefined };
    private requests: ConfigRequest[];

    constructor() {
	this.requests = [];
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
	}
	return s;
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
