'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { api, ApiError, type Platform } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';

const LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo'];
const HIGH_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'WHATSAPP_STATUS', label: 'WhatsApp' }, { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X' }, { value: 'TIKTOK', label: 'TikTok' }, { value: 'FACEBOOK', label: 'Facebook' },
];
const COMMUNITY_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'TELEGRAM', label: 'Telegram' }, { value: 'WHATSAPP_GROUP', label: 'WhatsApp Group' }, { value: 'FACEBOOK', label: 'Facebook Group' },
];
const ROLES = [
  { value: 'DISTRIBUTOR', label: 'Share ready-made posts', blurb: 'Earn by posting brand-provided content on your social media.' },
  { value: 'CREATOR', label: 'Create content for brands', blurb: 'Create content with brand assets and talk about their product following the instructions they provide.' },
  { value: 'PARTICIPATOR', label: 'Complete campaign tasks', blurb: 'Earn by performing simple actions like installs, sign-ups, reviews, or shares.' },
];
const ROLE_ORDER = ['DISTRIBUTOR', 'CREATOR', 'PARTICIPATOR'] as const;
const ROLE_CONTEXT: Record<string, string> = {
  DISTRIBUTOR: 'Because you chose to share brand content on your socials, tell us a little about your audience.',
  CREATOR: "Because you chose to create content for brands, we'd love to learn about your creative skills.",
  PARTICIPATOR: "Because you chose to complete campaign tasks, we'd like to know what kinds of campaigns you'll enjoy most.",
};

// One question per screen. `factor` is the capability_inputs key it feeds; a
// single-select stores the chosen option's value, a multi stores selected/total.
type Opt = { key: string; label: string; value: number };
type Question = { id: string; role: string; factor: string; multi: boolean; prompt: string; subtitle?: string; options: Opt[] };
const L = ['A', 'B', 'C', 'D', 'E'];
const opts = (items: [string, number][]): Opt[] => items.map(([label, value], i) => ({ key: L[i], label, value }));

const ROLE_QUESTIONS: Record<string, Question[]> = {
  DISTRIBUTOR: [
    { id: 'dist_reach', role: 'DISTRIBUTOR', factor: 'audienceSize', multi: false, prompt: 'How many people do your posts usually reach?', subtitle: 'This helps us match you with campaigns of the right size.', options: opts([['Under 500', 0.2], ['500–2,000', 0.5], ['2,000–10,000', 0.8], ['10,000+', 1]]) },
    { id: 'dist_freq', role: 'DISTRIBUTOR', factor: 'postingFrequency', multi: false, prompt: 'How often do you normally post?', options: opts([['Daily', 1], ['4–6 times a week', 0.8], ['2–3 times a week', 0.6], ['Once a week', 0.4], ['Occasionally', 0.2]]) },
  ],
  CREATOR: [
    { id: 'cre_content', role: 'CREATOR', factor: 'contentBreadth', multi: true, prompt: 'What kind of content do you enjoy creating?', subtitle: 'Select all that apply', options: opts([['Short form videos', 1], ['UGC/Skit', 1], ['Product review', 1], ['Photo', 1], ['Graphic', 1]]) },
    { id: 'cre_equip', role: 'CREATOR', factor: 'equipment', multi: false, prompt: 'What do you create with?', options: opts([['Pro camera', 1], ['Good phone', 0.7], ['Basic phone', 0.4]]) },
    { id: 'cre_camera', role: 'CREATOR', factor: 'cameraComfort', multi: false, prompt: 'Are you comfortable on camera?', options: opts([['Yes', 1], ['Somewhat', 0.6], ['No', 0.2]]) },
    { id: 'cre_turn', role: 'CREATOR', factor: 'turnaround', multi: false, prompt: 'How fast can you deliver?', options: opts([['Under 24h', 1], ['1–2 days', 0.7], ['3+ days', 0.4]]) },
  ],
  PARTICIPATOR: [
    { id: 'par_tasks', role: 'PARTICIPATOR', factor: 'taskBreadth', multi: true, prompt: 'Which of these tasks would you be happy to complete?', subtitle: 'Select all that apply', options: opts([['Install & sign up to an application', 1], ['Leave a Review on playstore/appstore/website', 1], ['Attend an event', 1], ['Drive Engagement', 1], ['Refer', 1]]) },
    { id: 'par_devices', role: 'PARTICIPATOR', factor: 'deviceCoverage', multi: true, prompt: 'Which devices can you use?', subtitle: 'Select all that apply', options: opts([['Phone', 1], ['Second phone', 1], ['Laptop', 1], ['Tablet', 1]]) },
    { id: 'par_multi', role: 'PARTICIPATOR', factor: 'multiStepWillingness', multi: false, prompt: 'Willing to do multi-step tasks?', options: opts([['Yes', 1], ['No', 0.2]]) },
    { id: 'par_age', role: 'PARTICIPATOR', factor: 'agedAccounts', multi: false, prompt: 'How old are your social accounts?', options: opts([['2+ years', 1], ['1–2 years', 0.7], ['Under a year', 0.4], ['New', 0.2]]) },
  ],
};

