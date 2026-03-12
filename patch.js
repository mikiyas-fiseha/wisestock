const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Translucent colors.card in ANY syntax, but not already followed by + '90'
            const cardRegex = /colors\.card(?!\s*\+\s*['"]90['"])/g;
            if (cardRegex.test(content)) {
                content = content.replace(cardRegex, "(colors.card + '90')");
                modified = true;
            }

            // Same for backgroundColor: colors.background -> 'transparent'
            const bgRegex = /backgroundColor:\s*colors\.background(?!\s*\+\s*['"]90['"])/g;
            if (bgRegex.test(content)) {
                 content = content.replace(bgRegex, "backgroundColor: 'transparent'");
                 modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Patched: ' + fullPath);
            }
        }
    });
}

processDir('components');
console.log('Done scanning.');
