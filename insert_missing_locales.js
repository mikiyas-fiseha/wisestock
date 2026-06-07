const fs = require('fs');
const path = require('path');

const localesDir = path.join('c:', 'PROJECT', 'stock', 'assets', 'locales');

const extraEN = {
    "Try all features for 7 days": "Try all features for 7 days",
    "Perfect for small businesses": "Perfect for small businesses",
    "Scale up with more users": "Scale up with more users",
    "Quarterly Growth": "Quarterly Growth",
    "Best value for established companies": "Best value for established companies"
};

const extraAM = {
    "Try all features for 7 days": "ሁሉንም አገልግሎቶች ለ 7 ቀናት ይሞክሩ",
    "Perfect for small businesses": "ለአነስተኛ ንግዶች ተስማሚ",
    "Scale up with more users": "ለተጨማሪ ተጠቃሚዎች ያሳድጉ",
    "Quarterly Growth": "የሩብ ዓመት ዕድገት",
    "Best value for established companies": "ለተቋቋሙ ድርጅቶች የተሻለ ምርጫ"
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

            const srcObj = (lang === 'am') ? extraAM : extraEN;
            Object.assign(data.subscription.dynamic, srcObj);

            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
            console.log(`Updated missing block in ${lang}.json`);
        } catch (e) {
            console.error(`Error parsing ${lang}.json:`, e);
        }
    }
}
