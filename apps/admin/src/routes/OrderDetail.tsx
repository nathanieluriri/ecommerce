import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ban, Copy, MailCheck, PackageCheck, Printer, Send, ShoppingBag, Truck } from 'lucide-react';
import { api, qs, type Order, type OrderStatus } from '../api';
import { useStore } from '../context';
import { dateTime, money, toMinor } from '../format';
import { Badge, Banner, Button, Card, Defs, Field, Loading, MenuItem, MenuSeparator, Modal, PageHeader, StatusBadge, useAsync, useToast } from '../ui';

const CARRIERS: Record<string, string> = {
  UPS: 'https://www.ups.com/track?tracknum=',
  USPS: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  FedEx: 'https://www.fedex.com/fedextrack/?trknbr=',
  DHL: 'https://www.dhl.com/en/express/tracking.html?AWB=',
  'Royal Mail': 'https://www.royalmail.com/track-your-item#/tracking-results/',
};

interface SentEmail {
  _id: string;
  subject: string;
  to: string;
  template?: string;
  status: 'sent' | 'failed';
  error?: string;
  createdAt: string;
}

function SendOutDialog({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
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
      title="Send out items"
      onClose={onClose}
      footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="primary" busy={busy} onClick={submit}>Mark as sent out</Button></>}
    >
      {error ? <Banner tone="critical" title="Couldn't send out the order">{error}</Banner> : null}
      <p className="muted">All {order.items.reduce((s, i) => s + i.quantity, 0)} items in order #{order.number} go out in one parcel.</p>
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
      <label className="check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email the customer that it is on its way</label>
    </Modal>
  );
}

function RefundDialog({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: () => void }) {
  const remaining = order.total - (order.refundedAmount ?? 0);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const m = (n: number) => money(n, order.currency);
  const value = amount ? toMinor(amount, order.currency) : remaining;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api(`/orders/${order._id}/refund`, { body: amount ? { amount: value } : {} });
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Refund"
      onClose={onClose}
      footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="critical" busy={busy} disabled={value <= 0 || value > remaining} onClick={submit}>Refund {m(Math.min(value, remaining))}</Button></>}
    >
      {error ? <Banner tone="critical" title="Stripe refused the refund">{error}</Banner> : null}
      <Defs rows={[{ label: 'Paid', value: m(order.total) }, { label: 'Already refunded', value: m(order.refundedAmount ?? 0) }, { label: 'Can refund', value: m(remaining), total: true }]} />
      <Field label="Amount" hint="Leave empty to refund everything that is left.">
        <input className="input" inputMode="decimal" placeholder={(remaining / 100).toFixed(2)} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <span className="muted">The money goes back to the customer's card through Stripe and they get an email.</span>
    </Modal>
  );
}

const TEMPLATE_NAMES: Record<string, string> = {
  order_confirmation: 'Order confirmation',
  order_shipped: 'Shipped',
  order_status: 'Status update',
  order_refunded: 'Refund',
  abandoned_checkout: 'Abandoned checkout',
};

