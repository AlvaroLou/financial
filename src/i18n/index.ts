import 'intl-pluralrules';

import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { setDateLocale } from '@/lib/dates';
import { setMoneyLocale } from '@/lib/money';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import itLocale from '@/locales/it.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import ptBR from '@/locales/pt-BR.json';
import ru from '@/locales/ru.json';
import zhCN from '@/locales/zh-CN.json';

import { DEFAULT_LANGUAGE, resolveLanguage, type LanguageCode } from './languages';

/** Idioma do aparelho, se for um dos suportados (senão pt-BR). */
export function deviceLanguage(): LanguageCode {
  try {
    return resolveLanguage(Localization.getLocales()[0]?.languageCode);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

// formatação de valores e datas acompanha o idioma
i18n.on('languageChanged', (lng) => {
  setMoneyLocale(lng);
  setDateLocale(lng);
});

void i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: itLocale },
    ru: { translation: ru },
    'zh-CN': { translation: zhCN },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

/** Aplica a escolha do usuário (null = idioma do aparelho). */
export function applyLanguage(choice: LanguageCode | null | undefined) {
  const lng = choice ?? deviceLanguage();
  if (i18n.language !== lng) void i18n.changeLanguage(lng);
}

export default i18n;
