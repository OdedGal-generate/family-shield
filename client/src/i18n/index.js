import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './locales/he.json';
import en from './locales/en.json';

const savedLocale = localStorage.getItem('locale');
const browserLang = navigator.language.startsWith('he') ? 'he' : 'en';
const defaultLang = savedLocale || browserLang;

i18n.use(initReactI18next).init({
  resources: { he: { translation: he }, en: { translation: en } },
  lng: defaultLang,
  fallbackLng: 'he',
  interpolation: { escapeValue: false }
});

// Set initial direction
document.documentElement.lang = defaultLang;
document.documentElement.dir = defaultLang === 'he' ? 'rtl' : 'ltr';

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
  localStorage.setItem('locale', lng);
});

export default i18n;
