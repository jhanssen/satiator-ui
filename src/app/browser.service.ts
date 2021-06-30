import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { Event } from 'electron';
const electron = (<any>window).require('electron');

interface DirectoryResponse {
    id: number;
    current?: string;
    error?: Error;
    files?: string[];
    directories?: string[];
}

interface ReadPartialFileResponse {
    id: number;
    file: string;
    data?: Uint8Array;
    size?: number;
    error?: Error;
}

interface ReadFileResponse {
    id: number;
    file: string;
    data?: Uint8Array;
    error?: Error;
}

interface HashFileResponse {
    id: number;
    file: string;
    hash?: string;
    error?: Error;
}

interface ReadRequest {
    id: number;
    resolve: (value: { data: Uint8Array, size: number } | PromiseLike<{ data: Uint8Array, size: number }>) => void;
    reject: (error: any) => void;
}

interface HashRequest {
    id: number;
    resolve: (value: string | PromiseLike<string>) => void;
    reject: (error: any) => void;
}

interface DriveRequest {
    id: number;
    resolve: (value: Drive[] | PromiseLike<Drive[]>) => void;
    reject: (error: any) => void;
}

interface DriveResponse {
    id: number;
    data?: Drive[];
    error?: Error;
}

export interface Redump {
    name: string;
    subname?: string;
    serial: string;
    offset?: number;
    disc: number;
}

export interface Keys {
    google: {
        cx: string;
        key: string;
    },
    thegamesdb: {
        key: string;
    }
}

export interface Drive {
    device: string;
    description: string;
    system: boolean;
    removable: boolean;
    mountpoints?: { path: string, label?: string }[];
}

@Injectable({
    providedIn: 'root'
})
export class BrowserService {
    current = new ReplaySubject<string>(1);
    file = new ReplaySubject<string[]>(1);
    directory = new ReplaySubject<string[]>(1);
    redump = new ReplaySubject<{ games: Redump[], sectors: Uint8Array }>(1);
    keys = new ReplaySubject<Keys>(1);
    private reads: ReadRequest[];
    private hashes: HashRequest[];
    private drives: DriveRequest[];
    private eid: number;

    constructor() {
        this.reads = [];
        this.hashes = [];
        this.drives = [];
        this.eid = 0;

        electron.ipcRenderer.on('getDirectoryResponse', (event: Event, directory: DirectoryResponse) => {
            if (directory.directories) {
                this.directory.next(directory.directories);
            }
            if (directory.files) {
                this.file.next(directory.files);
            }
            this.current.next(directory.current);
        });
        electron.ipcRenderer.on('readPartialFileResponse', (event: Event, read: ReadPartialFileResponse) => {
            const num = this.reads.length;
            for (let i = 0; i < num; ++i) {
                if (this.reads[i].id === read.id) {
                    if (read.error) {
                        this.reads[i].reject(read.error);
                    } else {
                        if (read.data === undefined || read.size === undefined) {
                            throw new Error("can't happen");
                        }
                        this.reads[i].resolve({ data: read.data, size: read.size });
                    }
                    this.reads.splice(i, 1);
                    return;
                }
            }
        });
        electron.ipcRenderer.on('readFileResponse', (event: Event, read: ReadFileResponse) => {
            const num = this.reads.length;
            for (let i = 0; i < num; ++i) {
                if (this.reads[i].id === read.id) {
                    if (read.error) {
                        this.reads[i].reject(read.error);
                    } else {
                        if (read.data === undefined) {
                            throw new Error("can't happen");
                        }
                        this.reads[i].resolve({ data: read.data, size: read.data.byteLength });
                    }
                    this.reads.splice(i, 1);
                    return;
                }
            }
        });
        electron.ipcRenderer.on('fetchResponse', (event: Event, read: ReadFileResponse) => {
            const num = this.reads.length;
            for (let i = 0; i < num; ++i) {
                if (this.reads[i].id === read.id) {
                    if (read.error) {
                        this.reads[i].reject(read.error);
                    } else {
                        if (read.data === undefined) {
                            throw new Error("can't happen");
                        }
                        this.reads[i].resolve({ data: read.data, size: read.data.byteLength });
                    }
                    this.reads.splice(i, 1);
                    return;
                }
            }
        });
        electron.ipcRenderer.on('hashFileResponse', (event: Event, read: HashFileResponse) => {
            const num = this.hashes.length;
            for (let i = 0; i < num; ++i) {
                if (this.hashes[i].id === read.id) {
                    if (read.error) {
                        this.hashes[i].reject(read.error);
                    } else {
                        if (read.hash === undefined) {
                            throw new Error("can't happen");
                        }
                        this.hashes[i].resolve(read.hash);
                    }
                    this.hashes.splice(i, 1);
                    return;
                }
            }
        });
        electron.ipcRenderer.on('drivelistResponse', (event: Event, drive: DriveResponse) => {
            const num = this.drives.length;
            for (let i = 0; i < num; ++i) {
                if (this.drives[i].id === drive.id) {
                    if (drive.error) {
                        this.drives[i].reject(drive.error);
                    } else {
                        if (drive.data === undefined) {
                            throw new Error("can't happen");
                        }
                        this.drives[i].resolve(drive.data);
                    }
                    this.drives.splice(i, 1);
                    return;
                }
            }
        });
        electron.ipcRenderer.on('readRedumpResponse', (event: Event, data: { error?: Error, games: Redump[], sectors: Uint8Array }) => {
            if (!data.error) {
                this.redump.next(data);
            }
        });
        electron.ipcRenderer.on('readKeysResponse', (event: Event, data: { error?: Error, data: Keys }) => {
            if (!data.error)  {
                this.keys.next(data.data);
            }
        });
        electron.ipcRenderer.send('readRedump');
        electron.ipcRenderer.send('readKeys');
    }

    navigateDirectory(path: string) {
        electron.ipcRenderer.send('navigateDirectory', 0, path);
    }

    readPartialFile(path: string, size?: number, offset?: number): Promise<{ data: Uint8Array, size: number }> {
        const id = this.eid++;
        return new Promise((resolve, reject) => {
            this.reads.push({ id: id, resolve: resolve, reject: reject });
            electron.ipcRenderer.send('readPartialFile', id, path, size, offset);
        });
    }

    readFile(path: string): Promise<{ data: Uint8Array, size: number }> {
        const id = this.eid++;
        return new Promise((resolve, reject) => {
            this.reads.push({ id: id, resolve: resolve, reject: reject });
            electron.ipcRenderer.send('readFile', id, path);
        });
    }

    fetch(path: string): Promise<{ data: Uint8Array, size: number }> {
        const id = this.eid++;
        return new Promise((resolve, reject) => {
            this.reads.push({ id: id, resolve: resolve, reject: reject });
            electron.ipcRenderer.send('fetch', id, path);
        });
    }

    hashFile(path: string): Promise<string> {
        const id = this.eid++;
        return new Promise((resolve, reject) => {
            this.hashes.push({ id: id, resolve: resolve, reject: reject });
            electron.ipcRenderer.send('hashFile', id, path);
        });
    }

    drivelist(): Promise<Drive[]> {
        const id = this.eid++;
        return new Promise((resolve, reject) => {
            this.drives.push({ id: id, resolve: resolve, reject: reject });
            electron.ipcRenderer.send('drivelist', id);
        });
    }
}
