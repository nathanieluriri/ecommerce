import { useState } from 'react';
import { api } from '../api';
import { useApp } from '../context';
import { Badge, Banner, Button, Card, Field, PageHeader, useAsync } from '../ui';

interface Member {
  _id: string;
  email: string;
  name: string;
  role: string;
}

export function Settings() {
  const { me } = useApp();
  const { data: team, reload } = useAsync(() => api<Member[]>('/team'), []);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite() {
    setBusy(true);
    setError(null);
    try {
      await api('/team', { body: form });
      setForm({ name: '', email: '', password: '' });
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);

  async function changePassword() {
    try {
      await api('/auth/password', { body: pw });
      setPw({ current: '', next: '' });
      setPwMsg({ tone: 'info', text: 'Password changed.' });
    } catch (e) {
      setPwMsg({ tone: 'critical', text: (e as Error).message });
    }
  }

  return (
    <div className="page">
      <PageHeader title="Settings" />
      <Card title="Team">
        <ul className="stack stack--tight">
          {team?.map((m) => (
            <li key={m._id} className="row">
              <strong>{m.name}</strong>
              <span className="muted">{m.email}</span>
              <span className="spacer" />
              <Badge tone={m.role === 'owner' ? 'info' : 'neutral'}>{m.role}</Badge>
              {me.role === 'owner' && m.role === 'staff' ? (
                <Button tone="plain" onClick={async () => { if (confirm(`Remove ${m.name}?`)) { await api(`/team/${m._id}`, { method: 'DELETE' }); reload(); } }}>Remove</Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      {me.role === 'owner' ? (
        <Card title="Add a staff member">
          {error ? <Banner tone="critical">{error}</Banner> : null}
          <div className="cols2">
            <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Temporary password" hint="At least 10 characters"><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          </div>
          <div className="row"><span className="spacer" /><Button tone="primary" busy={busy} onClick={invite}>Add member</Button></div>
        </Card>
      ) : null}
      <Card title="Your password">
        {pwMsg ? <Banner tone={pwMsg.tone}>{pwMsg.text}</Banner> : null}
        <div className="cols2">
          <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="New password" hint="At least 10 characters"><input className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <div className="row"><span className="spacer" /><Button disabled={!pw.current || pw.next.length < 10} onClick={() => void changePassword()}>Change password</Button></div>
      </Card>
      <Card title="Payments">
        <p>Payments run through Stripe Checkout. Keys live as secrets on the orders worker (<span className="mono">STRIPE_SECRET_KEY</span>, <span className="mono">STRIPE_WEBHOOK_SECRET</span>), never in the browser.</p>
      </Card>
    </div>
  );
}
