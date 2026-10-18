import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { Button, Field } from '../ui';

export function SignIn({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ needsSetup: boolean }>('/auth/status').then((r) => setNeedsSetup(r.needsSetup)).catch((e: Error) => setError(e.message));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ token: string }>(needsSetup ? '/auth/setup' : '/auth/login', { body: form });
      onSignedIn(r.token);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="signin">
      <div className="signin__col">
        <form className="signin__card stack" onSubmit={submit}>
          <h1 className="signin__title">{needsSetup ? 'Create the owner account' : 'Sign in'}</h1>
          <p className="signin__lede">{needsSetup ? 'This is the first sign-in. The account you create owns every store.' : 'Manage your stores, orders and emails.'}</p>
          {needsSetup ? (
            <Field label="Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
          ) : null}
          <Field label="Email"><input className="input" type="email" autoComplete="username" value={form.email} onChange={set('email')} required /></Field>
          <Field label="Password" hint={needsSetup ? 'At least 10 characters' : undefined}>
            <input className="input" type="password" autoComplete={needsSetup ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} required minLength={needsSetup ? 10 : 1} />
          </Field>
          {error ? <p className="signin__error">{error}</p> : null}
          <Button tone="primary" type="submit" busy={busy} disabled={needsSetup === null}>
            {needsSetup ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
