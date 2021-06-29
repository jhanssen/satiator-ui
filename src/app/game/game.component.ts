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
    }

    select(name: string) {
        this.selected = name;
    }

    className(name: string) {
        return name === this.selected ? "selected" : "normal";
    }

    save() {
    }

    cancel() {
        this.router.navigate(['/']);
    }

    private scrape() {
        if (!this.scraper)
            throw new Error("can't happen");
        this.scraper.scrape({ name: this.name }).then(data => {
            // console.log("hoo", data);
            this.images = data;
        }).catch(e => {});
    }
}
