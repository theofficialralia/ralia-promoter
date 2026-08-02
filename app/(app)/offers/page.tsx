'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { api, ApiError, type Offer, type Profile } from '@/lib/api';
import { countdown, naira, titleCase } from '@/lib/format';

export default function OffersPage() {
  const qc = useQueryClient();
  const router = useRouter();

  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/v1/promoters/me/profile') });
  const offers = useQuery({ queryKey: ['offers'], queryFn: () => api.get<Offer[]>('/v1/offers') });

  const accept = useMutation({
    mutationFn: (id: string) => api.post<{ id: string }>(`/v1/offers/${id}/accept`, {}),
    onSuccess: (a) => { void qc.invalidateQueries({ queryKey: ['offers'] }); router.push(`/campaigns/${a.id}`); },
  });
  const decline = useMutation({
    mutationFn: (id: string) => api.post(`/v1/offers/${id}/decline`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['offers'] }),
  });

  if (offers.isLoading || profile.isLoading) {
    return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  }

  const status = profile.data?.status;
  const list = offers.data ?? [];

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Offers for you</h1>
      <p className="mt-1 text-[14px] text-muted">Fresh campaigns matched to your channels. The fee shown is what you take home.</p>

      {status && status !== 'ACTIVE' && (
        <Link href="/onboarding" className="mt-4 block rounded-2xl border border-warn/30 bg-warn-wash px-4 py-3">
          <div className="text-[14px] font-bold text-warn">{status === 'AWAITING_APPROVAL' ? 'Profile under review' : 'Finish your profile'}</div>
          <div className="text-[12.5px] text-body">{status === 'AWAITING_APPROVAL' ? 'We’ll notify you once you’re approved — then offers appear here.' : 'Add your channels and bank to start receiving offers.'}</div>
        </Link>
      )}

      <div className="mt-5 space-y-3">
        {list.length === 0 && (
          <div className="card grid place-items-center p-10 text-center text-muted">
            <div className="text-[15px] font-semibold text-ink">No offers right now</div>
            <div className="mt-1 text-[13.5px]">Check back soon — new campaigns match to your channels.</div>
          </div>
        )}
        {list.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold text-ink">{o.campaign_name}</div>
                <div className="text-[12.5px] text-muted">{titleCase(o.role)} · expires in {countdown(o.expires_at)}</div>
              </div>
              <StatusPill status="New" tone="ok" />
            </div>
            <div className="mt-3 rounded-xl bg-wash px-3 py-2.5">
              <div className="text-[12px] text-muted">You earn</div>
              <div className="text-[22px] font-extrabold text-ink">{naira(o.fee_minor)}</div>
              <div className="text-[11.5px] text-muted">Paid to your balance after review.</div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" className="flex-1" loading={decline.isPending && decline.variables === o.id} onClick={() => decline.mutate(o.id)}>Decline</Button>
              <Button className="flex-1" loading={accept.isPending && accept.variables === o.id} onClick={() => accept.mutate(o.id)}>Accept</Button>
            </div>
            {accept.error instanceof ApiError && accept.variables === o.id && (
              <p className="mt-2 text-[12px] text-brand-700">{accept.error.message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
