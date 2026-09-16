import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaManager } from '@/components/PwaManager';

export const viewport: Viewport = {
  themeColor: '#f59e0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'easy-composer',
  description: 'Purely manual score editor for Taigi lyrics and numbered musical notation (Numbered Notation).',
  applicationName: 'easy-composer',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'easy-composer',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: 'manifest.webmanifest',
  icons: {
    icon: [
      { url: 'icons/icon.svg', type: 'image/svg+xml' },
      { url: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: 'favicon.ico' },
    ],
    apple: [
      { url: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'easy-composer',
    description: 'Purely manual score editor for Taigi lyrics and numbered musical notation (Numbered Notation).',
    type: 'website',
    siteName: 'easy-composer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'easy-composer',
    description: 'Purely manual score editor for Taigi lyrics and numbered musical notation (Numbered Notation).',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
