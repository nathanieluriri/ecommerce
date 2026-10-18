import { useId } from 'react';
import { Calendar } from 'lucide-react';

export interface Metric {
  label: string;
  value: string;

  delta?: string;

  series?: number[];
}

function Sparkline({ points }: { points: number[] }) {
  const gradId = useId();
  if (points.length < 2) return <span className="abar__flat" aria-hidden="true" />;

  const H = 18;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = 100 / (points.length - 1);
  const xy = points.map((p, i) => [i * step, H - 2 - ((p - min) / span) * (H - 5)] as const);

  const pt = (i: number) => `${xy[i]![0].toFixed(2)},${xy[i]![1].toFixed(2)}`;
  let line = `M${pt(0)}`;
  for (let i = 1; i < xy.length - 1; i++) {
    const [cx, cy] = xy[i]!;
    const [nx, ny] = xy[i + 1]!;
    line += ` Q${cx.toFixed(2)},${cy.toFixed(2)} ${((cx + nx) / 2).toFixed(2)},${((cy + ny) / 2).toFixed(2)}`;
  }

  line += ` Q${pt(xy.length - 1)} ${pt(xy.length - 1)}`;

  const area = `${line} L100,${H} L0,${H} Z`;

  return (
    <span className="abar__spark" aria-hidden="true">
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} stroke="none" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  );
}

export function AnalyticsBar({
  range = 'Today',
  metrics,
}: {
  range?: string;
  metrics: Metric[];
}) {
  return (
    <section className="abar" aria-label={`${range} summary`}>
      <div className="abar__range">
        <Calendar aria-hidden="true" />
        {range}
      </div>
      <div className="abar__cells">
        {metrics.map((m) => (
          <div className="abar__cell" key={m.label}>
            <span className="abar__label" title={m.label}>
              {m.label}
            </span>
            <span className="abar__value">
              {m.value}
              {m.delta ? <span className="abar__delta">{m.delta}</span> : null}
            </span>
            {m.series ? <Sparkline points={m.series} /> : <span className="abar__flat" aria-hidden="true" />}
          </div>
        ))}
      </div>

    </section>
  );
}
