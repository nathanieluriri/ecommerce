import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, CreditCard, Plus, Store as StoreIcon, Trash2, Truck, UserRound, Users } from 'lucide-react';
import { api, type Store, type ThemeId } from '../../api';
import { useApp } from '../../context';
import { money, slugify, toMajor, toMinor } from '../../format';
import { Badge, Banner, Button, Card, DataTable, Defs, Empty, Field, Modal, StoreArt, TagInput, useAsync, useToast } from '../../ui';
import { THEMES } from '../Design';
import { SettingsPage, useStoreForm } from './index';

const CURRENCIES = ['usd', 'eur', 'gbp', 'ngn', 'cad', 'aud', 'ghs', 'kes', 'zar', 'inr', 'jpy'];

export function StoreDetails() {
  const { form, setForm, error, bar } = useStoreForm(
    (s) => ({ name: s.name, slug: s.slug, domains: s.domains, currency: s.currency, emailFrom: s.emailFrom, supportEmail: s.supportEmail ?? '', active: s.active }),
    (f) => ({ ...f, supportEmail: f.supportEmail || undefined }),
  );
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <SettingsPage icon={<StoreIcon aria-hidden="true" />} title="Store details">
      {bar}
      {error ? <Banner tone="critical" title="Couldn't save">{error}</Banner> : null}
      <Card title="Profile">
        <Field label="Store name" hint="Shown in the storefront header, browser tabs and emails."><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="Handle" hint={<>Used to preview the store with <span className="mono">?store={form.slug}</span>.</>}><input className="input mono" value={form.slug} onChange={set('slug')} /></Field>
        <label className="check"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Store is open to shoppers</label>
      </Card>
      <Card title="Web addresses">
        <Field label="Domains" hint="Add each domain, then attach it to the storefront worker in Cloudflare. Press Enter after each one.">
          <TagInput label="Domains" placeholder="shop.example.com" value={form.domains} onChange={(domains) => setForm({ ...form, domains })} />
        </Field>
      </Card>
      <Card title="Money">
        <Field label="Currency" hint="Prices, Stripe charges and reports all use it. Changing it does not convert existing prices.">
          <select className="select" value={form.currency} onChange={set('currency')}>
            {[...new Set([form.currency, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </Field>
      </Card>
      <Card title="Email addresses">
        <Field label="Send emails from" hint="Must be on a domain set up in Cloudflare Email Routing or Resend."><input className="input" type="email" value={form.emailFrom} onChange={set('emailFrom')} /></Field>
        <Field label="Support email" hint="Customers' replies go here."><input className="input" type="email" value={form.supportEmail} onChange={set('supportEmail')} /></Field>
      </Card>
    </SettingsPage>
  );
}

export function Shipping() {
  const currency = useApp().store!.currency;
  const { store, form, setForm, error, bar } = useStoreForm(
    (s) => ({ flat: toMajor(s.shippingFlat, s.currency), freeOver: toMajor(s.freeShippingOver, s.currency), countries: s.shippingCountries ?? [] }),
    (f) => ({ shippingFlat: toMinor(f.flat, currency), freeShippingOver: f.freeOver ? toMinor(f.freeOver, currency) : undefined, shippingCountries: f.countries.map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)) }),
  );
  const cur = store.currency.toUpperCase();
  return (
    <SettingsPage icon={<Truck aria-hidden="true" />} title="Shipping" subtitle="One flat rate per order, with an optional free-shipping threshold.">
      {bar}
      {error ? <Banner tone="critical" title="Couldn't save">{error}</Banner> : null}
      <Card title="Rates">
        <div className="cols2">
          <Field label="Flat rate per order"><span className="affix"><span className="affix__tag">{cur}</span><input className="input affix__fill" inputMode="decimal" value={form.flat} onChange={(e) => setForm({ ...form, flat: e.target.value })} /></span></Field>
          <Field label="Free shipping over" hint="Leave empty to always charge."><span className="affix"><span className="affix__tag">{cur}</span><input className="input affix__fill" inputMode="decimal" value={form.freeOver} onChange={(e) => setForm({ ...form, freeOver: e.target.value })} /></span></Field>
        </div>
        <Defs
          rows={[
            { label: 'A $40 order pays', value: money(form.freeOver && toMinor('40', store.currency) >= toMinor(form.freeOver, store.currency) ? 0 : toMinor(form.flat, store.currency), store.currency) },
            ...(form.freeOver ? [{ label: `Orders over ${money(toMinor(form.freeOver, store.currency), store.currency)} pay`, value: 'Nothing' }] : []),
          ]}
        />
      </Card>
      <Card title="Where you ship">
        <Field label="Countries" hint="Two-letter codes such as US, GB, NG. Stripe only accepts addresses in these. Empty uses a default list of 17 countries.">
          <TagInput label="Countries" placeholder="US" value={form.countries} onChange={(countries) => setForm({ ...form, countries: countries.map((c) => c.toUpperCase().slice(0, 2)) })} />
        </Field>
      </Card>
    </SettingsPage>
  );
}

export function Notifications() {
  const { form, setForm, error, bar } = useStoreForm(
    (s) => ({ notifyEmail: s.notifyEmail ?? '', lowStockThreshold: String(s.lowStockThreshold ?? 5), abandonedCartEmails: s.abandonedCartEmails ?? false }),
    (f) => ({ notifyEmail: f.notifyEmail || undefined, lowStockThreshold: Number(f.lowStockThreshold) || 0, abandonedCartEmails: f.abandonedCartEmails }),
  );
  return (
    <SettingsPage icon={<Bell aria-hidden="true" />} title="Notifications">
      {bar}
      {error ? <Banner tone="critical" title="Couldn't save">{error}</Banner> : null}
      <Card title="Staff alerts">
        <Field label="Send staff alerts to" hint="Low-stock alerts. Defaults to the support email."><input className="input" type="email" value={form.notifyEmail} onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })} /></Field>
        <Field label="Low-stock threshold" hint="Alert when a product or variant drops to this many or fewer."><input className="input" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /></Field>
      </Card>
      <Card title="Customer emails">
        <label className="check"><input type="checkbox" checked={form.abandonedCartEmails} onChange={(e) => setForm({ ...form, abandonedCartEmails: e.target.checked })} /> Send a link back to the cart when a checkout expires unpaid</label>
        <span className="field__hint">Stripe keeps the checkout for 24 hours. The email goes out once, only to shoppers who entered their email.</span>
      </Card>
    </SettingsPage>
  );
}

