'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { IconExternal } from '@/components/brand/icons';
import { api, type Assignment } from '@/lib/api';
import { naira, titleCase } from '@/lib/format';

type Filter = 'all' | 'paid' | 'review' | 'rejected';

function isPaid(a: Assignment) { return a.status === 'PAID' || a.status === 'APPROVED'; }
function isRejected(a: Assignment) { return a.latest_verdict === 'REJECTED' || a.status === 'REJECTED'; }
function isReview(a: Assignment) { return a.status === 'SUBMITTED'; }

function noteFor(a: Assignment): string {
  if (isRejected(a)) return a.reject_reason ?? 'Rejected';
  if (isReview(a)) return 'Submitted · usually < 24h';
  if (isPaid(a)) return 'Paid to available balance';
  return 'Post and submit your proof';
}

export default function CampaignsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const q = useQuery({ queryKey: ['assignments'], queryFn: () => api.get<Assignment[]>('/v1/assignments') });

  const items = q.data ?? [];
  const lifetimeMinor = items.filter(isPaid).reduce((s, a) => s + a.fee.amount_minor, 0);
  const completed = items.filter(isPaid).length;
  const rejections = items.filter(isRejected).length;

  const filtered = useMemo(() => items.filter((a) => {
    if (filter === 'paid') return isPaid(a);
    if (filter === 'review') return isReview(a);
    if (filter === 'rejected') return isRejected(a);
    return true;
  }), [items, filter]);

  if (q.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;

  return (
    <div>
      <PageHeader crumb="History" title="My campaigns" subtitle="Every offer you’ve accepted, and where it landed." />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Lifetime earned" value={naira(lifetimeMinor)} accent="brand" />
        <StatCard label="Completed" value={String(completed)} accent="ok" />
        <StatCard label="Rejections" value={String(rejections)} accent="ink" />
      </div>

      <div className="mb-4 inline-flex rounded-full bg-wash p-1 text-[13.5px] font-semibold">
        {([['all', 'All'], ['paid', 'Paid'], ['review', 'In review'], ['rejected', 'Rejected']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-5 py-1.5 transition ${filter === k ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card grid place-items-center p-12 text-center text-muted">
          <div className="text-[15px] font-semibold text-ink">Nothing yet</div>
          <div className="mt-1 text-[13.5px]">Accept an offer and it shows up here.</div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead className="border-b border-rule text-[12px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3.5">Campaign</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Fee</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-rule transition last:border-0 hover:bg-wash">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-ink">{a.campaign_name}</div>
                      <div className="text-[12px] text-muted">{titleCase(a.role)} · {titleCase(a.objective)}</div>
                    </td>
                    <td className="px-5 py-3.5"><StatusPill status={isRejected(a) ? 'Rejected' : a.status} /></td>
                    <td className="px-5 py-3.5 text-right font-semibold text-ink">{a.fee.amount_display}</td>
                    <td className="px-5 py-3.5 text-muted">{noteFor(a)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/campaigns/${a.id}`} className="inline-flex items-center gap-1 font-semibold text-brand-700">
                        Open <IconExternal className="h-[15px] w-[15px]" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Nothing in this filter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
