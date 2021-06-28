import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FileBrowserComponent } from '../filebrowser/filebrowser.component';
import { BrowserService } from '../browser.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
    @ViewChild('filebrowser') filebrowser!: FileBrowserComponent;
    current: string|undefined;

    constructor(private browserService: BrowserService, private cdr: ChangeDetectorRef, private router: Router) {
	this.browserService.current.subscribe((value) => {
	    this.current = value;
	    this.cdr.detectChanges();
	});
    }

    ngOnInit(): void {
    }

    save() {
	this.filebrowser.save();
	this.router.navigate(['/']);
    }

    cancel() {
	this.router.navigate(['/']);
    }
}
