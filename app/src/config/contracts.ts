/** On-chain deployments (Base Sepolia + Lasna). */
export const contracts = {
  vault: "0x6947A35154A52e1110ABF897e8D297e176133F3D" as `0x${string}`,
  reactive: "0xdD7d918C65e20FB42e778564E3759EcCFe44c4f0" as `0x${string}`,
  ethUsdFeed: "0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3" as const,
  btcUsdFeed: "0x961AD289351459A45fC90884eF3AB0278ea95DDE" as const,
  linkUsdFeed: "0xAc6DB6d5538Cd07f58afee9dA736ce192119017B" as const,
};

export const CHAIN_BASE_SEPOLIA = 84532;
export const CHAIN_LASNA = 5318007;

export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
export const LASNA_RPC = "https://lasna-rpc.rnk.dev";

export const WETH_BASE_SEPOLIA = "0x4200000000000000000000000000000000000006" as const;

export const EXPLORERS = {
  baseSepolia: "https://sepolia.basescan.org",
  lasna: "https://lasna.reactscan.net",
} as const;

export function hasDeployments(): boolean {
  return contracts.vault.length > 0 && contracts.reactive.length > 0;
}

export function explorerAddress(explorer: keyof typeof EXPLORERS, address: string): string {
  return `${EXPLORERS[explorer]}/address/${address}`;
}