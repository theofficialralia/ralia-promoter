'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { api, ApiError, type Platform, type Profile } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';

const LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo'];
const ROLES: { value: string; label: string }[] = [
  { value: 'DISTRIBUTOR', label: 'Share ready-made posts' },
  { value: 'CREATOR', label: 'Create content for brands' },
  { value: 'PARTICIPATOR', label: 'Complete campaign tasks' },
];
const CHANNEL_PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'WHATSAPP_STATUS', label: 'WhatsApp Status' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
];

function Chips({ options, selected, onToggle }: { options: { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button key={o.value} type="button" onClick={() => onToggle(o.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${on ? 'bg-ink text-paper' : 'border border-rule bg-paper text-ink hover:border-ink/30'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Edit categories, languages, weekly capacity and roles — no re-onboarding. */
export function EditProfileModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const qc = useQueryClient();
  const [cats, setCats] = useState<string[]>(profile.preferred_categories ?? []);
  const [langs, setLangs] = useState<string[]>(profile.languages_spoken ?? []);
  const [roles, setRoles] = useState<string[]>(profile.roles ?? []);
  const [maxWeek, setMaxWeek] = useState<number>(profile.max_campaigns_per_week ?? 3);
  const [err, setErr] = useState<string | null>(null);
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = useMutation({
    mutationFn: () => api.put('/v1/promoters/me/profile', {
      preferred_categories: cats, languages_spoken: langs, max_campaigns_per_week: maxWeek, roles,
    }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['profile'] }); onClose(); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not save.'),
  });

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">Categories you’ll promote</p>
          <Chips options={CATEGORIES.map((c) => ({ value: c, label: c }))} selected={cats} onToggle={(v) => toggle(cats, setCats, v)} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">Languages you speak</p>
          <Chips options={LANGUAGES.map((l) => ({ value: l, label: l }))} selected={langs} onToggle={(v) => toggle(langs, setLangs, v)} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">How you promote</p>
          <Chips options={ROLES} selected={roles} onToggle={(v) => toggle(roles, setRoles, v)} />
        </div>
        <Field label={`Max campaigns per week: ${maxWeek}`}>
          <input type="range" min={1} max={10} value={maxWeek} onChange={(e) => setMaxWeek(Number(e.target.value))} className="w-full accent-brand" />
        </Field>
        {err && <p className="text-[12.5px] text-brand-700">{err}</p>}
        <div className="flex gap-2.5 pt-1">
          <Button className="flex-1" loading={save.isPending} onClick={() => { setErr(null); save.mutate(); }}>Save</Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Add a single channel without redoing onboarding. */
export function AddChannelModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<Platform>('INSTAGRAM');
  const [handle, setHandle] = useState('');
  const [url, setUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const linkless = platform === 'WHATSAPP_STATUS';

  const add = useMutation({
    mutationFn: () => api.post('/v1/promoters/me/channels', {
      platform, handle: handle.trim() || undefined, url: url.trim() || undefined, claimed_audience: Number(followers),
    }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['channels'] }); void qc.invalidateQueries({ queryKey: ['profile'] }); onClose(); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not add the channel.'),
  });

  function submit() {
    if (!followers || Number(followers) <= 0) return setErr('Enter your audience size.');
    if (!linkless && !handle.trim() && !url.trim()) return setErr('Add a handle or link so we can verify this channel.');
    setErr(null); add.mutate();
  }

  return (
    <Modal title="Add a channel" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Platform">
          <select className="input appearance-none" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {CHANNEL_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        {!linkless && (
          <>
            <Field label="Handle (optional)"><input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" /></Field>
            <Field label="Profile link (optional)"><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
          </>
        )}
        <Field label={linkless ? 'People who view your status' : 'Followers / audience size'}>
          <input className="input" type="number" inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="e.g. 5000" />
        </Field>
        {err && <p className="text-[12.5px] text-brand-700">{err}</p>}
        <div className="flex gap-2.5 pt-1">
          <Button className="flex-1" loading={add.isPending} onClick={submit}>Add channel</Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

/** Add a bank account with the Paystack resolve + name-match, without re-onboarding. */
export function AddBankModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const banks = useQuery({ queryKey: ['banks'], queryFn: () => api.get<{ name: string; code: string }[]>('/v1/promoters/me/banks') });
  const [bankCode, setBankCode] = useState('');
  const [acctNo, setAcctNo] = useState('');
  const [acctName, setAcctName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setAcctName(''); setErr(null);
    if (!bankCode || acctNo.length !== 10) return;
    setResolving(true);
    const t = setTimeout(() => {
      api.get<{ account_name: string }>(`/v1/promoters/me/bank/resolve?bank_code=${encodeURIComponent(bankCode)}&account_number=${encodeURIComponent(acctNo)}`)
        .then((r) => setAcctName(r.account_name))
        .catch((e) => setErr(e instanceof ApiError ? e.message : 'Could not resolve that account.'))
        .finally(() => setResolving(false));
    }, 300);
    return () => clearTimeout(t);
  }, [bankCode, acctNo]);

  const add = useMutation({
    mutationFn: () => api.post('/v1/promoters/me/bank', { bank_code: bankCode, account_number: acctNo, account_name: acctName.trim() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['bank'] }); onClose(); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not save the account.'),
  });

  return (
    <Modal title="Add bank account" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Bank">
          <select className="input appearance-none" value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
            <option value="">Select your bank</option>
            {(banks.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Account number">
          <input className="input" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" />
        </Field>
        {resolving && <p className="text-[12.5px] text-muted">Checking account…</p>}
        {acctName && (
          <div className="rounded-xl border border-ok/30 bg-ok-wash px-4 py-3">
            <p className="text-[13.5px] font-bold text-ink">✓ {acctName}</p>
            <p className="text-[12px] text-muted">If this isn’t you, check the number and bank.</p>
          </div>
        )}
        {err && <p className="text-[12.5px] text-brand-700">{err}</p>}
        <div className="flex gap-2.5 pt-1">
          <Button className="flex-1" loading={add.isPending} disabled={!acctName} onClick={() => { setErr(null); add.mutate(); }}>Save account</Button>
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}
