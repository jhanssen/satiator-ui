import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BrowserService } from '../browser.service';

@Component({
    selector: 'app-browser',
    templateUrl: './browser.component.html',
    styleUrls: ['./browser.component.css']
})
export class BrowserComponent implements OnInit {
    directory: string[];

    constructor(private browserService: BrowserService, private cdr: ChangeDetectorRef) {
	this.directory = [];
    }

    ngOnInit() {
	this.browserService.directory.subscribe((value) => {
	    this.directory = value;
	    this.cdr.detectChanges();
	});
    }

    navigateDirectory(path: string) {
	this.browserService.navigateDirectory(path);
    }
}
