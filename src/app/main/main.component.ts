import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BrowserService } from '../browser.service';
import { ConfigService } from '../config.service';

interface Game {
    id: string;
    version?: string;
    file: string;
    dir?: string;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
    games: Game[];
    redump: { [key: string]: { file: string, name: string } } | undefined;

    constructor(private browserService: BrowserService, private config: ConfigService, private cdr: ChangeDetectorRef) {
	this.games = [];

	config.getValue("directory").subscribe(dir => {
	    console.log("got dir", dir);
	    if (typeof dir === "string") {
		this.browserService.navigateDirectory(dir);
	    }
	});
	this.browserService.redump.subscribe((data) => {
	    // convert this to something useful
	    this.redump = {};
	    for (const game of data.game) {
		const name = game.attr["@_name"];
		for (const rom of game.rom) {
		    const sha1 = rom.attr["@_sha1"];
		    const file = rom.attr["@_name"];

		    this.redump[sha1] = {
			file, name
		    };
		}
	    }
	});
    }

    ngOnInit(): void {
	this.browserService.file.subscribe((value) => {
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
		    this.browserService.hashFile(file).then(sha1 => {
			if (this.redump)
			    console.log("got sha", sha1, this.redump[sha1]);
			this.browserService.readPartialFile(file, 2048).then(data => {
			    if (ext === ".iso") {
				this.addGame(i, this.parseSega(file, data.data, 0));
			    } else if (ext === ".bin") {
				this.addGame(i, this.parseSega(file, data.data, 16));
			    }
			    this.cdr.detectChanges();
			});
		    });
		}
	    });
	});
    }

    private addGame(idx: number, game: Game | undefined) {
	if (game === undefined)
	    return;
	// don't add if we already have this game
	for (let g of this.games) {
	    if (g.id === game.id)
		return;
	}
	this.games.push(game);
    }

    private parseSega(file: string, data: Uint8Array, offset: number) {
	const parseGame = (game: string) => {
	    const space = game.indexOf(' ');
	    if (space === -1)
		return { id: game };
	    return {
		id: game.substr(0, space).trim(),
		version: game.substr(space).trim()
	    };
	};
	const extractName = () => {
	    const slash = file.lastIndexOf('/');
	    if (slash === -1)
		return { file: file, dir: undefined };
	    return {
		file: file,
		dir: file.substr(0, slash)
	    };
	};

	// check that the data is what we expect
	const decoder = new TextDecoder();
	const sega = decoder.decode(new Uint8Array(data.buffer, offset, 16));
	if (sega.indexOf("SEGA") === 0 && sega.indexOf("SATURN") !== -1) {
	    // we good
	    const game = decoder.decode(new Uint8Array(data.buffer, offset + 32, 16));
	    const { id, version } = parseGame(game);
	    const { file, dir } = extractName();
	    // console.log("got game", id, version, extractName());

	    return {
		id,
		version,
		file,
		dir
	    };
	}
	return undefined;
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
