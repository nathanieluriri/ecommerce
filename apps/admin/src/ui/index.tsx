import { useCallback, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, CircleAlert, Info, Package, Search, X } from 'lucide-react';
import type { OrderStatus } from '../api';
import { Menu } from './Menu';

export { Menu, MenuItem, MenuSeparator } from './Menu';
export { ToastHost, useToast } from './Toast';
export { SaveBar } from './SaveBar';
export * from './illustrations';

type Tone = 'default' | 'primary' | 'plain' | 'critical';

const btnClass = (tone: Tone, size: 'md' | 'lg', iconOnly: boolean, busy?: boolean) =>
  ['btn', `btn--${tone}`, size === 'lg' ? 'btn--lg' : '', iconOnly ? 'btn--icon' : '', busy ? 'btn--busy' : ''].filter(Boolean).join(' ');

export function Button({
  tone = 'default',
  size = 'md',
  iconOnly = false,
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'md' | 'lg'; iconOnly?: boolean; busy?: boolean }) {
  return (
    <button type="button" {...rest} disabled={rest.disabled || busy} className={[btnClass(tone, size, iconOnly, busy), className].filter(Boolean).join(' ')}>
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ to, tone = 'default', size = 'md', children, target }: { to: string; tone?: Tone; size?: 'md' | 'lg'; children: ReactNode; target?: string }) {
  return (
    <Link to={to} target={target} className={btnClass(tone, size, false)}>
      {children}
    </Link>
  );
}

export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'critical' | 'info';

export function Badge({ tone = 'neutral', dot = true, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={tone === 'neutral' ? 'badge' : `badge badge--${tone}`}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const STATUS: Record<OrderStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'warn', label: 'Unpaid' },
  paid: { tone: 'info', label: 'Paid' },
  fulfilled: { tone: 'ok', label: 'Sent out' },
  delivered: { tone: 'neutral', label: 'Delivered' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
  refunded: { tone: 'critical', label: 'Refunded' },
};

export const statusLabel = (s: OrderStatus) => STATUS[s].label;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}

