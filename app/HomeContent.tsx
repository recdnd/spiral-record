'use client';

import { useLanguage } from './LanguageToggle';

const translations = {
  en: {
    intro: [
      'This is not a chat. This is not a draft. This is a record.',
      'Every fragment you submit becomes immutable. You cannot edit. You cannot delete.',
      'You can only seal it, and you can only add traces to connect fragments.',
      'This is the smallest irreversible language registry.',
    ],
  },
  zh: {
    intro: [
      '這不是聊天。這不是草稿。這是記錄。',
      '你提交的每個片段都將成為不可變的。你無法編輯。你無法刪除。',
      '你只能密封它，你只能添加追蹤來連接片段。',
      '這是最小的不可逆語言註冊表。',
    ],
  },
};

export function HomeContent() {

  const lang = useLanguage();
  const t = translations[lang];

  return (
    <div style={{ marginBottom: '2rem', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
      {t.intro.map((paragraph, index) => (
        <p key={index} style={{ marginBottom: '1rem' }}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

