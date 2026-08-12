'use client';

import { Avatar } from '@/components/ui/Avatar';
import { IconSearch } from '@/components/brand/icons';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/lib/auth';
import { nameFromEmail } from '@/lib/format';

/**
 * Persistent header from the design: a "Search offers" field, the notification
 * bell, theme switch, and a user chip. On mobile it shows the logo instead of
 * the search field (the bottom tab bar carries navigation).
 */
export function TopBar() {
  const { user } = useAuth();
  const name = nameFromEmail(user?.email);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-rule bg-paper/80 px-4 py-3 backdrop-blur lg:px-8">
      <div className="lg:hidden"><Logo label="Promoter" /></div>

      <form
        className="relative hidden max-w-xl flex-1 lg:block"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get('q');
          const el = document.querySelector<HTMLInputElement>('[data-list-search]');
          if (el) {
            el.focus();
            if (typeof q === 'string') {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              setter?.call(el, q);
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }}
      >
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <input name="q" className="input rounded-full !pl-11" placeholder="Search offers…" />
      </form>

      <div className="ml-auto flex items-center gap-2.5">
        <NotificationBell />
        <ThemeToggle />
        <div className="hidden items-center gap-2.5 rounded-full border border-rule bg-paper py-1 pl-1 pr-4 sm:flex">
          <Avatar name={name} className="h-8 w-8 text-[12px]" />
          <div className="leading-tight">
            <div className="text-[13px] font-bold text-ink">{name}</div>
            <div className="text-[11px] text-muted">Promoter</div>
          </div>
        </div>
      </div>
    </header>
  );
}
