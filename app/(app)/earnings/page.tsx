'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { PageHeader } from '@/components/layout/PageHeader';
import { api, ApiError, type Wallet, type Withdrawal } from '@/lib/api';
import { relativeTime } from '@/lib/format';

export default function EarningsPage() {
  const qc = useQueryClient();
  const [withdrawing, setWithdrawing] = useState(false);

  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<Wallet>('/v1/wallet') });
  const history = useQuery({ queryKey: ['withdrawals'], queryFn: () => api.get<Withdrawal[]>('/v1/withdrawals') });

  if (wallet.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const w = wallet.data!;
  const txns = history.data ?? [];

  return (
    <div>
      <PageHeader crumb="Wallet" title="Earnings" subtitle="Every naira Ralia has paid you, and every withdrawal you’ve made." />

      {/* Balance hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a0d0d] to-[#120708] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[13px] text-white/60">Available balance</div>
            <div className="text-[36px] font-extrabold leading-none">{w.available.amount_display}</div>
          </div>
          <Button
            variant="secondary"
            className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
            disabled={!w.can_withdraw}
            onClick={() => setWithdrawing(true)}
          >
            {w.can_withdraw ? 'Request Withdraw' : `Minimum is ${w.withdrawal_minimum.amount_display}`}
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-2xl bg-white/10 p-3.5">
            <div className="text-[11.5px] text-white/60">Pending review</div>
            <div className="text-[18px] font-bold">{w.pending_withdrawal.amount_display}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-3.5">
            <div className="text-[11.5px] text-white/60">Minimum withdrawal</div>
            <div className="text-[18px] font-bold">{w.withdrawal_minimum.amount_display}</div>
          </div>
        </div>
      </div>

      <h2 className="mt-6 text-[16px] font-extrabold text-ink">Transactions</h2>
      <div className="mt-3 space-y-2.5">
        {txns.length === 0 && <div className="card p-8 text-center text-[13.5px] text-muted">No withdrawals yet.</div>}
        {txns.map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-wash text-[16px] text-muted">↓</span>
              <div>
                <div className="text-[14px] font-bold text-ink">Withdrawal{t.paid_ref ? ` · ${t.paid_ref}` : ''}</div>
                <div className="text-[12px] text-muted">{relativeTime(t.created_at)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <StatusPill status={t.status} />
              <span className="text-[15px] font-extrabold text-brand-700">−{t.amount.amount_display}</span>
            </div>
          </div>
        ))}
      </div>

      {withdrawing && <WithdrawModal max={w.available} min={w.withdrawal_minimum} onClose={() => setWithdrawing(false)} onDone={() => { setWithdrawing(false); void qc.invalidateQueries({ queryKey: ['wallet'] }); void qc.invalidateQueries({ queryKey: ['withdrawals'] }); }} />}
    </div>
  );
}

function WithdrawModal({ max, min, onClose, onDone }: { max: { amount_minor: number }; min: { amount_minor: number; amount_display: string }; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const minor = Math.round(Number(amount) * 100);
    if (!minor || minor < min.amount_minor) return setError(`Minimum withdrawal is ${min.amount_display}.`);
    if (minor > max.amount_minor) return setError('That’s more than your balance.');
    setBusy(true); setError(null);
    try {
      await api.post('/v1/withdrawals', { amount_minor: minor });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not request the withdrawal — add a bank account first.');
      setBusy(false);
    }
  }

  return (
    <Modal title="Request withdrawal" onClose={onClose}>
      <p className="text-[13.5px] text-muted">Paid to your saved bank account. Admin approves payouts before they’re sent.</p>
      <Field label="Amount (₦)">
        <input type="number" inputMode="decimal" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" />
      </Field>
      {error && <p className="mt-2 text-[12px] text-brand-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={submit} loading={busy}>Request</Button>
      </div>
    </Modal>
  );
}
