import { HomeForm } from './HomeForm';
import { LanguageToggle } from './LanguageToggle';
import { HomeContent } from './HomeContent';
import { IS_READ_ONLY } from '@/lib/readonly';
import { RegistryGate } from './RegistryGate';
import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: '/',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description: SITE_DESCRIPTION,
};

export default function HomePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          Spiral Record
        </h1>
        <LanguageToggle />
      </div>

      <HomeContent />

      {/* 進入後建倉：倉在訪客自己的瀏覽器裡 */}
      <RegistryGate />

      {/* 本機可寫實例仍保留伺服器側表單（Rec 自用） */}
      {!IS_READ_ONLY && <HomeForm />}
    </div>
  );
}
