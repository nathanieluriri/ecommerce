import { useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import { api, type CopyTemplate, type Store } from '../api';
import { useApp, useStore } from '../context';
import { Banner, Card, Field, PageHeader, SaveBar, useToast } from '../ui';

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
  const toast = useToast();
  const initial = useMemo(() => JSON.stringify(store.emailCopy ?? {}), [store.emailCopy]);

  const set = (id: CopyTemplate, key: 'subject' | 'intro', value: string) => setCopy({ ...copy, [id]: { ...copy[id], [key]: value || undefined } });

  async function save() {
    setBusy(true);
    try {
      await api(`/stores/${store._id}`, { method: 'PUT', body: { emailCopy: copy } });
      await reloadStores();
      toast.show('Email templates saved');
    } catch (e) {
      toast.show((e as Error).message, 'critical');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader icon={<Mail aria-hidden="true" />} backTo="/emails" backLabel="Emails" title="Templates" subtitle={`The words in the emails ${store.name} sends to customers.`} />
      <SaveBar when={JSON.stringify(copy) !== initial} saving={busy} label="Unsaved template changes" onDiscard={() => setCopy(store.emailCopy ?? {})} onSave={() => void save()} />
      <Banner title="Empty fields use the default">The default text shows in grey. You can use {'{number}'} for the order number, {'{name}'} for the customer's first name and {'{store}'} for the store name.</Banner>
      {TEMPLATES.map((t) => (
        <Card key={t.id} title={t.name}>
          <span className="muted">{t.when}</span>
          <Field label="Subject"><input className="input" placeholder={t.subject} value={copy[t.id]?.subject ?? ''} onChange={(e) => set(t.id, 'subject', e.target.value)} /></Field>
          <Field label="Opening line"><textarea className="textarea" rows={2} placeholder={t.intro} value={copy[t.id]?.intro ?? ''} onChange={(e) => set(t.id, 'intro', e.target.value)} /></Field>
        </Card>
      ))}
    </div>
  );
}
