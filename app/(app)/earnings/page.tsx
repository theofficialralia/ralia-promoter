'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { api, ApiError, type Wallet, type Withdrawal } from '@/lib/api';
import { relativeTime } from '@/lib/format';

export default function EarningsPage() {
  const qc = useQueryClient();
  const [withdrawing, setWithdrawing] = useState(false);

  const wallet = useQuery({ queryKey: ['wallet'], queryFn: () => api.get<Wallet>('/v1/wallet') });
  const history = useQuery({ queryKey: ['withdrawals'], queryFn: () => api.get<Withdrawal[]>('/v1/withdrawals') });

  if (wallet.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const w = wallet.data!;

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Earnings</h1>
      <p className="mt-1 text-[14px] text-muted">Every naira Ralia has paid you.</p>

      <div className="mt-5 rounded-2xl bg-sidebar p-5 text-white">
        <div className="text-[13px] text-white/60">Available balance</div>
        <div className="text-[32px] font-extrabold">{w.available.amount_display}</div>
        <div className="mt-1 text-[12.5px] text-white/60">Pending review: {w.pending_withdrawal.amount_display}</div>
        <Button className="mt-4 w-full" disabled={!w.can_withdraw} onClick={() => setWithdrawing(true)}>
          {w.can_withdraw ? 'Request withdrawal' : `Minimum is ${w.withdrawal_minimum.amount_display}`}
        </Button>
      </div>

      <h2 className="mt-6 text-[15px] font-extrabold text-ink">Transactions</h2>
      <div className="mt-3 space-y-2">
        {(history.data ?? []).length === 0 && <div className="card p-6 text-center text-[13.5px] text-muted">No withdrawals yet.</div>}
        {(history.data ?? []).map((t) => (
          <div key={t.id} className="card flex items-center justify-between gap-3 p-3.5">
            <div>
              <div className="text-[14px] font-bold text-ink">Withdrawal</div>
              <div className="text-[12px] text-muted">{relativeTime(t.created_at)}</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-extrabold text-ink">-{t.amount.amount_display}</span>
              <StatusPill status={t.status} />
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
