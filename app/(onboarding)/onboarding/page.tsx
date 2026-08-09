'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { api, ApiError, type Platform } from '@/lib/api';

const CATEGORIES = ['Fashion', 'Tech', 'Food', 'Finance', 'Health', 'Education', 'Entertainment', 'Sports', 'Beauty', 'Travel'];
const LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo'];
const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'WHATSAPP_STATUS', label: 'WhatsApp Status' },
  { value: 'WHATSAPP_GROUP', label: 'WhatsApp Group' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'OFFLINE', label: 'Offline' },
];

// §3 roles, in the plain language the design uses ("How would you like to use Ralia").
const ROLES = [
  { value: 'DISTRIBUTOR', label: 'Share ready-made posts', blurb: 'Earn by posting brand-provided content on your social media.' },
  { value: 'CREATOR', label: 'Create content for brands', blurb: 'Create content with brand assets and talk about their product following the instructions they provide.' },
  { value: 'PARTICIPATOR', label: 'Complete campaign tasks', blurb: 'Earn by performing simple actions like installs, sign-ups, reviews, or shares.' },
];

// Single-select answer → normalised factor value.
const FREQ = [
  { label: 'Daily', value: 1 }, { label: 'Few times/week', value: 0.7 }, { label: 'Weekly', value: 0.4 }, { label: 'Rarely', value: 0.2 },
];
const EQUIP = [
  { label: 'Pro camera', value: 1 }, { label: 'Good phone', value: 0.7 }, { label: 'Basic phone', value: 0.4 },
];
const COMFORT = [
  { label: 'Yes', value: 1 }, { label: 'Somewhat', value: 0.6 }, { label: 'No', value: 0.2 },
];
const TURNAROUND = [
  { label: 'Under 24h', value: 1 }, { label: '1–2 days', value: 0.7 }, { label: '3+ days', value: 0.4 },
];
const YESNO = [{ label: 'Yes', value: 1 }, { label: 'No', value: 0.2 }];
const ACCOUNT_AGE = [
  { label: '2+ years', value: 1 }, { label: '1–2 years', value: 0.7 }, { label: 'Under a year', value: 0.4 }, { label: 'New', value: 0.2 },
];
const CONTENT_TYPES = ['Photos', 'Videos', 'Graphics', 'Writing'];
const TASK_TYPES = ['Sign-ups', 'Reviews', 'Surveys', 'Downloads', 'Referrals'];
const DEVICES = ['Phone', 'Second phone', 'Laptop', 'Tablet'];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — about
  const [fullName, setFullName] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [maxWeek, setMaxWeek] = useState(3);
  // Step 2 — strengths (roles + capability)
  const [roles, setRoles] = useState<string[]>([]);
  const [postingFrequency, setPostingFrequency] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<number | null>(null);
  const [cameraComfort, setCameraComfort] = useState<number | null>(null);
  const [turnaround, setTurnaround] = useState<number | null>(null);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [multiStep, setMultiStep] = useState<number | null>(null);
  const [accountAge, setAccountAge] = useState<number | null>(null);
  // Step 3 — channel
  const [platform, setPlatform] = useState<Platform>('WHATSAPP_STATUS');
  const [claimed, setClaimed] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [active, setActive] = useState('');
  // Step 4 — bank
  const [bankCode, setBankCode] = useState('');
  const [acctNo, setAcctNo] = useState('');

  const toggle = (v: string, arr: string[], set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const firstName = fullName.trim().split(/\s+/)[0] || '';

  async function saveAbout() {
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { full_name: fullName, preferred_categories: cats, languages_spoken: langs, max_campaigns_per_week: maxWeek });
      setStep(2);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  async function saveStrengths() {
    // Only send factors for the roles the promoter picked; missing single-selects
    // default to a neutral 0.5 so an unanswered question neither helps nor hurts.
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
      await api.put('/v1/promoters/me/profile', { roles, capability_inputs: f });
      setStep(3);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }

  async function saveChannel() {
    setBusy(true); setError(null);
    try {
      await api.post('/v1/promoters/me/channels', { platform, claimed_audience: Number(claimed), is_group: isGroup, ...(isGroup ? { active_participants: Number(active) } : {}) });
      void qc.invalidateQueries({ queryKey: ['channels'] });
      setStep(4);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not add channel.'); } finally { setBusy(false); }
  }
  async function saveBank() {
    setBusy(true); setError(null);
    try {
      await api.post('/v1/promoters/me/bank', { bank_code: bankCode, account_number: acctNo });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      setStep(5);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save bank.'); } finally { setBusy(false); }
  }

  return (
    <div>
      {step <= TOTAL_STEPS && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            {step > 1 ? (
              <button onClick={() => setStep((n) => n - 1)} className="text-muted hover:text-ink">← Back</button>
            ) : (
              <span className="text-ink">Complete your profile</span>
            )}
            <span className="text-muted tabular-nums">{step}/{TOTAL_STEPS}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rule">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Let&apos;s set up your profile.</h1>
          <p className="mt-1 text-[13.5px] text-muted">A few questions so we can match you to the right campaigns.</p>
          <div className="mt-6 space-y-4">
            <Field label="Your name"><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" /></Field>
            <div>
              <div className="mb-2 text-[13.5px] font-semibold text-ink">Niches you&apos;d promote</div>
              <Chips options={CATEGORIES} selected={cats} onToggle={(v) => toggle(v, cats, setCats)} />
            </div>
            <div>
              <div className="mb-2 text-[13.5px] font-semibold text-ink">Languages you speak</div>
              <Chips options={LANGUAGES} selected={langs} onToggle={(v) => toggle(v, langs, setLangs)} />
            </div>
            <Field label={`Max campaigns per week: ${maxWeek}`}>
              <input type="range" min={1} max={10} value={maxWeek} onChange={(e) => setMaxWeek(Number(e.target.value))} className="w-full accent-brand" />
            </Field>
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={!fullName || cats.length === 0 || langs.length === 0} onClick={saveAbout}>Continue →</Button>
        </div>
      )}

      {step === 2 && (
        <div>
          {firstName && <p className="text-[14px] font-semibold text-ink">Hello <span className="text-brand">{firstName}</span>!</p>}
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">How would you like to use Ralia</h1>
          <p className="mt-1 text-[13.5px] text-muted">Pick what fits you — you can choose more than one. Your answers set your capability score.</p>
          <div className="mt-6 space-y-5">
            <div className="space-y-3">
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

            {roles.includes('DISTRIBUTOR') && (
              <Choice label="How often do you post?" options={FREQ} value={postingFrequency} onPick={setPostingFrequency} />
            )}
            {roles.includes('CREATOR') && (
              <>
                <Choice label="What do you create with?" options={EQUIP} value={equipment} onPick={setEquipment} />
                <Choice label="Comfortable on camera?" options={COMFORT} value={cameraComfort} onPick={setCameraComfort} />
                <Choice label="How fast can you deliver?" options={TURNAROUND} value={turnaround} onPick={setTurnaround} />
                <div><div className="mb-2 text-[13.5px] font-semibold text-ink">What can you make?</div><Chips options={CONTENT_TYPES} selected={contentTypes} onToggle={(v) => toggle(v, contentTypes, setContentTypes)} /></div>
              </>
            )}
            {roles.includes('PARTICIPATOR') && (
              <>
                <div><div className="mb-2 text-[13.5px] font-semibold text-ink">Tasks you&apos;ll do</div><Chips options={TASK_TYPES} selected={taskTypes} onToggle={(v) => toggle(v, taskTypes, setTaskTypes)} /></div>
                <div><div className="mb-2 text-[13.5px] font-semibold text-ink">Devices you can use</div><Chips options={DEVICES} selected={devices} onToggle={(v) => toggle(v, devices, setDevices)} /></div>
                <Choice label="Willing to do multi-step tasks?" options={YESNO} value={multiStep} onPick={setMultiStep} />
                <Choice label="How old are your social accounts?" options={ACCOUNT_AGE} value={accountAge} onPick={setAccountAge} />
              </>
            )}
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={roles.length === 0} onClick={saveStrengths}>Continue →</Button>
        </div>
      )}

      {step === 3 && (
        <div>
          {firstName && <p className="text-[14px] font-semibold text-ink">Hello <span className="text-brand">{firstName}</span>!</p>}
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">Your best channel</h1>
          <p className="mt-1 text-[13.5px] text-muted">Where you&apos;ll post. Ralia pays on effective reach — a conservative estimate of who actually sees your post.</p>
          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-2 text-[13.5px] font-semibold text-ink">Platform</div>
              <div className="flex flex-wrap gap-2.5">
                {PLATFORMS.map((p) => {
                  const on = platform === p.value;
                  return (
                    <button key={p.value} type="button" onClick={() => setPlatform(p.value)}
                      className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${on ? 'bg-ink text-white' : 'border border-rule bg-paper text-ink hover:border-ink/30'}`}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={isGroup ? 'Total members' : 'Followers / contacts'}>
              <input type="number" inputMode="numeric" className="input" value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="e.g. 1200" />
            </Field>
            <label className="flex items-center gap-2.5 text-[14px] text-ink">
              <input type="checkbox" className="h-5 w-5 accent-brand" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
              This is a group / community
            </label>
            {isGroup && <Field label="Roughly how many are active?"><input type="number" inputMode="numeric" className="input" value={active} onChange={(e) => setActive(e.target.value)} placeholder="e.g. 400" /></Field>}
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={!claimed} onClick={saveChannel}>Continue →</Button>
        </div>
      )}

      {step === 4 && (
        <div>
          {firstName && <p className="text-[14px] font-semibold text-ink">Hello <span className="text-brand">{firstName}</span>!</p>}
          <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-ink">Where you get paid</h1>
          <p className="mt-1 text-[13.5px] text-muted">Your earnings are sent here after review.</p>
          <div className="mt-6 space-y-4">
            <Field label="Bank code" hint="3–6 digits (e.g. 058 for GTBank)."><input className="input" inputMode="numeric" value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="058" /></Field>
            <Field label="Account number" hint="10-digit NUBAN."><input className="input" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" /></Field>
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-6 w-full" loading={busy} disabled={acctNo.length !== 10} onClick={saveBank}>Finish →</Button>
        </div>
      )}

      {step === 5 && (
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
        return (
          <button key={o} type="button" onClick={() => onToggle(o)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'bg-brand text-white' : 'border border-rule text-body'}`}>{o}</button>
        );
      })}
    </div>
  );
}

/** Single-select segmented control mapping a labelled answer to a normalised value. */
function Choice({ label, options, value, onPick }: { label: string; options: { label: string; value: number }[]; value: number | null; onPick: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 text-[13.5px] font-semibold text-ink">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button key={o.label} type="button" onClick={() => onPick(o.value)} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'bg-brand text-white' : 'border border-rule text-body'}`}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}
