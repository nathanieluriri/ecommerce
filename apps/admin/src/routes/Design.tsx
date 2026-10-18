import { useState } from 'react';
import { api, type Store, type ThemeId } from '../api';
import { useApp, useStore } from '../context';
import { Store as StoreIcon } from 'lucide-react';
import { Button, Card, Field, PageHeader, useToast } from '../ui';

export const THEMES: { id: ThemeId; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic', description: 'Rounded cards, gradient hero, soft indigo. Modelled on Plaspool.' },
  { id: 'minimal', name: 'Minimal', description: 'Editorial serif type, single-column index, lots of white space.' },
  { id: 'bold', name: 'Bold', description: 'Neo-brutalist: heavy borders, hard shadows, oversized type.' },
];

export function Design() {
  const { me, reloadStores } = useApp();
  const store = useStore();
  const [theme, setTheme] = useState<ThemeId>(store.theme);
  const [settings, setSettings] = useState<Store['themeSettings']>(store.themeSettings);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const base = me.storefrontUrl.replace(/\/$/, '');
  const previewUrl = base ? `${base}/?store=${store.slug}&theme=${theme}` : null;

  async function save() {
    setBusy(true);
    try {
      await api(`/stores/${store._id}`, { method: 'PUT', body: { theme, themeSettings: settings } });
      await reloadStores();
      toast.show('Published. The storefront updates within a minute.');
    } catch (e) {
      toast.show((e as Error).message, 'critical');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Store['themeSettings']) => (e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, [k]: e.target.value || undefined });

  return (
    <div className="page">
      <PageHeader
        icon={<StoreIcon aria-hidden="true" />}
        title="Online store"
        subtitle={`Each store has its own design. This changes ${store.name} only.`}
        actions={<Button tone="primary" size="lg" busy={busy} disabled={theme === store.theme && JSON.stringify(settings) === JSON.stringify(store.themeSettings)} onClick={save}>Publish</Button>}
      />
      <Card title="Theme">
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="theme" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)} style={{ ['--sw' as string]: settings.accent }}>
              <span className={`theme__swatch theme__swatch--${t.id}`} />
              <strong>{t.name}</strong>
              <span className="muted">{t.description}</span>
            </button>
          ))}
        </div>
      </Card>
      <Card title="Branding">
        <div className="cols2">
          <Field label="Accent colour"><input className="input" type="color" value={settings.accent} onChange={set('accent')} /></Field>
          <Field label="Logo URL"><input className="input" value={settings.logoUrl ?? ''} onChange={set('logoUrl')} /></Field>
          <Field label="Tagline"><input className="input" value={settings.tagline ?? ''} onChange={set('tagline')} /></Field>
          <Field label="Announcement bar"><input className="input" value={settings.announcement ?? ''} onChange={set('announcement')} /></Field>
        </div>
      </Card>
      <Card title="Preview" action={previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer">Open in new tab</a> : undefined}>
        {previewUrl ? (
          <iframe className="preview" src={previewUrl} title="Storefront preview" />
        ) : (
          <span className="muted">Set STOREFRONT_URL on the admin worker to preview here.</span>
        )}
        <span className="muted">The preview shows the selected theme before publishing. Colours and text update after you publish.</span>
      </Card>
    </div>
  );
}
