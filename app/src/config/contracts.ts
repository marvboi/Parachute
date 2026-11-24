/** Deployed addresses — empty until contracts are on-chain. */
export const contracts = {
  vault: "" as `0x${string}`,
  reactive: "" as `0x${string}`,
  ethUsdFeed: "0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3" as const,
  btcUsdFeed: "0x961AD289351459A45fC90884eF3AB0278ea95DDE" as const,
  linkUsdFeed: "0xAc6DB6d5538Cd07f58afee9dA736ce192119017B" as const,
};

export const CHAIN_BASE_SEPOLIA = 84532;
export const CHAIN_LASNA = 5318007;

export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

export const EXPLORERS = {
  baseSepolia: "https://sepolia.basescan.org",
  lasna: "https://lasna.reactscan.net",
} as const;

export function hasDeployments(): boolean {
  return contracts.vault.length > 0 && contracts.reactive.length > 0;
}