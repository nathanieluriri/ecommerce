import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { OrderStatus } from './api';

export function Button({
  tone = 'default',
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'primary' | 'plain' | 'critical'; busy?: boolean }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy} className={['btn', `btn--${tone}`, busy ? 'btn--busy' : '', className].filter(Boolean).join(' ')}>
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'critical' | 'info';

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge--${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  pending: 'warn',
  paid: 'info',
  fulfilled: 'ok',
  delivered: 'ok',
  cancelled: 'neutral',
  refunded: 'critical',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status[0]!.toUpperCase() + status.slice(1)}</Badge>;
}

export function Card({ title, action, flush, children }: { title?: string; action?: ReactNode; flush?: boolean; children: ReactNode }) {
  return (
    <section className="card">
      {title ? (
        <div className="card__head">
          <h2 className="card__title">{title}</h2>
          {action}
        </div>
      ) : null}
      {flush ? children : <div className="card__body stack">{children}</div>}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, badge }: { title: string; subtitle?: ReactNode; actions?: ReactNode; badge?: ReactNode }) {
  return (
    <div className="page__headwrap">
      <div className="page__head">
        <div className="page__titles">
          <h1 className="page__title">
            <span className="page__titletext">{title}</span>
            {badge}
          </h1>
          {subtitle ? <p className="page__sub">{subtitle}</p> : null}
        </div>
        <div className="page__actions">{actions}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Loading({ what }: { what: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Loading {what}...</span>
    </div>
  );
}

export function Empty({ title, body, actions }: { title: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      {body ? <p className="empty__body">{body}</p> : null}
      {actions ? <div className="empty__actions">{actions}</div> : null}
    </div>
  );
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'critical'; children: ReactNode }) {
  return (
    <div className={tone === 'info' ? 'banner' : `banner banner--${tone}`} role="status">
      <div className="banner__content">
        <div className="banner__body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="ttabs" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" className="ttab" aria-selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="tfoot">
      <span className="muted">{total} total</span>
      <span className="spacer" />
      <div className="tfoot__pager row">
        <Button tone="plain" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <span className="muted num">{page} / {pages}</span>
        <Button tone="plain" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setError(null);
    load()
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload, setData };
}