export function Payments() {
  const store = useApp().store!;
  return (
    <SettingsPage icon={<CreditCard aria-hidden="true" />} title="Payments">
      <Card title="Stripe" action={<Badge tone="ok">Connected through the orders worker</Badge>}>
        <p>Stripe Checkout takes every payment, so card details never touch your servers. Refunds from an order page go back through Stripe.</p>
        <Defs
          rows={[
            { label: 'Currency', value: store.currency.toUpperCase() },
            { label: 'Secret key', value: <span className="mono">STRIPE_SECRET_KEY</span> },
            { label: 'Webhook secret', value: <span className="mono">STRIPE_WEBHOOK_SECRET</span> },
            { label: 'Webhook URL', value: <span className="mono">/stripe/webhook</span> },
          ]}
        />
        <span className="field__hint">Keys are Cloudflare secrets on the orders worker and are never sent to the browser. Change them with <span className="mono">wrangler secret put</span>.</span>
      </Card>
    </SettingsPage>
  );
}

interface StoreDraft {
  name: string;
  slug: string;
  currency: string;
  theme: ThemeId;
  emailFrom: string;
}

export function Stores() {
  const { stores, store: current, selectStore, reloadStores } = useApp();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState<StoreDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('new') || !stores.length) setDraft({ name: '', slug: '', currency: 'usd', theme: 'classic', emailFrom: '' });
  }, [params, stores.length]);

  async function create() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const s = await api<Store>('/stores', { body: { ...draft, domains: [], themeSettings: { accent: '#2e2a6b' }, shippingFlat: 0, active: true } });
      await reloadStores();
      selectStore(s._id);
      toast.show(`${s.name} created`);
      setDraft(null);
      setParams({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const add = <Button tone="primary" size="lg" onClick={() => setDraft({ name: '', slug: '', currency: 'usd', theme: 'classic', emailFrom: '' })}><Plus aria-hidden="true" /> Add store</Button>;

  return (
    <div className="page page--narrow">
      <div className="page__headwrap">
        <div className="page__head">
          <div className="page__titles">
            <h1 className="page__title">{stores.length ? <><StoreIcon aria-hidden="true" /> <span className="page__titletext">Stores</span></> : <span className="page__titletext">Create your first store</span>}</h1>
            <p className="page__sub">Each store is a separate storefront with its own domain, currency, design and orders.</p>
          </div>
          <div className="page__actions">{stores.length ? add : null}</div>
        </div>
      </div>
      {draft ? (
        <Modal
          title="New store"
          onClose={() => { if (stores.length) { setDraft(null); setParams({}); } }}
          footer={<Button tone="primary" busy={busy} disabled={!draft.name || !draft.slug || !draft.emailFrom} onClick={create}>Create store</Button>}
        >
          {error ? <Banner tone="critical" title="Couldn't create the store">{error}</Banner> : null}
          <Field label="Store name"><input className="input" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: slugify(e.target.value) })} /></Field>
          <div className="cols2">
            <Field label="Handle"><input className="input mono" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
            <Field label="Currency">
              <select className="select" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Send emails from"><input className="input" type="email" value={draft.emailFrom} onChange={(e) => setDraft({ ...draft, emailFrom: e.target.value })} placeholder="orders@your-domain.com" /></Field>
          <Field label="Design">
            <select className="select" value={draft.theme} onChange={(e) => setDraft({ ...draft, theme: e.target.value as ThemeId })}>
              {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <span className="field__hint">You can add domains, shipping and branding after it is created.</span>
        </Modal>
      ) : null}
      <DataTable<Store>
        rows={stores}
        rowKey={(s) => s._id}
        empty={<Empty art={<StoreArt />} title="No stores yet" />}
        columns={[
          {
            key: 'n',
            header: 'Store',
            render: (s) => (
              <span className="idcell">
                <span className="top__storemark" style={{ background: s.themeSettings.accent, width: '2rem', height: '2rem' }}>{s.name[0]?.toUpperCase()}</span>
                <span className="idcell__text"><span className="idcell__title">{s.name}</span><span className="idcell__meta">{s.domains[0] ?? `?store=${s.slug}`}</span></span>
              </span>
            ),
          },
          { key: 't', header: 'Design', render: (s) => THEMES.find((t) => t.id === s.theme)?.name ?? s.theme },
          { key: 'c', header: 'Currency', render: (s) => s.currency.toUpperCase() },
          { key: 's', header: 'Status', render: (s) => (s.active ? <Badge tone="ok">Open</Badge> : <Badge>Closed</Badge>) },
          { key: 'a', header: '', numeric: true, render: (s) => (current?._id === s._id ? <Badge tone="info" dot={false}>Current</Badge> : <Button onClick={() => { selectStore(s._id); toast.show(`Switched to ${s.name}`); }}>Switch</Button>) },
        ]}
      />
    </div>
  );
}

