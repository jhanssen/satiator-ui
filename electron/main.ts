const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const nodefetch = require('node-fetch');
const nodecrypto = require('crypto');
const hash = require('sha1-file');

const app = electron.app;
const ipcMain = electron.ipcMain;

const args = process.argv.slice(1);
const serve = args.some(val => val === '--serve');

type BrowserWindow = typeof electron.BrowserWindow;
type ElectronEvent = typeof electron.Event;
type Dirent = typeof fs.Dirent;

let win: BrowserWindow;

function onReady () {
    let width = 1280;
    if (serve)
	width *= 1.5;
    win = new electron.BrowserWindow({
	width: width, height: 720,
	webPreferences: {
	    nodeIntegration: true,
	    contextIsolation: false,
	    allowRunningInsecureContent: serve ? true : false
	}
    });
    if (serve) {
	win.webContents.openDevTools();
	require('electron-reload')(__dirname, {
	    electron: require(path.join(__dirname, '/../../node_modules/electron'))
	});
	win.loadURL('http://localhost:4200');
    } else {
	win.loadURL(url.format({
	    pathname: path.join(
		__dirname,
		'../../dist/satiator-ui/index.html'),
	    protocol: 'file:',
	    slashes: true
	}));
    }
}

app.on('ready', onReady);

let currentDir = process.cwd();
let getDirectoryReqs: string[] = [];

function getDirectory(id: number, dir: string) {
    // console.log("getDirectory", dir);
    getDirectoryReqs.push(dir);
    const sendRequest = (reqidx: number) => {
	if (reqidx >= getDirectoryReqs.length) {
	    getDirectoryReqs = [];
	    return;
	}
	const dir = getDirectoryReqs[reqidx];
	currentDir = dir[0] === '/' ? dir : path.resolve(currentDir, dir);
	fs.readdir(currentDir, { withFileTypes: true }, (err: Error | null, entries: Dirent[]) => {
	    if (!err) {
		let files = entries
		    .filter(file => file.isFile())
		    .filter(file => { const ext = path.extname(file.name); return ext === '.iso' || ext === '.cue'; })
		    .map(file => path.resolve(currentDir, file.name));
		const directories = entries
		    .filter(file => file.isDirectory())
		    .map(file => file.name);
		let rem = directories.slice(0).map(file => path.resolve(currentDir, file));
		if (process.cwd().length > 1) {
		    directories.unshift('..');
		}
		const processDir = () => {
		    if (rem.length === 0) {
			win.webContents.send("getDirectoryResponse", { id: id, files: files, directories: directories, current: currentDir });
			process.nextTick(() => { sendRequest(reqidx + 1); });
			return;
		    }
		    const dir = rem.shift();
		    fs.readdir(dir, { withFileTypes: true }, (err: Error | null, entries: Dirent[]) => {
			if (!err) {
			    const subdirectories = entries
				.filter(file => file.isDirectory())
				.map(file => path.resolve(dir, file.name));
			    rem = rem.concat(subdirectories);

			    files = files.concat(entries
				.filter(file => file.isFile())
				.filter(file => { const ext = path.extname(file.name); return ext === '.iso' || ext === '.cue'; })
				.map(file => path.resolve(dir, file.name)));
			}
			process.nextTick(processDir);
		    });
		};
		processDir();
	    } else {
		win.webContents.send("getDirectoryResponse", { id: id, error: err });
		process.nextTick(() => { sendRequest(reqidx + 1); });
	    }
	});
    };
    if (getDirectoryReqs.length === 1)
	sendRequest(0);
}

function readFile(reqname: string, id: number, file: string, app?: boolean) {
    let rfile = file;
    if (rfile[0] !== '/' && !app)
	rfile = path.resolve(currentDir, rfile);
    fs.readFile(rfile, (err: Error | null, data: Buffer) => {
	if (!err) {
	    win.webContents.send(reqname, { id: id, file: file, data: data });
	} else {
	    win.webContents.send(reqname, { id: id, file: file, error: err });
	}
    });
}

function hashFile(id: number, file: string, app?: boolean) {
    let rfile = file;
    if (rfile[0] !== '/' && !app)
	rfile = path.resolve(currentDir, rfile);
    hash(rfile).then((sha: string) => {
	win.webContents.send("hashFileResponse", { id: id, file: file, hash: sha });
    }).catch((err: Error) => {
	win.webContents.send("hashFileResponse", { id: id, file: file, error: err });
    });
}

