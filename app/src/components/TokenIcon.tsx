import type { TokenSymbol } from "../data/positions";

const META: Record<TokenSymbol, { gradient: [string, string]; glyph: string }> = {
  ETH: { gradient: ["#627eea", "#3d5afe"], glyph: "Ξ" },
  BTC: { gradient: ["#f7931a", "#ffad42"], glyph: "₿" },
  LINK: { gradient: ["#2a5ada", "#375bd2"], glyph: "⬡" },
};

type Props = { symbol: TokenSymbol; size?: number; className?: string };

export function TokenIcon({ symbol, size = 32, className = "" }: Props) {
  const { gradient, glyph } = META[symbol];
  return (
    <span
      className={`token-icon ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 32 32" className="token-icon-ring">
        <defs>
          <linearGradient id={`tk-${symbol}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradient[0]} />
            <stop offset="100%" stopColor={gradient[1]} />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill={`url(#tk-${symbol})`} opacity="0.9" />
        <circle cx="16" cy="16" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      </svg>
      <span className="token-glyph">{glyph}</span>
    </span>
  );
}