import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BrowserService, Redump } from '../browser.service';
import { ConfigService } from '../config.service';
import { UsbMonitorService } from '../usb-monitor.service';
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
    private device: string|undefined;

    constructor(private browser: BrowserService, private config: ConfigService,
                private usb: UsbMonitorService, private cdr: ChangeDetectorRef,
                private router: Router, private ngZone: NgZone) {
        this.games = [];
        this.subs = [];
    }

    ngOnInit(): void {
        let sub = this.config.getValue("drive").subscribe(device => {
            if (typeof device === "string" || device === undefined) {
                this.device = device;
                this.refresh();
            }
        });
        this.subs.push(sub);
        sub = this.usb.change.subscribe(() => {
            this.refresh(5);
        });
        this.subs.push(sub);
        sub = this.browser.redump.subscribe((data) => {
            // convert this to something useful
            this.redump = {};
            for (const game of data.games) {
                const offset = game.offset;
                if (offset !== undefined) {
                    const id = this.parseSega(data.sectors, offset);
                    if (id === undefined) {
                        this.redump[game.serial] = game;
                    } else {
                        this.redump[id] = game;
                    }
                } else {
                    this.redump[game.serial] = game;
                }
            }
            this.cdr.detectChanges();
        });
        this.subs.push(sub);
        sub = this.browser.file.subscribe((value) => {
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
                    this.browser.readPartialFile(file, 2048).then(data => {
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
        sub = this.browser.tga.subscribe(() => {
            for (const g of this.games) {
                this.readTga(g);
            }
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
        if (redump.subname)
            name = name + ` (${redump.subname})`;
        return name;
    }

    gameDir(id: string): string|undefined {
        for (const g of this.games) {
            if (g.id === id) {
                return g.dir;
            }
        }
        return undefined;
    }

    navigate(id: string) {
        this.ngZone.run(() => { this.router.navigate(['/game', this.gameName(id), this.gameDir(id)]) });
    }

    settings() {
        this.router.navigate(['/settings']);
    }

    refresh(retries?: number, timeout?: number) {
        // find where this drive is mounted
        let rem = retries || 0;
        const attempt = () => {
            this.browser.drivelist().then(drives => {
                // find the drive device
                let dir: string|undefined;
                for (const drive of drives) {
                    if (drive.device === this.device) {
                        // got it
                        if (drive.mountpoints instanceof Array && drive.mountpoints.length > 0) {
                            const mp = drive.mountpoints[0];
                            if (typeof mp === "object" && typeof mp.path === "string")
                                dir = mp.path;
                        }
                        break;
                    }
                }
                if (dir !== undefined) {
                    this.browser.navigateDirectory(dir);
                } else {
                    this.clear();
                    this.cdr.detectChanges();

                    if (rem > 0) {
                        --rem;
                        setTimeout(attempt, timeout || 1500);
                    }
                }
            });
        };
        attempt();
    }

    private clear() {
        this.games = [];
    }

    private addGame(game: Game | undefined) {
        if (game === undefined)
            return;
        // don't add if we already have this game
        for (let g of this.games) {
            if (g.file === game.file)
                return;
        }
        this.games.push(game);
        // sort the list
        this.games.sort((a, b) => {
            return a.id.localeCompare(b.id);
        });

        // attempt to fetch TGA
        // console.log("want to fetch tga", game.file, game.dir);
        this.readTga(game);
    }

    private readTga(game: Game) {
        if (game.dir) {
            const tga = game.dir + "/BOX.TGA";
            this.browser.readTga(tga).then(png => {
                game.tga = png;
                this.cdr.detectChanges();
            }).catch(err => {});
        }
    }

    private parseSega(data: Uint8Array, offset: number) {
        const decoder = new TextDecoder();
        const sega = decoder.decode(new Uint8Array(data.buffer, offset, 16));
        if (sega.indexOf("SEGA") === 0 && sega.indexOf("SATURN") !== -1) {
            // we good
            const id = decoder.decode(new Uint8Array(data.buffer, offset + 32, 32));
            // strip out the date?
            const cdidx = id.lastIndexOf("CD-");
            if (cdidx >= 16) {
                return id.substr(0, 16) + id.substr(cdidx);
            }
            return id;
        }
        return undefined;
    }

    private parseSegaFile(file: string, data: Uint8Array, offset: number) {
        // ignore autoboot
        if (file.toLowerCase().endsWith("autoboot.iso"))
            return undefined;

        const extractName = () => {
            const slash = file.lastIndexOf('/');
            if (slash === -1)
                return { file: file, dir: undefined };
            return {
                file: file,
                dir: file.substr(0, slash)
            };
        };

        const id = this.parseSega(data, offset);
        if (id === undefined)
            return undefined;
        const { file: nfile, dir: ndir } = extractName();
        return {
            id: id,
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
                    this.browser.readFile(file).then(data => {
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
