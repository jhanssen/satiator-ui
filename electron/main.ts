const electron = require('electron');
const url = require('url');
const path = require('path');

function onReady () {
    const win = new electron.BrowserWindow({ width: 900, height: 6700 })
    win.loadURL(url.format({
	pathname: path.join(
	    __dirname,
	    '../../dist/satiator-ui/index.html'),
	protocol: 'file:',
	slashes: true
    }))
}

electron.app.on('ready', onReady);
