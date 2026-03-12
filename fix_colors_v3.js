const fs = require('fs');

const filesToFix = [
    'c:/PROJECT/stock/app/(tabs)/suppliers/index.tsx',
    'c:/PROJECT/stock/app/(tabs)/suppliers/add.tsx',
    'c:/PROJECT/stock/app/(tabs)/customers/index.tsx',
    'c:/PROJECT/stock/app/(tabs)/reports/customers.tsx'
];

filesToFix.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Core Backgrounds
    content = content.replace(/backgroundColor:\s*'#fff',?/g, "backgroundColor: colors.card,");
    content = content.replace(/backgroundColor:\s*'#FFFFFF',?/g, "backgroundColor: colors.card,");

    // Specific check for reports/customers.tsx divider
    if (file.includes('reports/customers.tsx')) {
        content = content.replace(/backgroundColor:\s*'#f1f5f9'/g, 'backgroundColor: colors.border');
    }

    // Borders (Add if not present)
    content = content.replace(/borderRadius:\s*16,/g, "borderRadius: 16,\n        borderWidth: 1,\n        borderColor: colors.border,");

    // Deduplicate borderWidth/borderColor if they were just added
    content = content.replace(/(borderWidth:\s*1,?\s*borderColor:\s*colors\.border,?\s*){2,}/g, "$1");

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
