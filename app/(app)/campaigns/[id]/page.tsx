'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { IconArrowLeft, IconCopy } from '@/components/brand/icons';
import { api, ApiError, type AssignmentDetail } from '@/lib/api';
import { compactNumber, titleCase } from '@/lib/format';

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['assignment', id], queryFn: () => api.get<AssignmentDetail>(`/v1/assignments/${id}`) });

  if (q.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const a = q.data;
  if (!a) return <div className="card p-8 text-center text-muted">This assignment was not found.</div>;

  const submittable = a.status === 'IN_PROGRESS' || a.status === 'REJECTED';
  const underReview = a.status === 'SUBMITTED';
  const done = a.status === 'PAID' || a.status === 'APPROVED';
  const rejected = a.latest_verdict === 'REJECTED';
  const channelName = a.channel ? titleCase(a.channel.platform) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/campaigns" className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-rule text-muted transition hover:bg-wash hover:text-ink" aria-label="Back">
            <IconArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <div>
            <div className="text-[13px] font-semibold text-brand-700">Marketplace</div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{a.campaign_name}</h1>
            <div className="text-[13px] text-muted">
              {titleCase(a.objective)} campaign{channelName ? ` · ${channelName}` : ''} · 24-hour window
            </div>
          </div>
        </div>
        <StatusPill status={rejected ? 'Rejected' : a.status} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Steps */}
        <div className="space-y-3">
          <Step n={1} title="Download the poster" sub={a.poster ? `${a.poster.mime_type.split('/')[1]?.toUpperCase() ?? 'Image'} · ${fmtSize(a.poster.size_bytes)}` : 'The business asked Ralia to design this — check back shortly.'}>
            {a.poster && (
              <a href={a.poster.url} download target="_blank" rel="noreferrer">
                <Button variant="secondary">↓ Download</Button>
              </a>
            )}
          </Step>

          {a.caption && (
            <Step n={2} title="Copy the caption" sub="Paste exactly as written into your status text.">
              <CopyButton text={a.caption} label="Copy caption" />
              <p className="mt-3 rounded-xl bg-wash px-3.5 py-2.5 text-[13.5px] text-body">“{a.caption}”</p>
            </Step>
          )}

          {a.tracking_url && (
            <Step n={a.caption ? 3 : 2} title="Share your tracking link" sub="Use THIS link (not the raw one) so your clicks are counted toward your pay.">
              <CopyButton text={a.tracking_url} label="Copy link" />
              <p className="mt-3 break-all rounded-xl bg-wash px-3.5 py-2.5 text-[13px] font-medium text-brand-700">{a.tracking_url}</p>
            </Step>
          )}

          <Step n={(a.caption ? 3 : 2) + (a.tracking_url ? 1 : 0)} title="Keep the status live for 24 hours" sub="Then screenshot the view count and submit it below." />
        </div>

        {/* Right rail: earn + posting-to */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0d0d] to-[#120708] p-5 text-white">
            <div className="flex items-center justify-between text-[12px] text-white/60">
              <span>You Earn</span>
              <span>24h deadline</span>
            </div>
            <div className="mt-1 text-[26px] font-extrabold leading-none">{a.fee_min.amount_display} – {a.fee.amount_display}</div>
            <div className="mt-2 text-[12px] text-white/55">Paid to your balance after review — pro-rata on your verified views.</div>
          </div>

          {a.channel && (
            <div className="card p-5">
              <div className="text-[12px] font-semibold text-muted">Posting to</div>
              <div className="mt-1 text-[18px] font-extrabold text-ink">{channelName}</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {a.channel.handle ? `${a.channel.handle} · ` : ''}~{compactNumber(a.channel.effective_reach)} effective views
              </div>
            </div>
          )}

          {a.destination_url && (
            <div className="card p-4">
              <div className="text-[12px] font-semibold text-muted">Where the link goes</div>
              <p className="mt-1 break-all text-[13px] text-body">{a.destination_url}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejected reason */}
      {rejected && a.reject_reason && (
        <div className="mt-5 rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <div className="text-[13px] font-bold text-brand-700">Your last submission was rejected</div>
          <p className="mt-1 text-[13px] text-body">{a.reject_reason}</p>
        </div>
      )}

      {/* Submission (step 4) */}
      {a.submission && <SubmissionPreview submission={a.submission} rejected={rejected} done={done} underReview={underReview} />}

      {/* Submit proof */}
      {submittable && <SubmitProof assignmentId={a.id} channelName={channelName} onDone={() => void qc.invalidateQueries({ queryKey: ['assignment', id] })} />}
      {underReview && !a.submission && <ReviewState />}
      {done && <div className="mt-5 rounded-2xl border border-ok/30 bg-ok-wash p-4 text-[14px] font-semibold text-ok">Approved and paid to your balance. 🎉</div>}
    </div>
  );
}

function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="card flex items-start gap-4 p-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-[14px] font-bold text-brand-700">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-[15px] font-bold text-ink">{title}</div>
            <div className="text-[12.5px] text-muted">{sub}</div>
          </div>
          {children && <div className="shrink-0">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={() => void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
    >
      <IconCopy className="h-[16px] w-[16px]" /> {copied ? 'Copied' : label}
    </Button>
  );
}

function SubmissionPreview({ submission: s, rejected, done, underReview }: { submission: NonNullable<AssignmentDetail['submission']>; rejected: boolean; done: boolean; underReview: boolean }) {
  const views = s.verified_reach ?? s.claimed_views;
  const verdict = rejected ? 'Rejected' : done ? 'Approved' : underReview ? 'In review' : titleCase(s.verdict);
  return (
    <section className="mt-5">
      <div className="mb-2 text-[14px] font-extrabold text-ink">Your submission</div>
      <div className="card max-w-md overflow-hidden">
        <div className="relative aspect-video bg-wash">
          {s.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.image_url} alt="your proof" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-[12.5px] text-muted">No screenshot</div>
          )}
          {s.platform && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">{titleCase(s.platform)}</span>}
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-[18px] font-extrabold text-ink">{views != null ? compactNumber(views) : '—'}</div>
            <div className="text-[11.5px] text-muted">views</div>
          </div>
          <StatusPill status={verdict} />
        </div>
      </div>
    </section>
  );
}

function SubmitProof({ assignmentId, channelName, onDone }: { assignmentId: string; channelName: string | null; onDone: () => void }) {
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
    <section className="mt-6">
      <div className="text-[13px] font-semibold text-brand-700">Active task · Submit proof</div>
      <h2 className="text-[20px] font-extrabold tracking-tight text-ink">Show us your view count</h2>
      <p className="text-[13.5px] text-muted">
        Upload the evidence after your 24-hour status ends{channelName ? ` on ${channelName}` : ''}. We approve most proofs the same day.
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
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
            <Field label="Your total view count">
              <input type="number" inputMode="numeric" className="input" value={views} onChange={(e) => setViews(e.target.value)} placeholder="e.g. 840" />
            </Field>
            <Field label="Public URL (optional for WhatsApp)">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourlink" />
            </Field>
          </div>

          {error && <p className="mt-2 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-4 w-full sm:w-auto" loading={busy} onClick={submit}>Submit Proof →</Button>
        </div>

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