export function OrderDetail() {
  const { id } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: order, error, reload } = useAsync(() => api<Order>(`/orders/${id}`), [id]);
  const emails = useAsync(() => api<SentEmail[]>(`/orders/${id}/emails`), [id, order?.status]);
  const account = useAsync(
    () => (order?.customer.email ? api<{ _id: string; orders: number } | null>(`/customers/lookup${qs({ storeId: store._id, email: order.customer.email })}`) : Promise.resolve(null)),
    [order?.customer.email],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState<'ship' | 'refund' | null>(null);

  if (error) return <div className="page"><Banner tone="critical" title="Couldn't load this order">{error}</Banner></div>;
  if (!order) return <div className="page"><Loading what="order" /></div>;

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await fn();
      toast.show(done);
      reload();
    } catch (e) {
      toast.show((e as Error).message, 'critical');
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: OrderStatus, done: string) => run(status, () => api(`/orders/${order._id}/status`, { body: { status } }), done);
  const m = (n: number) => money(n, order.currency);
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  const refunded = order.refundedAmount ?? 0;
  const canRefund = Boolean(order.stripePaymentIntentId) && order.total - refunded > 0;
  const canCancel = order.status === 'pending' || order.status === 'paid';
  const addr = order.shippingAddress;
  const f = order.fulfillment;
  const shipped = order.status === 'fulfilled' || order.status === 'delivered';

  const primary =
    order.status === 'paid' ? (
      <Button tone="primary" size="lg" onClick={() => setDialog('ship')}><Send aria-hidden="true" /> Send out items</Button>
    ) : order.status === 'fulfilled' ? (
      <Button tone="primary" size="lg" busy={busy === 'delivered'} onClick={() => void setStatus('delivered', 'Marked as delivered')}><PackageCheck aria-hidden="true" /> Mark as delivered</Button>
    ) : null;

  return (
    <div className="page">
      <PageHeader
        icon={<ShoppingBag aria-hidden="true" />}
        backTo="/orders"
        backLabel="Orders"
        title={`#${order.number}`}
        badge={<StatusBadge status={order.status} />}
        subtitle={`Placed ${dateTime(order.createdAt)}${order.customer.email ? ` · ${order.customer.email}` : ''}`}
        menu={(close) => (
          <>
            <MenuItem icon={<Printer aria-hidden="true" />} onSelect={() => { close(); window.open(`/orders/${order._id}/print`, '_blank'); }}>Print packing slip</MenuItem>
            <MenuItem icon={<Copy aria-hidden="true" />} onSelect={() => { close(); void navigator.clipboard.writeText(String(order.number)); toast.show('Order number copied'); }}>Copy order number</MenuItem>
            {canRefund ? <MenuItem icon={<MailCheck aria-hidden="true" />} onSelect={() => { close(); setDialog('refund'); }}>Refund</MenuItem> : null}
            {canCancel ? (
              <>
                <MenuSeparator />
                <MenuItem critical icon={<Ban aria-hidden="true" />} onSelect={() => { close(); if (confirm('Cancel this order? The customer gets an email.')) void setStatus('cancelled', 'Order cancelled'); }}>Cancel order</MenuItem>
              </>
            ) : null}
          </>
        )}
        actions={primary}
      />
      {dialog === 'ship' ? <SendOutDialog order={order} onClose={() => setDialog(null)} onDone={() => { setDialog(null); toast.show('Order sent out'); reload(); }} /> : null}
      {dialog === 'refund' ? <RefundDialog order={order} onClose={() => setDialog(null)} onDone={() => { setDialog(null); toast.show('Refund sent to Stripe'); reload(); }} /> : null}
      {order.flags?.includes('oversold') ? <Banner tone="warn" title="This order oversold">Stock went below zero when it was paid. Check you have the items before sending it out.</Banner> : null}
      {order.status === 'pending' ? <Banner title="Waiting for payment">The customer started checkout but Stripe has not confirmed a payment yet. Unpaid checkouts are cancelled after a day.</Banner> : null}
      <div className="form2">
        <div className="form2__main">
          <Card title={<>Items <span className="muted">· {count}</span></>} action={order.status === 'paid' ? <Button onClick={() => setDialog('ship')}><Send aria-hidden="true" /> Send out items</Button> : undefined} flush>
            <table className="table">
              <thead><tr><th>Item</th><th className="th--num">Qty</th><th>Sent</th><th className="th--num">Unit</th><th className="th--num">Total</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={`${i.productId}.${i.variantId ?? ''}`} className="is-clickable" onClick={() => navigate(`/products/${i.productId}`)}>
                    <td className="cell--primary">
                      <span className="idcell__text">
                        <span className="idcell__title">{i.title}</span>
                        <span className="idcell__meta">{[i.variantTitle, i.sku && <span className="mono" key="sku">{i.sku}</span>].filter(Boolean).map((x, k) => <span key={k}>{k ? ' · ' : ''}{x}</span>)}</span>
                      </span>
                    </td>
                    <td className="cell--num num">{i.quantity}</td>
                    <td><Badge tone={shipped ? 'ok' : 'neutral'}>{shipped ? i.quantity : 0} of {i.quantity}</Badge></td>
                    <td className="cell--num num">{m(i.price)}</td>
                    <td className="cell--num num"><strong>{m(i.price * i.quantity)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Shipment">
            {f ? (
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Truck aria-hidden="true" style={{ width: 18, color: 'var(--ink-sub)' }} />
                <div className="stack stack--tight" style={{ flex: 1 }}>
                  <div className="row"><strong>{f.carrier ?? 'Sent out'}</strong>{order.status === 'delivered' ? <Badge tone="ok">Delivered</Badge> : <Badge tone="info">On its way</Badge>}</div>
                  {f.trackingNumber ? <span className="mono">{f.trackingNumber}</span> : <span className="muted">No tracking number</span>}
                  <span className="muted">Sent {dateTime(f.at)}</span>
                </div>
                {f.trackingUrl ? <a className="btn btn--default" href={f.trackingUrl} target="_blank" rel="noreferrer">Track</a> : null}
              </div>
            ) : shipped ? (
              <span className="muted">Sent out without tracking details.</span>
            ) : (
              <span className="muted">Nothing sent out yet.{order.status === 'paid' ? ' Send out the items to add tracking.' : ''}</span>
            )}
          </Card>
          <Card title="Emails" flush>
            {emails.data?.length ? (
              <table className="table">
                <tbody>
                  {emails.data.map((e) => (
                    <tr key={e._id}>
                      <td className="cell--primary">
                        <span className="idcell__text">
                          <span className="idcell__title">{TEMPLATE_NAMES[e.template ?? ''] ?? e.subject}</span>
                          <span className="idcell__meta">{e.to}</span>
                        </span>
                      </td>
                      <td>{e.status === 'sent' ? <Badge tone="ok">Sent</Badge> : <Badge tone="critical">Failed</Badge>}</td>
                      <td className="cell--num muted">{dateTime(e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="card__body muted">No emails sent for this order yet.</div>
            )}
          </Card>
          <Card title="History">
            <div className="row">
              <input className="input" placeholder="Leave a note for your team" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && note.trim() && void run('note', async () => { await api(`/orders/${order._id}/note`, { body: { note } }); setNote(''); }, 'Note added')} />
              <Button disabled={!note.trim()} busy={busy === 'note'} onClick={() => run('note', async () => { await api(`/orders/${order._id}/note`, { body: { note } }); setNote(''); }, 'Note added')}>Post</Button>
            </div>
            <ul className="tl">
              {[...(order.timeline ?? [])].reverse().map((t, i) => (
                <li className="tl__item" key={i}>
                  <span className={`tl__dot ${t.status === 'refunded' || t.status === 'cancelled' ? 'tl__dot--critical' : t.status ? 'tl__dot--ok' : 'tl__dot--info'}`} />
                  <div className="tl__content">
                    <div className="tl__msg">{t.note}</div>
                    <div className="tl__meta muted">{dateTime(t.at)}{t.by ? ` · ${t.by}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="form2__side">
          <Card title="Customer">
            <Defs
              rows={[
                { label: 'Name', value: order.customer.name ?? '-' },
                { label: 'Email', value: order.customer.email ? <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a> : '-' },
                ...(order.customer.phone ? [{ label: 'Phone', value: order.customer.phone }] : []),
                { label: 'Account', value: account.data ? <Link to={`/customers/${account.data._id}`}>{account.data.orders} {account.data.orders === 1 ? 'order' : 'orders'}</Link> : 'Guest checkout' },
              ]}
            />
            <div>
              <div className="field__label" style={{ marginBottom: 'var(--s1)' }}>Delivery address</div>
              {addr ? (
                <div style={{ lineHeight: 1.6 }}>
                  {[order.customer.name, addr.line1, addr.line2, addr.city, [addr.state, addr.postalCode].filter(Boolean).join(' '), addr.country].filter(Boolean).map((l) => <div key={l}>{l}</div>)}
                </div>
              ) : (
                <span className="muted">-</span>
              )}
            </div>
          </Card>
          <Card title="Payment" action={order.stripePaymentIntentId ? <Badge tone="ok">Stripe</Badge> : undefined}>
            <Defs
              rows={[
                { label: `Subtotal · ${count} ${count === 1 ? 'item' : 'items'}`, value: m(order.subtotal) },
                ...(order.discount ? [{ label: `Discount · ${order.discountCode}`, value: `-${m(order.discount)}` }] : []),
                { label: 'Delivery', value: order.shipping ? m(order.shipping) : 'Free' },
                { label: 'Total', value: m(order.total), total: true },
                ...(refunded ? [{ label: 'Refunded', value: `-${m(refunded)}` }, { label: 'Net', value: m(order.total - refunded), total: true }] : []),
              ]}
            />
            {canRefund ? <Button onClick={() => setDialog('refund')}>Refund</Button> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
