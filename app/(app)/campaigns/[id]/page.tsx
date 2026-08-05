'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
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

  return (
    <div>
      <Link href="/campaigns" className="text-[13px] font-semibold text-muted">← My campaigns</Link>
      <div className="mt-3 flex items-center gap-2">
        <StatusPill status={a.latest_verdict === 'REJECTED' ? 'Rejected' : a.status} />
        <span className="text-[13px] text-muted">{titleCase(a.objective)}</span>
      </div>
      <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">{a.campaign_name}</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-wash p-4">
          <div className="text-[12px] text-muted">You earn</div>
          <div className="text-[24px] font-extrabold text-ink">{a.fee.amount_display}</div>
          <div className="text-[11.5px] text-muted">on ~{compactNumber(a.promised_reach)} effective views</div>
        </div>
        <div className="rounded-2xl bg-wash p-4">
          <div className="text-[12px] text-muted">Clicks driven</div>
          <div className="text-[24px] font-extrabold text-ink">{compactNumber(a.clicks)}</div>
          <div className="text-[11.5px] text-muted">from your tracking link</div>
        </div>
      </div>

      <section className="card mt-4 p-4">
        <h2 className="text-[14px] font-extrabold text-ink">What to do</h2>
        {a.instructions ? <p className="mt-2 text-[13.5px] text-body">{a.instructions}</p> : <p className="mt-2 text-[13.5px] text-muted">Post the campaign to your channel and keep it up for the required time.</p>}
        {a.destination_url && (
          <>
            <div className="mt-3 text-[12px] font-semibold text-muted">Link to share</div>
            <p className="break-all text-[13.5px] text-brand-700">{a.destination_url}</p>
          </>
        )}
      </section>

      {a.latest_verdict === 'REJECTED' && a.reject_reason && (
        <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <div className="text-[13px] font-bold text-brand-700">Your last submission was rejected</div>
          <p className="mt-1 text-[13px] text-body">{a.reject_reason}</p>
        </div>
      )}

      {submittable && <SubmitProof assignmentId={a.id} onDone={() => void qc.invalidateQueries({ queryKey: ['assignments'] })} />}
      {underReview && <ReviewState />}
      {done && <div className="mt-4 rounded-2xl border border-ok/30 bg-ok-wash p-4 text-[14px] font-semibold text-ok">Approved and paid to your balance. 🎉</div>}
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
    <section className="card mt-4 p-4">
      <h2 className="text-[14px] font-extrabold text-ink">Submit your proof</h2>
      <p className="mb-3 text-[12.5px] text-muted">Upload a screenshot that clearly shows your view count. Pay is pro-rata on the verified views.</p>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-rule bg-wash px-4 py-6 text-center">
        <span className="text-[24px]">⬆️</span>
        <span className="mt-1 text-[13.5px] font-semibold text-ink">{file ? file.name : 'Tap to upload a screenshot'}</span>
        <span className="text-[12px] text-muted">PNG or JPG, under 10 MB</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />
      </label>

      <div className="mt-3 space-y-3">
        <Field label="Views on your post">
          <input type="number" inputMode="numeric" className="input" value={views} onChange={(e) => setViews(e.target.value)} placeholder="e.g. 840" />
        </Field>
        <Field label="Public link (optional)" hint="A WhatsApp status has none — leave blank.">
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
      </div>

      {error && <p className="mt-2 text-[12px] text-brand-700">{error}</p>}
      <Button size="lg" className="mt-4 w-full" loading={busy} onClick={submit}>Submit proof</Button>
    </section>
  );
}

function ReviewState() {
  return (
    <div className="mt-4 rounded-2xl border border-warn/30 bg-warn-wash p-4">
      <div className="text-[14px] font-bold text-warn">Evidence received — under review</div>
      <div className="text-[13px] text-body">We approve most proofs the same day. You’ll be paid to your balance once it clears.</div>
    </div>
  );
}
