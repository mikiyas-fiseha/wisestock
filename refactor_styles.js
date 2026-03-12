const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SEARCH = [
    path.join(__dirname, 'app'),
    path.join(__dirname, 'components'),
];

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        let filePath = path.join(currentDirPath, name);
        let stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

let modifiedFiles = 0;

DIRECTORIES_TO_SEARCH.forEach(dir => {
    if (fs.existsSync(dir)) {
        walkSync(dir, function (filePath, stat) {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('Colors.light')) {
                const newContent = content.replace(/Colors\.light/g, 'Colors.dark');
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`Updated: ${filePath}`);
                modifiedFiles++;
            }
        });
    }
});

console.log(`\nReplacement complete. Modified ${modifiedFiles} files.`);
