const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const nodefetch = require('node-fetch');

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
	    contextIsolation: false
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

function getDirectory(dir: string) {
    currentDir = path.resolve(currentDir, dir);
    fs.readdir(currentDir, { withFileTypes: true }, (err: Error | null, files: Dirent[]) => {
	if (!err) {
	    const directories = files
		.filter(file => file.isDirectory())
		.map(file => file.name);
	    if (process.cwd().length > 1) {
		directories.unshift('..');
	    }
	    win.webContents.send("getDirectoryResponse", { directories: directories });
	} else {
	    win.webContents.send("getDirectoryResponse", { error: err });
	}
    });
}

function readFile(file: string) {
    let rfile = file;
    if (rfile[0] !== '/')
	rfile = path.resolve(currentDir, rfile);
    fs.readFile(rfile, (err: Error | null, data: Buffer) => {
	if (!err) {
	    win.webContents.send("fetchResponse", { file: file, data: data });
	} else {
	    win.webContents.send("fetchResponse", { file: file, error: err });
	}
    });
}

function fetchFile(file: string) {
    nodefetch(file)
	.then((res: any) => res.buffer())
	.then((buffer: Buffer) => {
	    win.webContents.send("fetchResponse", { file: file, data: buffer });
	})
	.catch((err: Error) => {
	    win.webContents.send("fetchResponse", { file: file, error: err });
	});
}

ipcMain.on("navigateDirectory", (event: ElectronEvent, path: string) => {
    getDirectory(path);
});

ipcMain.on("fetch", (event: ElectronEvent, path: string) => {
    const protoIdx = path.indexOf("://");
    if (protoIdx == -1)
	readFile(path);
    const proto = path.substr(0, protoIdx);
    if (proto === "file") {
	readFile(path.substr(protoIdx));
    } else {
	fetchFile(path);
    }
});

ipcMain.on("write", (event: ElectronEvent, file: string, data: Buffer) => {
    let wfile = file;
    if (wfile[0] !== '/')
	wfile = path.resolve(currentDir, wfile);
    fs.writeFile(wfile, data, (err: Error | null) => {
	if (err) {
	    win.webContents.send("writeResponse", { file: file, error: err });
	} else {
	    win.webContents.send("writeResponse", { file: file });
	}
    });
});
