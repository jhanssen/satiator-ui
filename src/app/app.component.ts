import { Component, OnInit } from '@angular/core';
import { BrowserService } from './browser.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
    title = 'SatiatorUI';

    constructor(private browserService: BrowserService) {}

    ngOnInit(): void {
        this.browserService.navigateDirectory('.');
    }
}
