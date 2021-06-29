import { ConfigService } from './config.service'
import { BrowserService, Keys } from './browser.service';
import { first } from 'rxjs/operators'

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
            this.browserService.keys.pipe(first()).subscribe((keys: Keys)  => {
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

class ScraperTheGamesDbService extends ScraperService {
    constructor(protected browserService: BrowserService) {
        super(browserService);
    }

    scrape(request: ScrapeRequest): Promise<ScrapeResponse> {
        return new Promise((resolve, reject) => {
            this.browserService.keys.pipe(first()).subscribe((keys: Keys)  => {
                const url = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${keys.thegamesdb.key}&name=${encodeURIComponent(request.name)}`;
                this.browserService.fetch(url).then(data => {
                    const json = JSON.parse((new TextDecoder()).decode(data.data));
                    let gameids: string[] = [];
                    if (typeof json.data === "object" && json.data.games instanceof Array && json.data.games.length > 0) {
                        for (let i = 0; i < json.data.games.length; ++i) {
                            gameids.push(json.data.games[i].id);
                        }
                    }
                    if (gameids.length === 0) {
                        resolve({
                            candidates: []
                        });
                        return;
                    }
                    const imgurl = `https://api.thegamesdb.net/v1/Games/Images?apikey=${keys.thegamesdb.key}&games_id=${gameids.join(',')}`;
                    return this.browserService.fetch(imgurl);
                }).then(data => {
                    if (data === undefined)
                        return;
                    const json = JSON.parse((new TextDecoder()).decode(data.data));
                    const candidates: ScrapeImage[] = [];
                    if (typeof json.data === "object" && typeof json.data.images === "object") {
                        for (const gameid of Object.keys(json.data.images)) {
                            const game = json.data.images[gameid];
                            if (game instanceof Array) {
                                for (let i = 0; i < game.length; ++i) {
                                    const img = game[i];
                                    switch (img.type) {
                                    case "boxart":
                                        candidates.push({
                                            image: `https://cdn.thegamesdb.net/images/original/${img.filename}`
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    resolve({
                        candidates: candidates
                    });
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
            case "thegamesdb":
                resolve(new ScraperTheGamesDbService(browser));
                return;
            case "google":
                // fall through
            default:
                resolve(new ScraperGoogleService(browser));
                break;
            }
        });
    });
}
