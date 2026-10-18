import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, PenLine, X } from 'lucide-react';
import { api, qs, type Email, type Paged } from '../api';
import { useApp } from '../context';
import { dateTime } from '../format';
import { Badge, Banner, Button, Card, DataTable, Empty, EnvelopeArt, Field, Learn, Modal, PageHeader, Tabs, useAsync, useToast } from '../ui';
import { shortDate } from './Orders';

const SIZE = 25;

function Compose({ to = '', subject = '', onClose, onSent }: { to?: string; subject?: string; onClose: () => void; onSent: () => void }) {
  const { store } = useApp();
  const [form, setForm] = useState({ to, subject, text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ ok: boolean; error?: string }>('/emails/send', { body: { ...form, storeId: store?._id } });
      if (!r.ok) throw new Error(r.error ?? 'Failed');
      onSent();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title="New email" onClose={onClose} footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="primary" busy={busy} disabled={!form.to || !form.subject || !form.text} onClick={send}>Send</Button></>}>
      {error ? <Banner tone="critical" title="Couldn't send">{error}</Banner> : null}
      <Field label="To"><input className="input" type="email" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
      <Field label="Subject"><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
      <Field label="Message"><textarea className="textarea" rows={8} autoFocus={Boolean(to)} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
    </Modal>
  );
}

function Reader({ id, onClose, onReply }: { id: string; onClose: () => void; onReply: (e: Email) => void }) {
  const { data } = useAsync(() => api<Email>(`/emails/${id}`), [id]);
  return (
    <Card title={data?.subject ?? 'Loading...'} action={<Button tone="plain" iconOnly aria-label="Close" onClick={onClose}><X aria-hidden="true" /></Button>}>
      {data ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted">{data.direction === 'in' ? `From ${data.from}` : `To ${data.to}`} · {dateTime(data.createdAt)}</span>
            {data.direction === 'in' ? <Button onClick={() => onReply(data)}>Reply</Button> : null}
          </div>
          {data.error ? <Banner tone="critical" title="Not delivered">{data.error}</Banner> : null}
          {data.html ? <iframe className="mail-frame" sandbox="" srcDoc={data.html} title="Email body" /> : <div className="mail">{data.text}</div>}
        </>
      ) : null}
    </Card>
  );
}

export function Emails() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'in') as 'in' | 'out' | 'failed';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState<{ to?: string; subject?: string } | null>(null);
  const { data, error, reload } = useAsync(
    () => api<Paged<Email> & { unread: number }>(`/emails${qs({ direction: tab === 'in' ? 'in' : 'out', status: tab === 'failed' ? 'failed' : undefined, q, page, limit: SIZE })}`),
    [tab, q, page],
  );

  return (
    <div className="page">
      <PageHeader
        icon={<Mail aria-hidden="true" />}
        title="Emails"
        subtitle="Mail to your store addresses arrives here through Cloudflare Email Routing."
        actions={<Button tone="primary" size="lg" onClick={() => setCompose({})}><PenLine aria-hidden="true" /> Compose</Button>}
      />
      {compose ? <Compose {...compose} onClose={() => setCompose(null)} onSent={() => { setCompose(null); toast.show('Email sent'); reload(); }} /> : null}
      {error ? <Banner tone="critical" title="Couldn't load emails">{error}</Banner> : null}
      {open ? <Reader id={open} onClose={() => { setOpen(null); reload(); }} onReply={(e) => setCompose({ to: e.from, subject: e.subject.startsWith('Re:') ? e.subject : `Re: ${e.subject}` })} /> : null}
      <DataTable<Email>
        tabs={
          <Tabs
            value={tab}
            onChange={(v) => { setPage(1); setOpen(null); setParams(v === 'in' ? {} : { tab: v }); }}
            options={[{ value: 'in', label: data?.unread ? `Inbox (${data.unread})` : 'Inbox' }, { value: 'out', label: 'Sent' }, { value: 'failed', label: 'Failed' }]}
          />
        }
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'Search subject or address' }}
        rows={data?.items ?? (error ? [] : null)}
        rowKey={(m) => m._id}
        page={data ? { page, size: SIZE, total: data.total, onPage: setPage } : undefined}
        empty={<Empty art={<EnvelopeArt />} title={tab === 'in' ? 'Inbox zero' : tab === 'failed' ? 'Nothing failed' : 'Nothing sent yet'} body={tab === 'in' ? 'Replies from customers and mail to your support address show up here.' : undefined} />}
        columns={[
          {
            key: 'w',
            header: tab === 'in' ? 'From' : 'To',
            render: (m) => (
              <button type="button" className="linkbtn" onClick={() => setOpen(m._id)} style={{ fontWeight: m.direction === 'in' && !m.read ? 'var(--w-semi)' : undefined }}>
                <span className="idcell__text"><span className="idcell__title">{tab === 'in' ? m.from : m.to}</span><span className="idcell__meta truncate" style={{ maxWidth: '26rem' }}>{m.subject}</span></span>
              </button>
            ),
          },
          {
            key: 's', mobile: true,
            header: 'Status',
            render: (m) => (m.status === 'failed' ? <Badge tone="critical">Failed</Badge> : m.status === 'sent' ? <Badge tone="ok">Sent</Badge> : m.read ? <Badge>Read</Badge> : <Badge tone="info">New</Badge>),
          },
          { key: 'd', header: 'Date', mobile: true, numeric: true, render: (m) => <span className="muted">{shortDate(m.createdAt)}</span> },
        ]}
      />
      <Learn>Order emails are logged here as they are sent, so you can see exactly what a customer received.</Learn>
    </div>
  );
}
