'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { IconChevronRight } from '@/components/brand/icons';
import { api, type BankAccount, type Channel, type Profile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SUPPORT } from '@/lib/support';
import { compactNumber, titleCase } from '@/lib/format';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/v1/promoters/me/profile') });
  const channels = useQuery({ queryKey: ['channels'], queryFn: () => api.get<Channel[]>('/v1/promoters/me/channels') });
  const bank = useQuery({ queryKey: ['bank'], queryFn: () => api.get<BankAccount[]>('/v1/promoters/me/bank') });

  if (profile.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const p = profile.data!;

  async function signOut() { await logout(); router.replace('/login'); }

  const channelCount = channels.data?.length ?? 0;
  const bankCount = bank.data?.length ?? 0;

  return (
    <div>
      <div className="mb-1 text-[13px] font-semibold text-brand-700">Account</div>
      <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Profile</h1>
      <p className="mt-1 text-[14px] text-muted">Your trust score, payout details and account settings.</p>

      {/* Identity + trust hero */}
      <div className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0d0d] to-[#120708] p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={p.full_name ?? user?.email} className="h-12 w-12 text-[16px]" />
            <div className="min-w-0">
              <div className="truncate text-[18px] font-extrabold">{p.full_name ?? 'Your profile'}</div>
              <div className="truncate text-[13px] text-white/60">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={p.status} />
            <div className="rounded-2xl bg-white/10 px-4 py-2.5 text-right">
              <div className="text-[11px] text-white/60">Trust score</div>
              <div className="text-[18px] font-extrabold">{p.trust_score}<span className="text-[12px] font-semibold text-white/60"> / 100</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      <Group title="Account">
        <Row href="/onboarding" label="Channels & reach" meta={channelCount ? `${channelCount} channel${channelCount === 1 ? '' : 's'}` : 'Add a channel'} />
        <Row href="/onboarding" label="Bank details" meta={bankCount ? `${bankCount} account${bankCount === 1 ? '' : 's'}` : 'Add an account'} />
        <Row href="/onboarding" label="Switch your role" meta="Add or change how you promote" />
      </Group>

      {/* Channels detail */}
      <Group title="Your channels">
        {channelCount === 0 && <div className="py-3 text-[13px] text-muted">No channels yet — add one to get offers.</div>}
        {(channels.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between py-3">
            <div>
              <div className="text-[14px] font-bold text-ink">{titleCase(c.platform)}{c.handle ? ` · ${c.handle}` : ''}</div>
              <div className="text-[12px] text-muted">{compactNumber(c.effective_reach)} effective reach</div>
            </div>
            <StatusPill status={c.verification_tier} />
          </div>
        ))}
      </Group>

      {/* Preferences */}
      <Group title="Preferences">
        <Row href="/onboarding" label="Notification preferences" meta="Email & in-app" />
        <RowExternal href={SUPPORT.whatsappUrl} label="Help & support" meta="WhatsApp" />
      </Group>

      {/* Other */}
      <Group title="Other">
        <button onClick={signOut} className="flex w-full items-center justify-between py-3 text-left">
          <span className="text-[14.5px] font-semibold text-ink">Log out</span>
          <IconChevronRight className="h-[18px] w-[18px] text-muted" />
        </button>
        <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-between py-3 text-left">
          <span className="text-[14.5px] font-semibold text-brand-700">Delete account</span>
          <IconChevronRight className="h-[18px] w-[18px] text-brand-700/70" />
        </button>
      </Group>

      {confirmDelete && (
        <ConfirmModal
          title="Delete your account?"
          body={`This is permanent and can’t be undone. Account deletion isn’t available in-app yet — contact ${SUPPORT.email} and we’ll process it for you.`}
          confirmLabel="Email support"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => { window.location.href = `mailto:${SUPPORT.email}?subject=Delete%20my%20account`; setConfirmDelete(false); }}
        />
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 text-[12.5px] font-semibold text-muted">{title}</div>
      <div className="card divide-y divide-rule px-5">{children}</div>
    </section>
  );
}

function Row({ href, label, meta }: { href: string; label: string; meta?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between py-3.5">
      <span className="text-[14.5px] font-semibold text-ink">{label}</span>
      <span className="flex items-center gap-2 text-[12.5px] text-muted">{meta}<IconChevronRight className="h-[18px] w-[18px]" /></span>
    </Link>
  );
}

function RowExternal({ href, label, meta }: { href: string; label: string; meta?: string }) {
  return (
    <a href={href} className="flex items-center justify-between py-3.5">
      <span className="text-[14.5px] font-semibold text-ink">{label}</span>
      <span className="flex items-center gap-2 text-[12.5px] text-muted">{meta}<IconChevronRight className="h-[18px] w-[18px]" /></span>
    </a>
  );
}
