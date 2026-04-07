import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// استيراد ملفات الترجمة
import ar from './locales/ar.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector) // كشف لغة المتصفح
  .use(initReactI18next) // تمرير i18n إلى react-i18next
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: 'ar', // اللغة الافتراضية إذا لم يتم التعرف على اللغة
    interpolation: {
      escapeValue: false, // React يقوم بالـ escaping تلقائياً
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // حفظ اللغة المختارة في localStorage
    },
  });

export default i18n;
