/** Original line illustrations in a Warli-inspired style (simple figures, sun, trees). Decorative, so aria-hidden. */
const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Figure({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...common}>
      <circle cx="0" cy="-34" r="4" />
      <path d="M-8-26h16l-8 14zM-8 2h16l-8-14zM-4 2l-3 14M4 2l3 14" />
      <path d="M-8-22l-8 8M8-22l8 8" />
    </g>
  );
}
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...common}>
      <path d="M0 0v-46M0-14l-12-12M0-14l12-12M0-28l-10-10M0-28l10-10M0-46l0-8" />
    </g>
  );
}

export function Illustration({ name, className = '' }: { name: 'empty' | 'notfound'; className?: string }) {
  if (name === 'notfound') {
    return (
      <svg aria-hidden viewBox="0 0 320 160" className={className}>
        <g {...common}>
          <circle cx="262" cy="34" r="12" /><path d="M262 12v-6M262 56v6M240 34h-6M284 34h6M246 18l-4-4M278 50l4 4M278 18l4-4M246 50l-4 4" />
          <path d="M20 140h280" />
        </g>
        <Tree x={44} y={140} /><Tree x={274} y={140} s={0.8} />
        <Figure x={120} y={118} /><Figure x={200} y={118} />
        <g {...common}><path d="M136 100q16-26 48 0" strokeDasharray="1 7" /><path d="M158 82v-6" /></g>
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 240 150" className={className}>
      <g {...common}><path d="M20 132h200" /><circle cx="196" cy="30" r="10" /><path d="M196 12v-5M196 53v5M178 30h-5M219 30h5" /></g>
      <Tree x={36} y={132} s={0.9} />
      <Figure x={110} y={108} />
      <g {...common}><circle cx="140" cy="96" r="14" /><path d="m150 106 14 14" /></g>
    </svg>
  );
}

/** Low-opacity decorative strip built from the public Warli mask. */
export function WarliBand({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`warli h-16 w-full ${className}`} />;
}
