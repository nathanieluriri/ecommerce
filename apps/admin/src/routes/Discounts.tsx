import { useState } from 'react';
import { api, type Discount } from '../api';
import { useStore } from '../context';
import { money, toMajor, toMinor } from '../format';
import { Badge, Banner, Button, Card, Empty, Field, Loading, Modal, PageHeader, useAsync } from '../ui';

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

const day = (iso?: string) => (iso ? iso.slice(0, 10) : '');

function state(d: Discount): { tone: 'ok' | 'neutral' | 'warn'; label: string } {
  const now = Date.now();
  if (!d.active) return { tone: 'neutral', label: 'Off' };
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return { tone: 'neutral', label: 'Expired' };
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return { tone: 'warn', label: 'Scheduled' };
  if (d.usageLimit && d.usageCount >= d.usageLimit) return { tone: 'neutral', label: 'Used up' };
  return { tone: 'ok', label: 'Active' };
}

export function Discounts() {
  const store = useStore();
  const cur = store.currency;
  const { data, reload } = useAsync(() => api<Discount[]>(`/discounts?storeId=${store._id}`), [store._id]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const describe = (d: Discount) =>
    d.type === 'percent' ? `${d.value}% off` : d.type === 'fixed' ? `${money(d.value, cur)} off` : 'Free shipping';

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
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
      setDraft(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const edit = (d: Discount) =>
    setDraft({
      _id: d._id,
      code: d.code,
      type: d.type,
      value: d.type === 'fixed' ? toMajor(d.value, cur) : String(d.value),
      minSubtotal: toMajor(d.minSubtotal, cur),
      startsAt: day(d.startsAt),
      endsAt: day(d.endsAt),
      usageLimit: d.usageLimit ? String(d.usageLimit) : '',
      active: d.active,
    });

  return (
    <div className="page">
      <PageHeader
        title="Discounts"
        subtitle="Codes shoppers enter in the cart. Stripe charges the discounted total."
        actions={<Button tone="primary" onClick={() => setDraft({ code: '', type: 'percent', value: '10', minSubtotal: '', startsAt: '', endsAt: '', usageLimit: '', active: true })}>Create discount</Button>}
      />
      {draft ? (
        <Modal
          title={draft._id ? `Edit ${draft.code}` : 'New discount'}
          onClose={() => setDraft(null)}
          footer={<><Button tone="plain" onClick={() => setDraft(null)}>Cancel</Button><Button tone="primary" busy={busy} onClick={save}>Save</Button></>}
        >
          {error ? <Banner tone="critical">{error}</Banner> : null}
          <div className="cols2">
            <Field label="Code"><input className="input mono" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="SUMMER10" /></Field>
            <Field label="Type">
              <select className="select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Discount['type'] })}>
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </Field>
            {draft.type !== 'free_shipping' ? (
              <Field label={draft.type === 'percent' ? 'Percent off' : `Amount off (${cur.toUpperCase()})`}>
                <input className="input" inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
              </Field>
            ) : null}
            <Field label="Minimum subtotal" hint="Optional"><input className="input" inputMode="decimal" value={draft.minSubtotal} onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value })} /></Field>
            <Field label="Starts" hint="Optional"><input className="input" type="date" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></Field>
            <Field label="Ends" hint="Optional, inclusive"><input className="input" type="date" value={draft.endsAt} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} /></Field>
            <Field label="Usage limit" hint="Total redemptions, optional"><input className="input" type="number" min={1} value={draft.usageLimit} onChange={(e) => setDraft({ ...draft, usageLimit: e.target.value })} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
        </Modal>
      ) : null}
      <Card flush>
        {!data ? (
          <Loading what="discounts" />
        ) : !data.length ? (
          <Empty title="No discounts yet" body="Create a code for a sale, a newsletter offer or free shipping." />
        ) : (
          <table className="table">
            <thead><tr><th>Code</th><th>Offer</th><th>Status</th><th className="th--num">Used</th><th /></tr></thead>
            <tbody>
              {data.map((d) => {
                const s = state(d);
                return (
                  <tr key={d._id} className="is-clickable" onClick={() => edit(d)}>
                    <td className="cell--primary mono">{d.code}</td>
                    <td>{describe(d)}{d.minSubtotal ? <span className="muted"> over {money(d.minSubtotal, cur)}</span> : null}</td>
                    <td><Badge tone={s.tone}>{s.label}</Badge></td>
                    <td className="cell--num num">{d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</td>
                    <td className="cell--num">
                      <Button tone="plain" onClick={async (e) => { e.stopPropagation(); if (confirm(`Delete ${d.code}?`)) { await api(`/discounts/${d._id}`, { method: 'DELETE' }); reload(); } }}>Delete</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
