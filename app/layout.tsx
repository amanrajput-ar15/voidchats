import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WebLLMProvider } from '@/components/providers/WebLLMProvider';
import { ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'] });



export const metadata: Metadata = {
  title: 'VoidChats',
  description: 'Private AI — runs entirely in your browser',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning >
        <WebLLMProvider>{children}</WebLLMProvider>
      </body>
    </html>
  );
}