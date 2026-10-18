import { useState } from 'react';
import { Download, Megaphone, Plus, Send, UserPlus } from 'lucide-react';
import { api, download, qs, type Broadcast, type Paged, type Subscriber } from '../api';
import { useStore } from '../context';
import { dateTime } from '../format';
import { AnalyticsBar, Badge, Banner, Button, DataTable, Empty, EnvelopeArt, Field, Learn, MegaphoneArt, MenuItem, Modal, PageHeader, Tabs, useAsync, useToast } from '../ui';
import { shortDate } from './Orders';

const SIZE = 25;

function Compose({ audience, onClose, onSent }: { audience: number; onClose: () => void; onSent: () => void }) {
  const store = useStore();
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    if (!confirm(`Send "${subject}" to ${audience} subscribers?`)) return;
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
      footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="primary" busy={busy} disabled={!subject || !text} onClick={send}><Send aria-hidden="true" /> Send to {audience}</Button></>}
    >
      {error ? <Banner tone="critical" title="Couldn't queue the broadcast">{error}</Banner> : null}
      <Field label="Subject"><input className="input" autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      <Field label="Message" hint="Plain text. A blank line starts a new paragraph. An unsubscribe link is added for you.">
        <textarea className="textarea" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Banner>Broadcasts go out in batches every few minutes, so a large list takes a while to finish.</Banner>
    </Modal>
  );
}

function AddPeople({ onClose, onDone }: { onClose: () => void; onDone: (added: number) => void }) {
  const store = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const emails = text.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^\S+@\S+\.\S+$/.test(s));
  async function add() {
    setBusy(true);
    const r = await api<{ added: number }>('/subscribers', { body: { storeId: store._id, emails } });
    onDone(r.added);
  }
  return (
    <Modal title="Add subscribers" onClose={onClose} footer={<><Button tone="plain" onClick={onClose}>Cancel</Button><Button tone="primary" busy={busy} disabled={!emails.length} onClick={add}>Add {emails.length || ''}</Button></>}>
      <Field label="Email addresses" hint="Paste them separated by commas or new lines. Only add people who agreed to hear from you.">
        <textarea className="textarea" rows={6} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function Marketing() {
  const store = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<'subscribed' | 'unsubscribed' | 'broadcasts'>('subscribed');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<'compose' | 'add' | null>(null);
  const subs = useAsync(
    () => api<Paged<Subscriber> & { subscribed: number }>(`/subscribers${qs({ storeId: store._id, status: tab === 'broadcasts' ? 'subscribed' : tab, q, page, limit: SIZE })}`),
    [store._id, tab, q, page],
  );
  const casts = useAsync(() => api<Broadcast[]>(`/broadcasts?storeId=${store._id}`), [store._id, tab]);
  const audience = subs.data?.subscribed ?? 0;
  const sent = (casts.data ?? []).reduce((s, b) => s + b.sent, 0);

  return (
    <div className="page">
      <PageHeader
        icon={<Megaphone aria-hidden="true" />}
        title="Marketing"
        subtitle="Your newsletter list and the broadcasts sent to it."
        menu={(close) => (
          <>
            <MenuItem icon={<UserPlus aria-hidden="true" />} onSelect={() => { close(); setDialog('add'); }}>Add subscribers</MenuItem>
            <MenuItem icon={<Download aria-hidden="true" />} onSelect={() => { close(); void download(`/subscribers/export?storeId=${store._id}`, `subscribers-${store.slug}.csv`); }}>Export subscribers as CSV</MenuItem>
          </>
        )}
        actions={<Button tone="primary" size="lg" disabled={!audience} onClick={() => setDialog('compose')}><Plus aria-hidden="true" /> New broadcast</Button>}
      />
      {dialog === 'compose' ? <Compose audience={audience} onClose={() => setDialog(null)} onSent={() => { setDialog(null); setTab('broadcasts'); toast.show('Broadcast queued'); casts.reload(); }} /> : null}
      {dialog === 'add' ? <AddPeople onClose={() => setDialog(null)} onDone={(n) => { setDialog(null); toast.show(`${n} new ${n === 1 ? 'subscriber' : 'subscribers'}`); subs.reload(); }} /> : null}
      <AnalyticsBar
        range="All time"
        metrics={[
          { label: 'Subscribers', value: String(audience) },
          { label: 'Broadcasts', value: String(casts.data?.length ?? 0) },
          { label: 'Emails delivered', value: String(sent) },
        ]}
      />
      {tab === 'broadcasts' ? (
        <DataTable<Broadcast>
          tabs={<Tabs value={tab} onChange={(v) => { setPage(1); setTab(v); }} options={[{ value: 'subscribed', label: 'Subscribers' }, { value: 'unsubscribed', label: 'Unsubscribed' }, { value: 'broadcasts', label: 'Broadcasts' }]} />}
          rows={casts.data}
          rowKey={(b) => b._id}
          empty={<Empty art={<MegaphoneArt />} title="No broadcasts yet" body="Write to everyone on your list at once, for a launch, a sale or news." />}
          columns={[
            { key: 's', header: 'Subject', render: (b) => <span className="idcell__text"><span className="idcell__title">{b.subject}</span><span className="idcell__meta">{b.createdBy ? `by ${b.createdBy}` : ''}</span></span> },
            { key: 'st', header: 'Status', mobile: true, render: (b) => (b.status === 'sent' ? <Badge tone="ok">Sent</Badge> : b.status === 'sending' ? <Badge tone="info">Sending</Badge> : <Badge tone="warn">Queued</Badge>) },
            { key: 'd', header: 'Created', render: (b) => <span className="muted">{dateTime(b.createdAt)}</span> },
            { key: 'n', header: 'Delivered', numeric: true, render: (b) => <>{b.sent}{b.failed ? <span style={{ color: 'var(--critical)' }}> ({b.failed} failed)</span> : null}</> },
          ]}
        />
      ) : (
        <DataTable<Subscriber>
          tabs={<Tabs value={tab} onChange={(v) => { setPage(1); setTab(v); }} options={[{ value: 'subscribed', label: 'Subscribers' }, { value: 'unsubscribed', label: 'Unsubscribed' }, { value: 'broadcasts', label: 'Broadcasts' }]} />}
          search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'Search emails' }}
          rows={subs.data?.items ?? null}
          rowKey={(s) => s._id}
          page={subs.data ? { page, size: SIZE, total: subs.data.total, onPage: setPage } : undefined}
          bulk={(ids, clear) => (
            <Button tone="critical" onClick={async () => { if (!confirm(`Remove ${ids.length} from the list?`)) return; for (const id of ids) await api(`/subscribers/${id}`, { method: 'DELETE' }); toast.show(`${ids.length} removed`); clear(); subs.reload(); }}>Remove</Button>
          )}
          empty={q ? <Empty title="No one matches" /> : <Empty art={<EnvelopeArt />} title={tab === 'subscribed' ? 'No subscribers yet' : 'Nobody has unsubscribed'} body={tab === 'subscribed' ? 'Shoppers join from the form in your storefront footer.' : undefined} />}
          columns={[
            { key: 'e', header: 'Email', render: (s) => <span className="idcell__title">{s.email}</span> },
            { key: 'd', header: 'Joined', mobile: true, render: (s) => <span className="muted">{shortDate(s.createdAt)}</span> },
          ]}
        />
      )}
      <Learn>Every broadcast carries a one-click unsubscribe link, as email providers require.</Learn>
    </div>
  );
}
