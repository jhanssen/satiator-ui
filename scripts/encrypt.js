const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const infile = process.argv[2];
const outfile = process.argv[3];
const key = process.argv[4];

const iv = crypto.randomBytes(16);

(async function() {
    if (typeof key === undefined || key.length === 0)
        throw new Error('no key');

    const data = await fs.readFile(infile, { encoding: "utf8" });
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

    console.log("iv len", iv.toString('hex').length);

    await fs.writeFile(outfile, iv.toString('hex') + encrypted.toString('hex'));
})().then(() => {
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
