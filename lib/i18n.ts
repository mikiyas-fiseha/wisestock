import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import am from '../assets/locales/am.json';
import en from '../assets/locales/en.json';
import om from '../assets/locales/om.json';
import so from '../assets/locales/so.json';
import ti from '../assets/locales/ti.json';

const resources = {
  en: { translation: en },
  am: { translation: am },
  om: { translation: om },
  ti: { translation: ti },
  so: { translation: so },
};

const LANGUAGE_KEY = 'user-language';

// Initialize synchronously with a default language to prevent crashes during bundling/SSR
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false // Good practice for mobile to avoid suspended renders
    }
  });

// Asynchronously load the saved language after initialization
const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && savedLanguage !== i18n.language) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.warn('Failed to load saved language:', error);
  }
};

// Only run AsyncStorage logic if we're not in a Node environment (prevents "window is not defined" error)
if (typeof window !== 'undefined') {
  loadSavedLanguage();
}

export default i18n;
