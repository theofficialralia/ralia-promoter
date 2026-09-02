'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { api, ApiError, type Offer, type OfferDetail, type Profile } from '@/lib/api';
import { compactNumber, countdown, naira, titleCase } from '@/lib/format';

/** Friendly labels for the profile-completion checklist. */
function missingLabel(key: string): string {
  const map: Record<string, string> = {
    channels: 'Add a channel',
    bank: 'Add bank details',
    bank_account: 'Add bank details',
    profile: 'Finish your profile',
    questionnaire: 'Answer the questions',
    questions: 'Answer the questions',
    roles: 'Pick your roles',
    languages: 'Add your languages',
    categories: 'Pick your categories',
  };
  return map[key.toLowerCase()] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A plain-language "what you'll do" line derived from the offer role. */
function taskForRole(role: string): string {
  switch (role.toUpperCase()) {
    case 'DISTRIBUTOR':
      return 'Share this campaign to your channel and keep it live, then screenshot your view count.';
    case 'INFLUENCER':
      return 'Post this to your audience with the caption provided, then submit your proof.';
    case 'CREATOR':
      return 'Create content for this campaign and post it, then submit the link or screenshot.';
    case 'PARTICIPATOR':
      return 'Complete the campaign task as described, then submit your proof.';
    default:
      return 'Complete the task for this campaign, then submit your proof for review.';
  }
}

export default function OffersPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api.get<Profile>('/v1/promoters/me/profile') });
  const offers = useQuery({ queryKey: ['offers'], queryFn: () => api.get<Offer[]>('/v1/offers') });

  const accept = useMutation({
    mutationFn: (id: string) => api.post<{ id: string }>(`/v1/offers/${id}/accept`, {}),
    onSuccess: (a) => { setDetailId(null); void qc.invalidateQueries({ queryKey: ['offers'] }); router.push(`/campaigns/${a.id}`); },
  });
  const decline = useMutation({
    mutationFn: (id: string) => api.post(`/v1/offers/${id}/decline`, {}),
    onSuccess: () => { setDetailId(null); void qc.invalidateQueries({ queryKey: ['offers'] }); },
  });

  const list = offers.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? list.filter((o) => o.campaign_name.toLowerCase().includes(term) || o.role.toLowerCase().includes(term)) : list;
  }, [list, search]);

  if (offers.isLoading || profile.isLoading) {
    return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  }

  const p = profile.data;
  const status = p?.status;
  const avgFee = list.length ? Math.round(list.reduce((s, o) => s + o.fee_minor, 0) / list.length) : 0;

  return (
    <div>
      <PageHeader crumb="Marketplace" title="Offers for you" subtitle="Fresh campaigns matched to your channels and languages. The fee shown is what you take home." />

      {status && status !== 'ACTIVE' && (
        <Link href="/onboarding" className="mb-5 block rounded-2xl border border-warn/40 bg-warn-wash px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warn/15 text-warn">⚠</span>
            <span>
              <span className="block text-[14px] font-bold text-warn">{status === 'AWAITING_APPROVAL' ? 'Profile under review' : 'Complete your profile to receive campaign offers'}</span>
              <span className="block text-[12.5px] text-body">
                {status === 'AWAITING_APPROVAL'
                  ? 'We’ll notify you once you’re approved — then offers appear here.'
                  : 'You can’t be matched to any campaign until your profile is complete.'}
              </span>
            </span>
          </div>
          {status !== 'AWAITING_APPROVAL' && p?.missing && p.missing.length > 0 && (
            <div className="mt-3 border-t border-warn/20 pt-3">
              <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-warn">
                <span>Still to do</span>
                <span>{p.missing.length} step{p.missing.length === 1 ? '' : 's'} left →</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.missing.map((m) => (
                  <span key={m} className="rounded-full border border-warn/30 bg-paper px-2.5 py-1 text-[11.5px] font-semibold text-body">{missingLabel(m)}</span>
                ))}
              </div>
            </div>
          )}
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open offers" value={String(list.length)} accent="brand" />
        <StatCard label="Avg offer fee" value={avgFee ? naira(avgFee) : '—'} accent="ok" />
        <StatCard label="Your trust score" value={p ? `${p.trust_score} / 100` : '—'} accent="ink" />
        <StatCard label="Weekly capacity" value={p ? `${p.max_campaigns_per_week}` : '—'} accent="warn" sub="campaigns / week" />
      </div>

      {list.length > 3 && <SearchInput value={search} onChange={setSearch} placeholder="Search offers" />}

      <div className="space-y-4">
        {list.length === 0 && (
          <div className="card grid place-items-center p-12 text-center text-muted">
            <div className="text-[15px] font-semibold text-ink">No offers right now</div>
            <div className="mt-1 text-[13.5px]">Check back soon — new campaigns match to your channels.</div>
          </div>
        )}
        {filtered.map((o) => (
          <div key={o.id} className="card overflow-hidden">
            <div className="grid lg:grid-cols-[1fr_360px]">
              {/* Left — the ask */}
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button type="button" onClick={() => setDetailId(o.id)} className="text-left text-[17px] font-extrabold text-ink transition hover:text-brand-700">
                      {o.campaign_name}
                    </button>
                    <div className="mt-0.5 text-[12.5px] text-muted">{titleCase(o.role)} · expires in {countdown(o.expires_at)}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-ok-wash px-2.5 py-1 text-[11px] font-bold text-ok">● New</span>
                </div>

                <div className="mt-4 rounded-2xl bg-wash p-4">
                  <div className="text-[12px] font-semibold text-muted">What you’ll do</div>
                  <p className="mt-1 text-[13.5px] text-body">{taskForRole(o.role)}</p>
                </div>

                <button type="button" onClick={() => setDetailId(o.id)} className="mt-3 text-[13px] font-semibold text-brand-700 hover:underline">
                  View campaign details →
                </button>

                <div className="mt-3 flex gap-2.5">
                  <Button className="flex-1" loading={accept.isPending && accept.variables === o.id} onClick={() => accept.mutate(o.id)}>Accept →</Button>
                  <Button variant="secondary" className="flex-1" loading={decline.isPending && decline.variables === o.id} onClick={() => decline.mutate(o.id)}>Decline</Button>
                </div>
                {accept.error instanceof ApiError && accept.variables === o.id && (
                  <p className="mt-2 text-[12px] text-brand-700">{accept.error.message}</p>
                )}
              </div>

              {/* Right — the money (dark earn panel) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#2a0d0d] to-[#120708] p-5 text-white sm:p-6">
                <div className="text-[13px] text-white/60">You earn</div>
                <div className="text-[30px] font-extrabold leading-none">{naira(o.fee_minor)}</div>
                <div className="mt-1 text-[12px] text-white/60">Paid to your balance after review — usually within 24 hours.</div>

                <div className="mt-4 rounded-xl bg-white/10 p-3">
                  <div className="text-[11.5px] text-white/60">Expires in</div>
                  <div className="text-[17px] font-bold">{countdown(o.expires_at)}</div>
                </div>

                {o.fit_pct != null && (
                  <div className="mt-3 rounded-xl bg-white/10 p-3">
                    <div className="flex items-center justify-between text-[12px] text-white/70">
                      <span>Fit for you</span>
                      <span className="font-bold text-white">{o.fit_pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, o.fit_pct)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {list.length > 0 && filtered.length === 0 && <div className="card p-8 text-center text-[13px] text-muted">No offers match your search.</div>}
      </div>

      {detailId && (
        <OfferDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onAccept={() => accept.mutate(detailId)}
          onDecline={() => decline.mutate(detailId)}
          accepting={accept.isPending && accept.variables === detailId}
          declining={decline.isPending && decline.variables === detailId}
          error={accept.error instanceof ApiError && accept.variables === detailId ? accept.error.message : null}
        />
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-wash p-3">
      <div className="text-[11.5px] font-semibold text-muted">{label}</div>
      <div className="mt-0.5 text-[14px] font-bold text-ink">{value}</div>
    </div>
  );
}

function OfferDetailModal({
  id, onClose, onAccept, onDecline, accepting, declining, error,
}: {
  id: string;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  accepting: boolean;
  declining: boolean;
  error: string | null;
}) {
  const q = useQuery({ queryKey: ['offer', id], queryFn: () => api.get<OfferDetail>(`/v1/offers/${id}`) });
  const d = q.data;

  return (
    <Modal title={d?.campaign_name ?? 'Offer details'} onClose={onClose}>
      {q.isLoading || !d ? (
        <div className="grid h-40 place-items-center text-brand"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="text-[12.5px] text-muted">
            {titleCase(d.objective)} · {titleCase(d.role)}{d.fit_pct != null ? ` · ${d.fit_pct}% fit` : ''}
          </div>

          {d.description && <p className="text-[13.5px] leading-relaxed text-body">{d.description}</p>}

          <div className="rounded-xl bg-wash p-3">
            <div className="text-[11.5px] font-semibold text-muted">What you’ll do</div>
            <p className="mt-1 text-[13.5px] text-body">{d.task}</p>
          </div>

          {d.instructions && (
            <div className="rounded-xl border border-rule p-3">
              <div className="text-[11.5px] font-semibold text-muted">Instructions from the client</div>
              <p className="mt-1 whitespace-pre-line text-[13.5px] text-body">{d.instructions}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Fact label="You earn" value={d.fee_min.amount_minor === d.fee.amount_minor ? d.fee.amount_display : `${d.fee_min.amount_display} – ${d.fee.amount_display}`} />
            <Fact label="Posts required" value={d.posts_required > 1 ? `${d.posts_required} · ${titleCase(d.cadence)}` : 'One-off'} />
            <Fact label="Target views" value={compactNumber(d.promised_reach) + (d.posts_required > 1 ? ' / post' : '')} />
            <Fact label="Accept before" value={countdown(d.expires_at)} />
          </div>

          {d.channel && (
            <div className="text-[12.5px] text-muted">
              Posting to <span className="font-semibold text-ink">{titleCase(d.channel.platform)}</span>
              {d.channel.handle ? ` · ${d.channel.handle}` : ''}
            </div>
          )}

          {d.poster && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={d.poster.url} alt="Campaign poster" className="w-full rounded-xl border border-rule" />
          )}

          {d.caption && (
            <div className="rounded-xl bg-wash p-3 text-[13px] italic text-body">“{d.caption}”</div>
          )}

          {error && <p className="text-[12px] text-brand-700">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <Button className="flex-1" loading={accepting} onClick={onAccept}>Accept →</Button>
            <Button variant="secondary" className="flex-1" loading={declining} onClick={onDecline}>Decline</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