interface Member {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export function Team() {
  const { me } = useApp();
  const toast = useToast();
  const { data: team, reload } = useAsync(() => api<Member[]>('/team'), []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite() {
    setBusy(true);
    setError(null);
    try {
      await api('/team', { body: form });
      toast.show(`${form.name} can now sign in`);
      setForm({ name: '', email: '', password: '' });
      setAdding(false);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page--narrow">
      <div className="page__headwrap">
        <div className="page__head">
          <div className="page__titles"><h1 className="page__title"><Users aria-hidden="true" /> <span className="page__titletext">Team</span></h1><p className="page__sub">Owners can do everything. Staff can do everything except manage the team.</p></div>
          <div className="page__actions">{me.role === 'owner' ? <Button tone="primary" size="lg" onClick={() => setAdding(true)}><Plus aria-hidden="true" /> Add staff</Button> : null}</div>
        </div>
      </div>
      {adding ? (
        <Modal title="Add a staff member" onClose={() => setAdding(false)} footer={<><Button tone="plain" onClick={() => setAdding(false)}>Cancel</Button><Button tone="primary" busy={busy} disabled={!form.name || !form.email || form.password.length < 10} onClick={invite}>Add</Button></>}>
          {error ? <Banner tone="critical" title="Couldn't add">{error}</Banner> : null}
          <Field label="Name"><input className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Temporary password" hint="At least 10 characters. Ask them to change it under Your account."><input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        </Modal>
      ) : null}
      <DataTable<Member>
        rows={team}
        rowKey={(m) => m._id}
        empty={<Empty title="No one here" />}
        columns={[
          { key: 'n', header: 'Member', render: (m) => <span className="idcell"><span className="avatar" aria-hidden="true">{m.name.slice(0, 1).toUpperCase()}</span><span className="idcell__text"><span className="idcell__title">{m.name}{m.email === me.email ? ' (you)' : ''}</span><span className="idcell__meta">{m.email}</span></span></span> },
          { key: 'r', header: 'Role', render: (m) => <Badge tone={m.role === 'owner' ? 'info' : 'neutral'}>{m.role === 'owner' ? 'Owner' : 'Staff'}</Badge> },
          {
            key: 'a',
            header: '',
            numeric: true,
            render: (m) =>
              me.role === 'owner' && m.role === 'staff' ? (
                <Button tone="plain" iconOnly aria-label={`Remove ${m.name}`} onClick={async () => { if (confirm(`Remove ${m.name}? They will be signed out.`)) { await api(`/team/${m._id}`, { method: 'DELETE' }); toast.show(`${m.name} removed`); reload(); } }}>
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}

export function Account() {
  const { me } = useApp();
  const toast = useToast();
  const [pw, setPw] = useState({ current: '', next: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change() {
    setBusy(true);
    setError(null);
    try {
      await api('/auth/password', { body: pw });
      setPw({ current: '', next: '' });
      toast.show('Password changed');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsPage icon={<UserRound aria-hidden="true" />} title="Your account">
      <Card title="Profile">
        <Defs rows={[{ label: 'Name', value: me.name }, { label: 'Email', value: me.email }, { label: 'Role', value: me.role === 'owner' ? 'Owner' : 'Staff' }]} />
      </Card>
      <Card title="Password">
        {error ? <Banner tone="critical" title="Couldn't change it">{error}</Banner> : null}
        <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="New password" hint="At least 10 characters."><input className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        <div className="row"><span className="spacer" /><Button tone="primary" busy={busy} disabled={!pw.current || pw.next.length < 10} onClick={change}>Change password</Button></div>
      </Card>
    </SettingsPage>
  );
}
