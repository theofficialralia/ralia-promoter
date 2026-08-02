'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { api, type BankAccount, type Channel, type Profile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { compactNumber, titleCase } from '@/lib/format';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/v1/promoters/me/profile') });
  const channels = useQuery({ queryKey: ['channels'], queryFn: () => api.get<Channel[]>('/v1/promoters/me/channels') });
  const bank = useQuery({ queryKey: ['bank'], queryFn: () => api.get<BankAccount[]>('/v1/promoters/me/bank') });

  if (profile.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const p = profile.data!;

  async function signOut() { await logout(); router.replace('/login'); }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={p.full_name ?? user?.email} className="h-12 w-12 text-[15px]" />
        <div className="min-w-0">
          <div className="truncate text-[18px] font-extrabold text-ink">{p.full_name ?? 'Your profile'}</div>
          <div className="truncate text-[13px] text-muted">{user?.email}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="card p-4"><div className="text-[20px] font-extrabold text-ink">{p.trust_score}<span className="text-[13px] text-muted">/100</span></div><div className="text-[12px] text-muted">Trust score</div></div>
        <div className="card flex flex-col justify-center p-4"><StatusPill status={p.status} className="self-start" /><div className="mt-1 text-[12px] text-muted">Account status</div></div>
      </div>

      <Section title="Channels & reach" action={<Link href="/onboarding" className="text-[13px] font-semibold text-brand-700">Manage</Link>}>
        {(channels.data ?? []).length === 0 && <Empty>No channels yet — add one to get offers.</Empty>}
        {(channels.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2.5">
            <div>
              <div className="text-[14px] font-bold text-ink">{titleCase(c.platform)}{c.handle ? ` · ${c.handle}` : ''}</div>
              <div className="text-[12px] text-muted">{compactNumber(c.effective_reach)} effective reach</div>
            </div>
            <StatusPill status={c.verification_tier} />
          </div>
        ))}
      </Section>

      <Section title="Bank details" action={<Link href="/onboarding" className="text-[13px] font-semibold text-brand-700">Manage</Link>}>
        {(bank.data ?? []).length === 0 && <Empty>Add a bank account to get paid.</Empty>}
        {(bank.data ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between py-2.5">
            <div className="text-[14px] font-bold text-ink">{b.account_name ?? 'Account'}</div>
            <div className="text-[13px] text-muted">{b.bank_code} ··{b.account_number_masked?.slice(-4)}</div>
          </div>
        ))}
      </Section>

      <button onClick={signOut} className="mt-6 w-full rounded-2xl border border-rule py-3 text-[14px] font-semibold text-brand-700">Log out</button>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card mt-4 p-4">
      <div className="flex items-center justify-between"><h2 className="text-[14px] font-extrabold text-ink">{title}</h2>{action}</div>
      <div className="mt-1 divide-y divide-rule">{children}</div>
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-3 text-[13px] text-muted">{children}</div>;
}
