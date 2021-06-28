const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');

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

function isRoot() {
    return path.parse(process.cwd()).root == process.cwd();
}

function getDirectory() {
    fs.readdir('.', { withFileTypes: true }, (err: Error | null, files: Dirent[]) => {
	if (!err) {
	    const directories = files
		.filter(file => file.isDirectory())
		.map(file => file.name);
	    if (!isRoot()) {
		directories.unshift('..');
	    }
	    win.webContents.send("getDirectoryResponse", directories);
	}
    });
}

ipcMain.on("navigateDirectory", (event: ElectronEvent, path: string) => {
    process.chdir(path);
    getDirectory();
});
