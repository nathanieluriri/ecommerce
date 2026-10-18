import { useState } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { api, type Category } from '../api';
import { useStore } from '../context';
import { slugify } from '../format';
import { Banner, Button, DataTable, Empty, Field, Learn, Modal, PageHeader, ShelfArt, useAsync, useToast } from '../ui';

type Draft = { _id?: string; name: string; slug: string; description: string; sort: string };

export function Categories() {
  const store = useStore();
  const toast = useToast();
  const { data, error, reload } = useAsync(() => api<Category[]>(`/categories?storeId=${store._id}`), [store._id]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setSaveError(null);
    const body = { storeId: store._id, name: draft.name, slug: draft.slug, description: draft.description || undefined, sort: Number(draft.sort) || 0 };
    try {
      await api(draft._id ? `/categories/${draft._id}` : '/categories', { method: draft._id ? 'PUT' : 'POST', body });
      toast.show(draft._id ? 'Category saved' : 'Category created');
      setDraft(null);
      reload();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete ${c.name}? Its products stay, they just leave this category.`)) return;
    await api(`/categories/${c._id}`, { method: 'DELETE' });
    toast.show(`${c.name} deleted`);
    setDraft(null);
    reload();
  }

  const add = <Button tone="primary" size="lg" onClick={() => setDraft({ name: '', slug: '', description: '', sort: String(data?.length ?? 0) })}><Plus aria-hidden="true" /> Add category</Button>;

  return (
    <div className="page">
      <PageHeader icon={<FolderTree aria-hidden="true" />} title="Categories" subtitle="Categories become the storefront menu and collection pages." actions={add} />
      {error ? <Banner tone="critical" title="Couldn't load categories">{error}</Banner> : null}
      {draft ? (
        <Modal
          title={draft._id ? 'Edit category' : 'New category'}
          onClose={() => setDraft(null)}
          footer={
            <>
              {draft._id ? <Button tone="critical" onClick={() => { const c = data?.find((x) => x._id === draft._id); if (c) void remove(c); }}>Delete</Button> : null}
              <span className="spacer" />
              <Button tone="plain" onClick={() => setDraft(null)}>Cancel</Button>
              <Button tone="primary" busy={busy} disabled={!draft.name || !draft.slug} onClick={save}>Save</Button>
            </>
          }
        >
          {saveError ? <Banner tone="critical" title="Couldn't save">{saveError}</Banner> : null}
          <Field label="Name"><input className="input" autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, ...(draft._id ? {} : { slug: slugify(e.target.value) }) })} /></Field>
          <Field label="URL handle" hint={<>Storefront path: <span className="mono">/collections/{draft.slug || '...'}</span></>}><input className="input mono" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
          <Field label="Description" hint="Shown at the top of the collection page."><textarea className="textarea" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Position" hint="Lower numbers come first in the menu."><input className="input" type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })} /></Field>
        </Modal>
      ) : null}
      <DataTable<Category>
        rows={data ?? (error ? [] : null)}
        rowKey={(c) => c._id}
        empty={<Empty art={<ShelfArt />} title="Group your products" body="Categories help shoppers browse. Each one gets its own page and a link in the storefront menu." actions={add} />}
        columns={[
          { key: 'n', header: 'Category', render: (c) => <button type="button" className="linkbtn" onClick={() => setDraft({ _id: c._id, name: c.name, slug: c.slug, description: c.description ?? '', sort: String(c.sort) })}><span className="idcell__text"><span className="idcell__title">{c.name}</span><span className="idcell__meta mono">/collections/{c.slug}</span></span></button> },
          { key: 'd', header: 'Description', render: (c) => <span className="muted truncate" style={{ maxWidth: '20rem', display: 'inline-block' }}>{c.description || '-'}</span> },
          { key: 'p', header: 'Position', numeric: true, render: (c) => c.sort },
          { key: 'c', header: 'Products', mobile: true, numeric: true, render: (c) => c.productCount ?? 0 },
        ]}
      />
      <Learn>Add products to a category from the product page.</Learn>
    </div>
  );
}
