import { useState } from 'react';
import { api, type Store, type ThemeId } from '../api';
import { useApp } from '../context';
import { slugify, toMajor, toMinor } from '../format';
import { Badge, Banner, Button, Card, Empty, Field, PageHeader } from '../ui';
import { THEMES } from './Design';

interface Form {
  name: string;
  slug: string;
  domains: string;
  currency: string;
  theme: ThemeId;
  emailFrom: string;
  supportEmail: string;
  shippingFlat: string;
  freeShippingOver: string;
  active: boolean;
}

const toForm = (s?: Store): Form => ({
  name: s?.name ?? '',
  slug: s?.slug ?? '',
  domains: s?.domains.join(', ') ?? '',
  currency: s?.currency ?? 'usd',
  theme: s?.theme ?? 'classic',
  emailFrom: s?.emailFrom ?? '',
  supportEmail: s?.supportEmail ?? '',
  shippingFlat: toMajor(s?.shippingFlat ?? 0, s?.currency ?? 'usd'),
  freeShippingOver: toMajor(s?.freeShippingOver, s?.currency ?? 'usd'),
  active: s?.active ?? true,
});

function StoreForm({ store, onDone }: { store?: Store; onDone: () => void }) {
  const { reloadStores, selectStore } = useApp();
  const [form, setForm] = useState<Form>(toForm(store));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'name' && !store ? { slug: slugify(e.target.value) } : {}) }));

  async function save() {
    setBusy(true);
    setError(null);
    const body = {
      name: form.name,
      slug: form.slug,
      domains: form.domains.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean),
      currency: form.currency,
      theme: form.theme,
      themeSettings: store?.themeSettings ?? { accent: '#2e2a6b' },
      emailFrom: form.emailFrom,
      supportEmail: form.supportEmail || undefined,
      shippingFlat: toMinor(form.shippingFlat, form.currency),
      freeShippingOver: form.freeShippingOver ? toMinor(form.freeShippingOver, form.currency) : undefined,
      active: form.active,
    };
    try {
      const saved = store ? await api<Store>(`/stores/${store._id}`, { method: 'PUT', body }) : await api<Store>('/stores', { body });
      await reloadStores();
      if (!store) selectStore(saved._id);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={store ? `Edit ${store.name}` : 'New store'} action={<Button tone="plain" onClick={onDone}>Cancel</Button>}>
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <div className="cols2">
        <Field label="Name"><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="Handle" hint="Used for ?store= previews"><input className="input mono" value={form.slug} onChange={set('slug')} /></Field>
        <Field label="Domains" hint="Comma separated, e.g. shop-a.com, www.shop-a.com"><input className="input" value={form.domains} onChange={set('domains')} /></Field>
        <Field label="Currency" hint="ISO code, e.g. usd, gbp, ngn"><input className="input mono" maxLength={3} value={form.currency} onChange={set('currency')} /></Field>
        <Field label="Theme">
          <select className="select" value={form.theme} onChange={set('theme')}>
            {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Send emails from"><input className="input" type="email" value={form.emailFrom} onChange={set('emailFrom')} /></Field>
        <Field label="Support email" hint="Used as reply-to"><input className="input" type="email" value={form.supportEmail} onChange={set('supportEmail')} /></Field>
        <Field label="Flat shipping"><input className="input" inputMode="decimal" value={form.shippingFlat} onChange={set('shippingFlat')} /></Field>
        <Field label="Free shipping over" hint="Leave empty to always charge"><input className="input" inputMode="decimal" value={form.freeShippingOver} onChange={set('freeShippingOver')} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Store is live</label>
      <div className="row"><span className="spacer" /><Button tone="primary" busy={busy} onClick={save}>Save store</Button></div>
    </Card>
  );
}

export function Stores() {
  const { stores, store: current, selectStore } = useApp();
  const [editing, setEditing] = useState<Store | 'new' | null>(stores.length ? null : 'new');

  return (
    <div className="page">
      <PageHeader title="Stores" subtitle="Every store is its own storefront with its own domain, currency and design." actions={<Button tone="primary" onClick={() => setEditing('new')}>Add store</Button>} />
      {editing ? <StoreForm key={editing === 'new' ? 'new' : editing._id} store={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} /> : null}
      {stores.length === 0 && !editing ? <Empty title="No stores yet" /> : null}
      {stores.length ? (
        <div className="tcard">
          <div className="tscroll">
            <table className="table">
              <thead><tr><th>Store</th><th>Domains</th><th>Theme</th><th>Status</th><th /></tr></thead>
              <tbody>
                {stores.map((s) => (
                  <tr key={s._id}>
                    <td className="cell--primary"><span className="idcell__text"><span className="idcell__title">{s.name}</span><span className="idcell__meta muted mono">{s.slug} / {s.currency.toUpperCase()}</span></span></td>
                    <td className="muted">{s.domains.join(', ') || 'None'}</td>
                    <td>{s.theme}</td>
                    <td>{s.active ? <Badge tone="ok">Live</Badge> : <Badge>Paused</Badge>}</td>
                    <td className="cell--num">
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        {current?._id !== s._id ? <Button tone="plain" onClick={() => selectStore(s._id)}>Switch to</Button> : null}
                        <Button onClick={() => setEditing(s)}>Edit</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
