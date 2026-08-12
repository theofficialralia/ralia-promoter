'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { IconCampaigns, IconCollapse, IconFinance, IconLogout, IconOffers, IconSupport } from '@/components/brand/icons';
import { useAuth } from '@/lib/auth';
import { nameFromEmail } from '@/lib/format';

const NAV = [
  { href: '/offers', label: 'Offers', Icon: IconOffers },
  { href: '/campaigns', label: 'Campaigns', Icon: IconCampaigns },
  { href: '/earnings', label: 'Earnings', Icon: IconFinance },
];

export function Sidebar({ collapsed = false, onToggleCollapse }: { collapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const name = nameFromEmail(user?.email);

  async function signOut() {
    await logout();
    router.replace('/login');
  }

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar py-5 text-white transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-[76px] px-3' : 'w-64 px-4'
      }`}
    >
      <div className="flex items-center justify-between px-2">
        {collapsed ? <LogoMark className="h-8 w-8" /> : <Logo label="Promoters" dark />}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <IconCollapse className={`h-[18px] w-[18px] ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      <nav className="mt-8 space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-xl py-2.5 text-[14.5px] font-semibold transition ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${
                active ? 'bg-brand text-white shadow-sm' : 'text-white/65 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-[19px] w-[19px]" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1">
        <a
          href="mailto:support@ralia.app"
          title={collapsed ? 'Help & Support' : undefined}
          className={`flex items-center rounded-xl py-2.5 text-[14px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
        >
          <IconSupport className="h-[19px] w-[19px]" /> {!collapsed && 'Help & Support'}
        </a>
        <button
          onClick={signOut}
          title={collapsed ? 'Log out' : undefined}
          className={`flex w-full items-center rounded-xl py-2.5 text-[14px] font-semibold text-white/65 transition hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : 'gap-3 px-3'}`}
        >
          <IconLogout className="h-[19px] w-[19px]" /> {!collapsed && 'Log out'}
        </button>

        {!collapsed && (
          <Link href="/profile" className="relative mt-3 block overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
            <div className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-brand/50 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <Avatar name={name} className="h-9 w-9 text-[13px]" />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13.5px] font-bold text-white">{name}</div>
                <div className="truncate text-[11.5px] text-white/55">View profile</div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
