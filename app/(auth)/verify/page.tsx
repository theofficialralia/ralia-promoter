'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { api, ApiError, type Tokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get('phone') ?? '';
  const email = params.get('email') ?? '';
  const { setTokens } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  // Resend cooldown — the code is time-bound (expires server-side in ~10 min), and
  // resending is gated so it can't be spammed.
  const [seconds, setSeconds] = useState(45);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const tokens = await api.post<Tokens>('/v1/auth/otp/verify', { phone_e164: phone, code }, { auth: false });
      await setTokens(tokens);
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code did not work.');
      setBusy(false);
    }
  }

  async function resend() {
    if (seconds > 0) return;
    await api.post('/v1/auth/otp/request', { phone_e164: phone }, { auth: false }).catch(() => {});
    setResent(true);
    setSeconds(45);
  }

  return (
    <div>
      <Logo label="Promoter" />
      <h1 className="mt-8 text-[26px] font-extrabold tracking-tight text-ink">Verify your email.</h1>
      <p className="mt-1 text-[14px] text-muted">We sent a 6-digit code to {email || 'your email'}. Check your inbox (and spam). It expires in 10 minutes.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Code">
          <input className="input text-center text-[22px] font-bold tracking-[0.4em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" required />
        </Field>
        {error && <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</p>}
        <Button type="submit" size="lg" loading={busy} disabled={code.length < 6} className="w-full">Verify &amp; continue</Button>
      </form>

      <button onClick={resend} disabled={seconds > 0} className="mt-5 w-full text-center text-[14px] text-muted disabled:opacity-60">
        {seconds > 0
          ? `Didn’t get it? Resend in 0:${String(seconds).padStart(2, '0')}`
          : resent ? 'Code re-sent — resend again' : 'Didn’t get it? Resend'}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={null}><VerifyInner /></Suspense>;
}
