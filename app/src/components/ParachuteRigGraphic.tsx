/** Large hero / background parachute mark — canopy ~full width of box */
export function ParachuteRigGraphic({
  width,
  deployed = 1,
  capsuleOnly = false,
}: {
  width: number;
  deployed?: number;
  capsuleOnly?: boolean;
}) {
  const h = width * 1.12;
  const open = Math.min(1, Math.max(0, deployed));
  const showCanopy = !capsuleOnly && open > 0.08;

  return (
    <svg width={width} height={h} viewBox="0 0 38 40" fill="none" aria-hidden className="chute-rig-graphic">
      {showCanopy && (
        <g opacity={0.2 + open * 0.8}>
          <path d="M4 12 L19 6 L34 12 L28 18 L19 15 L10 18 Z" fill="#FF5B1F" />
          <path
            d="M5 12.2 H12 V14 L14 13.2 L17 14.8 L20 13 L23 15.2 L26 13.5 L29 14.6 L33 12.2"
            stroke="#14161C"
            strokeWidth="1.15"
            fill="none"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <path
            d="M10 18 L19 34 L28 18"
            stroke="#FF5B1F"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.5 + open * 0.5}
          />
        </g>
      )}
      <line x1="12" y1="18" x2="19" y2="32" stroke="#FF5B1F" strokeWidth="1.1" opacity={open * 0.9} />
      <line x1="26" y1="18" x2="19" y2="32" stroke="#FF5B1F" strokeWidth="1.1" opacity={open * 0.9} />
      <line x1="19" y1="18" x2="19" y2="32" stroke="#14161C" strokeWidth="0.75" opacity={0.55 * open} />
      <rect x="11" y="28" width="16" height="11" rx="5.5" fill="#FF5B1F" />
      <rect x="13.5" y="30" width="11" height="6" rx="3" fill="#ff8f4a" opacity="0.45" />
    </svg>
  );
}