import i18n from './i18n';

/**
 * Formats a number as a currency string based on the current language.
 * 
 * For Amharic ('am'), it appends the currency symbol at the end.
 * For English ('en') and other languages, it prepends the symbol.
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const language = i18n.language;
    const symbol = i18n.t('common.currency_symbol');

    // Use en-US formatting for the number part to ensure standard comma separators as requested
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const formattedNumber = formatter.format(num);

    if (language === 'am') {
        return `${formattedNumber} ${symbol}`;
    }

    return `${symbol}${formattedNumber}`;
};

/**
 * Formats a number compactly (e.g. 1.2k) with currency context.
 */
export const formatCompactCurrency = (amount: number): string => {
    const language = i18n.language;
    const symbol = i18n.t('common.currency_symbol');

    let formatted: string;
    if (amount >= 1000000) {
        formatted = (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        formatted = (amount / 1000).toFixed(1) + 'k';
    } else {
        formatted = amount.toFixed(0);
    }

    if (language === 'am') {
        return `${formatted} ${symbol}`;
    }
    return `${symbol}${formatted}`;
};
