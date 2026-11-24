type Props = {
  x: number;
  y: number;
  scale?: number;
  tokenGlyph?: string;
  id?: string;
};

export function Capsule({ x, y, scale = 1, tokenGlyph, id = "capsule" }: Props) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} id={id}>
      <ellipse cx="0" cy="0" rx="14" ry="10" fill="#FF5B1F" opacity="0.35" filter="url(#capsuleGlow)" />
      <rect x="-12" y="-8" width="24" height="16" rx="8" fill="#FF5B1F" />
      <rect x="-8" y="-5" width="16" height="10" rx="5" fill="#ff8f4a" opacity="0.45" />
      {tokenGlyph && (
        <text x="0" y="4" textAnchor="middle" fill="#14161C" fontSize="8" fontWeight="700" fontFamily="JetBrains Mono">
          {tokenGlyph}
        </text>
      )}
    </g>
  );
}

export function PackedCapsule({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path d="M-16 4 Q0 -14 16 4 L12 10 Q0 4 -12 10 Z" fill="#FF5B1F" opacity="0.9" />
      <ellipse cx="0" cy="8" rx="10" ry="4" fill="#cc4818" />
    </g>
  );
}