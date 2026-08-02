'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { api, type Assignment } from '@/lib/api';
import { titleCase } from '@/lib/format';

export default function CampaignsPage() {
  const q = useQuery({ queryKey: ['assignments'], queryFn: () => api.get<Assignment[]>('/v1/assignments') });
  if (q.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const items = q.data ?? [];

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-ink">My campaigns</h1>
      <p className="mt-1 text-[14px] text-muted">The work you accepted. Tap one to post and submit proof.</p>

      <div className="mt-5 space-y-3">
        {items.length === 0 && (
          <div className="card grid place-items-center p-10 text-center text-muted">
            <div className="text-[15px] font-semibold text-ink">Nothing yet</div>
            <div className="mt-1 text-[13.5px]">Accept an offer and it shows up here.</div>
          </div>
        )}
        {items.map((a) => (
          <Link key={a.id} href={`/campaigns/${a.id}`} className="card flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-ink">{a.campaign_name}</div>
              <div className="truncate text-[12.5px] text-muted">{titleCase(a.objective)} · {a.fee.amount_display}</div>
            </div>
            <StatusPill status={a.latest_verdict === 'REJECTED' ? 'Rejected' : a.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
