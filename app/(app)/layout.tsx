'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useTheme } from '@/lib/theme';
import { useRequireAuth } from '@/lib/auth';

const TABS = [
  { href: '/offers', label: 'Offers', icon: '✨' },
  { href: '/campaigns', label: 'Campaigns', icon: '📣' },
  { href: '/earnings', label: 'Earnings', icon: '💰' },
  { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-wash">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper/90 px-4 py-3 backdrop-blur">
        <Logo label="Promoter" />
        <button onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-full border border-rule bg-paper text-[15px]" aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="flex-1 px-4 py-5 pb-24 animate-fade-in">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-center justify-around border-t border-rule bg-paper/95 px-2 py-2 backdrop-blur">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${active ? 'text-brand' : 'text-muted'}`}>
              <span className={`text-[18px] ${active ? '' : 'opacity-70'}`}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
