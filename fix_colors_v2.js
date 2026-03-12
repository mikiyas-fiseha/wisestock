const fs = require('fs');

const filesToFix = [
    'c:/PROJECT/stock/app/(tabs)/suppliers/index.tsx',
    'c:/PROJECT/stock/app/(tabs)/suppliers/add.tsx',
    'c:/PROJECT/stock/app/(tabs)/customers/index.tsx'
];

filesToFix.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');

    // Core Backgrounds
    content = content.replace(/backgroundColor:\s*'#fff',?/g, "backgroundColor: colors.background,");
    content = content.replace(/backgroundColor:\s*'#FFFFFF',?/g, "backgroundColor: colors.background,");

    // Borders
    content = content.replace(/borderColor:\s*'#eee',?/g, "borderColor: colors.border,");
    content = content.replace(/borderColor:\s*'#f0f0f0',?/g, "borderColor: colors.border,");
    content = content.replace(/borderColor:\s*'#E2E8F0',?/g, "borderColor: colors.border,");

    // Shadow Opacity
    content = content.replace(/shadowOpacity:\s*0\.05,?/g, "shadowOpacity: 0.1,");

    // Specific Style Fixes (Search Bar, Cards)
    if (file.includes('suppliers/index.tsx')) {
        // Search bar should be colors.card
        content = content.replace(/searchContainer:\s*{[^}]*backgroundColor:\s*colors\.background/g, (m) => m.replace('colors.background', 'colors.card'));
        // Card should be colors.card
        content = content.replace(/card:\s*{[^}]*backgroundColor:\s*colors\.background/g, (m) => m.replace('colors.background', 'colors.card'));
        // Icon color
        content = content.replace(/color="#999"/g, 'color={colors.textSecondary}');
    }

    if (file.includes('suppliers/add.tsx')) {
        // Form card should be colors.card
        content = content.replace(/formCard:\s*{[^}]*backgroundColor:\s*colors\.background/g, (m) => m.replace('colors.background', 'colors.card'));
        // Inputs should be colors.background (already handled by generic replace if it was #F8FAFC)
        content = content.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.background');
    }

    if (file.includes('customers/index.tsx')) {
        // Export button background
        content = content.replace(/backgroundColor:\s*'#fff'/g, 'backgroundColor: colors.card');
        // Empty Icon Circle
        content = content.replace(/backgroundColor:\s*'#e3e8f0'/g, 'backgroundColor: colors.card');
    }

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
