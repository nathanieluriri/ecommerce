import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, type Store } from '../api';
import { useApp, useStore } from '../context';
import { Button, Card, Field, SaveBar, useToast } from '../ui';

type Content = NonNullable<Store['content']>;
type Pair = { title: string; text: string };

function PairList({ label, hint, items, onChange, max = 6 }: { label: string; hint: string; items: Pair[]; onChange: (v: Pair[]) => void; max?: number }) {
  return (
    <Card title={label} action={items.length < max ? <Button onClick={() => onChange([...items, { title: '', text: '' }])}><Plus aria-hidden="true" /> Add</Button> : undefined}>
      <span className="muted">{hint}</span>
      {items.map((it, i) => (
        <div className="row" key={i} style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}><Field label="Title"><input className="input" value={it.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} /></Field></div>
          <div style={{ flex: 2 }}><Field label="Text"><input className="input" value={it.text} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} /></Field></div>
          <Button tone="plain" iconOnly aria-label="Remove" style={{ marginTop: 24 }} onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 aria-hidden="true" /></Button>
        </div>
      ))}
    </Card>
  );
}

export function StoreContentEditor() {
  const store = useStore();
  const { reloadStores } = useApp();
  const toast = useToast();
  const initial: Content = store.content ?? {};
  const [c, setC] = useState<Content>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(c) !== JSON.stringify(initial);

  async function save() {
    setBusy(true);
    try {
      const clean: Content = {
        ...c,
        features: c.features?.filter((f) => f.title.trim()),
        promises: c.promises?.filter((f) => f.title.trim()),
        faq: c.faq?.filter((f) => f.q.trim() && f.a.trim()),
      };
      await api(`/stores/${store._id}`, { method: 'PUT', body: { content: clean } });
      await reloadStores();
      toast.show('Store content saved');
    } catch (e) {
      toast.show((e as Error).message, 'critical');
    } finally {
      setBusy(false);
    }
  }

  const faq = c.faq ?? [];
  return (
    <>
      <SaveBar when={dirty} saving={busy} label="Unsaved store content" onDiscard={() => setC(initial)} onSave={() => void save()} />
      <Card title="Homepage hero">
        <div className="cols2">
          <Field label="Label" hint="Shown above the first featured product"><input className="input" value={c.heroTitle ?? ''} onChange={(e) => setC({ ...c, heroTitle: e.target.value || undefined })} /></Field>
          <Field label="Fallback text" hint="Used when a product has no description"><input className="input" value={c.heroText ?? ''} onChange={(e) => setC({ ...c, heroText: e.target.value || undefined })} /></Field>
        </div>
      </Card>
      <PairList label="Trust strip" hint="Short reassurances under the hero and on product pages, such as delivery cost and secure payment." items={c.features ?? []} onChange={(features) => setC({ ...c, features })} />
      <PairList label="Why shop with us" hint="Larger cards near the bottom of the homepage." items={c.promises ?? []} onChange={(promises) => setC({ ...c, promises })} />
      <Card title="Questions and answers" action={faq.length < 20 ? <Button onClick={() => setC({ ...c, faq: [...faq, { q: '', a: '' }] })}><Plus aria-hidden="true" /> Add</Button> : undefined}>
        <span className="muted">Shown on the homepage, product pages and the Delivery and FAQ page.</span>
        {faq.map((f, i) => (
          <div key={i} className="stack stack--tight" style={{ paddingBottom: 'var(--s3)', borderBottom: '1px solid var(--border-sub)' }}>
            <div className="row">
              <input className="input" placeholder="Question" value={f.q} onChange={(e) => setC({ ...c, faq: faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
              <Button tone="plain" iconOnly aria-label="Remove question" onClick={() => setC({ ...c, faq: faq.filter((_, j) => j !== i) })}><Trash2 aria-hidden="true" /></Button>
            </div>
            <textarea className="textarea" rows={3} placeholder="Answer" value={f.a} onChange={(e) => setC({ ...c, faq: faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
          </div>
        ))}
      </Card>
    </>
  );
}
