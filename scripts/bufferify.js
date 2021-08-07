const fs = require('fs/promises');
const path = require('path');

const infile = process.argv[2];

(async function() {
    const data = await fs.readFile(infile, { encoding: null });
    const arr = [...data];
    console.log(`new Uint8Array([${arr}])`);
})().then(() => {
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
