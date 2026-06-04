'use client';

import { useState, useEffect } from 'react';

type Language = 'en' | 'zh';

export function LanguageToggle() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {

    // Load saved language preference from localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spiral-lang') as Language | null;
        if (saved === 'en' || saved === 'zh') {
          setLang(saved);
        }
      } catch (e) {
      }
    }
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'zh' : 'en';
    setLang(newLang);
    localStorage.setItem('spiral-lang', newLang);
  };

  return (
    <button
      onClick={toggleLang}
      className="btn-base"
      title={lang === 'en' ? 'Switch to Chinese' : '切換到英文'}
    >
      {lang === 'en' ? 'EN' : '中文'}
    </button>
  );
}

export function useLanguage(): Language {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spiral-lang') as Language | null;
        if (saved === 'en' || saved === 'zh') {
          setLang(saved);
        }

        // Listen for storage changes (in case user switches language in another tab)
        const handleStorageChange = () => {
          try {
            const updated = localStorage.getItem('spiral-lang') as Language | null;
            if (updated === 'en' || updated === 'zh') {
              setLang(updated);
            }
          } catch (e) {
            console.error('localStorage access failed in storage event:', e);
          }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
      } catch (e) {
      }
    }
  }, []);

  return lang;
}

