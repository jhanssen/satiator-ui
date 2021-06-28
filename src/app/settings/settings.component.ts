import { Component, OnInit, ViewChild } from '@angular/core';
import { FileBrowserComponent } from '../filebrowser/filebrowser.component';
import { Router } from '@angular/router';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
    @ViewChild('filebrowser') private fileBrowser!: FileBrowserComponent;

    constructor(private router: Router) { }

    ngOnInit(): void {
    }

    save() {
	this.fileBrowser.save();
	this.router.navigate(['/']);
    }

    cancel() {
	this.router.navigate(['/']);
    }
}
