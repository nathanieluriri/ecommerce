import type { ReactNode } from 'react';

const INK = '#3d3a75';
const SOFT = '#eeedf5';
const SOFT_2 = '#dcd9ec';
const LINE = '#c3c0dc';
const AMBER = '#ffd6a4';
const AMBER_INK = '#d9a514';

const common = {
  fill: 'none',
  stroke: INK,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Stage({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 220 160" role="img" aria-hidden="true" focusable="false">
      <circle cx="110" cy="74" r="62" fill={SOFT} />
      <ellipse cx="110" cy="142" rx="64" ry="7" fill={INK} opacity="0.07" />
      {children}
    </svg>
  );
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y - 5 * s} L${x + 1.6 * s} ${y - 1.6 * s} L${x + 5 * s} ${y} L${x + 1.6 * s} ${y + 1.6 * s} L${x} ${y + 5 * s} L${x - 1.6 * s} ${y + 1.6 * s} L${x - 5 * s} ${y} L${x - 1.6 * s} ${y - 1.6 * s} Z`}
      fill={AMBER_INK}
      stroke="none"
      opacity="0.85"
    />
  );
}

export function ReceiptArt() {
  return (
    <Stage>

      <path
        d="M78 34 h64 v88 l-8 -6 -8 6 -8 -6 -8 6 -8 -6 -8 6 -8 -6 -8 6 Z"
        fill="#ffffff"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="90" y1="52" x2="130" y2="52" {...common} stroke={LINE} />
      <line x1="90" y1="64" x2="122" y2="64" {...common} stroke={LINE} />
      <line x1="90" y1="76" x2="130" y2="76" {...common} stroke={LINE} />
      <line x1="90" y1="88" x2="114" y2="88" {...common} stroke={LINE} />

      <line x1="90" y1="102" x2="102" y2="102" {...common} />
      <line x1="118" y1="102" x2="130" y2="102" {...common} />

      <circle cx="146" cy="106" r="17" fill={AMBER} stroke={INK} strokeWidth="2" />
      <path d="M139 106 l5 5 9 -10" {...common} />
      <Sparkle x={64} y={46} />
      <Sparkle x={158} y={58} s={0.7} />
    </Stage>
  );
}

export function CouponArt() {
  return (
    <Stage>
      <g transform="rotate(-8 110 82)">

        <path
          d="M52 62 h116 a8 8 0 0 1 8 8 v6 a9 9 0 0 0 0 18 v6 a8 8 0 0 1 -8 8 h-116 a8 8 0 0 1 -8 -8 v-6 a9 9 0 0 0 0 -18 v-6 a8 8 0 0 1 8 -8 Z"
          fill="#ffffff"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        <line x1="132" y1="66" x2="132" y2="104" {...common} stroke={LINE} strokeDasharray="3 5" />

        <circle cx="82" cy="76" r="7" {...common} />
        <circle cx="106" cy="94" r="7" {...common} />
        <line x1="108" y1="70" x2="80" y2="100" {...common} />

        <line x1="144" y1="78" x2="158" y2="78" {...common} stroke={SOFT_2} />
        <line x1="144" y1="90" x2="154" y2="90" {...common} stroke={SOFT_2} />
      </g>

      <circle cx="164" cy="52" r="12" fill={AMBER} stroke={INK} strokeWidth="2" />
      <circle cx="164" cy="52" r="3" fill="#ffffff" stroke={INK} strokeWidth="1.5" />
      <Sparkle x={52} y={44} />
      <Sparkle x={172} y={112} s={0.8} />
    </Stage>
  );
}

export function BoxArt() {
  return (
    <Stage>

      <circle cx="110" cy="66" r="24" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <circle cx="110" cy="66" r="16" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      <circle cx="110" cy="66" r="6" fill="#ffffff" stroke={INK} strokeWidth="2" />

      <path d="M96 56 a18 18 0 0 1 28 0" {...common} stroke={LINE} />
      <path d="M94 62 a20 16 0 0 1 32 0" {...common} stroke={LINE} />

      <path d="M62 84 L110 96 L158 84 L158 122 L110 134 L62 122 Z" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <line x1="110" y1="96" x2="110" y2="134" {...common} />

      <path d="M62 84 L48 70 L96 60 L110 96 Z" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      <path d="M158 84 L172 70 L124 60 L110 96 Z" fill="#ffffff" stroke={INK} strokeWidth="2" />

      <rect x="164" y="106" width="20" height="20" rx="3" fill={AMBER} stroke={INK} strokeWidth="2" />
      <Sparkle x={54} y={48} />
    </Stage>
  );
}

export function PeopleArt() {
  return (
    <Stage>

      <circle cx="88" cy="62" r="15" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      <path d="M60 116 a28 26 0 0 1 56 0" fill={SOFT_2} stroke={INK} strokeWidth="2" />

      <circle cx="128" cy="70" r="17" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <path d="M98 128 a30 28 0 0 1 60 0" fill="#ffffff" stroke={INK} strokeWidth="2" />

      <circle cx="152" cy="98" r="13" fill={AMBER} stroke={INK} strokeWidth="2" />
      <path
        d="M152 91.5 l1.9 3.9 4.3 0.6 -3.1 3 0.7 4.3 -3.8 -2 -3.8 2 0.7 -4.3 -3.1 -3 4.3 -0.6 Z"
        fill="#ffffff"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <Sparkle x={60} y={50} />
      <Sparkle x={166} y={52} s={0.8} />
    </Stage>
  );
}

export function PageArt() {
  return (
    <Stage>
      <rect x="72" y="34" width="76" height="94" rx="6" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <line x1="84" y1="54" x2="126" y2="54" {...common} />
      <line x1="84" y1="68" x2="136" y2="68" {...common} stroke={LINE} />
      <line x1="84" y1="80" x2="136" y2="80" {...common} stroke={LINE} />
      <line x1="84" y1="92" x2="118" y2="92" {...common} stroke={LINE} />

      <g transform="rotate(38 148 96)">
        <rect x="140" y="58" width="14" height="56" rx="2" fill={AMBER} stroke={INK} strokeWidth="2" />
        <path d="M140 114 h14 l-7 14 Z" fill="#ffffff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <rect x="140" y="52" width="14" height="8" rx="2" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      </g>
      <Sparkle x={58} y={56} />
    </Stage>
  );
}

export function ShelfArt() {
  return (
    <Stage>
      <rect x="60" y="44" width="100" height="80" rx="8" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <line x1="60" y1="84" x2="160" y2="84" {...common} />

      <rect x="72" y="60" width="18" height="24" rx="2" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      <rect x="96" y="54" width="16" height="30" rx="2" fill={AMBER} stroke={INK} strokeWidth="2" />
      <circle cx="134" cy="72" r="12" fill={SOFT_2} stroke={INK} strokeWidth="2" />

      <line x1="76" y1="106" x2="106" y2="106" {...common} stroke={LINE} strokeDasharray="2 6" />
      <Sparkle x={172} y={60} s={0.8} />
    </Stage>
  );
}


export function EnvelopeArt() {
  return (
    <Stage>
      <rect x="58" y="48" width="104" height="72" rx="6" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <path d="M60 52 L110 92 L160 52" {...common} />
      <path d="M60 118 L96 84 M160 118 L124 84" {...common} stroke={LINE} />
      <circle cx="158" cy="50" r="14" fill={AMBER} stroke={INK} strokeWidth="2" />
      <line x1="158" y1="43" x2="158" y2="52" {...common} />
      <circle cx="158" cy="57" r="1.2" fill={INK} stroke="none" />
      <Sparkle x={52} y={40} />
    </Stage>
  );
}

export function StarArt() {
  return (
    <Stage>
      <path d="M62 44 h96 a8 8 0 0 1 8 8 v50 a8 8 0 0 1 -8 8 h-60 l-18 16 v-16 h-18 a8 8 0 0 1 -8 -8 v-50 a8 8 0 0 1 8 -8 Z" fill="#ffffff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {[84, 102, 120, 138].map((x, i) => (
        <path
          key={x}
          d={`M${x} 66 l3.2 6.5 7.2 1 -5.2 5.1 1.2 7.1 -6.4 -3.4 -6.4 3.4 1.2 -7.1 -5.2 -5.1 7.2 -1 Z`}
          fill={i < 3 ? AMBER : SOFT_2}
          stroke={INK}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ))}
      <line x1="80" y1="96" x2="128" y2="96" {...common} stroke={LINE} />
      <Sparkle x={172} y={44} />
    </Stage>
  );
}

export function StoreArt() {
  return (
    <Stage>
      <rect x="66" y="70" width="88" height="54" rx="4" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <path d="M60 70 L70 44 H150 L160 70 Z" fill={SOFT_2} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M60 70 q11 12 22 0 q11 12 22 0 q11 12 22 0 q11 12 22 0 q11 12 22 0" fill={AMBER} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="78" y="92" width="22" height="32" rx="2" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      <rect x="112" y="92" width="30" height="18" rx="2" fill="#ffffff" stroke={INK} strokeWidth="2" />
      <Sparkle x={168} y={50} s={0.8} />
    </Stage>
  );
}

export function MegaphoneArt() {
  return (
    <Stage>
      <path d="M70 76 L132 48 V122 L70 94 Z" fill="#ffffff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <rect x="56" y="74" width="16" height="22" rx="3" fill={SOFT_2} stroke={INK} strokeWidth="2" />
      <path d="M80 96 l6 22 h12 l-4 -18" {...common} />
      <path d="M146 70 q10 15 0 30" {...common} stroke={LINE} />
      <path d="M156 62 q18 23 0 46" {...common} stroke={LINE} />
      <circle cx="132" cy="48" r="9" fill={AMBER} stroke={INK} strokeWidth="2" />
      <Sparkle x={168} y={46} />
    </Stage>
  );
}
