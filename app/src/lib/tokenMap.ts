import { contracts, WETH_BASE_SEPOLIA } from "../config/contracts";
import type { TokenSymbol } from "../data/demoSeed";

export const FEED_BY_TOKEN: Record<TokenSymbol, `0x${string}`> = {
  ETH: contracts.ethUsdFeed,
  BTC: contracts.btcUsdFeed,
  LINK: contracts.linkUsdFeed,
};

const FEED_LOOKUP: Record<string, TokenSymbol> = {
  [contracts.ethUsdFeed.toLowerCase()]: "ETH",
  [contracts.btcUsdFeed.toLowerCase()]: "BTC",
  [contracts.linkUsdFeed.toLowerCase()]: "LINK",
};

export function tokenFromFeed(feed: string): TokenSymbol {
  return FEED_LOOKUP[feed.toLowerCase()] ?? "ETH";
}

/** Known Base Sepolia assets for the create flow. */
export const TOKEN_CONTRACT: Partial<Record<TokenSymbol, `0x${string}`>> = {
  ETH: WETH_BASE_SEPOLIA,
};

export function trailStopUsd(high: number, trailBps: number): number {
  return (high * (10_000 - trailBps)) / 10_000;
}