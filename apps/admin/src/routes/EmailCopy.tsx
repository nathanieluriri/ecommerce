import { useState } from 'react';
import { api, type CopyTemplate, type Store } from '../api';
import { useApp, useStore } from '../context';
import { Banner, Button, Card, Field } from '../ui';

const TEMPLATES: { id: CopyTemplate; name: string; when: string; subject: string; intro: string }[] = [
  { id: 'order_confirmation', name: 'Order confirmation', when: 'Sent when payment succeeds', subject: 'Order #{number} confirmed', intro: 'Thanks for your order, {name}! We will email you again when it ships.' },
  { id: 'order_shipped', name: 'Shipped', when: 'Sent when you mark an order as shipped', subject: 'Order #{number} is on its way', intro: 'Good news, {name}: your order has shipped.' },
  { id: 'order_status', name: 'Delivered or cancelled', when: 'Sent for other status changes', subject: 'Update on order #{number}', intro: 'There is an update on your order.' },
  { id: 'order_refunded', name: 'Refund', when: 'Sent when you refund', subject: 'Refund for order #{number}', intro: 'We have issued a refund for your order. It can take 5 to 10 business days to appear on your statement.' },
  { id: 'abandoned_checkout', name: 'Abandoned checkout', when: 'Sent when a checkout expires, if turned on in store settings', subject: 'You left something behind', intro: 'Your cart at {store} is still waiting. Pick up where you left off whenever you are ready.' },
];

export function EmailCopy() {
  const store = useStore();
  const { reloadStores } = useApp();
  const [copy, setCopy] = useState<NonNullable<Store['emailCopy']>>(store.emailCopy ?? {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (id: CopyTemplate, key: 'subject' | 'intro', value: string) => setCopy({ ...copy, [id]: { ...copy[id], [key]: value || undefined } });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/stores/${store._id}`, { method: 'PUT', body: { emailCopy: copy } });
      await reloadStores();
      setMsg('Saved.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Banner>Leave a field empty to use the default shown in grey. You can use {'{number}'}, {'{name}'} and {'{store}'}.</Banner>
      {msg ? <Banner>{msg}</Banner> : null}
      {TEMPLATES.map((t) => (
        <Card key={t.id} title={t.name}>
          <span className="muted">{t.when}</span>
          <Field label="Subject"><input className="input" placeholder={t.subject} value={copy[t.id]?.subject ?? ''} onChange={(e) => set(t.id, 'subject', e.target.value)} /></Field>
          <Field label="Opening line"><textarea className="textarea" rows={2} placeholder={t.intro} value={copy[t.id]?.intro ?? ''} onChange={(e) => set(t.id, 'intro', e.target.value)} /></Field>
        </Card>
      ))}
      <div className="row"><span className="spacer" /><Button tone="primary" busy={busy} onClick={save}>Save email copy</Button></div>
    </>
  );
}
