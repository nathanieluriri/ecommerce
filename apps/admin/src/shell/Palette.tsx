import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Package, Search, ShoppingBag, TicketPercent, User } from 'lucide-react';
import { api, qs } from '../api';
import { useApp } from '../context';
import { money } from '../format';
import { NAV, NAV_FOOT } from './nav';

interface Hit {
  key: string;
  group: string;
  icon: ReactNode;
  title: ReactNode;
  meta?: string;
  to: string;
}

interface Results {
  orders: { _id: string; number: number; status: string; total: number; currency: string; customer: { email?: string; name?: string } }[];
  products: { _id: string; title: string; status: string }[];
  customers: { _id: string; email: string; name?: string; orders: number }[];
  discounts: { _id: string; code: string; active: boolean }[];
}

const SCOPES = [
  { value: 'all', label: 'All' },
  { value: 'Pages', label: 'Pages' },
  { value: 'Orders', label: 'Orders' },
  { value: 'Products', label: 'Products' },
  { value: 'Customers', label: 'Customers' },
  { value: 'Discounts', label: 'Discounts' },
];

const PAGES = [...NAV, ...NAV_FOOT].flatMap((e) => [
  { to: e.to, label: e.label, icon: e.icon },
  ...(e.children ?? []).map((c) => ({ to: c.to, label: `${e.label} › ${c.label}`, icon: e.icon })),
]);

export function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { store } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('all');
  const [hot, setHot] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQ('');
      setScope('all');
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !store) return;
    setLoading(true);
    const timer = setTimeout(() => {
      api<Results>(`/search${qs({ storeId: store._id, q })}`)
        .then(setResults)
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 160);
    return () => clearTimeout(timer);
  }, [open, q, store]);

  const hits = useMemo(() => {
    const out: Hit[] = [];
    const needle = q.trim().toLowerCase();
    for (const p of PAGES) if (!needle || p.label.toLowerCase().includes(needle)) out.push({ key: `p${p.to}`, group: 'Pages', icon: p.icon, title: p.label, to: p.to });
    const cur = store?.currency ?? 'usd';
    for (const o of results?.orders ?? [])
      out.push({ key: `o${o._id}`, group: 'Orders', icon: <ShoppingBag />, title: <span className="mono">#{o.number}</span>, meta: `${o.customer.name ?? o.customer.email ?? 'Guest'} · ${money(o.total, o.currency ?? cur)}`, to: `/orders/${o._id}` });
    for (const p of results?.products ?? []) out.push({ key: `pr${p._id}`, group: 'Products', icon: <Package />, title: p.title, meta: p.status, to: `/products/${p._id}` });
    for (const c of results?.customers ?? []) out.push({ key: `c${c._id}`, group: 'Customers', icon: <User />, title: c.name ?? c.email, meta: `${c.email} · ${c.orders} orders`, to: `/customers/${c._id}` });
    for (const d of results?.discounts ?? []) out.push({ key: `d${d._id}`, group: 'Discounts', icon: <TicketPercent />, title: <span className="mono">{d.code}</span>, meta: d.active ? 'Active' : 'Off', to: '/discounts' });
    return out.filter((h) => scope === 'all' || h.group === scope).slice(0, 40);
  }, [q, results, scope, store]);

  const groups = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const h of hits) map.set(h.group, [...(map.get(h.group) ?? []), h]);
    return [...map].map(([label, list]) => ({ label, hits: list }));
  }, [hits]);

  useEffect(() => setHot(0), [q, scope]);
  useEffect(() => {
    listRef.current?.querySelector('.is-hot')?.scrollIntoView({ block: 'nearest' });
  }, [hot]);

  if (!open) return null;

  const go = (hit: Hit) => {
    onClose();
    navigate(hit.to);
  };

  return (
    <div className="palette__scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search">
        <div className="palette__head">
          <Search aria-hidden="true" />
          <input
            className="palette__input"
            placeholder={`Search ${store?.name ?? 'the admin'}`}
            aria-label="Search"
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHot((h) => Math.min(h + 1, Math.max(hits.length - 1, 0)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHot((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const hit = hits[hot];
                if (hit) go(hit);
              }
            }}
          />
          <span className="palette__esc" aria-hidden="true">esc</span>
        </div>
        <div className="palette__chips" role="group" aria-label="Search scope">
          {SCOPES.map((s) => (
            <button key={s.value} type="button" className="palette__chip" aria-pressed={scope === s.value} onClick={() => setScope(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="palette__body" ref={listRef}>
          {hits.length === 0 ? (
            <div className="palette__empty">
              <span className="palette__glass" aria-hidden="true"><Search /></span>
              <span className="palette__hint">{loading ? 'Searching...' : q ? 'Nothing matches that' : 'Find anything in your store'}</span>
              {!loading && q ? <span className="alerts__body">Search covers pages, orders by number or email, products, customers and discount codes.</span> : null}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="palette__label">{group.label}</div>
                {group.hits.map((hit) => {
                  const index = hits.indexOf(hit);
                  return (
                    <button key={hit.key} type="button" className={index === hot ? 'palette__row is-hot' : 'palette__row'} onMouseEnter={() => setHot(index)} onClick={() => go(hit)}>
                      {hit.icon}
                      <span className="palette__rowtitle">{hit.title}</span>
                      {hit.meta ? <span className="palette__rowmeta">{hit.meta}</span> : null}
                      {index === hot ? <CornerDownLeft aria-hidden="true" style={{ width: 14, opacity: 0.5 }} /> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
          <span className="spacer" />
          <span>Pages, recent records and live search</span>
        </div>
      </div>
    </div>
  );
}
