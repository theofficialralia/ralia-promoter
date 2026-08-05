import { session } from './session';
import type { Money } from './money';

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; auth?: boolean; idempotencyKey?: string; form?: FormData };

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const token = session.refresh;
  if (!token) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch('/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: token }),
      });
      if (!res.ok) { session.clear(); return false; }
      session.set(await res.json());
      return true;
    } finally { refreshing = null; }
  })();
  return refreshing;
}

async function raw<T>(path: string, opts: Options, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (!opts.form) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && session.access) headers.Authorization = `Bearer ${session.access}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const res = await fetch(path, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });

  if (res.status === 401 && retry && opts.auth !== false) {
    if (await tryRefresh()) return raw<T>(path, opts, false);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message ?? res.statusText;
    throw new ApiError(res.status, message, data?.code);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => raw<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, extra?: Omit<Options, 'method' | 'body'>) => raw<T>(path, { method: 'POST', body, ...extra }),
  put: <T>(path: string, body?: unknown) => raw<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => raw<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, form: FormData) => raw<T>(path, { method: 'POST', form }),
};

export function uuid(): string { return crypto.randomUUID(); }

// ── Response shapes ──────────────────────────────────────────

export type Tokens = { access_token: string; refresh_token: string; expires_in: number; token_type: string };
export type Me = { id: string; email: string; phone_e164: string; roles: string[]; status: string };

export type Platform = 'WHATSAPP_STATUS' | 'WHATSAPP_GROUP' | 'TELEGRAM' | 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'X' | 'LINKEDIN' | 'OFFLINE';

export type Profile = {
  full_name: string | null;
  status: string;
  trust_score: number;
  languages_spoken: string[];
  preferred_categories: string[];
  max_campaigns_per_week: number;
};

export type Channel = {
  id: string;
  platform: Platform;
  handle: string | null;
  claimed_audience: number;
  effective_reach: number;
  verification_tier: 'SELF' | 'SCREENSHOT' | 'INSIGHTS';
  status: string;
  is_group?: boolean;
};

export type BankAccount = { id: string; bank_code: string; account_number_masked: string; account_name: string | null; is_default: boolean };

export type Offer = {
  id: string;
  campaign_id: string;
  campaign_name: string;
  role: string;
  fee_minor: number;
  expires_at: string;
  status: string;
  fit_pct: number | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

export type NotificationList = { items: Notification[]; unread: number };

export type Assignment = {
  id: string;
  campaign_id: string;
  campaign_name: string;
  objective: string;
  role: string;
  fee: Money;
  promised_reach: number;
  status: string;
  due_at: string | null;
  instructions: string | null;
  destination_url: string | null;
  clicks: number;
  latest_verdict: string | null;
  reject_reason: string | null;
};

export type Wallet = { available: Money; pending_withdrawal: Money; withdrawal_minimum: Money; can_withdraw: boolean };
export type Withdrawal = { id: string; amount: Money; status: string; paid_ref: string | null; created_at: string };
