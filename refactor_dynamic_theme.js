const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SEARCH = [
    path.join(__dirname, 'app'),
    path.join(__dirname, 'components'),
];

// Files to explicitly skip to avoid breaking core providers or the script itself
const SKIP_FILES = [
    'ThemeContext.tsx',
    '_layout.tsx',
    'Colors.ts',
    'useColorScheme.ts',
    'MockData.ts'
];

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        let filePath = path.join(currentDirPath, name);
        let stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith('.tsx') || filePath.endsWith('.ts'))) {
            if (!SKIP_FILES.some(skip => filePath.includes(skip))) {
                callback(filePath, stat);
            }
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

let modifiedFiles = 0;

walkSync(DIRECTORIES_TO_SEARCH[1], processFile); // Components first
walkSync(DIRECTORIES_TO_SEARCH[0], processFile); // Then app/ screens

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Only process files that use Colors
    if (!content.includes('Colors.')) return;

    let originalContent = content;

    // 1. Add import for useTheme if not present
    if (!content.includes('useTheme')) {
        // Find the last import
        const lastImportMatch = [...content.matchAll(/^import.*from.*$/gm)].pop();
        if (lastImportMatch) {
            const importIdx = lastImportMatch.index + lastImportMatch[0].length;
            const useThemeImport = `\nimport { useTheme } from '@/context/ThemeContext';`;
            content = content.slice(0, importIdx) + useThemeImport + content.slice(importIdx);
        }
    }

    // 2. Transform StyleSheet.create to a factory function if it exists
    if (content.includes('StyleSheet.create({') && !content.includes('createStyles')) {
        content = content.replace(
            /(?:export )?const styles = StyleSheet\.create\({/g,
            'const createStyles = (colors: any) => StyleSheet.create({'
        );
    }

    // 3. Inject useTheme hook inside the main component(s)
    // We look for common component definitions: export function View() { or const View = () => {

    // Simple regex to find component starts. 
    // This looks for `export default function Name(` or `export function Name(` or `const Name = ({...}) => {`
    const componentRegex = /(?:export\s+(?:default\s+)?(?:function|const)\s+[A-Z][a-zA-Z0-9_]*\s*(?:=\s*(?:\([^)]*\)|[^=]*)\s*=>\s*)?(?:\([^)]*\))?\s*(?::\s*[A-Za-z<>]+)?\s*{)/g;

    let match;
    const matches = [];
    while ((match = componentRegex.exec(content)) !== null) {
        matches.push({ index: match.index, text: match[0] });
    }

    // Process from bottom to top to avoid index shifting issues
    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const insertPos = m.index + m.text.length;

        // Inject hook
        const injection = `\n    const { colors } = useTheme();`;

        let stylesInjection = '';
        if (content.includes('createStyles(colors)')) {
            // Already injected styles somewhere, handle carefully or assume we don't need
        } else if (content.includes('const createStyles')) {
            // Basic naive assumption that we need React.useMemo for styles. 
            // We'll import React if needed (assumed present in RN files usually).
            stylesInjection = `\n    const styles = React.useMemo(() => createStyles(colors), [colors]);`;
        }

        // Avoid double injecting if it already exists right after
        const nextChars = content.substring(insertPos, insertPos + 100);
        if (!nextChars.includes('useTheme()')) {
            content = content.slice(0, insertPos) + injection + stylesInjection + content.slice(insertPos);
        }
    }

    // 4. Replace Colors.light and Colors.dark with the dynamic 'colors' object
    // This is the most crucial part.
    content = content.replace(/Colors\.dark\./g, 'colors.');
    content = content.replace(/Colors\.light\./g, 'colors.');

    // Remove the imported statically used Colors if it's no longer used
    if (!content.includes('Colors.') && content.includes(`import { Colors }`)) {
        content = content.replace(/import { Colors[a-zA-Z0-9_, ]* } from '@\/constants\/Colors';\n?/, '');
    }

    if (content !== originalContent) {
        try {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated dynamic theme in: ${filePath}`);
            modifiedFiles++;
        } catch (e) {
            console.error(`Failed to write: ${filePath}`);
        }
    }
}

console.log(`\nDynamic Theme Refactoring complete. Modified ${modifiedFiles} files.`);
