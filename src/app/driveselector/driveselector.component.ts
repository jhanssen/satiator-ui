import { Component, OnInit } from '@angular/core';
import { BrowserService, Drive } from '../browser.service';
import { ConfigService } from '../config.service';

@Component({
    selector: 'app-driveselector',
    templateUrl: './driveselector.component.html',
    styleUrls: ['./driveselector.component.css']
})
export class DriveSelectorComponent implements OnInit {
    drives: Drive[];
    selected: string|undefined;

    constructor(private browser: BrowserService, private config: ConfigService) {
        this.drives = [];
    }

    ngOnInit(): void {
        this.refresh();
        this.config.getOneValue("drive").then(val => {
            if (typeof val === "string")
                this.selected = val;
        });
    }

    ngOnDestroy(): void {
        this.selected = undefined;
    }

    refresh() {
        this.browser.drivelist().then(list => {
            let drives: Drive[] = [];
            for (let d of list) {
                if (d.removable && d.mountpoints instanceof Array && d.mountpoints.length > 0) {
                    drives.push(d);
                }
            }
            this.drives = drives;
        });
    }

    description(drive: Drive) {
        let descr: string|undefined;
        let mountpoint: string|undefined;
        if (drive.mountpoints) {
            // return drive.mountpoints[0].path;
            // return JSON.stringify(drive.mountpoints);
            descr = drive.mountpoints[0].label;
            mountpoint = drive.mountpoints[0].path;
        }
        if (descr === undefined)
            descr = drive.description;
        if (mountpoint)
            descr += ` (mounted at '${mountpoint}')`;
        return descr;
    }

    selectDrive(drive: string) {
        this.selected = drive;
    }

    driveClass(drive: string) {
        return drive === this.selected ? "selected" : "normal";
    }

    save() {
        this.config.setValue("drive", this.selected);
    }
}
