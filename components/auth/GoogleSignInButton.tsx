'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type Tokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

/**
 * "Sign in with Google" via Google Identity Services. Renders Google's official
 * button, and on success posts the returned ID token to /v1/auth/google (which
 * verifies it and logs the person in, creating the account on first use).
 *
 * Gated on NEXT_PUBLIC_GOOGLE_CLIENT_ID: with no client id configured it falls
 * back to the disabled "coming soon" affordance, so the page is never broken.
 */
export function GoogleSignInButton({ role = 'PROMOTER' }: { role?: 'PROMOTER' | 'CLIENT' }) {
  const router = useRouter();
  const { setTokens } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function init() {
      const g = window.google;
      if (!g || !ref.current) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp: { credential: string }) => {
          try {
            const tokens = await api.post<Tokens>('/v1/auth/google', { id_token: resp.credential, role }, { auth: false });
            await setTokens(tokens);
            router.replace('/onboarding');
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Google sign-in failed. Please try again.');
          }
        },
      });
      g.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320 });
    }

    if (window.google) { init(); return; }
    const id = 'google-gsi-script';
    let s = document.getElementById(id) as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement('script');
      s.id = id;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    s.addEventListener('load', init);
    return () => s?.removeEventListener('load', init);
  }, [role, router, setTokens]);

  if (!CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        title="Google sign-in is coming soon"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-rule bg-paper py-3 text-[14px] font-semibold text-muted opacity-60"
      >
        <GoogleGlyph /> Sign in with Google <span className="text-[11px] font-normal">(soon)</span>
      </button>
    );
  }

  return (
    <div>
      <div ref={ref} className="flex justify-center" />
      {error && <p className="mt-2 text-center text-[12px] text-brand-700">{error}</p>}
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
