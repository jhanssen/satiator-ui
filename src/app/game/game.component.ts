import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ScraperService } from '../scraper.service';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
    name: string;

    constructor(private scraper: ScraperService, private route: ActivatedRoute) {
	this.name = "";
    }

    ngOnInit(): void {
	this.route.params.subscribe(params => {
	    this.name = params['name'];
	});
    }
}
