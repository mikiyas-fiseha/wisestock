const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        let fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.tsx') && !fullPath.endsWith('_layout.tsx') && !fullPath.endsWith('dashboard.tsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('./app/(tabs)');
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const orig = content;

    const regex = /(return\s*\(\s*<View\s+[^>]*?style=\{[^}]*?(?:container|centered|screen|containerWeb|mobileContent)[^}]*?\}[^>]*>)/g;
    if (!regex.test(content)) return;

    if (content.includes('<LinearGradient colors={theme === ')) {
        return; 
    }

    if (!content.includes('import { LinearGradient }')) {
        content = content.replace(/import React/, "import { LinearGradient } from 'expo-linear-gradient';\nimport React");
    }

    if (!content.includes('Gradients')) {
        if (content.match(/import\s*\{[^}]*\}\s*from\s*['"]@\/constants\/Colors['"]/)) {
            content = content.replace(/(import\s*\{)([^}]*)(\}\s*from\s*['"]@\/constants\/Colors['"]\s*;?)/, (match, p1, p2, p3) => {
                if (p2.includes('Gradients')) return match;
                return p1 + p2.trim() + (p2.trim().endsWith(',') ? ' Gradients ' : ', Gradients ') + p3;
            });
        } else {
            content = content.replace(/import React/, "import { Gradients } from '@/constants/Colors';\nimport React");
        }
    }

    if (content.includes('const { colors } = useTheme();')) {
        content = content.replace('const { colors } = useTheme();', 'const { colors, theme } = useTheme();');
    } else if (content.includes('const { colors, theme } = useTheme();') || content.includes('const { theme, colors } = useTheme();')) {
        // do nothing
    } else if (content.includes('useTheme();')) {
        content = content.replace(/const\s+\{([^}]+)\}\s*=\s*useTheme\(\);/, (match, p1) => {
            if (p1.includes('theme')) return match;
            return `const { ${p1.trim()}, theme } = useTheme();`;
        });
    }

    content = content.replace(regex, (match) => {
        return match + '\n            <LinearGradient colors={theme === "dark" ? Gradients.authDark : Gradients.authLight} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />';
    });

    if (content !== orig) {
        fs.writeFileSync(file, content, 'utf8');
        changed++;
        console.log('Injected gradient into', file);
    }
});

console.log('Total files injected:', changed);
