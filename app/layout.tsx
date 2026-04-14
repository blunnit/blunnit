import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BLUNNIT — Pierce The Illusion',
  description: 'A self-awareness mirror powered by AI.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mirror',
  },
  openGraph: {
    title: 'BLUNNIT — Pierce The Illusion',
    description: 'A self-awareness mirror powered by AI.',
    images: [{ url: '/logo.png' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BLUNNIT — Pierce The Illusion',
    description: 'A self-awareness mirror powered by AI.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}