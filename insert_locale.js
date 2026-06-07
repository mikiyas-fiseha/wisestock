const fs = require('fs');
const path = require('path');

const localesDir = path.join('c:', 'PROJECT', 'stock', 'assets', 'locales');

const enSub = {
    plans: "Plans",
    choose_plan: "Choose The Perfect Plan \nFor Your Business",
    affordable_pricing: "We offer affordable pricing to suit businesses of all sizes",
    save_40: "Save 40%",
    month_short: "mo",
    year_short: "yr",
    year: "Year",
    month: "Month",
    get_full_access: "Get full access to essential tools and features tailored to grow your business.",
    view_details: "View more Details",
    select_package: "Select a Package",
    processing: "Processing...",
    continue_payment: "Continue to Payment",
    secure_payment: "Secure payment • Select a plan"
};

const amSub = {
    plans: "ዕቅዶች",
    choose_plan: "ለንግድዎ ትክክለኛውን \nዕቅድ ይምረጡ",
    affordable_pricing: "ለሁሉም ንግድ የሚስማማ ተመጣጣኝ ዋጋ እናቀርባለን",
    save_40: "40% ይቆጥቡ",
    month_short: "ወር",
    year_short: "ዓመት",
    year: "ዓመት",
    month: "ወር",
    get_full_access: "ለድርጅትዎ የሚያስፈልጉ መሰረታዊ አገልግሎቶችን ሙሉ ለሙሉ ያግኙ::",
    view_details: "ተጨማሪ ዝርዝሮችን እይ",
    select_package: "ዕቅድ ምረጥ",
    processing: "በማስተናገድ ላይ...",
    continue_payment: "ወደ ክፍያ ይቀጥሉ",
    secure_payment: "አስተማማኝ ክፍያ • ዕቅድ ይምረጡ"
};

const locales = ['am', 'en', 'so', 'ti', 'om'];

for (const lang of locales) {
    const file = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, 'utf8');
        try {
            let data = JSON.parse(text);
            if (!data.subscription) {
                data.subscription = {};
            }
            const srcObj = (lang === 'am') ? amSub : enSub; // use enSub for others as fallback
            Object.assign(data.subscription, srcObj);

            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
            console.log(`Updated ${lang}.json`);
        } catch (e) {
            console.error(`Error parsing ${lang}.json:`, e);
        }
    } else {
        console.warn(`File not found: ${file}`);
    }
}
