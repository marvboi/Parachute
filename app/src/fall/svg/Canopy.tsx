type Props = { x: number; y: number; open: number };

/** open: 0 closed, 1 fully open */
export function Canopy({ x, y, open }: Props) {
  const spread = 8 + open * 42;
  const lift = open * -28;
  return (
    <g transform={`translate(${x}, ${y + lift})`} opacity={0.2 + open * 0.8}>
      <path
        d={`M${-spread} 4 Q0 ${-20 - open * 16} ${spread} 4 L${spread * 0.6} 8 L0 2 L${-spread * 0.6} 8 Z`}
        fill="#FF5B1F"
        stroke="#ff8f4a"
        strokeWidth="0.6"
      />
      <path
        d={`M${-spread * 0.85} 6 H${spread * 0.85}`}
        stroke="#0A0E1A"
        strokeWidth="1"
        fill="none"
        opacity={0.4}
      />
      <line x1={-spread * 0.5} y1="6" x2="0" y2="22" stroke="#FF5B1F" strokeWidth="1.2" />
      <line x1={spread * 0.5} y1="6" x2="0" y2="22" stroke="#FF5B1F" strokeWidth="1.2" />
    </g>
  );
}