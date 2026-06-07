const fs = require('fs');
const path = require('path');

const localesDir = path.join('c:', 'PROJECT', 'stock', 'assets', 'locales');

const messagesEN = {
    "failed_load": "Failed to load plans",
    "trial_started": "Trial Started",
    "trial_active": "7-day trial active!",
    "plan_selected": "Plan Selected",
    "follow_guide": "Please follow the payment guide.",
    "action_failed": "Action failed"
};

const messagesAM = {
    "failed_load": "ዕቅዶችን መጫን አልተቻለም",
    "trial_started": "ሙከራ ተጀምሯል",
    "trial_active": "የ 7 ቀናት ሙከራዎ ንቁ ነው!",
    "plan_selected": "ዕቅድ ተመርጧል",
    "follow_guide": "እባክዎ የክፍያ መመሪያውን ይከተሉ።",
    "action_failed": "ተግባሩ አልተሳካም"
};

const locales = ['am', 'en', 'so', 'ti', 'om'];

for (const lang of locales) {
    const file = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, 'utf8');
        try {
            let data = JSON.parse(text);
            if (!data.subscription) data.subscription = {};

            const srcObj = (lang === 'am') ? messagesAM : messagesEN;
            Object.assign(data.subscription, srcObj);

            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
            console.log(`Updated messages in ${lang}.json`);
        } catch (e) {
            console.error(`Error parsing ${lang}.json:`, e);
        }
    }
}
