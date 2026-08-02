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
  // Step 2 — channel
  const [platform, setPlatform] = useState<Platform>('WHATSAPP_STATUS');
  const [claimed, setClaimed] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [active, setActive] = useState('');
  // Step 3 — bank
  const [bankCode, setBankCode] = useState('');
  const [acctNo, setAcctNo] = useState('');

  const toggle = (v: string, arr: string[], set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  async function saveAbout() {
    setBusy(true); setError(null);
    try {
      await api.put('/v1/promoters/me/profile', { full_name: fullName, preferred_categories: cats, languages_spoken: langs, max_campaigns_per_week: maxWeek });
      setStep(2);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save.'); } finally { setBusy(false); }
  }
  async function saveChannel() {
    setBusy(true); setError(null);
    try {
      await api.post('/v1/promoters/me/channels', { platform, claimed_audience: Number(claimed), is_group: isGroup, ...(isGroup ? { active_participants: Number(active) } : {}) });
      void qc.invalidateQueries({ queryKey: ['channels'] });
      setStep(3);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not add channel.'); } finally { setBusy(false); }
  }
  async function saveBank() {
    setBusy(true); setError(null);
    try {
      await api.post('/v1/promoters/me/bank', { bank_code: bankCode, account_number: acctNo });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      setStep(4);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save bank.'); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1.5">
        {[1, 2, 3].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-brand' : 'bg-rule'}`} />)}
      </div>

      {step === 1 && (
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">A few questions</h1>
          <p className="mt-1 text-[13.5px] text-muted">This helps us match you to the right campaigns.</p>
          <div className="mt-5 space-y-4">
            <Field label="Your name"><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" /></Field>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink">Niches you’d promote</div>
              <Chips options={CATEGORIES} selected={cats} onToggle={(v) => toggle(v, cats, setCats)} />
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink">Languages you speak</div>
              <Chips options={LANGUAGES} selected={langs} onToggle={(v) => toggle(v, langs, setLangs)} />
            </div>
            <Field label={`Max campaigns per week: ${maxWeek}`}>
              <input type="range" min={1} max={10} value={maxWeek} onChange={(e) => setMaxWeek(Number(e.target.value))} className="w-full accent-brand" />
            </Field>
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-5 w-full" loading={busy} disabled={!fullName} onClick={saveAbout}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Your best channel</h1>
          <p className="mt-1 text-[13.5px] text-muted">Where you’ll post. Ralia pays on effective reach — a conservative estimate of who actually sees your post.</p>
          <div className="mt-5 space-y-4">
            <Field label="Platform">
              <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
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
          <Button size="lg" className="mt-5 w-full" loading={busy} disabled={!claimed} onClick={saveChannel}>Continue</Button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Where you get paid</h1>
          <p className="mt-1 text-[13.5px] text-muted">Your earnings are sent here after review.</p>
          <div className="mt-5 space-y-4">
            <Field label="Bank code" hint="3–6 digits (e.g. 058 for GTBank)."><input className="input" inputMode="numeric" value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="058" /></Field>
            <Field label="Account number" hint="10-digit NUBAN."><input className="input" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" /></Field>
          </div>
          {error && <p className="mt-3 text-[12px] text-brand-700">{error}</p>}
          <Button size="lg" className="mt-5 w-full" loading={busy} disabled={acctNo.length !== 10} onClick={saveBank}>Finish</Button>
        </div>
      )}

      {step === 4 && (
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
