import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { DriveSelectorComponent } from '../driveselector/driveselector.component';
import { BrowserService } from '../browser.service';
import { ConfigService } from '../config.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
    @ViewChild('driveselector') driveselector!: DriveSelectorComponent;
    current: string|undefined;
    scraper: string;
    scrapers: string[] = ["google", "thegamesdb"];
    private subs: any[];

    constructor(private browser: BrowserService, private config: ConfigService,
                private cdr: ChangeDetectorRef, private router: Router) {
        this.subs = [];
        this.scraper = "google";
    }

    ngOnInit(): void {
        let sub = this.browser.current.subscribe((value) => {
            this.current = value;
            this.cdr.detectChanges();
        });
        this.subs.push(sub);
        sub = this.config.getValue("scraper").subscribe(value => {
            if (typeof value === "string") {
                this.scraper = value;
                this.cdr.detectChanges();
            } else {
                this.scraper = "google";
                this.cdr.detectChanges();
            }
        });
        this.subs.push(sub);
    }

    ngOnDestroy(): void {
        for (let d of this.subs) {
            d.unsubscribe();
        }
        this.subs = [];
    }

    save() {
        this.driveselector.save();
        this.router.navigate(['/']);
        this.config.setValue("scraper", this.scraper);
    }

    cancel() {
        this.router.navigate(['/']);
    }
}
