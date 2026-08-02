const ACCESS = 'ralia.promoter.access';
const REFRESH = 'ralia.promoter.refresh';
export const session = {
  get access(): string | null { return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS); },
  get refresh(): string | null { return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH); },
  set(t: { access_token: string; refresh_token: string }) { localStorage.setItem(ACCESS, t.access_token); localStorage.setItem(REFRESH, t.refresh_token); },
  clear() { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); },
};
