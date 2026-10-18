import { useState, type ReactNode } from 'react';
import { Plus, TicketPercent } from 'lucide-react';
import { api, type Discount } from '../api';
import { useStore } from '../context';
import { money, toMajor, toMinor } from '../format';
import { Badge, Banner, Button, CouponArt, DataTable, Empty, Field, Learn, Modal, PageHeader, Tabs, useAsync, useToast } from '../ui';
import { shortDate } from './Orders';

interface Draft {
  _id?: string;
  code: string;
  type: Discount['type'];
  value: string;
  minSubtotal: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  active: boolean;
}

type State = 'active' | 'scheduled' | 'expired' | 'disabled';

function stateOf(d: Discount): State {
  const now = Date.now();
  if (!d.active) return 'disabled';
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return 'expired';
  if (d.usageLimit && d.usageCount >= d.usageLimit) return 'expired';
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}

const BADGE: Record<State, ReactNode> = {
  active: <Badge tone="ok">Active</Badge>,
  scheduled: <Badge tone="info">Scheduled</Badge>,
  expired: <Badge>Expired</Badge>,
  disabled: <Badge tone="warn">Disabled</Badge>,
};

const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');

export function Discounts() {
  const store = useStore();
  const toast = useToast();
  const cur = store.currency;
  const { data, error, reload } = useAsync(() => api<Discount[]>(`/discounts?storeId=${store._id}`), [store._id]);
  const [tab, setTab] = useState<'' | State>('');
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const describe = (d: Discount) => (d.type === 'percent' ? `${d.value}% off` : d.type === 'fixed' ? `${money(d.value, cur)} off` : 'Free shipping');
  const rows = data?.filter((d) => (!tab || stateOf(d) === tab) && (!q || d.code.includes(q.toUpperCase()))) ?? null;

  async function save() {
    if (!draft) return;
    setBusy(true);
    setSaveError(null);
    const body = {
      storeId: store._id,
      code: draft.code,
      type: draft.type,
      value: draft.type === 'percent' ? Number(draft.value) || 0 : draft.type === 'fixed' ? toMinor(draft.value, cur) : 0,
      minSubtotal: draft.minSubtotal ? toMinor(draft.minSubtotal, cur) : undefined,
      startsAt: draft.startsAt || undefined,
      endsAt: draft.endsAt ? `${draft.endsAt}T23:59:59Z` : undefined,
      usageLimit: draft.usageLimit ? Number(draft.usageLimit) : undefined,
      active: draft.active,
    };
    try {
      await api(draft._id ? `/discounts/${draft._id}` : '/discounts', { method: draft._id ? 'PUT' : 'POST', body });
      toast.show(draft._id ? `${draft.code} saved` : `${draft.code} created`);
      setDraft(null);
      reload();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const create = () => setDraft({ code: '', type: 'percent', value: '10', minSubtotal: '', startsAt: '', endsAt: '', usageLimit: '', active: true });
  const add = <Button tone="primary" size="lg" onClick={create}><Plus aria-hidden="true" /> Create discount</Button>;
  const edit = (d: Discount) =>
    setDraft({ _id: d._id, code: d.code, type: d.type, value: d.type === 'fixed' ? toMajor(d.value, cur) : String(d.value), minSubtotal: toMajor(d.minSubtotal, cur), startsAt: day(d.startsAt), endsAt: day(d.endsAt), usageLimit: d.usageLimit ? String(d.usageLimit) : '', active: d.active });

  return (
    <div className="page">
      <PageHeader icon={<TicketPercent aria-hidden="true" />} title="Discounts" subtitle="Codes customers type in the cart." actions={add} />
      {error ? <Banner tone="critical" title="Couldn't load discounts">{error}</Banner> : null}
      {draft ? (
        <Modal
          title={draft._id ? `Edit ${draft.code}` : 'Create discount'}
          onClose={() => setDraft(null)}
          footer={
            <>
              {draft._id ? <Button tone="critical" onClick={async () => { if (confirm(`Delete ${draft.code}?`)) { await api(`/discounts/${draft._id}`, { method: 'DELETE' }); toast.show(`${draft.code} deleted`); setDraft(null); reload(); } }}>Delete</Button> : null}
              <span className="spacer" />
              <Button tone="plain" onClick={() => setDraft(null)}>Cancel</Button>
              <Button tone="primary" busy={busy} disabled={draft.code.length < 2} onClick={save}>Save</Button>
            </>
          }
        >
          {saveError ? <Banner tone="critical" title="Couldn't save">{saveError}</Banner> : null}
          <Field label="Code" hint="Customers type this in the cart. Letters and numbers, not case sensitive.">
            <div className="row">
              <input className="input mono" autoFocus value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })} placeholder="SUMMER10" />
              <Button onClick={() => setDraft({ ...draft, code: Math.random().toString(36).slice(2, 10).toUpperCase() })}>Generate</Button>
            </div>
          </Field>
          <div className="segmented" aria-label="Discount type">
            {([['percent', 'Percentage'], ['fixed', 'Fixed amount'], ['free_shipping', 'Free shipping']] as const).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={draft.type === v} className="segmented__opt" onClick={() => setDraft({ ...draft, type: v })}>{l}</button>
            ))}
          </div>
          <div className="cols2">
            {draft.type !== 'free_shipping' ? (
              <Field label={draft.type === 'percent' ? 'Percent off' : 'Amount off'}>
                <span className="affix">
                  {draft.type === 'fixed' ? <span className="affix__tag">{cur.toUpperCase()}</span> : null}
                  <input className="input affix__fill" inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                  {draft.type === 'percent' ? <span className="affix__tag affix__tag--end">%</span> : null}
                </span>
              </Field>
            ) : null}
            <Field label="Minimum cart subtotal" hint="Optional"><span className="affix"><span className="affix__tag">{cur.toUpperCase()}</span><input className="input affix__fill" inputMode="decimal" value={draft.minSubtotal} onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value })} /></span></Field>
            <Field label="Starts" hint="Optional"><input className="input" type="date" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></Field>
            <Field label="Ends" hint="Optional, the code works all of that day"><input className="input" type="date" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} /></Field>
            <Field label="Total uses" hint="Optional cap across all customers"><input className="input" type="number" min={1} value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Enabled</label>
        </Modal>
      ) : null}
      <DataTable<Discount>
        tabs={<Tabs value={tab} onChange={setTab} options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'expired', label: 'Expired' }, { value: 'disabled', label: 'Disabled' }]} />}
        search={{ value: q, onChange: setQ, placeholder: 'Search codes' }}
        rows={rows ?? (error ? [] : null)}
        rowKey={(d) => d._id}
        empty={
          data?.length ? (
            <Empty title="No discounts here" />
          ) : (
            <Empty art={<CouponArt />} title="No discount codes yet" body="Create a code a customer can type in the cart: a percentage or a fixed amount off, or free shipping, with an optional window and usage cap." actions={add} />
          )
        }
        columns={[
          { key: 'c', header: 'Code', render: (d) => <button type="button" className="linkbtn" onClick={() => edit(d)}><span className="idcell__text"><span className="idcell__title mono">{d.code}</span><span className="idcell__meta">{describe(d)}{d.minSubtotal ? ` over ${money(d.minSubtotal, cur)}` : ''}</span></span></button> },
          { key: 's', header: 'Status', mobile: true, render: (d) => BADGE[stateOf(d)] },
          { key: 'w', header: 'Window', render: (d) => <span className="muted">{d.startsAt || d.endsAt ? `${d.startsAt ? shortDate(d.startsAt) : 'Now'} to ${d.endsAt ? shortDate(d.endsAt) : 'no end'}` : 'Always'}</span> },
          { key: 'u', header: 'Used', mobile: true, numeric: true, render: (d) => `${d.usageCount}${d.usageLimit ? ` / ${d.usageLimit}` : ''}` },
        ]}
      />
      <Learn>Stripe charges the discounted total, and a code counts as used once the order is paid.</Learn>
    </div>
  );
}
