import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Check, CircleAlert, CornerDownRight, ExternalLink, LogOut, Menu as MenuIcon, Plus, Search, Settings, UserRound } from 'lucide-react';
import { useApp } from '../context';
import { Menu, MenuItem, MenuSeparator } from '../ui';
import { AlertsBell } from './Alerts';
import { NAV, NAV_FOOT, type NavEntry } from './nav';
import { Palette } from './Palette';

export const BRAND = 'Shop Admin';

export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#fff" />
      <path d="M9 12h14l-1.2 11.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8Z" fill="none" stroke="#1a1a1a" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12.5 12V10.5a3.5 3.5 0 0 1 7 0V12" fill="none" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'AD';
}

const isActive = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`);

function NavItem({ entry, pathname }: { entry: NavEntry; pathname: string }) {
  const active = isActive(pathname, entry.to);
  const childActive = Boolean(entry.children?.some((c) => isActive(pathname, c.to)));
  const cls = !active ? 'side__link' : childActive ? 'side__link is-section' : 'side__link is-active';
  return (
    <div>
      <NavLink to={entry.to} className={cls} end>
        {entry.icon}
        <span className="side__label">{entry.label}</span>
      </NavLink>
      {active && entry.children ? (
        <div className="side__sub">
          {entry.children.map((child) => (
            <NavLink key={child.to} to={child.to} className={({ isActive: on }) => (on ? 'side__sublink is-active' : 'side__sublink')}>
              <CornerDownRight className="side__arrow" aria-hidden="true" />
              <span className="side__label">{child.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StoreSwitcher() {
  const { stores, store, selectStore } = useApp();
  const navigate = useNavigate();
  if (!store) return null;
  return (
    <Menu
      chrome="bare"
      buttonLabel="Switch store"
      label={
        <span className="top__store">
          <span className="top__storemark" style={{ background: store.themeSettings.accent }}>{store.name[0]?.toUpperCase()}</span>
          <span className="top__storename">{store.name}</span>
        </span>
      }
    >
      {(close) => (
        <>
          <div className="menu__section">Your stores</div>
          {stores.map((s) => (
            <MenuItem
              key={s._id}
              icon={<span className="top__storemark" style={{ background: s.themeSettings.accent }}>{s.name[0]?.toUpperCase()}</span>}
              onSelect={() => {
                close();
                selectStore(s._id);
                navigate('/home');
              }}
            >
              <span style={{ flex: 1 }}>{s.name}</span>
              {s._id === store._id ? <Check aria-hidden="true" /> : null}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem icon={<Plus aria-hidden="true" />} onSelect={() => { close(); navigate('/settings/stores?new=1'); }}>Add a store</MenuItem>
        </>
      )}
    </Menu>
  );
}

export function Shell() {
  const { me, store, stores, signOut } = useApp();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [railOpen, setRailOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setRailOpen(false);
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const storefrontHref = store && me.storefrontUrl ? `${me.storefrontUrl.replace(/\/$/, '')}/?store=${store.slug}&theme=reset` : null;
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

  return (
    <div className="shell">
      <header className="top">
        <div className="row">
          <button type="button" className="top__icon top__burger" aria-label="Toggle navigation" aria-expanded={railOpen} onClick={() => setRailOpen((v) => !v)}>
            <MenuIcon aria-hidden="true" />
          </button>
          <Link to="/home" className="top__brand">
            <LogoMark />
            <span className="top__wordmark">{BRAND}</span>
          </Link>
        </div>
        <div className="top__search">
          <button type="button" className="top__searchbtn" aria-label="Search (Ctrl+K)" aria-haspopup="dialog" onClick={() => setSearchOpen(true)}>
            <Search aria-hidden="true" />
            <span className="top__ghost">Search</span>
            <span aria-hidden="true" style={{ display: 'flex', gap: 2 }}>
              <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd>
              <kbd>K</kbd>
            </span>
          </button>
        </div>
        <div className="top__end">
          <StoreSwitcher />
          <AlertsBell />
          <Menu
            chrome="bare"
            buttonLabel="Account"
            label={<span className="top__user" aria-hidden="true">{initials(me.name)}</span>}
          >
            {(close) => (
              <>
                <div style={{ padding: 'var(--s2)', fontSize: 'var(--t-sm)', color: 'var(--ink-sub)' }}>
                  Signed in as <strong style={{ color: 'var(--ink)', fontWeight: 'var(--w-semi)' }}>{me.name}</strong>
                  <div>{me.email}</div>
                </div>
                <MenuSeparator />
                {storefrontHref ? (
                  <MenuItem icon={<ExternalLink aria-hidden="true" />} onSelect={() => { close(); window.open(storefrontHref, '_blank', 'noreferrer'); }}>View storefront</MenuItem>
                ) : null}
                <MenuItem icon={<UserRound aria-hidden="true" />} onSelect={() => { close(); navigate('/settings/account'); }}>Your account</MenuItem>
                <MenuItem icon={<Settings aria-hidden="true" />} onSelect={() => { close(); navigate('/settings'); }}>Settings</MenuItem>
                <MenuSeparator />
                <MenuItem icon={<LogOut aria-hidden="true" />} onSelect={() => { close(); signOut(); }}>Sign out</MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>
      <div className="shell__body">
        {railOpen ? <button type="button" className="shell__scrim" aria-label="Close navigation" onClick={() => setRailOpen(false)} /> : null}
        <nav className={railOpen ? 'side is-open' : 'side'} aria-label="Sections" onClick={(e) => (e.target as HTMLElement).closest('a') && setRailOpen(false)}>
          {NAV.map((entry) => <NavItem key={entry.to} entry={entry} pathname={pathname} />)}
          <div className="side__foot">
            {NAV_FOOT.map((entry) => <NavItem key={entry.to} entry={entry} pathname={pathname} />)}
            <div className="row" style={{ marginTop: 'var(--s3)', padding: '0 var(--s2)', fontSize: 'var(--t-sm)', color: 'var(--ink-muted)', gap: 'var(--s1)' }}>
              <CircleAlert size={13} aria-hidden="true" />
              {stores.length} {stores.length === 1 ? 'store' : 'stores'} on Cloudflare
            </div>
          </div>
        </nav>
        <main className="main" ref={mainRef}>
          <Outlet />
        </main>
      </div>
      <Palette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
