import { useState } from 'react';
import { X } from 'lucide-react';

export function TagInput({ value, onChange, placeholder = 'Add a tag', label }: { value: string[]; onChange: (next: string[]) => void; placeholder?: string; label: string }) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const parts = draft.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <div className="tagin">
      <div className="tagin__box" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
        {value.map((tag) => (
          <span key={tag} className="tagin__chip">
            {tag}
            <button type="button" className="tagin__x" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
              <X aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          className="tagin__input"
          aria-label={label}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
    </div>
  );
}
