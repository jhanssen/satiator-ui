import { ConfigService } from './config.service'
import { BrowserService, Keys } from './browser.service';

export interface ScrapeRequest {
    name: string;
    id?: string;
}

export interface ScrapeImage {
    image: string;
    thumbnail?: string;
}

export interface ScrapeResponse {
    primary?: ScrapeImage;
    candidates: ScrapeImage[];
}

export abstract class ScraperService {
    constructor(protected browserService: BrowserService) { }

    abstract scrape(request: ScrapeRequest): Promise<ScrapeResponse>;
}

class ScraperGoogleService extends ScraperService {
    constructor(protected browserService: BrowserService) {
        super(browserService);
    }

    scrape(request: ScrapeRequest): Promise<ScrapeResponse> {
        return new Promise((resolve, reject) => {
            this.browserService.keys.subscribe((keys: Keys)  => {
                const query = `q=${encodeURIComponent(request.name + " saturn cover")}&searchType=image&cx=${keys.google.cx}&key=${keys.google.key}`;
                const url = `https://www.googleapis.com/customsearch/v1?${query}`;
                fetch(url).then(data => data.json()).then(data => {
                    // console.log(data);
                    const items = data.items.map((item: any) => {
                        return {
                            image: item.link,
                            thumbnail: item.image.thumbnailLink
                        };
                    });
                    resolve({ candidates: items });
                }).catch(err => {
                    reject(err);
                });
            });
        });
    }
}

export function selectScraperService(config: ConfigService, browser: BrowserService) {
    return new Promise<ScraperService>((resolve, reject) => {
        config.getOneValue("scraper").then(scraper => {
            switch (scraper) {
            default:
                resolve(new ScraperGoogleService(browser));
                break;
            }
        });
    });
}
