import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export function Float({
  open,
  anchor,
  onClose,
  align = 'right',
  className,
  role,
  ariaLabel,
  dismissOnEscape = true,
  children,
}: {
  open: boolean;

  anchor: RefObject<HTMLElement | null>;

  onClose: (opts?: { refocus?: boolean }) => void;
  align?: 'left' | 'right';
  className: string;
  role?: string;
  ariaLabel?: string;

  dismissOnEscape?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left?: number;
    right?: number;
    anchorW: number;
    origin: string;
  } | null>(null);

  const place = useCallback(() => {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(
      align === 'left'
        ? { top: rect.bottom + 8, left: Math.max(8, rect.left), anchorW: rect.width, origin: 'top left' }
        : {
            top: rect.bottom + 8,
            right: Math.max(8, window.innerWidth - rect.right),
            anchorW: rect.width,
            origin: 'top right',
          },
    );
  }, [align, anchor]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
  }, [open, place]);

  const adjusted = useRef(false);
  useLayoutEffect(() => {
    if (!open) {
      adjusted.current = false;
      return;
    }
    if (adjusted.current || pos === null || !panel.current || !anchor.current) return;
    adjusted.current = true;
    const panelRect = panel.current.getBoundingClientRect();
    const anchorRect = anchor.current.getBoundingClientRect();
    const floor = window.innerHeight - 8;
    const edge = window.innerWidth - 8;
    setPos((was) => {
      if (!was) return was;
      let next = was;
      if (panelRect.bottom > floor) {
        const above = Math.max(8, anchorRect.top - 8 - panelRect.height);
        next = { ...next, top: above, origin: next.origin.replace('top', 'bottom') };
      }
      if (next.left !== undefined && panelRect.right > edge) {
        next = { ...next, left: Math.max(8, next.left - (panelRect.right - edge)) };
      }
      if (next.right !== undefined && panelRect.left < 8) {
        next = { ...next, right: Math.max(8, next.right - (8 - panelRect.left)) };
      }

      return next;
    });
  }, [open, pos, anchor]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const escRef = useRef(dismissOnEscape);
  escRef.current = dismissOnEscape;
  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchor.current?.contains(target)) return;
      if (panel.current?.contains(target)) return;
      closeRef.current();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !escRef.current) return;

      event.stopPropagation();
      closeRef.current({ refocus: true });
    }
    function onScroll(event: Event) {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      closeRef.current();
    }

    const widthAtOpen = window.innerWidth;
    function onResize() {
      if (window.innerWidth !== widthAtOpen) {
        closeRef.current();
        return;
      }

      adjusted.current = false;
      place();
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);

    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, anchor, place]);

  if (!open || pos === null) return null;

  const style: CSSProperties & Record<'--float-anchor-w', string> = {
    top: pos.top,
    left: pos.left,
    right: pos.right,
    transformOrigin: pos.origin,
    '--float-anchor-w': `${pos.anchorW}px`,
  };

  return createPortal(
    <div
      ref={panel}
      className={`${className} vfloat`}
      style={style}
      role={role}
      aria-label={ariaLabel}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