function readPartialFile(id: number, file: string, size?: number, offset?: number, app?: boolean) {
    let rfile = file;
    if (rfile[0] !== '/' && !app)
	rfile = path.resolve(currentDir, rfile);
    fs.open(rfile, (err: Error | null, fd: number) => {
	if (err) {
	    win.webContents.send("readPartialFileResponse", { id: id, file: file, error: err });
	    return;
	}
	const sz = typeof size === "undefined" ? 16384 : size;
	const buf = Buffer.alloc(sz);
	fs.read(fd, buf, 0, sz, offset || 0, (err: Error | null, bytesRead: number, buffer: Buffer) => {
	    try {
		if (err)
		    throw err;
		fs.closeSync(fd);
	    } catch (e) {
		win.webContents.send("readPartialFileResponse", { id: id, file: file, error: e });
		return;
	    }
	    win.webContents.send("readPartialFileResponse", { id: id, file: file, data: buffer, size: bytesRead });
	});
    });
}

function fetchFile(id: number, file: string) {
    nodefetch(file)
	.then((res: any) => res.buffer())
	.then((buffer: Buffer) => {
	    win.webContents.send("fetchResponse", { id: id, file: file, data: buffer });
	})
	.catch((err: Error) => {
	    win.webContents.send("fetchResponse", { id: id, file: file, error: err });
	});
}

function unmagic(magic: number[], shift: number) {
    let str = "";
    for (let k = 0; k < magic.length; ++k) {
	str += String.fromCharCode(magic[k] >> shift);
    }
    return str;
}

ipcMain.on("navigateDirectory", (event: ElectronEvent, id: number, path: string) => {
    getDirectory(id, path);
});

ipcMain.on("fetch", (event: ElectronEvent, id: number, path: string, app?: boolean) => {
    const protoIdx = path.indexOf("://");
    if (protoIdx == -1) {
	readFile("fetchResponse", id, path, app);
    } else {
	const proto = path.substr(0, protoIdx);
	if (proto === "file") {
	    readFile("fetchResponse", id, path.substr(protoIdx), app);
	} else {
	    fetchFile(id, path);
	}
    }
});

ipcMain.on("hashFile", (event: ElectronEvent, id: number, path: string, app?: boolean) => {
    hashFile(id, path, app);
});

ipcMain.on("readFile", (event: ElectronEvent, id: number, path: string, app?: boolean) => {
    readFile("readFileResponse", id, path, app);
});

ipcMain.on("readPartialFile", (event: ElectronEvent, id: number, path: string, size?: number, offset?: number, app?: boolean) => {
    readPartialFile(id, path, size, offset, app);
});

ipcMain.on("readRedump", (event: ElectronEvent) => {
    fs.readFile("redump/redump.json", { encoding: "utf8" }, (err: Error | null, games: string) => {
	if (err) {
	    win.webContents.send("readRedumpResponse", { error: err });
	} else {
	    fs.readFile("redump/sectors.bin", (err: Error | null, sectors: Buffer) => {
		if (err) {
		    win.webContents.send("readRedumpResponse", { error: err });
		} else {
		    win.webContents.send("readRedumpResponse", { games: JSON.parse(games), sectors: sectors });
		}
	    });
	}
    });
});

ipcMain.on("write", (event: ElectronEvent, id: number, file: string, data: Buffer, app?: boolean) => {
    let wfile = file;
    if (wfile[0] !== '/' && !app)
	wfile = path.resolve(currentDir, wfile);
    fs.writeFile(wfile, data, (err: Error | null) => {
	if (err) {
	    win.webContents.send("writeResponse", { id: id, file: file, error: err });
	} else {
	    win.webContents.send("writeResponse", { id: id, file: file });
	}
    });
});

ipcMain.on("readKeys", (event: ElectronEvent) => {
    fs.readFile("data.bin", { encoding: "utf8" }, (err: Error | null, data: string) => {
	if (err) {
	    win.webContents.send("readKeysResponse", { error: err });
	} else {
	    const iv = data.substr(0, 32);
	    const enc = data.substr(32);
	    // some good ol' security by obscurity
	    const decipher = nodecrypto.createDecipheriv('aes-256-ctr', unmagic([12800,12416,7296,12928,13440,15232,12416,13440,12544,13440,12928,6784,9728,12416,13440,6272,14336,13312,13440,12416,10752,13312,12928,14848,14208,12416,15616,14208,14208,12672,13312,14208], 7), Buffer.from(iv, 'hex'));
	    const decrypted = Buffer.concat([decipher.update(Buffer.from(enc, 'hex')), decipher.final()]);
	    win.webContents.send("readKeysResponse", { data: JSON.parse(decrypted.toString()) });
	}
    });
});

ipcMain.on("log", (event: ElectronEvent, ...data: any) => {
    console.log.call(console.log, ...data);
});
