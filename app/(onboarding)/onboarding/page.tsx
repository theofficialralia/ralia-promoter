'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { api, ApiError, type Platform } from '@/lib/api';

const CATEGORIES = ['Fashion', 'Tech', 'Food', 'Finance', 'Health', 'Education', 'Entertainment', 'Sports', 'Beauty', 'Travel'];
const LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo'];

// The channel with the promoter's highest following (design: 5 headline platforms).
const HIGH_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'WHATSAPP_STATUS', label: 'WhatsApp' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'X', label: 'X' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FACEBOOK', label: 'Facebook' },
];
const COMMUNITY_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'WHATSAPP_GROUP', label: 'WhatsApp Group' },
  { value: 'FACEBOOK', label: 'Facebook Group' },
];

// §3 roles, in the design's plain language.
const ROLES = [
  { value: 'DISTRIBUTOR', label: 'Share ready-made posts', blurb: 'Earn by posting brand-provided content on your social media.' },
  { value: 'CREATOR', label: 'Create content for brands', blurb: 'Create content with brand assets and talk about their product following the instructions they provide.' },
  { value: 'PARTICIPATOR', label: 'Complete campaign tasks', blurb: 'Earn by performing simple actions like installs, sign-ups, reviews, or shares.' },
];
const ROLE_ORDER = ['DISTRIBUTOR', 'CREATOR', 'PARTICIPATOR'];
const ROLE_TITLE: Record<string, string> = {
  DISTRIBUTOR: 'Sharing posts', CREATOR: 'Creating content', PARTICIPATOR: 'Completing tasks',
};

const FREQ = [{ label: 'Daily', value: 1 }, { label: 'Few times/week', value: 0.7 }, { label: 'Weekly', value: 0.4 }, { label: 'Rarely', value: 0.2 }];
const EQUIP = [{ label: 'Pro camera', value: 1 }, { label: 'Good phone', value: 0.7 }, { label: 'Basic phone', value: 0.4 }];
const COMFORT = [{ label: 'Yes', value: 1 }, { label: 'Somewhat', value: 0.6 }, { label: 'No', value: 0.2 }];
const TURNAROUND = [{ label: 'Under 24h', value: 1 }, { label: '1–2 days', value: 0.7 }, { label: '3+ days', value: 0.4 }];
const YESNO = [{ label: 'Yes', value: 1 }, { label: 'No', value: 0.2 }];
const ACCOUNT_AGE = [{ label: '2+ years', value: 1 }, { label: '1–2 years', value: 0.7 }, { label: 'Under a year', value: 0.4 }, { label: 'New', value: 0.2 }];
const CONTENT_TYPES = ['Photos', 'Videos', 'Graphics', 'Writing'];
const TASK_TYPES = ['Sign-ups', 'Reviews', 'Surveys', 'Downloads', 'Referrals'];
const DEVICES = ['Phone', 'Second phone', 'Laptop', 'Tablet'];

