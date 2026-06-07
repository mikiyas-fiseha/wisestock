const fs = require('fs');
const path = require('path');

const localesDir = path.join('c:', 'PROJECT', 'stock', 'assets', 'locales');

const dynamicTranslationsEN = {
    "7-Day Free Trial": "7-Day Free Trial",
    "7-day free ttrial": "7-Day Free Trial",
    "Monthly Starter": "Monthly Starter",
    "montly starter": "Monthly Starter",
    "Yearly Pro": "Yearly Pro",
    "Enterprise": "Enterprise",
    "Get full access to essential tools and features tailored to grow your business.": "Get full access to essential tools and features tailored to grow your business."
};

const dynamicTranslationsAM = {
    "7-Day Free Trial": "የ7 ቀናት ነፃ ሙከራ",
    "7-day free ttrial": "የ7 ቀናት ነፃ ሙከራ",
    "Monthly Starter": "ወርሃዊ ጀማሪ ዕቅድ",
    "montly starter": "ወርሃዊ ጀማሪ ዕቅድ",
    "Yearly Pro": "ዓመታዊ ፕሮ",
    "Enterprise": "ድርጅታዊ ዕቅድ",
    "Get full access to essential tools and features tailored to grow your business.": "ለድርጅትዎ የሚያስፈልጉ መሰረታዊ አገልግሎቶችን ሙሉ ለሙሉ ያግኙ::"
};

const locales = ['am', 'en', 'so', 'ti', 'om'];

for (const lang of locales) {
    const file = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, 'utf8');
        try {
            let data = JSON.parse(text);
            if (!data.subscription) data.subscription = {};
            if (!data.subscription.dynamic) data.subscription.dynamic = {};

            const srcObj = (lang === 'am') ? dynamicTranslationsAM : dynamicTranslationsEN;
            Object.assign(data.subscription.dynamic, srcObj);

            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
            console.log(`Updated dynamic block in ${lang}.json`);
        } catch (e) {
            console.error(`Error parsing ${lang}.json:`, e);
        }
    }
}
