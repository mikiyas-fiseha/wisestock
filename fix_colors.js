const fs = require('fs');
const path = require('path');

const filesToFix = [
    'c:/PROJECT/stock/app/(tabs)/suppliers/index.tsx',
    'c:/PROJECT/stock/app/(tabs)/suppliers/add.tsx',
    'c:/PROJECT/stock/app/(tabs)/customers/index.tsx'
];

filesToFix.forEach(file => {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return;
    }
    let content = fs.readFileSync(file, 'utf8');

    // Replace hex codes in styles
    content = content.replace(/backgroundColor:\s*'#fff',?/g, "backgroundColor: colors.background,");
    content = content.replace(/backgroundColor:\s*'#FFFFFF',?/g, "backgroundColor: colors.background,");
    content = content.replace(/backgroundColor:\s*'#F8FAFC',?/g, "backgroundColor: colors.background,");
    content = content.replace(/borderColor:\s*'#eee',?/g, "borderColor: colors.border,");
    content = content.replace(/borderColor:\s*'#f0f0f0',?/g, "borderColor: colors.border,");
    content = content.replace(/borderColor:\s*'#E2E8F0',?/g, "borderColor: colors.border,");
    content = content.replace(/shadowOpacity:\s*0\.05,?/g, "shadowOpacity: 0.1,");

    // Specific adjustments for index cards
    if (file.includes('index.tsx')) {
        content = content.replace(/backgroundColor:\s*colors\.background,\s*\/\/ For index cards/g, "backgroundColor: colors.card,");
        // Wait, the above simple regex might be too broad. Let's do it more carefully.
    }

    // Let's use a more targeted approach for card backgrounds in index files
    if (file.includes('index.tsx')) {
        content = content.replace(/card:\s*{[^}]*backgroundColor:\s*colors\.background/g, (match) => match.replace('colors.background', 'colors.card'));
    }

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
