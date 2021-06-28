import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Event } from 'electron';
const electron = (<any>window).require('electron');

interface DirectoryResponse {
    error?: Error;
    directories?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class BrowserService {
    directory = new BehaviorSubject<string[]>([]);

    constructor() {
	electron.ipcRenderer.on('getDirectoryResponse', (event: Event, directory: DirectoryResponse) => {
	    if (directory.directories) {
		this.directory.next(directory.directories);
	    }
	});
    }

    navigateDirectory(path: string) {
	electron.ipcRenderer.send('navigateDirectory', path);
    }
}
