import { CHAIN_BASE_SEPOLIA, CHAIN_LASNA, contracts } from "../config/contracts";

export type TokenSymbol = "ETH" | "BTC" | "LINK";

export type PositionStatus = "idle" | "armed" | "triggered" | "landed";

export interface Position {
  id: string;
  token: TokenSymbol;
  amount: number;
  stopType: "fixed" | "trailing";
  trailPct: number;
  highWater: number;
  stopLevel: number;
  status: PositionStatus;
  safeAddress: string;
  swapToStable: boolean;
  vaultId?: number;
  onChain?: boolean;
  tokenAddress?: `0x${string}`;
  feedAddress?: `0x${string}`;
  safeFull?: `0x${string}`;
  liveSpot?: number;
}

export interface TimelineStep {
  id: string;
  label: string;
  chain: "Base Sepolia" | "Lasna";
  chainId: number;
  status: "done" | "active" | "pending";
  txHash?: string;
  contractAddress?: string;
  explorer: "baseSepolia" | "lasna";
  detail: string;
}

export function buildLiveTimeline(token: TokenSymbol, vaultPositionId?: number): TimelineStep[] {
  const posLabel = vaultPositionId ? `position #${vaultPositionId}` : "position";
  return [
    {
      id: "e1",
      label: "AnswerUpdated",
      chain: "Base Sepolia",
      chainId: CHAIN_BASE_SEPOLIA,
      status: "done",
      explorer: "baseSepolia",
      detail: `${token}/USD Chainlink feed · vault ${contracts.vault.slice(0, 10)}…`,
      contractAddress: contracts.ethUsdFeed,
    },
    {
      id: "e2",
      label: "react()",
      chain: "Lasna",
      chainId: CHAIN_LASNA,
      status: "done",
      explorer: "lasna",
      detail: `Reactive ${contracts.reactive.slice(0, 10)}… watching ${posLabel}`,
      contractAddress: contracts.reactive,
    },
    {
      id: "e3",
      label: "executeStop → land",
      chain: "Base Sepolia",
      chainId: CHAIN_BASE_SEPOLIA,
      status: "active",
      explorer: "baseSepolia",
      detail: `Vault callback when stop hits · safe payout`,
      contractAddress: contracts.vault,
    },
  ];
}

/** Synthetic price path shape for chart preview (anchored on a live spot). */
export function buildPriceSeries(base: number, points = 80): number[] {
  if (base <= 0) base = 1;
  const out: number[] = [];
  const riseEnd = Math.floor(points * 0.82);
  const peak = base * 1.09;
  const start = base * 0.95;

  for (let i = 0; i < points; i++) {
    if (i <= riseEnd) {
      const u = i / riseEnd;
      const wave = Math.sin(i * 0.35) * base * 0.008;
      out.push(Number((start + (peak - start) * u + wave).toFixed(2)));
    } else {
      const u = (i - riseEnd) / (points - 1 - riseEnd);
      const stop = peak * (1 - 0.05);
      const end = stop * 0.97;
      out.push(Number((peak - (peak - end) * u).toFixed(2)));
    }
  }
  return out;
}

export const DEFAULT_CHART: Record<TokenSymbol, number> = {
  ETH: 1700,
  BTC: 60_000,
  LINK: 9,
};