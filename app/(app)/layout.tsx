'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Spinner } from '@/components/ui/Spinner';
import { IconCampaigns, IconFinance, IconOffers, IconPromoters } from '@/components/brand/icons';
import { useRequireAuth } from '@/lib/auth';

const TABS = [
  { href: '/offers', label: 'Offers', Icon: IconOffers },
  { href: '/campaigns', label: 'Campaigns', Icon: IconCampaigns },
  { href: '/earnings', label: 'Earnings', Icon: IconFinance },
  { href: '/profile', label: 'Profile', Icon: IconPromoters },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-wash">
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-5 pb-24 animate-fade-in lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-rule bg-paper/95 px-2 py-2 backdrop-blur lg:hidden">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition ${active ? 'text-brand' : 'text-muted'}`}>
              <Icon className="h-[20px] w-[20px]" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
