import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs, type Paged, type Review } from '../api';
import { useStore } from '../context';
import { dateTime } from '../format';
import { Badge, Button, Empty, Loading, PageHeader, Pager, Stars, Tabs, useAsync } from '../ui';

const SIZE = 20;
type Status = Review['status'];

export function Reviews() {
  const store = useStore();
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const { data, reload } = useAsync(() => api<Paged<Review>>(`/reviews${qs({ storeId: store._id, status, page, limit: SIZE })}`), [store._id, status, page]);

  async function act(r: Review, next: Status | 'delete') {
    if (next === 'delete') {
      if (!confirm('Delete this review for good?')) return;
      await api(`/reviews/${r._id}`, { method: 'DELETE' });
    } else await api(`/reviews/${r._id}`, { method: 'PUT', body: { status: next } });
    reload();
  }

  return (
    <div className="page">
      <PageHeader title="Reviews" subtitle="Only customers who bought a product can review it. Approved reviews show on the product page." />
      <div className="tcard">
        <Tabs value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[{ value: 'pending', label: 'Waiting' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
        {!data ? (
          <Loading what="reviews" />
        ) : !data.items.length ? (
          <Empty title="Nothing here" />
        ) : (
          <div className="stack" style={{ padding: 'var(--s4)' }}>
            {data.items.map((r) => (
              <div className="card" key={r._id}>
                <div className="card__body stack stack--tight">
                  <div className="row">
                    <Stars value={r.rating} />
                    {r.title ? <strong>{r.title}</strong> : null}
                    <span className="spacer" />
                    {r.verified ? <Badge tone="ok">Verified purchase</Badge> : null}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{r.body}</p>
                  <div className="muted">
                    {r.name} ({r.email}) on {r.product ? <Link to={`/products/${r.product._id}`}>{r.product.title}</Link> : 'a deleted product'}, {dateTime(r.createdAt)}
                  </div>
                  <div className="row">
                    {r.status !== 'approved' ? <Button tone="primary" onClick={() => void act(r, 'approved')}>Approve</Button> : null}
                    {r.status !== 'rejected' ? <Button onClick={() => void act(r, 'rejected')}>Reject</Button> : null}
                    <Button tone="plain" onClick={() => void act(r, 'delete')}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {data ? <Pager page={page} total={data.total} size={SIZE} onPage={setPage} /> : null}
      </div>
    </div>
  );
}
