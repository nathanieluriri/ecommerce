import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, House, LogOut, Mail, Menu as MenuIcon, Package, Palette, Settings, ShoppingBag, Store as StoreIcon, Users } from 'lucide-react';
import { useApp } from './context';

const NAV = [
  { to: '/home', label: 'Home', icon: <House /> },
  { to: '/orders', label: 'Orders', icon: <ShoppingBag /> },
  { to: '/products', label: 'Products', icon: <Package /> },
  { to: '/customers', label: 'Customers', icon: <Users /> },
  { to: '/emails', label: 'Emails', icon: <Mail /> },
  { to: '/design', label: 'Storefront design', icon: <Palette /> },
];

const NAV_FOOT = [
  { to: '/stores', label: 'Stores', icon: <StoreIcon /> },
  { to: '/settings', label: 'Settings', icon: <Settings /> },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'AD';
}

export function Shell() {
  const { me, stores, store, selectStore, signOut } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [railOpen, setRailOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => setRailOpen(false), [pathname]);

  const link = (e: (typeof NAV)[number]) => (
    <NavLink key={e.to} to={e.to} className={({ isActive }) => (isActive ? 'side__link is-active' : 'side__link')}>
      {e.icon}
      <span className="side__label">{e.label}</span>
    </NavLink>
  );

  const storefrontHref = store && me.storefrontUrl ? `${me.storefrontUrl.replace(/\/$/, '')}/?store=${store.slug}` : null;

  return (
    <div className="shell">
      <header className="top">
        <div className="row">
          <button type="button" className="top__icon top__burger" aria-label="Toggle navigation" aria-expanded={railOpen} onClick={() => setRailOpen((v) => !v)}>
            <MenuIcon aria-hidden="true" />
          </button>
          <Link to="/home" className="top__brand">
            <span style={{ color: 'var(--topbar-ink-strong)', fontWeight: 'var(--w-bold)' }}>Shop Admin</span>
          </Link>
        </div>
        {stores.length ? (
          <select
            className="top__store"
            aria-label="Store"
            value={store?._id ?? ''}
            onChange={(e) => {
              selectStore(e.target.value);
              navigate('/home');
            }}
          >
            {stores.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <span />
        )}
        <div className="top__end">
          {storefrontHref ? (
            <a className="top__icon" href={storefrontHref} target="_blank" rel="noreferrer" title="View storefront">
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}
          <div className="menu">
            <button type="button" className="menu__bare" aria-label="Account" onClick={() => setUserOpen((v) => !v)}>
              <span className="top__user" aria-hidden="true">{initials(me.name)}</span>
            </button>
            {userOpen ? (
              <div className="menu__panel" role="menu" style={{ position: 'absolute', right: 0, top: '2.75rem', zIndex: 80 }}>
                <div style={{ padding: 'var(--s2)', fontSize: 'var(--t-sm)', color: 'var(--ink-sub)' }}>
                  Signed in as <strong style={{ color: 'var(--ink)' }}>{me.name}</strong>
                </div>
                <div className="menu__sep" role="separator" />
                <button type="button" className="menu__item" role="menuitem" onClick={signOut}>
                  <LogOut aria-hidden="true" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <div className="shell__body">
        {railOpen ? <button type="button" className="shell__scrim" aria-label="Close navigation" onClick={() => setRailOpen(false)} /> : null}
        <nav className={railOpen ? 'side is-open' : 'side'} aria-label="Sections">
          {NAV.map(link)}
          <div className="side__foot">{NAV_FOOT.map(link)}</div>
        </nav>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
