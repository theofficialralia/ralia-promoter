'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { api, ApiError, type Tokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { setTokens } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const tokens = await api.post<Tokens>('/v1/auth/login', { email, password }, { auth: false });
      await setTokens(tokens);
      router.replace('/offers');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign you in.');
      setBusy(false);
    }
  }

  return (
    <div>
      <Logo label="Promoter" />
      <h1 className="mt-8 text-[26px] font-extrabold tracking-tight text-ink">Welcome back.</h1>
      <p className="mt-1 text-[14px] text-muted">Sign in to see offers and get paid.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email">
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </Field>
        <Field label="Password">
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
        </Field>
        {error && <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-[13px] text-brand-700">{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full">Sign in</Button>

        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
        </div>
        <GoogleSignInButton role="PROMOTER" />
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">New to Ralia? <Link href="/register" className="font-semibold text-brand-700">Create an account</Link></p>
    </div>
  );
}
