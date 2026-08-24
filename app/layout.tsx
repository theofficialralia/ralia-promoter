import type { Metadata, Viewport } from 'next';
import { Urbanist } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { EnvBadge } from '@/components/EnvBadge';

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ralia — Promoters',
  description: 'Get paid to promote campaigns you already fit — accept offers, post, submit proof, cash out.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

const noFlash = `(function(){try{var t=localStorage.getItem('ralia.promoter.theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={urbanist.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: noFlash }} /></head>
      <body>
        <Providers>{children}</Providers>
        <EnvBadge />
      </body>
    </html>
  );
}
