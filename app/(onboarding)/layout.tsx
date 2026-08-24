'use client';

import { AuthShowcase } from '@/components/auth/AuthShowcase';
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
      <AuthShowcase />

      <main className="flex items-center justify-center bg-paper px-6 py-10 sm:px-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
