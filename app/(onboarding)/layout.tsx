'use client';

import { LogoMark } from '@/components/brand/Logo';
import { Spinner } from '@/components/ui/Spinner';
import { useRequireAuth } from '@/lib/auth';

/**
 * The "complete your profile" flow — a continuation of signup, so it uses the
 * same split-screen onboarding frame as register/verify (brand panel + form) and
 * deliberately shows no app tab-bar until the profile is submitted. Auth-guarded.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  }
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(120% 60% at 50% -10%, rgba(247,9,9,0.55), transparent 60%), linear-gradient(180deg, #3a0608 0%, #1a0304 55%, #120202 100%)',
          }}
        />
        <div className="relative">
          <LogoMark className="h-10 w-10" />
        </div>
        <div className="relative">
          <div className="mb-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border-2 border-brand/70 bg-gradient-to-br from-white/10 to-white/0 shadow-2xl">
            <div className="flex h-full items-center justify-center text-sm text-white/40">Promoter story</div>
          </div>
          <blockquote className="max-w-md text-[22px] font-medium italic leading-snug">
            “Ralia connects me with brands that actually fit my audience.
            <span className="text-white/60"> No endless emails or negotiations, just quality partnerships that make sense.”</span>
          </blockquote>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-paper px-6 py-10 sm:px-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
