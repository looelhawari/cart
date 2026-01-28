import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ar from './locales/ar.json';

// Get saved language or default to English
const savedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ar: { translation: ar },
        },
        lng: savedLanguage,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

// Function to change language and update document direction
export const changeLanguage = (lang: 'en' | 'ar') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);

    // Update document direction for RTL support
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    // Add/remove RTL class for additional styling
    if (lang === 'ar') {
        document.body.classList.add('rtl');
        document.body.classList.remove('ltr');
    } else {
        document.body.classList.add('ltr');
        document.body.classList.remove('rtl');
    }
};

// Initialize direction on load
const initDirection = () => {
    const currentLang = i18n.language || 'en';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    document.body.classList.add(currentLang === 'ar' ? 'rtl' : 'ltr');
};

initDirection();

export default i18n;
