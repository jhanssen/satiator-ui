import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ScraperService, ScrapeResponse, selectScraperService } from '../scraper.service';
import { ConfigService } from '../config.service';
import { BrowserService } from '../browser.service';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit, OnDestroy {
    name: string;
    directory: string|undefined;
    images: ScrapeResponse;
    selected: string;
    private scraper: ScraperService | undefined;
    private subs: any[];

    constructor(private config: ConfigService, private browser: BrowserService,
                private route: ActivatedRoute, private router: Router) {
        this.name = "";
        this.selected = "";
        this.images = {
            candidates: []
        };
        this.subs = [];
    }

    ngOnInit(): void {
        selectScraperService(this.config, this.browser).then(scraper => {
            this.scraper = scraper;
            this.scrape();
        });
        let sub = this.route.params.subscribe(params => {
            this.name = params['name'];
            this.directory = params['dir'];
            if (this.scraper)
                this.scrape();
        });
        this.subs.push(sub);
    }

    ngOnDestroy(): void {
        for (let d of this.subs) {
            d.unsubscribe();
        }
        this.subs = [];
        this.scraper = undefined;
        this.images = {
            candidates: []
        };
        this.name = "";
        this.selected = "";
    }

    select(name: string) {
        this.selected = name;
    }

    hasImages() {
        return this.images.primary !== undefined || this.images.candidates.length > 0;
    }

    className(name: string) {
        return name === this.selected ? "selected" : "normal";
    }

    scraperName() {
        if (!this.scraper)
            return undefined;
        return this.scraper.name();
    }

    save() {
        if (this.directory && this.selected.length > 0) {
            console.log("writing tga", this.selected, this.directory);
            this.browser.writeTga(this.selected, this.directory + "/BOX.TGA").then(() => {
            }).catch(err => {});
        }
        this.router.navigate(['/']);
    }

    cancel() {
        this.router.navigate(['/']);
    }

    private scrape() {
        if (!this.scraper)
            throw new Error("can't happen");
        let name = this.name;
        const disc = name.indexOf("(Disc");
        if (disc !== -1)
            name = name.substr(0, disc - 1);
        this.scraper.scrape({ name: name }).then(data => {
            // console.log("hoo", data);
            this.images = data;
        }).catch(e => {});
    }
}
