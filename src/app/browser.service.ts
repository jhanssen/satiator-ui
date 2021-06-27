import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Event } from 'electron';
const electron = (<any>window).require('electron');

@Injectable({
    providedIn: 'root'
})

export class BrowserService {
    directory = new BehaviorSubject<string[]>([]);

    constructor() {
	electron.ipcRenderer.on('getDirectoryResponse', (event: Event, directory: string[]) => {
	    this.directory.next(directory);
	});
    }

    navigateDirectory(path: string) {
	electron.ipcRenderer.send('navigateDirectory', path);
    }
}
