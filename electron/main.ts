const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');

const app = electron.app;
const ipcMain = electron.ipcMain;

type BrowserWindow = typeof electron.BrowserWindow;
type ElectronEvent = typeof electron.Event;
type Dirent = typeof fs.Dirent;

let win: BrowserWindow;

function onReady () {
    win = new electron.BrowserWindow({
	width: 900, height: 6700,
	webPreferences: {
	    nodeIntegration: true,
	    contextIsolation: false
	}
    });
    win.loadURL(url.format({
	pathname: path.join(
	    __dirname,
	    '../../dist/satiator-ui/index.html'),
	protocol: 'file:',
	slashes: true
    }));
    win.webContents.openDevTools();
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
