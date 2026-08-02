'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError('Password must be at least 10 characters.');
    setBusy(true);
    try {
      await api.post('/v1/auth/register', { role: 'PROMOTER', email, phone_e164: phone, password }, { auth: false });
      router.replace(`/verify?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account.');
      setBusy(false);
    }
  }

  return (
    <div>
      <Logo label="Promoter" />
      <h1 className="mt-8 text-[26px] font-extrabold tracking-tight text-ink">Earn by promoting.</h1>
      <p className="mt-1 text-[14px] text-muted">See the fee before you accept. Post from channels you already use.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </Field>
        <Field label="Phone" hint="We text a code to verify it.">
          <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+2348012345678" required />
        </Field>
        <Field label="Password" hint="At least 10 characters.">
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" required />
        </Field>
        {error && <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full">Create account &amp; verify</Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">Already have an account? <Link href="/login" className="font-semibold text-brand-700">Log in</Link></p>
    </div>
  );
}