export function Card({ title, action, flush, children }: { title?: ReactNode; action?: ReactNode; flush?: boolean; children: ReactNode }) {
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

export function PageHeader({
  icon,
  title,
  badge,
  subtitle,
  backTo,
  backLabel,
  actions,
  menu,
}: {
  icon?: ReactNode;
  title: string;
  badge?: ReactNode;
  subtitle?: ReactNode;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  menu?: (close: () => void) => ReactNode;
}) {
  return (
    <div className="page__headwrap">
      <div className="page__head">
        <div className="page__titles">
          <h1 className="page__title">
            {backTo ? (
              <>
                <span className="page__crumbwrap">
                  <Link className="page__crumb" to={backTo} title={backLabel} aria-label={backLabel ?? 'Back'}>
                    {icon}
                  </Link>
                </span>
                <ChevronRight className="page__crumbsep" aria-hidden="true" />
              </>
            ) : (
              icon
            )}
            <span className="page__titletext">{title}</span>
            {badge}
          </h1>
          {subtitle ? <p className="page__sub">{subtitle}</p> : null}
        </div>
        <div className="page__actions">
          {menu ? <Menu label="More actions">{menu}</Menu> : null}
          {actions}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
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

export function Empty({ art, title, body, actions }: { art?: ReactNode; title: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      {art ? <div className="empty__art" aria-hidden="true">{art}</div> : null}
      <h2 className="empty__title">{title}</h2>
      {body ? <p className="empty__body">{body}</p> : null}
      {actions ? <div className="empty__actions">{actions}</div> : null}
    </div>
  );
}

export function Banner({ tone = 'info', title, action, children }: { tone?: 'info' | 'warn' | 'critical'; title?: string; action?: ReactNode; children?: ReactNode }) {
  const Icon = tone === 'info' ? Info : CircleAlert;
  return (
    <div className={tone === 'info' ? 'banner' : `banner banner--${tone}`} role="status">
      <span className="banner__icon" aria-hidden="true"><Icon /></span>
      <div className="banner__content">
        {title ? <div className="banner__title">{title}</div> : null}
        {children ? <div className="banner__body">{children}</div> : null}
      </div>
      {action ? <div className="banner__action">{action}</div> : null}
    </div>
  );
}

export function Learn({ children }: { children: ReactNode }) {
  return <p className="page__learn">{children}</p>;
}

export function Defs({ rows }: { rows: { label: ReactNode; value: ReactNode; total?: boolean }[] }) {
  return (
    <div className="defs">
      {rows.map((row, i) => (
        <div key={i} className={row.total ? 'defs__row defs__row--total' : 'defs__row'}>
          <span className="defs__label">{row.label}</span>
          <span className="defs__value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
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

export function IdCell({ thumb, title, meta }: { thumb?: string | null; title: ReactNode; meta?: ReactNode }) {
  return (
    <span className="idcell">
      {thumb !== undefined ? (
        <span className="idcell__thumb" aria-hidden="true">
          {thumb ? <img src={thumb} alt="" /> : <Package />}
        </span>
      ) : null}
      <span className="idcell__text">
        <span className="idcell__title">{title}</span>
        {meta ? <span className="idcell__meta">{meta}</span> : null}
      </span>
    </span>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  numeric?: boolean;
  mobile?: boolean;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  tabs,
  search,
  filter,
  columns,
  rows,
  rowKey,
  href,
  empty,
  bulk,
  page,
}: {
  tabs?: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  filter?: ReactNode;
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  empty: ReactNode;
  bulk?: (selected: string[], clear: () => void) => ReactNode;
  page?: { page: number; size: number; total: number; onPage: (p: number) => void };
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const keys = rows?.map(rowKey) ?? [];
  const ticked = keys.filter((k) => selected.has(k));
  useEffect(() => setSelected(new Set()), [rows]);
  const clear = () => setSelected(new Set());
  const toggle = (k: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  });

  return (
    <div className="tcard">
      {tabs}
      {search || filter ? (
        <div className="tfilter">
          {search ? (
            <div className="tfilter__search">
              <Search aria-hidden="true" />
              <input className="input" type="search" value={search.value} placeholder={search.placeholder} aria-label={search.placeholder} onChange={(e) => search.onChange(e.target.value)} />
            </div>
          ) : (
            <span className="spacer" />
          )}
          {filter}
        </div>
      ) : null}
      {bulk && ticked.length ? (
        <div className="tsel">
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" checked={ticked.length === keys.length} ref={(el) => { if (el) el.indeterminate = ticked.length < keys.length; }} onChange={() => (ticked.length === keys.length ? clear() : setSelected(new Set(keys)))} aria-label="Select all" />
          </label>
          <span className="tsel__count">{ticked.length} selected</span>
          <span className="tsel__spacer" />
          {bulk(ticked, clear)}
          <Button tone="plain" iconOnly aria-label="Clear selection" onClick={clear}><X aria-hidden="true" /></Button>
        </div>
      ) : null}
      {rows === null ? (
        <div className="tscroll" aria-hidden="true">
          <table className="table">
            <tbody>
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  {bulk ? <td className="cell--tight" /> : null}
                  {columns.map((c, j) => (
                    <td key={c.key} className={c.numeric ? 'cell--num' : j === 0 ? 'cell--primary' : undefined}>
                      <span className="skel" style={{ width: `${j === 0 ? 9 - (i % 3) : 4 + ((i + j) % 3)}rem`, display: 'inline-block' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        empty
      ) : (
        <div className="tscroll">
          <table className="table">
            {bulk && ticked.length ? null : (
              <thead>
                <tr>
                  {bulk ? (
                    <th className="th--tight">
                      <label className="check" style={{ margin: 0 }}>
                        <input type="checkbox" checked={false} aria-label="Select every row on this page" onChange={() => setSelected(new Set(keys))} />
                      </label>
                    </th>
                  ) : null}
                  {columns.map((c) => <th key={c.key} className={c.numeric ? 'th--num' : undefined}>{c.header}</th>)}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row) => {
                const k = rowKey(row);
                const to = href?.(row);
                return (
                  <tr
                    key={k}
                    className={to ? 'is-clickable' : undefined}
                    onClick={to ? (e) => { if (!(e.target as HTMLElement).closest('a,button,input,label,select')) navigate(to); } : undefined}
                  >
                    {bulk ? (
                      <td className="cell--tight">
                        <label className="check" style={{ margin: 0 }}>
                          <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(k)} aria-label="Select row" />
                        </label>
                      </td>
                    ) : null}
                    {columns.map((c, j) => (
                      <td
                        key={c.key}
                        className={j === 0 ? 'cell--primary' : c.numeric ? 'cell--num num' : undefined}
                        data-label={j === 0 ? undefined : typeof c.header === 'string' ? c.header : ''}
                        data-mobile={c.mobile ? 'keep' : undefined}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {page && rows?.length ? <Pager {...page} /> : null}
    </div>
  );
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <div className="tfoot">
      <span>{total <= size ? `${total} shown` : `${from} to ${to} of ${total}`}</span>
      <div className="tfoot__pager">
        <Button iconOnly aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</Button>
        <Button iconOnly aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</Button>
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

export function Modal({ title, onClose, footer, children }: { title: string; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal__scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <Button tone="plain" iconOnly onClick={onClose} aria-label="Close"><X aria-hidden="true" /></Button>
        </div>
        <div className="modal__body stack">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return <span style={{ color: '#b98900', letterSpacing: 1 }} aria-label={`${value} out of 5`}>{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>;
}
export { AnalyticsBar, type Metric } from './AnalyticsBar';
export { TagInput } from './TagInput';
export { MediaEditor } from './Media';
