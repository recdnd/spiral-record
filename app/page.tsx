import { HomeForm } from './HomeForm';
import { LanguageToggle } from './LanguageToggle';
import { HomeContent } from './HomeContent';

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

      <HomeForm />
    </div>
  );
}
