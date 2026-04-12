// Inline SVG confrontation icons — thin line art, stroke="currentColor"

function Feather({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true" style={{ display: 'block' }}>
      {/* Curved central shaft with quill tip at bottom */}
      <path d="M10 2 C10.8 5, 9.2 10, 10 16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M10 16 C10.2 17, 10.6 18, 11 19" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      {/* Left vane: curved barb lines fanning out */}
      <path d="M10 4.5 C8.5 5, 7 5.5, 5.5 7" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M10 7 C8.5 7.5, 7 8.5, 5.5 9.5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M10 9.5 C8.5 10, 7.5 11, 6.5 12" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M10 12 C9 12.5, 8.5 13.5, 7.5 14.5" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round" />
      {/* Right vane: curved barb lines fanning out */}
      <path d="M10 4.5 C11.5 5, 13 5.5, 14.5 7" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M10 7 C11.5 7.5, 13 8.5, 14.5 9.5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M10 9.5 C11.5 10, 12.5 11, 13.5 12" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
      <path d="M10 12 C11 12.5, 11.5 13.5, 12.5 14.5" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round" />
    </svg>
  );
}

function Lens({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1" />
      <line x1="12.5" y1="13" x2="17" y2="17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Blade({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true" style={{ display: 'block' }}>
      {/* Pommel */}
      <line x1="7" y1="2.5" x2="13" y2="2.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Grip sides */}
      <line x1="9" y1="2.5" x2="9" y2="8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="11" y1="2.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Crossguard */}
      <line x1="5" y1="8.5" x2="15" y2="8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Blade: wide at guard, narrows to point */}
      <path
        d="M8 8.5 L10 18.5 L12 8.5 Z"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfrontationIcon({ level, size = 20 }: { level: string; size?: number }) {
  if (level === 'gentle') return <Feather size={size} />;
  if (level === 'clear') return <Lens size={size} />;
  if (level === 'piercing') return <Blade size={size} />;
  return null;
}
