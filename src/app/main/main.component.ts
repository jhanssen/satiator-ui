import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BrowserService, Redump } from '../browser.service';
import { ConfigService } from '../config.service';
import { Game } from '../game.interface';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {
    games: Game[];
    redump: { [key: string]: Redump } | undefined;
    private subs: any[];

    constructor(private browserService: BrowserService, private config: ConfigService,
                private cdr: ChangeDetectorRef, private router: Router, private ngZone: NgZone) {
        this.games = [];
        this.subs = [];
    }

    ngOnInit(): void {
        let sub = this.config.getValue("directory").subscribe(dir => {
            console.log("got dir", dir);
            if (typeof dir === "string") {
                this.browserService.navigateDirectory(dir);
            }
        });
        this.subs.push(sub);
        sub = this.browserService.redump.subscribe((data) => {
            // convert this to something useful
            this.redump = {};
            for (const game of data.games) {
                const offset = game.offset;
                if (offset !== undefined) {
                    const sega = this.parseSega(data.sectors, offset);
                    if (sega === undefined) {
                        this.redump[game.serial] = game;
                    } else {
                        this.redump[sega.id] = game;
                    }
                } else {
                    this.redump[game.serial] = game;
                }
            }
            this.cdr.detectChanges();
        });
        this.subs.push(sub);
        sub = this.browserService.file.subscribe((value) => {
            //console.log("files?", value);
            this.uniqify(value).then(unique => {
                const num = unique.length;
                this.games = [];
                for (let i = 0; i < num; ++i) {
                    const file = unique[i];
                    const dot = file.lastIndexOf('.');
                    if (dot === -1)
                        continue;
                    const ext = file.substr(dot).toLowerCase();
                    this.browserService.readPartialFile(file, 2048).then(data => {
                        if (ext === ".iso") {
                            this.addGame(this.parseSegaFile(file, data.data, 0));
                        } else if (ext === ".bin") {
                            this.addGame(this.parseSegaFile(file, data.data, 16));
                        }
                        this.cdr.detectChanges();
                    });
                }
            });
        });
        this.subs.push(sub);
    }

    ngOnDestroy(): void {
        for (let d of this.subs) {
            d.unsubscribe();
        }
        this.subs = [];
        this.games = [];
    }

    gameName(id: string) {
        if (!this.redump)
            return id;
        if (!(id in this.redump))
            return id;
        const redump = this.redump[id];
        let name = redump.name;
        const disc = name.indexOf("(Disc");
        if (disc !== -1)
            name = name.substr(0, disc - 1);
        if (redump.subname)
            name = name + ` (${redump.subname})`;
        return name;
    }

    navigate(id: string) {
        this.ngZone.run(() => { this.router.navigate(['/game', this.gameName(id)]) });;
    }

    private addGame(game: Game | undefined) {
        if (game === undefined)
            return;
        // don't add if we already have this game
        for (let g of this.games) {
            if (g.id === game.id)
                return;
        }
        this.games.push(game);
    }

    private parseSega(data: Uint8Array, offset: number) {
        const parseGame = (game: string) => {
            const space = game.indexOf(' ');
            if (space === -1) {
                const vv = game.lastIndexOf('V');
                if (vv === -1)
                    return { id: game };
                return {
                    id: game.substr(0, vv).trim(),
                    version: game.substr(vv).trim()
                };
            }
            return {
                id: game.substr(0, space).trim(),
                version: game.substr(space).trim()
            };
        };

        const decoder = new TextDecoder();
        const sega = decoder.decode(new Uint8Array(data.buffer, offset, 16));
        if (sega.indexOf("SEGA") === 0 && sega.indexOf("SATURN") !== -1) {
            // we good
            const game = decoder.decode(new Uint8Array(data.buffer, offset + 32, 16));
            const { id, version } = parseGame(game);
            // console.log("got game", id, version, extractName());

            return {
                id,
                version
            };
        }
        return undefined;
    }

    private parseSegaFile(file: string, data: Uint8Array, offset: number) {
        const extractName = () => {
            const slash = file.lastIndexOf('/');
            if (slash === -1)
                return { file: file, dir: undefined };
            return {
                file: file,
                dir: file.substr(0, slash)
            };
        };

        const sega = this.parseSega(data, offset);
        if (sega === undefined)
            return undefined;
        const { file: nfile, dir: ndir } = extractName();
        return {
            id: sega.id,
            version: sega.version,
            file: nfile,
            dir: ndir
        };
    }

    private uniqify(files: string[]) {
        return new Promise<string[]>((resolve, reject) => {
            const promises = [];
            const len = files.length;
            const newFiles: string[] = new Array(len);
            for (let i = 0; i < len; ++i) {
                const file = files[i];
                const dot = file.lastIndexOf('.');
                if (dot === -1) {
                    newFiles[i] = file;
                    continue;
                }
                const ext = file.substr(dot).toLowerCase();
                if (ext !== ".cue") {
                    newFiles[i] = file;
                    continue;
                }
                promises.push(new Promise<void>((resolve, reject) => {
                    this.browserService.readFile(file).then(data => {
                        const fn = this.parseCueFile(data.data);
                        // console.log("got fn", fn, "for", file);
                        const slash = file.lastIndexOf('/');
                        const newFile = fn[0] === '/' ? fn : file.substr(0, slash + 1) + fn;
                        // if we already have this file, drop it
                        if (files.indexOf(newFile) === -1)
                            newFiles[i] = newFile;
                        resolve();
                    }).catch(e => {
                        reject(e);
                    });
                }));
            }
            Promise.all(promises).then(() => {
                resolve(newFiles.filter(file => file !== undefined));
            }).catch(e => {
                reject(e);
            });
        });
    }

    private parseCueFile(data: Uint8Array) {
        const str = (new TextDecoder()).decode(data);
        // assume that track 01 is first?
        const rx = /FILE\s+\"([^\"]+)\"\s+BINARY/;
        const match = rx.exec(str);
        if (match) {
            return match[1];
        }
        throw new Error("Unable to match");
    }
}
