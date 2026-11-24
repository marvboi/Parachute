import { CHAIN_BASE_SEPOLIA, CHAIN_LASNA, contracts } from "../config/contracts";

/** Chainlink 8-decimal answers from docs/price-source-proof.md */
export const PROOF_PRICES = {
  ETH: 1686.8,
  BTC: 60038.06779304,
  LINK: 9.02754266,
} as const;

export type TokenSymbol = "ETH" | "BTC" | "LINK";

export type PositionStatus = "armed" | "triggered" | "landed";

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
}

export interface TimelineStep {
  id: string;
  label: string;
  chain: "Base Sepolia" | "Lasna";
  chainId: number;
  status: "done" | "active" | "pending";
  txHash?: string;
  explorer: "baseSepolia" | "lasna";
  detail: string;
}

export const DEMO_POSITIONS: Position[] = [
  {
    id: "p1",
    token: "ETH",
    amount: 2.4,
    stopType: "trailing",
    trailPct: 5,
    highWater: 1724.5,
    stopLevel: 1638.28,
    status: "armed",
    safeAddress: "0x7a9f…c2d1",
    swapToStable: true,
  },
  {
    id: "p2",
    token: "BTC",
    amount: 0.15,
    stopType: "fixed",
    trailPct: 0,
    highWater: PROOF_PRICES.BTC,
    stopLevel: 52_000,
    status: "armed",
    safeAddress: "0x3b8e…91a0",
    swapToStable: false,
  },
  {
    id: "p3",
    token: "LINK",
    amount: 1200,
    stopType: "trailing",
    trailPct: 8,
    highWater: 9.45,
    stopLevel: 8.69,
    status: "triggered",
    safeAddress: "0x9c12…ff04",
    swapToStable: true,
  },
  {
    id: "p4",
    token: "ETH",
    amount: 0.85,
    stopType: "trailing",
    trailPct: 4,
    highWater: 1710,
    stopLevel: 1641.6,
    status: "landed",
    safeAddress: "0x5afe…00c1",
    swapToStable: true,
  },
];

export function buildDemoTimeline(token: TokenSymbol): TimelineStep[] {
  return [
    {
      id: "e1",
      label: "AnswerUpdated",
      chain: "Base Sepolia",
      chainId: CHAIN_BASE_SEPOLIA,
      status: "done",
      txHash: "0x8f2c1a9e4b3d7c6f5a8e1d2c3b4a5968778899aabbccddeeff001122334455",
      explorer: "baseSepolia",
      detail: `${token}/USD Chainlink round propagated (${contracts.ethUsdFeed.slice(0, 10)}…)`,
    },
    {
      id: "e2",
      label: "react()",
      chain: "Lasna",
      chainId: CHAIN_LASNA,
      status: "done",
      txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
      explorer: "lasna",
      detail: "Reactive contract evaluated trailing stop & queued callback",
    },
    {
      id: "e3",
      label: "onPriceUpdate → land",
      chain: "Base Sepolia",
      chainId: CHAIN_BASE_SEPOLIA,
      status: "active",
      txHash: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
      explorer: "baseSepolia",
      detail: "Vault moved funds to safe address (stable swap optional)",
    },
  ];
}

/**
 * Demo price path: rise → trailing stop below highs → single fall through stop at the end.
 */
export function buildPriceSeries(base: number, points = 80): number[] {
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