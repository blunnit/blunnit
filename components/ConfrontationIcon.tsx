// Inline SVG confrontation icons — thin line art, stroke="currentColor"

function Feather({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} fill="none" aria-hidden="true" style={{ display: 'block' }}>
      {/* Outer vane */}
      <path
        d="M10 2 C6.5 5, 5.5 11, 7.5 15 C8.5 17, 10 18, 10 18 C10 18, 11.5 17, 12.5 15 C14.5 11, 13.5 5, 10 2Z"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Spine */}
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Barbs */}
      <line x1="10" y1="7.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="10" y1="7.5" x2="13" y2="9.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="10" y1="11.5" x2="6.5" y2="13.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="10" y1="11.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
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
