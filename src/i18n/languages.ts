/** Idiomas do app (nome no próprio idioma). pt-BR é o padrão e o fallback. */
export const LANGUAGES = [
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR';

export const isLanguageCode = (code: unknown): code is LanguageCode => LANGUAGES.some((l) => l.code === code);

/** Código do aparelho ("pt", "pt-PT", "zh-Hans", "en-US"…) -> idioma suportado (senão pt-BR). */
export function resolveLanguage(deviceCode?: string | null): LanguageCode {
  const code = (deviceCode ?? '').toLowerCase();
  if (code.startsWith('pt')) return 'pt-BR';
  if (code.startsWith('zh')) return 'zh-CN';
  const prefix = code.split(/[-_]/)[0];
  return LANGUAGES.find((l) => l.code === prefix)?.code ?? DEFAULT_LANGUAGE;
}
