import { useState } from 'react';
import { api, qs, type Email, type Paged } from '../api';
import { useApp } from '../context';
import { dateTime } from '../format';
import { Badge, Banner, Button, Card, Empty, Field, Loading, PageHeader, Pager, Tabs, useAsync } from '../ui';

const SIZE = 25;

function Compose({ onSent }: { onSent: () => void }) {
  const { store } = useApp();
  const [form, setForm] = useState({ to: '', subject: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ ok: boolean; error?: string }>('/emails/send', { body: { ...form, storeId: store?._id } });
      setMsg(r.ok ? { tone: 'info', text: 'Sent.' } : { tone: 'critical', text: r.error ?? 'Failed' });
      if (r.ok) setForm({ to: '', subject: '', text: '' });
      onSent();
    } catch (e) {
      setMsg({ tone: 'critical', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="New email">
      {msg ? <Banner tone={msg.tone}>{msg.text}</Banner> : null}
      <Field label="To"><input className="input" type="email" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
      <Field label="Subject"><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
      <Field label="Message"><textarea className="textarea" rows={6} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
      <div className="row"><span className="spacer" /><Button tone="primary" busy={busy} disabled={!form.to || !form.subject || !form.text} onClick={send}>Send</Button></div>
    </Card>
  );
}

function Viewer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useAsync(() => api<Email>(`/emails/${id}`), [id]);
  if (!data) return <Loading what="email" />;
  return (
    <Card title={data.subject} action={<Button tone="plain" onClick={onClose}>Close</Button>}>
      <div className="muted">From {data.from} to {data.to}, {dateTime(data.createdAt)}</div>
      {data.error ? <Banner tone="critical">{data.error}</Banner> : null}
      {data.html ? <iframe className="mail-frame" sandbox="" srcDoc={data.html} title="Email body" /> : <div className="mail">{data.text}</div>}
    </Card>
  );
}

export function Emails() {
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const { data, reload } = useAsync(() => api<Paged<Email>>(`/emails${qs({ direction, page, limit: SIZE })}`), [direction, page]);

  return (
    <div className="page">
      <PageHeader
        title="Emails"
        subtitle="Inbound mail arrives through Cloudflare Email Routing. Outbound mail is sent by the email worker."
        actions={<Button tone="primary" onClick={() => setCompose((v) => !v)}>{compose ? 'Close' : 'Compose'}</Button>}
      />
      {compose ? <Compose onSent={reload} /> : null}
      {open ? <Viewer id={open} onClose={() => { setOpen(null); reload(); }} /> : null}
      <div className="tcard">
        <Tabs value={direction} onChange={(v) => { setPage(1); setDirection(v); }} options={[{ value: 'in', label: 'Inbox' }, { value: 'out', label: 'Sent' }]} />
        {!data ? (
          <Loading what="emails" />
        ) : data.items.length === 0 ? (
          <Empty title={direction === 'in' ? 'Inbox is empty' : 'Nothing sent yet'} />
        ) : (
          <div className="tscroll">
            <table className="table">
              <thead><tr><th>{direction === 'in' ? 'From' : 'To'}</th><th>Subject</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m._id} className="is-clickable" onClick={() => setOpen(m._id)}>
                    <td className="cell--primary" style={{ fontWeight: m.direction === 'in' && !m.read ? 'var(--w-semi)' : undefined }}>{direction === 'in' ? m.from : m.to}</td>
                    <td>{m.subject}</td>
                    <td><Badge tone={m.status === 'failed' ? 'critical' : m.status === 'sent' ? 'ok' : m.read ? 'neutral' : 'info'}>{m.status === 'received' ? (m.read ? 'Read' : 'New') : m.status}</Badge></td>
                    <td className="muted">{dateTime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data ? <Pager page={page} total={data.total} size={SIZE} onPage={setPage} /> : null}
      </div>
    </div>
  );
}
