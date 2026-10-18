import { useRef, useState } from 'react';
import { ImageIcon, Star, Trash2, Upload } from 'lucide-react';
import { upload } from '../api';
import { Button } from './index';

export function MediaEditor({ storeId, images, onChange, canUpload, onError }: { storeId: string; images: string[]; onChange: (next: string[]) => void; canUpload: boolean; onError: (msg: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState('');

  async function onFiles(files: FileList | null) {
    if (!files?.length || !canUpload) return;
    const list = Array.from(files);
    setBusy(list.length);
    const urls: string[] = [];
    for (const f of list) {
      try {
        urls.push(await upload(f, storeId));
      } catch (e) {
        onError((e as Error).message);
      }
      setBusy((n) => n - 1);
    }
    if (urls.length) onChange([...images, ...urls]);
    if (input.current) input.current.value = '';
  }

  const drop = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      void onFiles(e.dataTransfer.files);
    },
  };

  const picker = <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden onChange={(e) => void onFiles(e.target.files)} />;

  return (
    <div className="stack">
      {!images.length && !busy ? (
        <div className={over ? 'drop is-over' : 'drop'} {...drop}>
          <Upload aria-hidden="true" style={{ width: 20, color: 'var(--ink-sub)' }} />
          {canUpload ? <Button onClick={() => input.current?.click()}>Upload images</Button> : null}
          <span className="drop__hint">{canUpload ? 'or drop files here. JPEG, PNG, WebP, GIF or AVIF, up to 10 MB' : 'Connect the MEDIA R2 bucket to upload, or paste image links below.'}</span>
          {picker}
        </div>
      ) : (
        <div className="imgg" {...drop}>
          {images.map((src, i) => (
            <div key={src + i} className={i === 0 ? 'imgg__tile imgg__tile--cover' : 'imgg__tile'}>
              <img src={src} alt="" />
              {i === 0 ? <span className="imgg__cover">Cover</span> : null}
              <div className="imgg__acts">
                {i > 0 ? (
                  <button type="button" className="imgg__act" title="Set as cover" aria-label="Set as cover image" onClick={() => onChange([src, ...images.filter((_, j) => j !== i)])}>
                    <Star aria-hidden="true" />
                  </button>
                ) : null}
                <button type="button" className="imgg__act" title="Remove" aria-label="Remove image" onClick={() => onChange(images.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {Array.from({ length: busy }, (_, i) => (
            <div key={`busy${i}`} className="imgg__tile" aria-label="Uploading image"><span className="spinner" style={{ position: 'absolute', inset: 0, margin: 'auto' }} /></div>
          ))}
          {canUpload ? (
            <button type="button" className={over ? 'imgg__add is-over' : 'imgg__add'} onClick={() => input.current?.click()} aria-label="Add images">
              <ImageIcon aria-hidden="true" />
            </button>
          ) : null}
          {picker}
        </div>
      )}
      <div className="row">
        <input className="input" placeholder="Or paste an image link" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button disabled={!/^https?:\/\//.test(url)} onClick={() => { onChange([...images, url]); setUrl(''); }}>Add link</Button>
      </div>
    </div>
  );
}
