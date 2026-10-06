import { HomeForm } from './HomeForm';
import { LanguageToggle } from './LanguageToggle';
import { HomeContent } from './HomeContent';
import { IS_READ_ONLY } from '@/lib/readonly';
import { RegistryGate } from './RegistryGate';

export default function HomePage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
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
