const fs = require('fs');
const path = require('path');

const filesToFix = [
    'c:\\PROJECT\\stock\\app\\(tabs)\\sales\\analytics.tsx',
    'c:\\PROJECT\\stock\\app\\(tabs)\\sales\\new.tsx',
    'c:\\PROJECT\\stock\\app\\(tabs)\\sales\\[id].tsx'
];

filesToFix.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Find all const <var> = StyleSheet.create({ ... colors. ... })
    const styleRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*StyleSheet\.create\({/g;
    let match;
    const styleBlocks = [];

    while ((match = styleRegex.exec(content)) !== null) {
        const name = match[1];
        // find the matching closing bracket for StyleSheet.create
        let braceCount = 1;
        let p = match.index + match[0].length;
        while (p < content.length && braceCount > 0) {
            if (content[p] === '{') braceCount++;
            else if (content[p] === '}') braceCount--;
            p++;
        }
        if (content[p] === ')') p++;
        if (content[p] === ';') p++;

        const block = content.substring(match.index, p);
        if (block.includes('colors.')) {
            styleBlocks.push({ name, oldBlock: block, index: match.index });
        }
    }

    // Now replace the style blocks with factories
    styleBlocks.forEach(sb => {
        const newBlock = sb.oldBlock.replace(
            new RegExp(`const\\s+${sb.name}\\s*=\\s*StyleSheet\\.create\\({`),
            `const createStyles_${sb.name} = (colors: any) => StyleSheet.create({`
        );
        content = content.replace(sb.oldBlock, newBlock);
    });

    // Now inject the memoized styles into the components
    // Find component functions
    const compRegex = /(?:export\s+default\s+)?function\s+([A-Z][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*{/g;
    let modifiedFuncs = [];

    content = content.replace(compRegex, (matchStr, compName, args) => {
        // we return matchStr + injected stuff later, but first we check if it uses any of the styleBlocks
        // Actually it's safer to just inject into all components if they use the style name.
        return matchStr;
    });
    // It's safer to manual inject since regex component injection is tricky when we don't know the exact scope bound.
    // Instead of complex AST, let's just do simple regex for the specific components we care about.
});
