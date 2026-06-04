import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spiral Record',
  description: 'The smallest irreversible language registry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}

