'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translate, type Language, type Variables } from '@/i18n/catalog';

const STORAGE_KEY = 'ai-toolkit-y.language.v1';
const valid = (value: string | null): value is Language => value === 'en' || value === 'zh-CN';
const LanguageContext = createContext({ language: 'en' as Language, setLanguage: (_: Language) => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Match the server render, then restore this browser's explicit preference.
  const [language, updateLanguage] = useState<Language>('en');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      updateLanguage(valid(saved) ? saved : 'zh-CN');
    } catch { updateLanguage('zh-CN'); }
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) updateLanguage(valid(event.newValue) ? event.newValue : 'zh-CN');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Session-only when storage is blocked. */ }
  }, []);
  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
export function useT() {
  const { language } = useLanguage();
  return useCallback((text: string, variables?: Variables) => translate(language, text, variables), [language]);
}
export function T({ text }: { text: string }) {
  const t = useT();
  return <>{t(text)}</>;
}

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const t = useT();
  return <section className="mb-6 border-b border-gray-800 pb-5" aria-labelledby="interface-language">
    <h2 id="interface-language" className="text-sm font-medium mb-2">{t('Interface language')}</h2>
    <div role="group" aria-labelledby="interface-language" className="inline-flex rounded-lg border border-gray-600 p-1 gap-1">
      {([['zh-CN', '中文'], ['en', 'English']] as const).map(([value, label]) =>
        <button key={value} type="button" lang={value} aria-pressed={language === value} onClick={() => setLanguage(value)}
          className={`min-w-24 rounded-md px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${language === value ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}`}>{label}</button>)}
    </div>
    <p className="mt-2 text-xs text-gray-400">{t('Applies immediately and is remembered in this browser.')}</p>
  </section>;
}
