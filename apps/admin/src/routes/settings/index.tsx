import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, CreditCard, Layers, Settings as SettingsIcon, Store as StoreIcon, Truck, UserRound, Users } from 'lucide-react';
import { api, type Store } from '../../api';
import { useApp, useStore } from '../../context';
import { Card, PageHeader, SaveBar, useToast } from '../../ui';

const DOORS = [
  { to: '/settings/store', icon: <StoreIcon />, title: 'Store details', body: 'Name, web address, currency and the addresses emails come from.' },
  { to: '/settings/payments', icon: <CreditCard />, title: 'Payments', body: 'How Stripe takes payments and refunds for this store.' },
  { to: '/settings/shipping', icon: <Truck />, title: 'Shipping', body: 'Which countries you ship to and what delivery costs.' },
  { to: '/settings/notifications', icon: <Bell />, title: 'Notifications', body: 'Who hears about low stock, and whether shoppers get a nudge about their cart.' },
  { to: '/settings/stores', icon: <Layers />, title: 'Stores', body: 'Every storefront you run from this admin, each with its own domain and design.' },
  { to: '/settings/team', icon: <Users />, title: 'Team', body: 'Who can sign in to the admin.' },
  { to: '/settings/account', icon: <UserRound />, title: 'Your account', body: 'Your name, email and password.' },
];

export function Settings() {
  const store = useStore();
  return (
    <div className="page">
      <PageHeader icon={<SettingsIcon aria-hidden="true" />} title="Settings" subtitle={`Configuration for ${store.name}, gathered behind one door each.`} />
      <Card flush>
        {DOORS.map((door) => (
          <Link key={door.to} to={door.to} className="pick">
            <span className="pick__icon" aria-hidden="true">{door.icon}</span>
            <span>
              <span className="pick__title">{door.title}</span>
              <span className="pick__body" style={{ display: 'block' }}>{door.body}</span>
            </span>
            <span className="pick__chev" aria-hidden="true" style={{ display: 'flex' }}><ChevronRight /></span>
          </Link>
        ))}
      </Card>
    </div>
  );
}

export function SettingsPage({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="page">
      <PageHeader icon={icon} backTo="/settings" backLabel="Settings" title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}

export function useStoreForm<T extends Record<string, unknown>>(toForm: (s: Store) => T, toBody: (f: T) => Record<string, unknown>) {
  const store = useStore();
  const { reloadStores } = useApp();
  const toast = useToast();
  const initial = useMemo(() => toForm(store), [store]);
  const [form, setForm] = useState<T>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/stores/${store._id}`, { method: 'PUT', body: toBody(form) });
      await reloadStores();
      toast.show('Settings saved');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const bar = <SaveBar when={dirty} saving={busy} onDiscard={() => setForm(initial)} onSave={() => void save()} />;
  return { store, form, setForm, error, bar };
}
