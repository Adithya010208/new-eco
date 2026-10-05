/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import taTranslation from './locales/ta.json';
import hiTranslation from './locales/hi.json';

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('ecobuild_language_preference') || 'en'
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ta: { translation: taTranslation },
      hi: { translation: hiTranslation },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes XSS
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
