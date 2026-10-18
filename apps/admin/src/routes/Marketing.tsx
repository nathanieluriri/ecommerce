import { useState } from 'react';
import { api, download, qs, type Broadcast, type Paged, type Subscriber } from '../api';
import { useStore } from '../context';
import { dateTime } from '../format';
import { Badge, Banner, Button, Card, Empty, Field, Loading, Modal, PageHeader, Pager, Tabs, useAsync } from '../ui';

const SIZE = 25;

function Compose({ audience, onClose, onSent }: { audience: number; onClose: () => void; onSent: () => void }) {
  const store = useStore();
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    if (!confirm(`Send to ${audience} subscribers?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api('/broadcasts', { body: { storeId: store._id, subject, text } });
      onSent();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="New broadcast"
      onClose={onClose}
      footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="primary" busy={busy} disabled={!subject || !text} onClick={send}>Send to {audience}</Button></>}
    >
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <Field label="Subject"><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      <Field label="Message" hint="Plain text. Blank lines start new paragraphs. An unsubscribe link is added automatically.">
        <textarea className="textarea" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <span className="muted">Sending happens in batches every few minutes, so large lists take a while.</span>
    </Modal>
  );
}

export function Marketing() {
  const store = useStore();
  const [tab, setTab] = useState<'subscribers' | 'broadcasts'>('subscribers');
  const [status, setStatus] = useState<'subscribed' | 'unsubscribed'>('subscribed');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [compose, setCompose] = useState(false);
  const [adding, setAdding] = useState('');
  const subs = useAsync(
    () => api<Paged<Subscriber> & { subscribed: number }>(`/subscribers${qs({ storeId: store._id, status, q, page, limit: SIZE })}`),
    [store._id, status, q, page],
  );
  const casts = useAsync(() => api<Broadcast[]>(`/broadcasts?storeId=${store._id}`), [store._id, tab]);
  const audience = subs.data?.subscribed ?? 0;

  async function addEmails() {
    const emails = adding.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!emails.length) return;
    const r = await api<{ added: number }>('/subscribers', { body: { storeId: store._id, emails } });
    setAdding('');
    alert(`${r.added} new subscribers added.`);
    subs.reload();
  }

  return (
    <div className="page">
      <PageHeader
        title="Newsletter"
        subtitle={`${audience} people are subscribed to ${store.name}. Shoppers join from the form in the storefront footer.`}
        actions={
          <>
            <Button onClick={() => void download(`/subscribers/export?storeId=${store._id}`, `subscribers-${store.slug}.csv`)}>Export CSV</Button>
            <Button tone="primary" disabled={!audience} onClick={() => setCompose(true)}>New broadcast</Button>
          </>
        }
      />
      {compose ? <Compose audience={audience} onClose={() => setCompose(false)} onSent={() => { setCompose(false); setTab('broadcasts'); casts.reload(); }} /> : null}
      <Tabs value={tab} onChange={setTab} options={[{ value: 'subscribers', label: 'Subscribers' }, { value: 'broadcasts', label: 'Broadcasts' }]} />
      {tab === 'subscribers' ? (
        <>
          <Card title="Add subscribers">
            <Field label="Emails" hint="Paste addresses separated by commas or new lines. Only add people who agreed to hear from you.">
              <textarea className="textarea" rows={2} value={adding} onChange={(e) => setAdding(e.target.value)} />
            </Field>
            <div className="row"><span className="spacer" /><Button disabled={!adding.trim()} onClick={() => void addEmails()}>Add</Button></div>
          </Card>
          <div className="tcard">
            <Tabs value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[{ value: 'subscribed', label: 'Subscribed' }, { value: 'unsubscribed', label: 'Unsubscribed' }]} />
            <div className="tfilter"><div className="tfilter__search"><input className="input" placeholder="Search emails" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} /></div></div>
            {!subs.data ? (
              <Loading what="subscribers" />
            ) : !subs.data.items.length ? (
              <Empty title="No subscribers here" />
            ) : (
              <table className="table">
                <thead><tr><th>Email</th><th>Joined</th><th /></tr></thead>
                <tbody>
                  {subs.data.items.map((s) => (
                    <tr key={s._id}>
                      <td className="cell--primary">{s.email}</td>
                      <td className="muted">{dateTime(s.createdAt)}</td>
                      <td className="cell--num"><Button tone="plain" onClick={async () => { if (confirm(`Remove ${s.email}?`)) { await api(`/subscribers/${s._id}`, { method: 'DELETE' }); subs.reload(); } }}>Remove</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {subs.data ? <Pager page={page} total={subs.data.total} size={SIZE} onPage={setPage} /> : null}
          </div>
        </>
      ) : (
        <Card flush>
          {!casts.data ? (
            <Loading what="broadcasts" />
          ) : !casts.data.length ? (
            <Empty title="No broadcasts yet" />
          ) : (
            <table className="table">
              <thead><tr><th>Subject</th><th>Status</th><th className="th--num">Sent</th><th>Created</th></tr></thead>
              <tbody>
                {casts.data.map((b) => (
                  <tr key={b._id}>
                    <td className="cell--primary">{b.subject}</td>
                    <td><Badge tone={b.status === 'sent' ? 'ok' : 'info'}>{b.status}</Badge></td>
                    <td className="cell--num num">{b.sent}{b.failed ? <span className="muted"> ({b.failed} failed)</span> : null}</td>
                    <td className="muted">{dateTime(b.createdAt)}{b.createdBy ? ` by ${b.createdBy}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
