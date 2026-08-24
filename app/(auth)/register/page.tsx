'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError } from '@/lib/api';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River',
  'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT',
];

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({
    full_name: '', email: '', gender: '', date_of_birth: '',
    country: 'Nigeria', state: '', lga: '', phone: '', password: '',
  });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.full_name.trim()) return setError('Enter your full name.');
    if (!/^\+[1-9]\d{7,14}$/.test(f.phone)) return setError('Enter your WhatsApp number in international format, e.g. +2348012345678.');
    if (f.password.length < 10) return setError('Password must be at least 10 characters.');
    if (!accept) return setError('Please accept the terms of service and privacy notice.');
    setBusy(true);
    try {
      await api.post('/v1/auth/register', {
        role: 'PROMOTER',
        email: f.email,
        phone_e164: f.phone,
        password: f.password,
        full_name: f.full_name.trim(),
        gender: f.gender || undefined,
        date_of_birth: f.date_of_birth || undefined,
        country: f.country || undefined,
        state: f.state || undefined,
        lga: f.lga.trim() || undefined,
        accepted_terms: true,
        accepted_privacy: true,
      }, { auth: false });
      // Verification is by email OTP for now — carry both: email to show the promoter
      // where the code went, phone as the account key the verify endpoint uses.
      router.replace(`/verify?email=${encodeURIComponent(f.email)}&phone=${encodeURIComponent(f.phone)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account.');
      setBusy(false);
    }
  }

  return (
    <div>
      <LogoMark className="mb-5 h-9 w-9" />
      <p className="text-[13px] font-semibold text-brand-700">Register as a promoter</p>
      <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-ink">Start earning from your reach.</h1>
      <p className="mt-1.5 text-[14px] text-muted">You will be paid to use your voice, your phone, and your crowd!</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className="input" value={f.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="Chidera Okoye" />
          </Field>
          <Field label="Email">
            <input className="input" type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@email.com" required />
          </Field>
          <Field label="Gender">
            <select className="input appearance-none" value={f.gender} onChange={(e) => set({ gender: e.target.value })}>
              <option value="">Select</option>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Date of birth">
            <input className="input" type="date" value={f.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} />
          </Field>
          <Field label="Country">
            <select className="input appearance-none" value={f.country} onChange={(e) => set({ country: e.target.value })}>
              <option value="Nigeria">Nigeria</option>
            </select>
          </Field>
          <Field label="State">
            <select className="input appearance-none" value={f.state} onChange={(e) => set({ state: e.target.value })}>
              <option value="">Select your state</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="LGA">
            <input className="input" value={f.lga} onChange={(e) => set({ lga: e.target.value })} placeholder="Your local government area" />
          </Field>
          <Field label="WhatsApp number" hint="We text your verification code here.">
            <input className="input" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+234" required />
          </Field>
        </div>

        <Field label="Password" hint="At least 10 characters.">
          <PasswordInput autoComplete="new-password" value={f.password} onChange={(e) => set({ password: e.target.value })} placeholder="At least 10 characters" required />
        </Field>

        <label className="flex items-start gap-3 text-[13.5px] text-body">
          <input type="checkbox" className="mt-0.5 h-5 w-5 rounded accent-brand" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>I agree to Ralia&apos;s <span className="font-semibold text-ink">terms of service</span> and <span className="font-semibold text-ink">privacy notice</span>.</span>
        </label>

        {error && <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</p>}

        <Button type="submit" size="lg" loading={busy} className="w-full">Create account &amp; verify</Button>

        <button
          type="button"
          disabled
          title="Google sign-in is coming soon"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-rule bg-paper py-3 text-[14px] font-semibold text-muted opacity-60"
        >
          <GoogleGlyph /> Sign in with Google
          <span className="text-[11px] font-normal">(soon)</span>
        </button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        Already have an account? <Link href="/login" className="font-semibold text-brand-700">Log in</Link>
      </p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.2 5.6c4.2-3.9 6.6-9.6 6.6-16.1Z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1Z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.2-5.6c-2 1.4-4.6 2.2-8 2.2-6.4 0-11.8-3.8-13.6-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" />
    </svg>
  );
}
