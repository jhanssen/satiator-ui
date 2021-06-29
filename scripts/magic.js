const key = process.argv[2];
const shift = parseInt(process.argv[3]);

const nstr = [];
for (let i = 0; i < key.length; ++i) {
    const n = key.charCodeAt(i);
    nstr.push(n << shift);
}

console.log(JSON.stringify(nstr));
