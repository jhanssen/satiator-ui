import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { BrowserService, Drive } from '../browser.service';
import { ConfigService } from '../config.service';
import { UsbMonitorService } from '../usb-monitor.service';

@Component({
    selector: 'app-driveselector',
    templateUrl: './driveselector.component.html',
    styleUrls: ['./driveselector.component.css']
})
export class DriveSelectorComponent implements OnInit, OnDestroy {
    drives: Drive[];
    selected: string|undefined;
    private subs: any[];

    constructor(private browser: BrowserService, private config: ConfigService,
                private usb: UsbMonitorService, private cdr: ChangeDetectorRef) {
        this.drives = [];
        this.subs = [];
    }

    ngOnInit(): void {
        this.refresh();
        this.config.getOneValue("drive").then(val => {
            if (typeof val === "string")
                this.selected = val;
        });
        let sub = this.usb.change.subscribe(() => {
            this.refresh(5);
        });
        this.subs.push(sub);
    }

    ngOnDestroy(): void {
        for (let d of this.subs) {
            d.unsubscribe();
        }
        this.subs = [];
        this.selected = undefined;
    }

    refresh(retries?: number, timeout?: number) {
        let rem = retries || 0;
        const attempt = () => {
            this.browser.drivelist().then(list => {
                let drives: Drive[] = [];
                for (let d of list) {
                    if (d.removable && d.mountpoints instanceof Array && d.mountpoints.length > 0) {
                        drives.push(d);
                    }
                }
                this.drives = drives;
                this.cdr.detectChanges();

                if (drives.length === 0 && rem > 0) {
                    --rem;
                    setTimeout(attempt, timeout || 1500);
                }
            });
        };
        attempt();
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
