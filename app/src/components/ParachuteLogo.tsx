type Props = { className?: string; showWordmark?: boolean; size?: number };

/** Inline SVG mark: faceted canopy, chart zigzag hem, lines to shield */
export function ParachuteLogo({ className = "", showWordmark = true, size = 40 }: Props) {
  const h = size;
  const w = size * 0.95;
  return (
    <div className={`logo-wrap ${className}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={w} height={h} viewBox="0 0 38 40" fill="none" aria-hidden>
        <path d="M4 12 L19 6 L34 12 L28 18 L19 15 L10 18 Z" fill="#FF5B1F" opacity="0.95" />
        <path d="M4 12 L10 18 L19 16 L28 20 L34 12 Z" fill="#FF5B1F" opacity="0.55" />
        <path
          d="M6 12.5 H32"
          stroke="#14161C"
          strokeWidth="0.4"
          opacity="0.3"
        />
        <path
          d="M5 12.2 H12 V14 L14 13.2 L17 14.8 L20 13 L23 15.2 L26 13.5 L29 14.6 L33 12.2"
          stroke="#14161C"
          strokeWidth="1.1"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M10 18 L19 34 L28 18" stroke="#FF5B1F" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M19 16 V34" stroke="#FF5B1F" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
        <path d="M15 31 L19 36 L23 31 Z" fill="#FF5B1F" />
      </svg>
      {showWordmark && <span className="wordmark">Parachute</span>}
    </div>
  );
}