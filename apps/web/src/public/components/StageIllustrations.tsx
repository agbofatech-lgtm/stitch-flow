/** Phase 12 — hand-authored technical illustrations (local SVG, no CDN).
 *  Schematic product visualizations in the token palette. */

const GOLD = '#C9A96E';
const INK = '#18181B';
const MUTE = '#6b6b70';
const LINE = '#E4E1DA';

const frame = 'w-full h-auto';

export function MeasureArt() {
  return (
    <svg viewBox="0 0 320 240" className={frame} role="img" aria-label="Technical measurement annotation diagram">
      <rect x="0" y="0" width="320" height="240" fill="none" />
      <path d="M130 30c-14 0-22 10-22 24 0 10 4 16 4 26l-10 96c-2 18 8 34 58 34s60-16 58-34l-10-96c0-10 4-16 4-26 0-14-8-24-22-24z" fill="#FFFDF9" stroke={INK} strokeWidth="2" />
      <path d="M112 84h96" stroke={GOLD} strokeWidth="1.5" strokeDasharray="5 4" />
      <path d="M108 150h104" stroke={GOLD} strokeWidth="1.5" strokeDasharray="5 4" />
      <path d="M236 84v66" stroke={MUTE} strokeWidth="1" />
      <path d="M232 84h8M232 150h8" stroke={MUTE} strokeWidth="1" />
      <text x="244" y="120" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>chest→waist</text>
      <text x="52" y="88" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>C-38</text>
      <text x="52" y="154" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>W-32</text>
      <path d="M28 40v160" stroke={LINE} strokeWidth="1" />
      <path d="M24 40h8M24 200h8" stroke={MUTE} strokeWidth="1" />
    </svg>
  );
}

export function DesignArt() {
  return (
    <svg viewBox="0 0 320 240" className={frame} role="img" aria-label="Garment silhouette with fabric swatches">
      <path d="M120 40l20-12c6 8 34 8 40 0l20 12 14 34-22 10-4-14v110c0 12-56 12-56 0V70l-4 14-22-10z" fill="#FFFDF9" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M140 28c6 8 34 8 40 0" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <path d="M132 96h56M132 128h56" stroke={LINE} strokeWidth="1" strokeDasharray="4 4" />
      <rect x="228" y="52" width="44" height="44" rx="6" fill={GOLD} opacity="0.85" />
      <rect x="236" y="104" width="44" height="44" rx="6" fill="#3f3f46" />
      <rect x="228" y="156" width="44" height="44" rx="6" fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="40" y="216" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>fabric · colour · detail</text>
    </svg>
  );
}

export function PatternArt() {
  return (
    <svg viewBox="0 0 320 240" className={frame} role="img" aria-label="Technical pattern piece on construction grid">
      {Array.from({ length: 7 }, (_, i) => (
        <path key={`v${i}`} d={`M${40 + i * 40} 20v200`} stroke={LINE} strokeWidth="1" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <path key={`h${i}`} d={`M20 ${40 + i * 40}h280`} stroke={LINE} strokeWidth="1" />
      ))}
      <path d="M96 48c40-14 96-14 128 4l8 118c-46 18-98 18-144 0z" fill="#FFFDF9" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M160 60v130" stroke={GOLD} strokeWidth="1.5" strokeDasharray="6 4" />
      <path d="M154 70l6-8 6 8M154 182l6 8 6-8" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <path d="M96 96l-10 4M224 96l10 4" stroke={MUTE} strokeWidth="1" />
      <text x="172" y="130" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>grain</text>
      <text x="40" y="226" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>piece F-01 · seam 1.0</text>
    </svg>
  );
}

export function ProduceArt() {
  return (
    <svg viewBox="0 0 320 240" className={frame} role="img" aria-label="Production stage timeline">
      <path d="M40 120h240" stroke={LINE} strokeWidth="2" />
      <path d="M40 120h130" stroke={GOLD} strokeWidth="2" />
      {[
        { x: 40, done: true, label: 'cut' },
        { x: 120, done: true, label: 'sew' },
        { x: 200, done: false, label: 'finish' },
        { x: 280, done: false, label: 'deliver' },
      ].map((s) => (
        <g key={s.label}>
          <circle cx={s.x} cy="120" r="10" fill={s.done ? '#18181B' : '#FFFDF9'} stroke={s.done ? '#18181B' : MUTE} strokeWidth="2" />
          {s.done && <path d={`M${s.x - 4} 120l3 4 6-8`} fill="none" stroke={GOLD} strokeWidth="2" />}
          <text x={s.x - 14} y="150" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>{s.label}</text>
        </g>
      ))}
      <text x="40" y="70" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>order #— · due fri</text>
    </svg>
  );
}

export function ManageArt() {
  return (
    <svg viewBox="0 0 320 240" className={frame} role="img" aria-label="Business ledger visualization (illustrative)">
      <rect x="48" y="36" width="224" height="168" rx="12" fill="#FFFDF9" stroke={INK} strokeWidth="2" />
      <path d="M48 72h224" stroke={LINE} strokeWidth="1.5" />
      <circle cx="70" cy="54" r="6" fill={GOLD} />
      <path d="M86 50h60M86 60h40" stroke={MUTE} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <path d={`M64 ${100 + i * 26}h${120 - i * 18}`} stroke={i === 0 ? GOLD : LINE} strokeWidth="6" strokeLinecap="round" />
          <circle cx="248" cy={100 + i * 26} r="5" fill={i < 2 ? '#18181B' : 'none'} stroke={i < 2 ? '#18181B' : MUTE} strokeWidth="1.5" />
        </g>
      ))}
      <text x="64" y="222" fontFamily="JetBrains Mono Variable, monospace" fontSize="10" fill={MUTE}>illustrative product visualization</text>
    </svg>
  );
}
