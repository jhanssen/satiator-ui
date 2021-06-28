import { Injectable } from '@angular/core';
const electron = (<any>window).require('electron');

@Injectable({
  providedIn: 'root'
})
export class LogService {
    constructor() { }

    log(...data: any) {
	electron.ipcRenderer.send("log", ...data);
    }
}
