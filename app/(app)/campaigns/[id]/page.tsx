'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { IconArrowLeft } from '@/components/brand/icons';
import { api, ApiError, type Assignment } from '@/lib/api';
import { compactNumber, titleCase } from '@/lib/format';

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['assignments'], queryFn: () => api.get<Assignment[]>('/v1/assignments') });

  const a = (q.data ?? []).find((x) => x.id === id);
  if (q.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  if (!a) return <div className="card p-8 text-center text-muted">This assignment was not found.</div>;

  const submittable = a.status === 'IN_PROGRESS' || a.status === 'REJECTED';
  const underReview = a.status === 'SUBMITTED';
  const done = a.status === 'PAID' || a.status === 'APPROVED';
  const rejected = a.latest_verdict === 'REJECTED';

  const glance: [string, string][] = [
    ['Role', titleCase(a.role)],
    ['Objective', titleCase(a.objective)],
    ['Fee', a.fee.amount_display],
    ['Priced for', `${compactNumber(a.promised_reach)} views`],
    ['Status', titleCase(rejected ? 'Rejected' : a.status)],
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="flex h-9 w-9 items-center justify-center rounded-full border border-rule text-muted transition hover:bg-wash hover:text-ink" aria-label="Back">
          <IconArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{a.campaign_name}</h1>
            <StatusPill status={rejected ? 'Rejected' : a.status} />
          </div>
          <div className="text-[13px] text-muted">{titleCase(a.objective)} · {titleCase(a.role)}</div>
        </div>
      </div>

      {/* You Earn hero */}
      <div className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0d0d] to-[#120708] p-6 text-white">
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="text-[13px] text-white/60">You earn</div>
            <div className="text-[34px] font-extrabold leading-none">{a.fee.amount_display}</div>
            <div className="mt-1 text-[12.5px] text-white/60">Paid to your balance after review — usually within 24 hours.</div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <div className="text-[11.5px] text-white/60">Priced for</div>
              <div className="text-[18px] font-bold">{compactNumber(a.promised_reach)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <div className="text-[11.5px] text-white/60">Clicks driven</div>
              <div className="text-[18px] font-bold">{compactNumber(a.clicks)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* What to do */}
        <section className="card p-5">
          <h2 className="text-[14px] font-extrabold text-brand-700">What to do</h2>
          <p className="mt-2 text-[13.5px] font-semibold text-body">{a.task}</p>
          {a.instructions && (
            <>
              <div className="mt-4 text-[12px] font-semibold text-muted">Notes from the business</div>
              <p className="text-[13.5px] text-body">{a.instructions}</p>
            </>
          )}
          {a.destination_url && (
            <>
              <div className="mt-4 text-[12px] font-semibold text-muted">Link to share</div>
              <p className="break-all text-[13.5px] text-brand-700">{a.destination_url}</p>
            </>
          )}
        </section>

        {/* At a glance */}
        <section className="card h-max p-5">
          <h2 className="text-[14px] font-extrabold text-brand-700">At a glance</h2>
          <dl className="mt-2 divide-y divide-rule">
            {glance.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-[12.5px] text-muted">{k}</dt>
                <dd className="text-[13.5px] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {rejected && a.reject_reason && (
        <div className="mt-5 rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <div className="text-[13px] font-bold text-brand-700">Your last submission was rejected</div>
          <p className="mt-1 text-[13px] text-body">{a.reject_reason}</p>
        </div>
      )}

      {submittable && <SubmitProof assignmentId={a.id} onDone={() => void qc.invalidateQueries({ queryKey: ['assignments'] })} />}
      {underReview && <ReviewState />}
      {done && <div className="mt-5 rounded-2xl border border-ok/30 bg-ok-wash p-4 text-[14px] font-semibold text-ok">Approved and paid to your balance. 🎉</div>}
    </div>
  );
}

function SubmitProof({ assignmentId, onDone }: { assignmentId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [views, setViews] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) return setError('Add a screenshot of your post’s view count.');
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (views) form.append('claimed_views', views);
      if (url) form.append('public_url', url);
      await api.postForm(`/v1/assignments/${assignmentId}/submission`, form);
      setSent(true);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your proof.');
      setBusy(false);
    }
  }

  if (sent) return <ReviewState />;

  return (
    <section className="mt-5">
      <div className="text-[13px] font-semibold text-brand-700">Active task · Submit proof</div>
      <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Show us your view count</h2>
      <p className="text-[13.5px] text-muted">Upload the evidence after your status ends. We approve most proofs the same day.</p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) { setFile(f); setError(null); } }}
            className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${dragging ? 'border-brand bg-brand/10' : 'border-brand/40 bg-brand/5'}`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-[22px] text-white">⬆</span>
            <span className="mt-3 text-[16px] font-bold text-ink">{file ? file.name : 'Drop your evidence, or click to browse'}</span>
            <span className="mt-1 text-[12.5px] text-muted">PNG or JPG, under 5 MB. Must show your status view count.</span>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Views on your post">
              <input type="number" inputMode="numeric" className="input" value={views} onChange={(e) => setViews(e.target.value)} placeholder="e.g. 840" />
            </Field>
            <Field label="Public URL (optional for WhatsApp)">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourlink" />
            </Field>
          </div>

          {error && <p className="mt-2 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-4 w-full sm:w-auto" loading={busy} onClick={submit}>Submit Proof →</Button>
        </div>

        {/* Good vs bad helper */}
        <div className="card h-max p-4">
          <div className="text-[13px] font-bold text-ink">Good vs bad evidence</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-ok/40 p-3 text-center">
              <div className="text-[11px] text-muted">Your post</div>
              <div className="mt-1 text-[20px] font-extrabold text-ink">842</div>
              <div className="text-[11px] text-muted">Views</div>
              <div className="mt-2 text-[11.5px] font-semibold text-ok">✓ View count visible</div>
            </div>
            <div className="rounded-xl border border-brand/40 p-3 text-center">
              <div className="text-[11px] text-muted">Your post</div>
              <div className="mt-1 text-[20px] font-extrabold text-ink">?</div>
              <div className="text-[11px] text-muted">Views</div>
              <div className="mt-2 text-[11.5px] font-semibold text-brand-700">✕ View count cropped</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewState() {
  return (
    <div className="mt-5 rounded-2xl border border-warn/30 bg-warn-wash p-4">
      <div className="text-[14px] font-bold text-warn">Evidence received — under review</div>
      <div className="text-[13px] text-body">We approve most proofs the same day. You’ll be paid to your balance once it clears.</div>
    </div>
  );
}
