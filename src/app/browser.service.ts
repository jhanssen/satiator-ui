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

@Injectable({
    providedIn: 'root'
})
export class BrowserService {
    current = new ReplaySubject<string>();
    file = new ReplaySubject<string[]>();
    directory = new ReplaySubject<string[]>();

    constructor() {
	electron.ipcRenderer.on('getDirectoryResponse', (event: Event, directory: DirectoryResponse) => {
	    if (directory.directories) {
		this.directory.next(directory.directories);
	    }
	    if (directory.files) {
		this.file.next(directory.files);
	    }
	    this.current.next(directory.current);
	});
    }

    navigateDirectory(path: string) {
	electron.ipcRenderer.send('navigateDirectory', 0, path);
    }
}
