import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Inbox, RefreshCw } from 'lucide-react';
import { api, qs } from '../api';
import { useApp } from '../context';

interface Alert {
  id: string;
  source: string;
  at: string;
  title: string;
  body: string;
  to: string;
}

const READ_KEY = 'shop.admin.alerts.read';

function readSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function saveSet(s: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...s].slice(-500)));
  } catch {
    return;
  }
}

function when(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function AlertsBell() {
  const { store } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Alert[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [read, setRead] = useState(readSet);
  const root = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!store) return;
    try {
      setFailed(false);
      setItems((await api<{ items: Alert[] }>(`/alerts${qs({ storeId: store._id })}`)).items);
    } catch {
      setFailed(true);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 120_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const mark = (ids: string[]) => {
    const next = new Set(read);
    ids.forEach((id) => next.add(id));
    setRead(next);
    saveSet(next);
  };
  const unread = (items ?? []).filter((a) => !read.has(a.id));

  return (
    <div className="menu" ref={root}>
      <button type="button" className={'top__icon top__bell' + (open ? ' is-open' : '')} aria-label={unread.length ? `Alerts, ${unread.length} unread` : 'Alerts'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Bell aria-hidden="true" />
        {unread.length ? <span className="top__bell__dot" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <div className="alerts" role="dialog" aria-label="Alerts">
          <div className="alerts__head">
            <span className="alerts__title">Alerts</span>
            <span className="alerts__tools">
              <button type="button" className="alerts__tool" title="Refresh" aria-label="Refresh" onClick={() => void refresh()}><RefreshCw /></button>
              <button type="button" className="alerts__tool" title="Mark all as read" aria-label="Mark all as read" disabled={!unread.length} onClick={() => mark(unread.map((a) => a.id))}><CheckCheck /></button>
            </span>
          </div>
          {failed ? (
            <div className="alerts__empty">
              <span className="alerts__itemtitle">Couldn't load alerts</span>
              <span className="alerts__body">Check your connection, then try again.</span>
            </div>
          ) : items === null ? (
            <div className="alerts__list" aria-hidden="true">
              {[0, 1].map((i) => (
                <div key={i} className="alerts__item" style={{ cursor: 'default' }}>
                  <span className="alerts__dot" style={{ background: 'transparent' }} />
                  <span className="alerts__content">
                    <span className="skel" style={{ width: '7rem' }} />
                    <span className="skel" style={{ width: '13rem' }} />
                  </span>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="alerts__empty">
              <span className="empty__mark" aria-hidden="true"><Inbox /></span>
              <span className="alerts__itemtitle">You're all caught up</span>
              <span className="alerts__body">Orders to ship, reviews to approve, new mail, failed emails and low stock show up here.</span>
            </div>
          ) : (
            <div className="alerts__list">
              {items.map((a) => {
                const isUnread = !read.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={isUnread ? 'alerts__item is-unread' : 'alerts__item'}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      mark([a.id]);
                      setOpen(false);
                      navigate(a.to);
                    }}
                  >
                    <span className="alerts__dot" aria-hidden="true" />
                    <span className="alerts__content">
                      <span className="alerts__meta">{a.source} • {when(a.at)}</span>
                      <span className="alerts__itemtitle">{a.title}</span>
                      <span className="alerts__body">{a.body}</span>
                    </span>
                    {isUnread ? (
                      <button type="button" className="alerts__check" title="Mark as read" aria-label={`Mark "${a.title}" as read`} onClick={(e) => { e.stopPropagation(); mark([a.id]); }}>
                        <Check aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
