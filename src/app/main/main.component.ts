import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BrowserService } from '../browser.service';
import { ConfigService } from '../config.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    games: string[];

    constructor(private browserService: BrowserService, private config: ConfigService, private cdr: ChangeDetectorRef) {
	this.games = [];

	config.getValue("directory").subscribe(dir => {
	    console.log("got dir", dir);
	    if (typeof dir === "string") {
		this.browserService.navigateDirectory(dir);
	    }
	});
    }

    ngOnInit(): void {
	this.browserService.file.subscribe((value) => {
	    console.log("files?", value);
	});
    }
}
