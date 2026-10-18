import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert } from 'lucide-react';

export function SaveBar({
  when,
  label = 'Unsaved changes',
  saving = false,
  disabled = false,
  saveLabel = 'Save',
  onDiscard,
  onSave,
}: {
  when: boolean;
  label?: string;
  saving?: boolean;

  disabled?: boolean;
  saveLabel?: string;
  onDiscard: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    if (!when) return;
    function guard(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [when]);

  if (!when) return null;

  return createPortal(
    <div className="savebar" role="status" aria-label={label}>
      <CircleAlert aria-hidden="true" />
      <span className="savebar__label">{label}</span>
      <button type="button" className="savebar__btn savebar__btn--ghost" onClick={onDiscard} disabled={saving}>
        Discard
      </button>
      <button
        type="button"
        className="savebar__btn savebar__btn--save"
        onClick={onSave}
        disabled={disabled || saving}
      >
        {saving ? <span className="spinner" aria-hidden="true" /> : null}
        {saveLabel}
      </button>
    </div>,
    document.body,
  );
}
