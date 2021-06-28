import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BrowserService } from '../browser.service';
import { ConfigService } from '../config.service';

@Component({
    selector: 'app-filebrowser',
    templateUrl: './filebrowser.component.html',
    styleUrls: ['./filebrowser.component.css']
})
export class FileBrowserComponent implements OnInit {
    current: string|undefined;
    directory: string[];

    constructor(private browserService: BrowserService, private config: ConfigService, private cdr: ChangeDetectorRef) {
	this.directory = [];
    }

    ngOnInit() {
	this.browserService.directory.subscribe((value) => {
	    this.directory = value;
	    this.cdr.detectChanges();
	});
	this.browserService.current.subscribe((value) => {
	    this.current = value;
	});
    }

    navigateDirectory(path: string) {
	this.browserService.navigateDirectory(path);
    }

    save() {
	console.log("saving directory", this.current);
	this.config.setValue("directory", this.current);
    }
}
