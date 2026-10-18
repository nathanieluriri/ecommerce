import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Order, type OrderStatus } from '../api';
import { dateTime, money, toMinor } from '../format';
import { Banner, Button, Card, Field, Loading, Modal, PageHeader, StatusBadge, useAsync } from '../ui';

const CARRIERS: Record<string, string> = {
  UPS: 'https://www.ups.com/track?tracknum=',
  USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  FedEx: 'https://www.fedex.com/fedextrack/?trknbr=',
  DHL: 'https://www.dhl.com/en/express/tracking.html?AWB=',
  'Royal Mail': 'https://www.royalmail.com/track-your-item#/tracking-results/',
};

function FulfillDialog({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const [carrier, setCarrier] = useState('UPS');
  const [number, setNumber] = useState('');
  const [url, setUrl] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackingUrl = url || (number && CARRIERS[carrier] ? `${CARRIERS[carrier]}${encodeURIComponent(number)}` : '');

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api(`/orders/${order._id}/status`, {
        body: { status: 'fulfilled', notify, fulfillment: number ? { carrier, trackingNumber: number, trackingUrl: trackingUrl || undefined } : undefined },
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Ship order #${order.number}`}
      onClose={onClose}
      footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="primary" busy={busy} onClick={submit}>Mark as shipped</Button></>}
    >
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <div className="cols2">
        <Field label="Carrier">
          <select className="select" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
            {[...Object.keys(CARRIERS), 'Other'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Tracking number" hint="Optional"><input className="input mono" value={number} onChange={(e) => setNumber(e.target.value)} /></Field>
      </div>
      <Field label="Tracking link" hint={trackingUrl && !url ? `Will use ${trackingUrl}` : 'Optional'}>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      </Field>
      <label className="check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer that it shipped</label>
    </Modal>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: order, error, reload } = useAsync(() => api<Order>(`/orders/${id}`), [id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState('');
  const [shipping, setShipping] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <div className="page"><Banner tone="critical">{error}</Banner></div>;
  if (!order) return <div className="page"><Loading what="order" /></div>;

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: OrderStatus) => run(status, () => api(`/orders/${order._id}/status`, { body: { status } }));
  const m = (n: number) => money(n, order.currency);
  const refunded = order.refundedAmount ?? 0;
  const refundable = order.total - refunded;
  const canRefund = Boolean(order.stripePaymentIntentId) && refundable > 0;
  const canCancel = order.status === 'pending' || order.status === 'paid';
  const addr = order.shippingAddress;
  const f = order.fulfillment;

  return (
    <div className="page">
      <PageHeader
        title={`Order #${order.number}`}
        badge={<StatusBadge status={order.status} />}
        subtitle={dateTime(order.createdAt)}
        actions={
          <>
            <Link className="btn btn--plain" to={`/orders/${order._id}/print`} target="_blank">Packing slip</Link>
            {canCancel ? <Button tone="plain" busy={busy === 'cancelled'} onClick={() => confirm('Cancel this order?') && void setStatus('cancelled')}>Cancel order</Button> : null}
            {order.status === 'paid' ? <Button tone="primary" onClick={() => setShipping(true)}>Ship order</Button> : null}
            {order.status === 'fulfilled' ? <Button tone="primary" busy={busy === 'delivered'} onClick={() => void setStatus('delivered')}>Mark as delivered</Button> : null}
          </>
        }
      />
      {shipping ? <FulfillDialog order={order} onClose={() => setShipping(false)} onDone={() => { setShipping(false); reload(); }} /> : null}
      {actionError ? <Banner tone="critical">{actionError}</Banner> : null}
      {order.flags?.includes('oversold') ? <Banner tone="warn">This order took stock below zero. Check inventory before shipping it.</Banner> : null}
      <div className="form2">
        <div className="form2__main">
          <Card title="Items" flush>
            <table className="table">
              <tbody>
                {order.items.map((i) => (
                  <tr key={`${i.productId}.${i.variantId ?? ''}`}>
                    <td className="cell--primary">
                      <span className="idcell">
                        {i.image ? <img className="thumb" src={i.image} alt="" /> : <span className="thumb" />}
                        <span className="idcell__text">
                          <Link className="idcell__title" to={`/products/${i.productId}`}>{i.title}</Link>
                          <span className="idcell__meta muted">{[i.variantTitle, i.sku && `SKU ${i.sku}`, `${m(i.price)} × ${i.quantity}`].filter(Boolean).join(' · ')}</span>
                        </span>
                      </span>
                    </td>
                    <td className="cell--num num">{m(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="card__body">
              <div className="defs">
                <div className="defs__row"><span className="defs__label">Subtotal</span><span className="defs__value num">{m(order.subtotal)}</span></div>
                {order.discount ? <div className="defs__row"><span className="defs__label">Discount {order.discountCode}</span><span className="defs__value num">-{m(order.discount)}</span></div> : null}
                <div className="defs__row"><span className="defs__label">Shipping</span><span className="defs__value num">{m(order.shipping)}</span></div>
                <div className="defs__row defs__row--total"><span className="defs__label">Total</span><span className="defs__value num">{m(order.total)}</span></div>
                {refunded ? <div className="defs__row"><span className="defs__label">Refunded</span><span className="defs__value num">-{m(refunded)}</span></div> : null}
              </div>
            </div>
          </Card>
          <Card title="Timeline">
            <div className="row">
              <input className="input" placeholder="Add a private note" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button disabled={!note.trim()} busy={busy === 'note'} onClick={() => run('note', async () => { await api(`/orders/${order._id}/note`, { body: { note } }); setNote(''); })}>Post</Button>
            </div>
            <ul className="tl">
              {[...(order.timeline ?? [])].reverse().map((t, i) => (
                <li className="tl__item" key={i}>
                  <span className={`tl__dot ${t.status === 'refunded' || t.status === 'cancelled' ? 'tl__dot--critical' : t.status ? 'tl__dot--ok' : 'tl__dot--info'}`} />
                  <div className="tl__content">
                    <div className="tl__msg">{t.note}</div>
                    <div className="tl__meta muted">{dateTime(t.at)}{t.by ? ` by ${t.by}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="form2__side">
          <Card title="Customer">
            <div>{order.customer.name ?? 'Guest'}</div>
            {order.customer.email ? <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a> : null}
            {order.customer.phone ? <div className="muted">{order.customer.phone}</div> : null}
          </Card>
          <Card title="Shipping address">
            {addr ? (
              <div>{[addr.line1, addr.line2, [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', '), addr.country].filter(Boolean).map((l) => <div key={l}>{l}</div>)}</div>
            ) : (
              <span className="muted">Not provided yet</span>
            )}
          </Card>
          {f ? (
            <Card title="Shipment">
              <div>{f.carrier ?? 'Shipped'} {f.trackingNumber ? <span className="mono">{f.trackingNumber}</span> : null}</div>
              {f.trackingUrl ? <a href={f.trackingUrl} target="_blank" rel="noreferrer">Track package</a> : null}
              <div className="muted">{dateTime(f.at)}</div>
            </Card>
          ) : null}
          {canRefund ? (
            <Card title="Refund">
              <Field label="Amount" hint={`Up to ${m(refundable)}. Leave empty to refund the rest.`}>
                <input className="input" inputMode="decimal" placeholder={m(refundable)} value={refund} onChange={(e) => setRefund(e.target.value)} />
              </Field>
              <Button
                tone="critical"
                busy={busy === 'refund'}
                onClick={() => {
                  if (!confirm('Refund this order through Stripe?')) return;
                  void run('refund', async () => {
                    await api(`/orders/${order._id}/refund`, { body: refund ? { amount: toMinor(refund, order.currency) } : {} });
                    setRefund('');
                  });
                }}
              >
                Refund via Stripe
              </Button>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
