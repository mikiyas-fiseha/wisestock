const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file === '_layout.tsx' && fullPath.includes('app\\(tabs)')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Find <Stack screenOptions={{ ... }}> or <Stack>
            if (content.match(/<Stack(?:\s*>)|\s+screenOptions=\{\{/)) {
                if (!content.includes("contentStyle: { backgroundColor: 'transparent' }")) {
                    content = content.replace(/<Stack\s*>/g, "<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}>");
                    content = content.replace(/<Stack\s+screenOptions=\{\s*\{\s*headerShown:\s*false\s*\}\s*\}/g, "<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, headerStyle: { backgroundColor: 'transparent' }, headerShadowVisible: false }}");
                    
                    fs.writeFileSync(fullPath, content);
                    modified = true;
                    console.log('Patched layout: ' + fullPath);
                }
            }
        }
    });
}

processDir('app/(tabs)');
console.log('Done.');
