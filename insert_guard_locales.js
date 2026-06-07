const fs = require('fs');
const path = require('path');

const localesDir = path.join('c:', 'PROJECT', 'stock', 'assets', 'locales');

const keysEN = {
    "connection_issue": "Connection Issue",
    "unable_to_verify": "Unable to verify status.",
    "status_reviewing": "Status: Reviewing",
    "reviewing_desc": "We received your receipt! Our team is verifying the transaction. This usually takes less than 24 hours.",
    "expired": "Expired",
    "renew_continue": "Please renew to continue.",
    "welcome": "Welcome",
    "choose_plan_start": "Choose a plan to get started.",
    "try_again": "Try Again",
    "check_updates": "Check Updates"
};

const keysAM = {
    "connection_issue": "የግንኙነት ችግር",
    "unable_to_verify": "ሁኔታውን ማረጋገጥ አልተቻለም።",
    "status_reviewing": "ሁኔታ፡ በመገምገም ላይ ነው",
    "reviewing_desc": "ደረሰኝዎን ተቀብለናል! ቡድናችን የክፍያውን ትክክለኛነት እያረጋገጠ ነው። ይህ አብዛኛውን ጊዜ ከ30 ደቂቃ ባነሰ ጊዜ ውስጥ ይጠናቀቃል።",
    "expired": "ጊዜው አልፏል",
    "renew_continue": "እባክዎ ለመቀጠል ያድሱ።",
    "welcome": "እንኳን ደህና መጡ",
    "choose_plan_start": "ለመጀመር ከታች ዕቅድ ይምረጡ።",
    "try_again": "እንደገና ይሞክሩ",
    "check_updates": "ያለበትን ደረጃ አረጋግጥ"
};

const locales = ['am', 'en', 'so', 'ti', 'om'];

for (const lang of locales) {
    const file = path.join(localesDir, `${lang}.json`);
    if (fs.existsSync(file)) {
        let text = fs.readFileSync(file, 'utf8');
        try {
            let data = JSON.parse(text);
            if (!data.subscription) data.subscription = {};

            const srcObj = (lang === 'am') ? keysAM : keysEN;
            Object.assign(data.subscription, srcObj);

            fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
            console.log(`Updated Guard keys in ${lang}.json`);
        } catch (e) {
            console.error(`Error parsing ${lang}.json:`, e);
        }
    }
}
