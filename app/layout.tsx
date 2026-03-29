// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WebLLMProvider } from '@/components/providers/WebLLMProvider';
import { ReactNode } from 'react';
import { OfflineBadge } from '@/components/ui/OfflineBadge';
import { InstallBanner } from '@/components/ui/InstallBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VoidChats',
  description: 'Private AI — runs in your browser',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VoidChats',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <WebLLMProvider>
            <OfflineBadge />
                <InstallBanner />
                      {children}
        </WebLLMProvider>
      </body>
    </html>
  );
}