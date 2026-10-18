import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Float } from './Float';

export function Menu({
  label,
  children,
  align = 'right',
  tone = 'default',
  chrome = 'button',
  buttonLabel,
}: {
  label: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  tone?: 'default' | 'plain';

  chrome?: 'button' | 'bare';

  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <div className="menu">
      <button
        ref={trigger}
        type="button"
        className={
          (chrome === 'bare' ? 'menu__bare' : `btn btn--${tone} btn--lg`) + (open ? ' is-open' : '')
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={buttonLabel}
        onClick={() => setOpen((was) => !was)}
      >
        {label}
        {chrome === 'bare' ? null : <ChevronDown aria-hidden="true" />}
      </button>
      <Float
        open={open}
        anchor={trigger}
        align={align}
        className="menu__panel"
        role="menu"
        onClose={(opts) => {
          setOpen(false);
          if (opts?.refocus) trigger.current?.focus();
        }}
      >
        {children(() => setOpen(false))}
      </Float>
    </div>
  );
}

export function MenuItem({
  icon,
  onSelect,
  critical = false,
  children,
}: {
  icon?: ReactNode;
  onSelect: () => void;
  critical?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={critical ? 'menu__item menu__item--critical' : 'menu__item'}
      onClick={onSelect}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="menu__sep" role="separator" />;
}
