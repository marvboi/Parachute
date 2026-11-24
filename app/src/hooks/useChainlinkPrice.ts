import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import { BASE_SEPOLIA_RPC } from "../config/contracts";
import type { TokenSymbol } from "../data/demoSeed";

const aggregatorAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function decimals() view returns (uint8)",
]);

const FEEDS: Record<TokenSymbol, `0x${string}`> = {
  ETH: "0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3",
  BTC: "0x961AD289351459A45fC90884eF3AB0278ea95DDE",
  LINK: "0xAc6DB6d5538Cd07f58afee9dA736ce192119017B",
};

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

export function useChainlinkPrices(symbols: TokenSymbol[], enabled: boolean) {
  return useQuery({
    queryKey: ["chainlink", symbols, enabled],
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const entries = await Promise.all(
        symbols.map(async (sym) => {
          const feed = FEEDS[sym];
          const [round, decimals] = await Promise.all([
            client.readContract({ address: feed, abi: aggregatorAbi, functionName: "latestRoundData" }),
            client.readContract({ address: feed, abi: aggregatorAbi, functionName: "decimals" }),
          ]);
          const answer = Number(round[1]) / 10 ** Number(decimals);
          return [sym, { price: answer, roundId: round[0].toString(), updatedAt: Number(round[3]) }] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<
        TokenSymbol,
        { price: number; roundId: string; updatedAt: number }
      >;
    },
    retry: 1,
  });
}