type Community = { platform: Platform; participants: string; link: string };

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Name comes from registration.
  const profileQ = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ full_name: string | null }>('/v1/promoters/me/profile'),
  });
  const firstName = (profileQ.data?.full_name ?? '').trim().split(/\s+/)[0] || '';

  // Step 1 — profile
  const [cats, setCats] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [channelPlatform, setChannelPlatform] = useState<Platform>('WHATSAPP_STATUS');
  const [channelUrl, setChannelUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [analyticsFile, setAnalyticsFile] = useState<File | null>(null);
  const [maxWeek, setMaxWeek] = useState(3);
  const [communities, setCommunities] = useState<Community[]>([{ platform: 'TELEGRAM', participants: '', link: '' }]);
  // Step 2 — bank
  const [bankCode, setBankCode] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [acctName, setAcctName] = useState('');
  // Step 3 — roles
  const [roles, setRoles] = useState<string[]>([]);
  // Per-role capability
  const [postingFrequency, setPostingFrequency] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<number | null>(null);
  const [cameraComfort, setCameraComfort] = useState<number | null>(null);
  const [turnaround, setTurnaround] = useState<number | null>(null);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [multiStep, setMultiStep] = useState<number | null>(null);
  const [accountAge, setAccountAge] = useState<number | null>(null);

  const toggle = (v: string, arr: string[], set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const roleSteps = ROLE_ORDER.filter((r) => roles.includes(r));
  const total = 3 + roleSteps.length;
  const currentRole = step >= 4 && step <= total ? roleSteps[step - 4] : null;

  async function saveProfile() {
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { preferred_categories: cats, languages_spoken: langs, max_campaigns_per_week: maxWeek });
      // The channel with the highest following.
      const channel = await api.post<{ id: string }>('/v1/promoters/me/channels', { platform: channelPlatform, url: channelUrl || undefined, claimed_audience: Number(followers) });
      // Optional analytics screenshot → queued for admin verification.
      if (analyticsFile) {
        const form = new FormData();
        form.append('file', analyticsFile);
        await api.postForm(`/v1/promoters/me/channels/${channel.id}/evidence`, form);
      }
      // Each managed community is a group channel. group_members is required for
      // groups, and active_participants must not exceed it.
      for (const c of communities) {
        if (!c.participants) continue;
        const members = Number(c.participants);
        await api.post('/v1/promoters/me/channels', {
          platform: c.platform, is_group: true, is_group_admin: true,
          group_members: members, active_participants: members,
          claimed_audience: members, url: c.link || undefined,
        });
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
      setStep(4);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  async function nextRoleStep() {
    // Advance through the per-role steps; on the last one, persist capability inputs.
    if (step < total) { setStep(step + 1); return; }
    const f: Record<string, number> = {};
    if (roles.includes('DISTRIBUTOR')) f.postingFrequency = postingFrequency ?? 0.5;
    if (roles.includes('CREATOR')) {
      f.equipment = equipment ?? 0.5;
      f.cameraComfort = cameraComfort ?? 0.5;
      f.turnaround = turnaround ?? 0.5;
      f.contentBreadth = contentTypes.length / CONTENT_TYPES.length;
    }
    if (roles.includes('PARTICIPATOR')) {
      f.taskBreadth = taskTypes.length / TASK_TYPES.length;
      f.deviceCoverage = devices.length / DEVICES.length;
      f.multiStepWillingness = multiStep ?? 0.5;
      f.agedAccounts = accountAge ?? 0.5;
    }
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { capability_inputs: f });
      setStep(total + 1);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  const Hello = () => firstName ? <p className="text-[14px] font-semibold text-ink">Hello <span className="text-brand">{firstName}</span>!</p> : null;

  return (
    <div>
      {step <= total && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            {step > 1 ? <button onClick={() => setStep((n) => n - 1)} className="text-muted hover:text-ink">← Back</button> : <span className="text-ink">Complete your profile</span>}
            <span className="text-muted tabular-nums">{step}/{total}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rule">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(step / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Step 1 — profile questions */}
      {step === 1 && (
        <div>
          <Hello />
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">A few questions</h1>
          <p className="mt-1 text-[13.5px] text-muted">Welcome to Ralia — this helps us position you and match the right campaigns.</p>
          <div className="mt-6 space-y-5">
            <div><div className="mb-2 text-[13.5px] font-semibold text-ink">Categories / Niche you&apos;d promote</div><Chips options={CATEGORIES} selected={cats} onToggle={(v) => toggle(v, cats, setCats)} /></div>
            <div><div className="mb-2 text-[13.5px] font-semibold text-ink">How many languages do you speak</div><Chips options={LANGUAGES} selected={langs} onToggle={(v) => toggle(v, langs, setLangs)} /></div>

            <div>
              <div className="mb-2 text-[13.5px] font-semibold text-ink">Select the channel with your highest following</div>
              <div className="flex flex-wrap gap-2.5">
                {HIGH_PLATFORMS.map((p) => {
                  const on = channelPlatform === p.value;
                  return <button key={p.value} type="button" onClick={() => setChannelPlatform(p.value)} className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'}`}>{p.label}</button>;
                })}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input className="input" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="Link to profile e.g https://…" />
                <input className="input" type="number" inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Number of followers" />
              </div>
              <label className="mt-3 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-rule bg-wash py-6 text-center transition hover:border-brand/40">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => setAnalyticsFile(e.target.files?.[0] ?? null)} />
                {analyticsFile ? (
                  <span className="text-[13px] font-semibold text-ink">{analyticsFile.name}</span>
                ) : (
                  <>
                    <span className="text-[13px] font-semibold text-ink">↑ Upload your analytics</span>
                    <span className="text-[12px] text-muted">JPG, PNG or WebP up to 5MB — helps verify your reach</span>
                  </>
                )}
              </label>
            </div>

            <Field label={`Max campaigns per week: ${maxWeek}`}>
              <input type="range" min={1} max={10} value={maxWeek} onChange={(e) => setMaxWeek(Number(e.target.value))} className="w-full accent-brand" />
            </Field>

            <div>
              <div className="mb-2 text-[13.5px] font-semibold text-ink">Online communities you manage <span className="font-normal text-muted">(optional)</span></div>
              <div className="space-y-3">
                {communities.map((c, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-3">
                    <select className="input appearance-none" value={c.platform} onChange={(e) => setCommunities((arr) => arr.map((x, j) => j === i ? { ...x, platform: e.target.value as Platform } : x))}>
                      {COMMUNITY_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <input className="input" type="number" inputMode="numeric" value={c.participants} onChange={(e) => setCommunities((arr) => arr.map((x, j) => j === i ? { ...x, participants: e.target.value } : x))} placeholder="No. of participants" />
                    <input className="input" value={c.link} onChange={(e) => setCommunities((arr) => arr.map((x, j) => j === i ? { ...x, link: e.target.value } : x))} placeholder="Link (optional)" />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setCommunities((arr) => [...arr, { platform: 'TELEGRAM', participants: '', link: '' }])} className="mt-2 text-[13.5px] font-semibold text-brand-700">+ Add another community</button>
            </div>
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={cats.length === 0 || langs.length === 0 || !followers} onClick={saveProfile}>Next →</Button>
        </div>
      )}

      {/* Step 2 — bank */}
      {step === 2 && (
        <div>
          <Hello />
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">Where you get paid</h1>
          <p className="mt-1 text-[13.5px] text-muted">Your earnings are sent here after review.</p>
          <div className="mt-6 space-y-4">
            <Field label="Bank code" hint="3–6 digits (e.g. 058 for GTBank)."><input className="input" inputMode="numeric" value={bankCode} onChange={(e) => setBankCode(e.target.value.replace(/\D/g, ''))} placeholder="058" /></Field>
            <Field label="Account number" hint="10-digit NUBAN."><input className="input" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" /></Field>
            <Field label="Account name"><input className="input" value={acctName} onChange={(e) => setAcctName(e.target.value)} placeholder="As it appears on your bank account" /></Field>
            {acctName.trim() && (
              <div className="flex items-start gap-2 rounded-xl border border-ok/30 bg-ok/5 px-4 py-3 text-[13px]">
                <span className="text-ok">✓</span>
                <span><span className="font-semibold text-ok">Account name confirmed.</span> <span className="text-muted">If this isn&apos;t you, change the account number.</span></span>
              </div>
            )}
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={!/^\d{3,6}$/.test(bankCode) || acctNo.length !== 10 || !acctName.trim()} onClick={saveBank}>Next →</Button>
        </div>
      )}

      {/* Step 3 — roles */}
      {step === 3 && (
        <div>
          <Hello />
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">How would you like to use Ralia</h1>
          <p className="mt-1 text-[13.5px] text-muted">Pick what fits you — you can choose more than one. We&apos;ll ask a couple of quick questions for each.</p>
          <div className="mt-6 space-y-3">
            {ROLES.map((r) => {
              const on = roles.includes(r.value);
              return (
                <button key={r.value} type="button" onClick={() => toggle(r.value, roles, setRoles)}
                  className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${on ? 'border-brand bg-brand/[0.04]' : 'border-rule hover:border-ink/30'}`}>
                  <span>
                    <span className="block text-[15px] font-bold text-ink">{r.label}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{r.blurb}</span>
                  </span>
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-[12px] text-white' : 'border-rule'}`}>{on ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={roles.length === 0} onClick={saveRoles}>Continue →</Button>
        </div>
      )}

      {/* Steps 4..N — one per selected role */}
      {currentRole && (
        <div>
          <Hello />
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">{ROLE_TITLE[currentRole]}</h1>
          <p className="mt-1 text-[13.5px] text-muted">A few questions about this role — they set your capability score.</p>
          <div className="mt-6 space-y-5">
            {currentRole === 'DISTRIBUTOR' && (
              <Choice label="How often do you post?" options={FREQ} value={postingFrequency} onPick={setPostingFrequency} />
            )}
            {currentRole === 'CREATOR' && (
              <>
                <Choice label="What do you create with?" options={EQUIP} value={equipment} onPick={setEquipment} />
                <Choice label="Comfortable on camera?" options={COMFORT} value={cameraComfort} onPick={setCameraComfort} />
                <Choice label="How fast can you deliver?" options={TURNAROUND} value={turnaround} onPick={setTurnaround} />
                <div><div className="mb-2 text-[13.5px] font-semibold text-ink">What can you make?</div><Chips options={CONTENT_TYPES} selected={contentTypes} onToggle={(v) => toggle(v, contentTypes, setContentTypes)} /></div>
              </>
            )}
            {currentRole === 'PARTICIPATOR' && (
              <>
                <div><div className="mb-2 text-[13.5px] font-semibold text-ink">Tasks you&apos;ll do</div><Chips options={TASK_TYPES} selected={taskTypes} onToggle={(v) => toggle(v, taskTypes, setTaskTypes)} /></div>
                <div><div className="mb-2 text-[13.5px] font-semibold text-ink">Devices you can use</div><Chips options={DEVICES} selected={devices} onToggle={(v) => toggle(v, devices, setDevices)} /></div>
                <Choice label="Willing to do multi-step tasks?" options={YESNO} value={multiStep} onPick={setMultiStep} />
                <Choice label="How old are your social accounts?" options={ACCOUNT_AGE} value={accountAge} onPick={setAccountAge} />
              </>
            )}
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} onClick={nextRoleStep}>{step === total ? 'Finish →' : 'Continue →'}</Button>
        </div>
      )}

      {/* Submitted */}
      {step === total + 1 && (
        <div className="grid place-items-center py-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-warn-wash text-[28px]">⏳</div>
          <h1 className="mt-4 text-[22px] font-extrabold text-ink">Profile submitted</h1>
          <p className="mt-1 max-w-xs text-[13.5px] text-muted">We review new promoters in under 24 hours. Once approved, offers appear on your Offers tab.</p>
          <Button size="lg" className="mt-6 w-full" onClick={() => router.replace('/offers')}>Go to Offers</Button>
        </div>
      )}
    </div>
  );
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

function Choice({ label, options, value, onPick }: { label: string; options: { label: string; value: number }[]; value: number | null; onPick: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 text-[13.5px] font-semibold text-ink">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return <button key={o.label} type="button" onClick={() => onPick(o.value)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'bg-brand text-white' : 'border border-rule text-body'}`}>{o.label}</button>;
        })}
      </div>
    </div>
  );
}
