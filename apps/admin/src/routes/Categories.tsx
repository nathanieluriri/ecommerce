import { useState } from 'react';
import { api, type Category } from '../api';
import { useStore } from '../context';
import { slugify } from '../format';
import { Banner, Button, Card, Empty, Field, Loading, Modal, PageHeader, useAsync } from '../ui';

type Draft = { _id?: string; name: string; slug: string; description: string; sort: string };

export function Categories() {
  const store = useStore();
  const { data, reload } = useAsync(() => api<Category[]>(`/categories?storeId=${store._id}`), [store._id]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const body = { storeId: store._id, name: draft.name, slug: draft.slug, description: draft.description || undefined, sort: Number(draft.sort) || 0 };
    try {
      await api(draft._id ? `/categories/${draft._id}` : '/categories', { method: draft._id ? 'PUT' : 'POST', body });
      setDraft(null);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete ${c.name}? Products stay, they just leave this category.`)) return;
    await api(`/categories/${c._id}`, { method: 'DELETE' });
    reload();
  }

  return (
    <div className="page">
      <PageHeader title="Categories" subtitle="Categories become the storefront navigation and collection pages." actions={<Button tone="primary" onClick={() => setDraft({ name: '', slug: '', description: '', sort: String(data?.length ?? 0) })}>Add category</Button>} />
      {draft ? (
        <Modal
          title={draft._id ? 'Edit category' : 'New category'}
          onClose={() => setDraft(null)}
          footer={<><Button tone="plain" onClick={() => setDraft(null)}>Cancel</Button><Button tone="primary" busy={busy} onClick={save}>Save</Button></>}
        >
          {error ? <Banner tone="critical">{error}</Banner> : null}
          <Field label="Name"><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, ...(draft._id ? {} : { slug: slugify(e.target.value) }) })} /></Field>
          <Field label="URL handle" hint={`/collections/${draft.slug || '...'}`}><input className="input mono" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
          <Field label="Description"><textarea className="textarea" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Order" hint="Lower numbers show first"><input className="input" type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })} /></Field>
        </Modal>
      ) : null}
      <Card flush>
        {!data ? (
          <Loading what="categories" />
        ) : !data.length ? (
          <Empty title="No categories yet" body="Group products so shoppers can browse them." />
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Handle</th><th className="th--num">Products</th><th /></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c._id}>
                  <td className="cell--primary">{c.name}</td>
                  <td className="mono muted">{c.slug}</td>
                  <td className="cell--num num">{c.productCount ?? 0}</td>
                  <td className="cell--num">
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Button tone="plain" onClick={() => setDraft({ _id: c._id, name: c.name, slug: c.slug, description: c.description ?? '', sort: String(c.sort) })}>Edit</Button>
                      <Button tone="plain" onClick={() => void remove(c)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
