import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageSquareQuote, Trash2, X } from 'lucide-react';
import { api, qs, type Paged, type Review } from '../api';
import { useStore } from '../context';
import { dateTime } from '../format';
import { Badge, Banner, Button, Empty, Learn, PageHeader, Pager, StarArt, Stars, Tabs, useAsync, useToast } from '../ui';

const SIZE = 20;
type Status = Review['status'];

export function Reviews() {
  const store = useStore();
  const toast = useToast();
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const { data, error, reload } = useAsync(() => api<Paged<Review>>(`/reviews${qs({ storeId: store._id, status, page, limit: SIZE })}`), [store._id, status, page]);

  async function act(r: Review, next: Status | 'delete') {
    if (next === 'delete') {
      if (!confirm('Delete this review for good?')) return;
      await api(`/reviews/${r._id}`, { method: 'DELETE' });
      toast.show('Review deleted');
    } else {
      await api(`/reviews/${r._id}`, { method: 'PUT', body: { status: next } });
      toast.show(next === 'approved' ? 'Review approved and live' : next === 'rejected' ? 'Review rejected' : 'Moved back to waiting');
    }
    reload();
  }

  return (
    <div className="page">
      <PageHeader icon={<MessageSquareQuote aria-hidden="true" />} title="Reviews" subtitle="Only customers who bought a product can review it." />
      {error ? <Banner tone="critical" title="Couldn't load reviews">{error}</Banner> : null}
      <div className="tcard">
        <Tabs value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[{ value: 'pending', label: 'Waiting' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
        {!data ? (
          <div className="card__body"><span className="skel" style={{ width: '60%', display: 'block', marginBottom: 8 }} /><span className="skel" style={{ width: '40%', display: 'block' }} /></div>
        ) : !data.items.length ? (
          <Empty art={<StarArt />} title={status === 'pending' ? 'No reviews waiting' : status === 'approved' ? 'No approved reviews yet' : 'Nothing rejected'} body={status === 'pending' ? 'New reviews from your customers land here for you to approve.' : undefined} />
        ) : (
          <div>
            {data.items.map((r) => (
              <div className="review-row" key={r._id}>
                <div className="stack stack--tight" style={{ flex: 1, minWidth: 0 }}>
                  <div className="row">
                    <Stars value={r.rating} />
                    {r.title ? <strong>{r.title}</strong> : null}
                    {r.verified ? <Badge tone="ok">Verified purchase</Badge> : null}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{r.body}</p>
                  <span className="muted" style={{ fontSize: 'var(--t-sm)' }}>
                    {r.name} · {r.email} · {r.product ? <Link to={`/products/${r.product._id}`}>{r.product.title}</Link> : 'a deleted product'} · {dateTime(r.createdAt)}
                  </span>
                </div>
                <div className="row" style={{ alignSelf: 'flex-start' }}>
                  {r.status !== 'approved' ? <Button tone="primary" onClick={() => void act(r, 'approved')}><Check aria-hidden="true" /> Approve</Button> : null}
                  {r.status !== 'rejected' ? <Button onClick={() => void act(r, 'rejected')}><X aria-hidden="true" /> Reject</Button> : null}
                  <Button tone="plain" iconOnly aria-label="Delete review" onClick={() => void act(r, 'delete')}><Trash2 aria-hidden="true" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {data?.items.length ? <Pager page={page} total={data.total} size={SIZE} onPage={setPage} /> : null}
      </div>
      <Learn>Approved reviews show on the product page and count towards its star rating.</Learn>
    </div>
  );
}