// The self-reported factors the backend accepts (scoring.ts). Questions can carry
// extra factors for UX (e.g. audienceSize) that are captured but not persisted —
// audience size is already covered by the channel's verified reach.
const KNOWN_FACTORS = new Set([
  'postingFrequency', 'contentBreadth', 'equipment', 'cameraComfort', 'turnaround',
  'taskBreadth', 'deviceCoverage', 'multiStepWillingness', 'agedAccounts',
]);

type Community = { platform: Platform; participants: string; link: string };
const DOTS = { backgroundImage: 'radial-gradient(circle, rgba(120,120,130,0.18) 1.2px, transparent 1.2px)', backgroundSize: '24px 24px' } as const;

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1); // 1 profile · 2 bank · 3 roles · 4 questions · 5 review
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQ = useQuery({ queryKey: ['profile'], queryFn: () => api.get<{ full_name: string | null }>('/v1/promoters/me/profile') });
  const firstName = (profileQ.data?.full_name ?? '').trim().split(/\s+/)[0] || '';

  // Step 1 — profile
  const [cats, setCats] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [channelPlatform, setChannelPlatform] = useState<Platform>('WHATSAPP_STATUS');
  const [channelUrl, setChannelUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [analytics, setAnalytics] = useState<File | null>(null);
  const [maxWeek, setMaxWeek] = useState(3);
  const [communities, setCommunities] = useState<Community[]>([{ platform: 'TELEGRAM', participants: '', link: '' }]);
  // Step 2 — bank
  const [bankCode, setBankCode] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [acctName, setAcctName] = useState('');
  // Step 3 — roles
  const [roles, setRoles] = useState<string[]>([]);
  // Step 4 — cinematic questions
  const [qIndex, setQIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showSkip, setShowSkip] = useState(false);

  const toggle = (v: string, arr: string[], set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const questions = useMemo(() => ROLE_ORDER.filter((r) => roles.includes(r)).flatMap((r) => ROLE_QUESTIONS[r]), [roles]);
  const totalQ = questions.length;
  const currentQ = questions[qIndex];
  const totalSteps = 3 + totalQ + 1;
  const globalPos = step <= 3 ? step : step === 4 ? 3 + qIndex + 1 : totalSteps;

  async function saveProfile() {
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { preferred_categories: cats, languages_spoken: langs, max_campaigns_per_week: maxWeek });
      const channel = await api.post<{ id: string }>('/v1/promoters/me/channels', { platform: channelPlatform, url: channelUrl || undefined, claimed_audience: Number(followers) });
      if (analytics && channel?.id) {
        const form = new FormData();
        form.append('file', analytics);
        await api.postForm(`/v1/promoters/me/channels/${channel.id}/evidence`, form).catch(() => {});
      }
      for (const c of communities) {
        if (!c.participants) continue;
        const members = Number(c.participants);
        await api.post('/v1/promoters/me/channels', { platform: c.platform, is_group: true, is_group_admin: true, group_members: members, active_participants: members, claimed_audience: members, url: c.link || undefined });
      }
      void qc.invalidateQueries({ queryKey: ['channels'] });
      setStep(2);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  async function saveBank() {
    setBusy(true); setError(null);
    try {
      await api.post('/v1/promoters/me/bank', { bank_code: bankCode, account_number: acctNo, account_name: acctName.trim() });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      setStep(3);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save bank.'); } finally { setBusy(false); }
  }

  async function saveRoles() {
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { roles });
      setQIndex(0); setDir(1); setStep(4);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  function pickAnswer(q: Question, key: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (q.multi) return { ...prev, [q.id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
      return { ...prev, [q.id]: [key] };
    });
  }

  async function finalize(list: Question[]) {
    const f: Record<string, number> = {};
    for (const q of list) {
      if (!KNOWN_FACTORS.has(q.factor)) continue; // captured for UX, not a scored factor
      const a = answers[q.id];
      if (q.multi) f[q.factor] = a && a.length ? a.length / q.options.length : 0;
      else f[q.factor] = a && a.length ? q.options.find((o) => o.key === a[0])!.value : 0.5;
    }
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { capability_inputs: f });
      setStep(5);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  function qNext() {
    if (qIndex < totalQ - 1) { setDir(1); setQIndex((i) => i + 1); } else { void finalize(questions); }
  }
  function qBack() {
    if (qIndex > 0) { setDir(-1); setQIndex((i) => i - 1); } else { setStep(3); }
  }
  async function dropRole(role: string) {
    const next = roles.filter((r) => r !== role);
    setRoles(next);
    await api.put('/v1/promoters/me/profile', { roles: next }).catch(() => {});
    if (next.length === 0) { setStep(3); return; }
    const newList = ROLE_ORDER.filter((r) => next.includes(r)).flatMap((r) => ROLE_QUESTIONS[r]);
    const firstUnanswered = newList.findIndex((q) => !(answers[q.id]?.length));
    if (firstUnanswered === -1) { void finalize(newList); return; }
    setDir(1); setQIndex(firstUnanswered);
  }

  // ── Fixed steps (split-screen, from the onboarding layout) ──
  if (step <= 3) {
    return (
      <div>
        <ProgressHeader pos={globalPos} total={totalSteps} onBack={step > 1 ? () => setStep((n) => n - 1) : undefined} />
        {step === 1 && (
          <StepProfile {...{ firstName, cats, setCats, langs, setLangs, channelPlatform, setChannelPlatform, channelUrl, setChannelUrl, followers, setFollowers, analytics, setAnalytics, maxWeek, setMaxWeek, communities, setCommunities, toggle, busy, error, onNext: saveProfile }} />
        )}
        {step === 2 && (
          <StepBank {...{ firstName, bankCode, setBankCode, acctNo, setAcctNo, acctName, setAcctName, busy, error, onNext: saveBank }} />
        )}
        {step === 3 && (
          <StepRoles {...{ firstName, roles, setRoles, toggle, busy, error, onNext: saveRoles }} />
        )}
      </div>
    );
  }

  // ── Cinematic question flow + review (full-width, dotted) ──
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-wash" style={DOTS}>
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-5 py-6">
        <div className="mb-2 flex items-center gap-4">
          <span className="text-[14px] font-bold text-ink">Complete your profile</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-rule">
            <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${(globalPos / totalSteps) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </div>
          <span className="text-[13px] font-semibold text-muted tabular-nums">{globalPos}/{totalSteps}</span>
        </div>

        {step === 4 && currentQ && (
          <>
            <div className="mt-3 flex items-start gap-3">
              <button onClick={qBack} className="mt-3 flex shrink-0 items-center gap-2 text-[15px] font-semibold text-muted hover:text-ink">← back</button>
              <div className="flex flex-1 items-center justify-between gap-4 rounded-3xl border border-rule bg-paper/70 p-4 backdrop-blur">
                <p className="text-[15px] font-semibold text-ink">{ROLE_CONTEXT[currentQ.role]}</p>
                <button onClick={() => void dropRole(currentQ.role)} className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:opacity-90">
                  Not interested in this role anymore ↪
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-8">
              <motion.div
                className="mb-8 h-16 w-16 rounded-full"
                style={{ background: 'radial-gradient(circle at 35% 30%, #ff6a6a, #E23B2E 55%, #7a1109)' }}
                animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={currentQ.id}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -60 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="w-full max-w-xl"
                >
                  <h1 className="text-center text-[24px] font-extrabold tracking-tight text-ink">{currentQ.prompt}</h1>
                  {currentQ.subtitle && <p className="mt-1 text-center text-[14px] text-muted">{currentQ.subtitle}</p>}
                  <div className="mt-6 space-y-3">
                    {currentQ.options.map((o) => {
                      const on = (answers[currentQ.id] ?? []).includes(o.key);
                      return (
                        <button key={o.key} type="button" onClick={() => pickAnswer(currentQ, o.key)}
                          className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-paper p-3.5 text-left text-[15px] transition ${on ? 'border-brand ring-2 ring-brand/20' : 'border-rule hover:border-ink/30'}`}>
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[14px] font-bold ${on ? 'bg-brand text-white' : 'bg-brand/10 text-brand'}`}>{o.key}</span>
                          <span className="font-medium text-ink">{o.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {error && <p className="mt-4 text-[12px] text-brand-700">{error}</p>}
              <div className="mt-8 flex w-full max-w-xl gap-3">
                <button onClick={() => setShowSkip(true)} className="flex-1 rounded-2xl border border-rule bg-paper py-3.5 text-[15px] font-semibold text-ink transition hover:border-ink/30">Skip this process →</button>
                <button onClick={qNext} disabled={busy || !(answers[currentQ.id]?.length)} className="flex-1 rounded-2xl bg-brand py-3.5 text-[15px] font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40">Continue →</button>
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 16 }}
              className="grid h-28 w-28 place-items-center rounded-full bg-warn/10">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-warn text-[26px] text-white">🕐</span>
            </motion.div>
            <span className="mt-6 rounded-full bg-warn/10 px-5 py-2 text-[15px] font-bold text-warn">Under review</span>
            <h1 className="mt-4 text-[24px] font-extrabold tracking-tight text-ink">Your profile is in the queue.</h1>
            <p className="mt-1 max-w-md text-[14px] text-muted">This usually takes less than 24 hours. We&apos;ll notify you by WhatsApp and email the moment you&apos;re approved.</p>
            <div className="mt-8 w-full max-w-md overflow-hidden rounded-2xl border border-rule bg-paper">
              {[['Onboarding / Registration', true], ['Bank Details', true], ['Role selection', true], ['Admin review', false]].map(([label, done]) => (
                <div key={label as string} className="flex items-center gap-3 border-b border-rule px-4 py-3.5 last:border-0">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[13px] text-white ${done ? 'bg-ok' : 'bg-warn'}`}>{done ? '✓' : '🕐'}</span>
                  <span className="text-[14.5px] font-medium text-ink">{label as string}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="mt-8 w-full max-w-md" onClick={() => router.replace('/offers')}>Go to Offers</Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSkip && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-5" onClick={() => setShowSkip(false)}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-paper p-7 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand/10">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-[22px] text-white">!</span>
              </div>
              <h2 className="mt-5 text-[20px] font-extrabold text-ink">Are you sure you want to skip</h2>
              <p className="mt-1.5 text-[13.5px] text-muted">If you skip you won&apos;t be able to receive campaign offers until you complete the onboarding.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowSkip(false)} className="flex-1 rounded-2xl bg-brand py-3 text-[14px] font-semibold text-white">Cancel</button>
                <button onClick={() => router.replace('/offers')} className="flex-1 rounded-2xl border border-rule bg-paper py-3 text-[14px] font-semibold text-ink">Yes, Skip for now</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared bits ─────────────────────────────────────────────

function ProgressHeader({ pos, total, onBack }: { pos: number; total: number; onBack?: () => void }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-[13px] font-semibold">
        {onBack ? <button onClick={onBack} className="text-muted hover:text-ink">← Back</button> : <span className="text-ink">Complete your profile</span>}
        <span className="text-muted tabular-nums">{pos}/{total}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rule">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(pos / total) * 100}%` }} />
      </div>
    </div>
  );
}

function Hello({ name }: { name: string }) {
  if (!name) return null;
  return <p className="text-[14px] font-semibold text-ink">Hello <span className="text-brand">{name}</span>!</p>;
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return <button key={o} type="button" onClick={() => onToggle(o)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'bg-brand text-white' : 'border border-rule text-body'}`}>{o}</button>;
      })}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function StepProfile(p: any) {
  return (
    <div>
      <Hello name={p.firstName} />
      <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">A few questions</h1>
      <p className="mt-1 text-[13.5px] text-muted">Welcome to Ralia — this helps us position you and match the right campaigns.</p>
      <div className="mt-6 space-y-5">
        <div><div className="mb-2 text-[13.5px] font-semibold text-ink">Categories / Niche you&apos;d promote</div><Chips options={CATEGORIES} selected={p.cats} onToggle={(v: string) => p.toggle(v, p.cats, p.setCats)} /></div>
        <div><div className="mb-2 text-[13.5px] font-semibold text-ink">How many languages do you speak</div><Chips options={LANGUAGES} selected={p.langs} onToggle={(v: string) => p.toggle(v, p.langs, p.setLangs)} /></div>
        <div>
          <div className="mb-2 text-[13.5px] font-semibold text-ink">Select the channel with your highest following</div>
          <div className="flex flex-wrap gap-2.5">
            {HIGH_PLATFORMS.map((pl) => {
              const on = p.channelPlatform === pl.value;
              return <button key={pl.value} type="button" onClick={() => p.setChannelPlatform(pl.value)} className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'}`}>{pl.label}</button>;
            })}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input className="input" value={p.channelUrl} onChange={(e) => p.setChannelUrl(e.target.value)} placeholder="Link to profile e.g https://…" />
            <input className="input" type="number" inputMode="numeric" value={p.followers} onChange={(e) => p.setFollowers(e.target.value)} placeholder="Number of followers" />
          </div>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rule bg-wash py-6 text-center transition hover:border-brand/40">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => p.setAnalytics(e.target.files?.[0] ?? null)} />
            <span className="text-[13px] font-semibold text-ink">{p.analytics ? p.analytics.name : '↑ Upload your analytics'}</span>
            <span className="text-[12px] text-muted">JPG, PNG up to 5MB</span>
          </label>
        </div>
        <Field label={`Max campaigns per week: ${p.maxWeek}`}>
          <input type="range" min={1} max={10} value={p.maxWeek} onChange={(e) => p.setMaxWeek(Number(e.target.value))} className="w-full accent-brand" />
        </Field>
        <div>
          <div className="mb-2 text-[13.5px] font-semibold text-ink">Online communities you manage <span className="font-normal text-muted">(optional)</span></div>
          <div className="space-y-3">
            {p.communities.map((c: Community, i: number) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                <select className="input appearance-none" value={c.platform} onChange={(e) => p.setCommunities((arr: Community[]) => arr.map((x, j) => j === i ? { ...x, platform: e.target.value as Platform } : x))}>
                  {COMMUNITY_PLATFORMS.map((pl) => <option key={pl.value} value={pl.value}>{pl.label}</option>)}
                </select>
                <input className="input" type="number" inputMode="numeric" value={c.participants} onChange={(e) => p.setCommunities((arr: Community[]) => arr.map((x, j) => j === i ? { ...x, participants: e.target.value } : x))} placeholder="No. of participants" />
                <input className="input" value={c.link} onChange={(e) => p.setCommunities((arr: Community[]) => arr.map((x, j) => j === i ? { ...x, link: e.target.value } : x))} placeholder="Link (optional)" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => p.setCommunities((arr: Community[]) => [...arr, { platform: 'TELEGRAM', participants: '', link: '' }])} className="mt-2 text-[13.5px] font-semibold text-brand-700">+ Add another community</button>
        </div>
      </div>
      {p.error && <p className="mt-3 text-[12px] text-brand-700">{p.error}</p>}
      <Button size="lg" className="mt-6 w-full" loading={p.busy} disabled={p.cats.length === 0 || p.langs.length === 0 || !p.followers} onClick={p.onNext}>Next →</Button>
    </div>
  );
}

function StepBank(p: any) {
  return (
    <div>
      <Hello name={p.firstName} />
      <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">Where you get paid</h1>
      <p className="mt-1 text-[13.5px] text-muted">Your earnings are sent here after review.</p>
      <div className="mt-6 space-y-4">
        <Field label="Bank code" hint="3–6 digits (e.g. 058 for GTBank)."><input className="input" inputMode="numeric" value={p.bankCode} onChange={(e) => p.setBankCode(e.target.value.replace(/\D/g, ''))} placeholder="058" /></Field>
        <Field label="Account number" hint="10-digit NUBAN."><input className="input" inputMode="numeric" maxLength={10} value={p.acctNo} onChange={(e) => p.setAcctNo(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" /></Field>
        <Field label="Account name"><input className="input" value={p.acctName} onChange={(e) => p.setAcctName(e.target.value)} placeholder="As it appears on your bank account" /></Field>
        {p.acctName.trim() && (
          <div className="flex items-start gap-2 rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-[13px]">
            <span className="text-ok">✓</span><span><span className="font-semibold text-ok">Account name confirmed.</span> <span className="text-muted">If this isn&apos;t you, change the account number.</span></span>
          </div>
        )}
      </div>
      {p.error && <p className="mt-3 text-[12px] text-brand-700">{p.error}</p>}
      <Button size="lg" className="mt-6 w-full" loading={p.busy} disabled={!/^\d{3,6}$/.test(p.bankCode) || p.acctNo.length !== 10 || !p.acctName.trim()} onClick={p.onNext}>Next →</Button>
    </div>
  );
}

function StepRoles(p: any) {
  return (
    <div>
      <Hello name={p.firstName} />
      <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">How would you like to use Ralia</h1>
      <p className="mt-1 text-[13.5px] text-muted">Pick what fits you — you can choose more than one. We&apos;ll ask a couple of quick questions for each.</p>
      <div className="mt-6 space-y-3">
        {ROLES.map((r) => {
          const on = p.roles.includes(r.value);
          return (
            <button key={r.value} type="button" onClick={() => p.toggle(r.value, p.roles, p.setRoles)}
              className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${on ? 'border-brand bg-brand/[0.04]' : 'border-rule hover:border-ink/30'}`}>
              <span><span className="block text-[15px] font-bold text-ink">{r.label}</span><span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{r.blurb}</span></span>
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-[12px] text-white' : 'border-rule'}`}>{on ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>
      {p.error && <p className="mt-3 text-[12px] text-brand-700">{p.error}</p>}
      <Button size="lg" className="mt-6 w-full" loading={p.busy} disabled={p.roles.length === 0} onClick={p.onNext}>Continue →</Button>
    </div>
  );
}
