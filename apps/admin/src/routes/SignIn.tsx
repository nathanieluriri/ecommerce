import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { Button, Field } from '../ui';
import { BRAND } from '../shell/Shell';

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
        <div className="row" style={{ justifyContent: 'center', gap: 'var(--s2)' }}>
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#1a1a1a" />
            <path d="M9 12h14l-1.2 11.2a2 2 0 0 1-2 1.8h-7.6a2 2 0 0 1-2-1.8Z" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M12.5 12V10.5a3.5 3.5 0 0 1 7 0V12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: 'var(--t-2xl)', fontWeight: 'var(--w-bold)', letterSpacing: '-0.02em' }}>{BRAND}</span>
        </div>
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
          {error ? <p className="signin__error" role="alert">{error}</p> : null}
          <Button tone="primary" type="submit" busy={busy} disabled={needsSetup === null}>
            {needsSetup ? 'Create account' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
