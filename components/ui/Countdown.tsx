'use client';

import { useEffect, useState } from 'react';

/** Live "time left" that ticks every second. Seconds appear under an hour, to nudge
 *  a faster reply; above an hour it shows hours + minutes. */
function format(ms: number): string {
  if (ms <= 0) return 'expired';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function Countdown({ to, className }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const [ms, setMs] = useState(() => target - Date.now());
  useEffect(() => {
    const tick = () => setMs(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return <span className={className}>{format(ms)}</span>;
}
