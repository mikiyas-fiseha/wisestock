const fs = require('fs');
const path = require('path');

const localesDir = path.join('c:', 'PROJECT', 'stock', 'assets', 'locales');

const keysEN = {
    "failed_pick_image": "Failed to pick image",
    "copied": "Copied!",
    "copied_desc": "Account number copied to clipboard",
    "failed_copy": "Failed to copy text",
    "required": "Required",
    "upload_first": "Please upload a receipt screenshot first.",
    "thank_you": "Thank You!",
    "receipt_uploaded": "Receipt uploaded. We will review and activate your account shortly.",
    "upload_failed": "Upload Failed",
    "something_went_wrong": "Something went wrong",
    "transfer_funds": "Transfer Funds",
    "send_amount": "Send the amount ",
    "for_your_plan": "for your plan",
    "to_chosen_bank": " to your chosen bank account below.",
    "upload_screenshot": "Upload Screenshot",
    "take_screenshot": "Take a screenshot of the transaction and upload it.",
    "done": "Done",
    "once_verified": "Once verified, your account will be activated!",
    "payment_methods": "PAYMENT METHODS",
    "proof_of_payment": "PROOF OF PAYMENT",
    "assistance": "ASSISTANCE",
    "update_receipt": "Update Receipt",
    "select_screenshot": "Select Screenshot",
    "jpg_png_gallery": "JPG or PNG from gallery",
    "call_support": "Call Support",
    "telegram": "Telegram",
    "secure_payment_title": "Secure Payment",
    "follow_steps": "Follow these simple steps to activate your subscription.",
    "confirm_payment": "Confirm Payment",
    "back_to_plans": "Back to Plans"
};

const keysAM = {
    "failed_pick_image": "ምስል መምረጥ አልተቻለም",
    "copied": "ተቀድቷል!",
    "copied_desc": "የሂሳብ ቁጥሩ ኮፒ ተደርጓል",
    "failed_copy": "ጽሑፍ መቅዳት አልተቻለም",
    "required": "ያስፈልጋል",
    "upload_first": "እባክዎ መጀመሪያ የደረሰኝ (Screenshot) ያያይዙ።",
    "thank_you": "እናመሰግናለን!",
    "receipt_uploaded": "ደረሰኝ ታትሟል። በቅርቡ ከገመገምን በኋላ አካውንትዎን የከፈታል",
    "upload_failed": "ማያያዝ አልተሳካም",
    "something_went_wrong": "ችግር ተከስቷል",
    "transfer_funds": "ገንዘብ ያስተላልፉ",
    "send_amount": "መጠኑን ",
    "for_your_plan": "ለዕቅድዎ",
    "to_chosen_bank": " ከታች ወዳለው የባንክ ሂሳብ ያስተላልፉ።",
    "upload_screenshot": "ቅጂ ያያይዙ",
    "take_screenshot": "የግብይቱን ቅጂ(Screenshot) አንስተው ያያይዙ።",
    "done": "ተጠናቋል",
    "once_verified": "ልክ እንደተረጋገጠ፣ አካውንትዎ አክቲቭ ይሆናል!",
    "payment_methods": "የክፍያ አማራጮች",
    "proof_of_payment": "የክፍያ ማረጋገጫ",
    "assistance": "እርዳታ",
    "update_receipt": "ደረሰኝ ቀይር",
    "select_screenshot": " ፎቶ ምረጥ",
    "jpg_png_gallery": "JPG ወይም PNG ከጋለሪ",
    "call_support": "ወደ ድጋፍ ይደውሉ",
    "telegram": "ቴሌግራም",
    "secure_payment_title": "አስተማማኝ ክፍያ",
    "follow_steps": "ምዝገባዎን ለማንቃት እነዚህን ቀላል ደረጃዎች ይከተሉ።",
    "confirm_payment": "ክፍያ አረጋግጥ",
    "back_to_plans": "ወደ ዕቅዶች ተመለስ"
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
            console.log(`Updated guide block in ${lang}.json`);
        } catch (e) {
            console.error(`Error parsing ${lang}.json:`, e);
        }
    }
}
