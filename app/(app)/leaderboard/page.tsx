'use client';

import { useQuery } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { api, type Leaderboard, type MyScore, type PromoterTier } from '@/lib/api';

const TIER: Record<PromoterTier, { label: string; badge: string; dot: string }> = {
  BRONZE: { label: 'Bronze', badge: 'bg-[#b5744a]/15 text-[#a5623a]', dot: 'bg-[#b5744a]' },
  SILVER: { label: 'Silver', badge: 'bg-slate-400/20 text-slate-500', dot: 'bg-slate-400' },
  GOLD: { label: 'Gold', badge: 'bg-amber-400/20 text-amber-600', dot: 'bg-amber-500' },
  PLATINUM: { label: 'Platinum', badge: 'bg-indigo-400/20 text-indigo-500', dot: 'bg-indigo-500' },
};

const POINT_LABEL: Record<string, string> = {
  DELIVERY_COMPLETED: 'Deliveries',
  DELIVERED_ON_TIME: 'On-time',
  OVER_DELIVERY: 'Over-delivery',
  QUALITY_CLEAN: 'Clean proof',
  STREAK_BONUS: 'Streaks',
  BREADTH_BONUS: 'Range',
  MILESTONE: 'Milestones',
  PENALTY_NO_SHOW: 'Missed posts',
  PENALTY_REJECTED: 'Rejections',
  PENALTY_DUPLICATE: 'Duplicates',
  ADJUSTMENT: 'Adjustments',
  REVERSAL: 'Reversals',
};

function TierBadge({ tier }: { tier: PromoterTier }) {
  const t = TIER[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${t.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> {t.label}
    </span>
  );
}

export default function LeaderboardPage() {
  const board = useQuery({ queryKey: ['leaderboard'], queryFn: () => api.get<Leaderboard>('/v1/leaderboard') });
  const score = useQuery({ queryKey: ['my-score'], queryFn: () => api.get<MyScore>('/v1/leaderboard/me') });

  if (board.isLoading || score.isLoading) return <div className="grid h-64 place-items-center text-brand"><Spinner className="h-7 w-7" /></div>;
  const b = board.data!;
  const s = score.data!;

  // Show a pinned "you" row when the viewer isn't already in the visible top.
  const meInTop = b.top.some((r) => r.is_me);
  const progressPct = s.next_tier && s.next_tier.points_to_go > 0
    ? Math.min(100, Math.round((s.rolling_90_points / (s.rolling_90_points + s.next_tier.points_to_go)) * 100))
    : 100;

  return (
    <div>
      <PageHeader crumb="Season" title="Leaderboard" subtitle="Earn points for great work — deliver on time, over-deliver, keep your proof clean — and climb the ranks." />

      {/* Your score */}
      <div className="card overflow-hidden">
        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <div className="flex items-center gap-2.5">
              <TierBadge tier={s.tier} />
              {s.streak > 0 && <span className="rounded-full bg-warn-wash px-2.5 py-1 text-[11.5px] font-bold text-warn">{s.streak} on-time streak</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <div className="text-[28px] font-extrabold leading-none tabular-nums text-ink">{s.season_points.toLocaleString('en-NG')}</div>
                <div className="text-[12px] text-muted">points this season</div>
              </div>
              <div>
                <div className="text-[20px] font-extrabold leading-none tabular-nums text-ink">{s.rank ? `#${s.rank}` : '—'}</div>
                <div className="text-[12px] text-muted">of {b.total.toLocaleString('en-NG')} promoters</div>
              </div>
              <div>
                <div className="text-[20px] font-extrabold leading-none tabular-nums text-ink">{s.lifetime_points.toLocaleString('en-NG')}</div>
                <div className="text-[12px] text-muted">all-time</div>
              </div>
            </div>
          </div>

          {/* Progress to next tier */}
          <div className="w-full sm:w-64">
            {s.next_tier ? (
              <>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-ink">Next: {TIER[s.next_tier.tier].label}</span>
                  <span className="tabular-nums text-muted">{s.next_tier.points_to_go.toLocaleString('en-NG')} pts to go</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-wash">
                  <div className={`h-full rounded-full ${TIER[s.next_tier.tier].dot}`} style={{ width: `${Math.max(4, progressPct)}%` }} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-muted">Based on your last 90 days of points.</p>
              </>
            ) : (
              <div className="rounded-xl bg-wash p-3 text-center text-[12.5px] font-semibold text-ink">Top tier — keep it up to hold it.</div>
            )}
          </div>
        </div>

        {/* Breakdown */}
        {s.breakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-rule px-5 py-3.5 sm:px-6">
            {s.breakdown.map((row) => (
              <span key={row.type} className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1 text-[12px] font-semibold text-ink">
                {POINT_LABEL[row.type] ?? row.type}
                <span className={`tabular-nums ${row.points < 0 ? 'text-brand-700' : 'text-ok'}`}>{row.points > 0 ? '+' : ''}{row.points.toLocaleString('en-NG')}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      <h2 className="mt-8 text-[15px] font-extrabold text-ink">Top promoters · this season</h2>
      <div className="mt-3 card divide-y divide-rule overflow-hidden p-0">
        {b.top.length === 0 && <div className="p-10 text-center text-[13.5px] text-muted">No scores yet this season — be the first on the board.</div>}
        {b.top.map((row) => (
          <Row key={row.rank} row={row} />
        ))}
        {!meInTop && b.me && (
          <>
            <div className="bg-wash px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">Your position</div>
            <Row row={b.me} />
          </>
        )}
      </div>
    </div>
  );
}

function Row({ row }: { row: import('@/lib/api').LeaderboardRow }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${row.is_me ? 'bg-brand/5' : ''}`}>
      <span className={`w-8 shrink-0 text-center text-[15px] font-extrabold tabular-nums ${row.rank <= 3 ? 'text-brand-700' : 'text-muted'}`}>{row.rank}</span>
      <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-ink">
        {row.display_name}{row.is_me && <span className="ml-1.5 text-[11px] font-semibold text-brand-700">You</span>}
      </span>
      <TierBadge tier={row.tier} />
      <span className="w-16 shrink-0 text-right text-[14px] font-extrabold tabular-nums text-ink">{row.points.toLocaleString('en-NG')}</span>
    </div>
  );
}
