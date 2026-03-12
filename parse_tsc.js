const fs = require('fs');
const txt = fs.readFileSync('tsc_errors.log', 'utf16le');
const lines = txt.split('\n');
const filesToFix = new Set();
lines.forEach(line => {
    if (line.includes("TS2304: Cannot find name 'colors'") || line.includes("TS2304: Cannot find name 'styles'")) {
        const match = line.match(/^(.+\.tsx?)\(/);
        if (match) filesToFix.add(match[1].trim());
    }
});
console.log(Array.from(filesToFix).join('\n'));
