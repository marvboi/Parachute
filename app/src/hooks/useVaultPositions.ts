import { useQuery } from "@tanstack/react-query";
import { createPublicClient, formatUnits, http, parseAbi, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { BASE_SEPOLIA_RPC, contracts, hasDeployments } from "../config/contracts";
import type { Position, PositionStatus } from "../data/positions";
import { tokenFromFeed, trailStopUsd } from "../lib/tokenMap";
import { MODE_FIXED, MODE_TRAILING, VAULT_STATUS, vaultAbi } from "../lib/vaultAbi";

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC),
});

const aggregatorAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
]);

async function feedSpot(feed: Address, feedDecimals: number): Promise<number | undefined> {
  try {
    const round = await client.readContract({
      address: feed,
      abi: aggregatorAbi,
      functionName: "latestRoundData",
    });
    return Number(round[1]) / 10 ** feedDecimals;
  } catch {
    return undefined;
  }
}

function mapStatus(status: number): PositionStatus {
  if (status === VAULT_STATUS.Armed) return "armed";
  if (status === VAULT_STATUS.Executed) return "landed";
  if (status === VAULT_STATUS.Idle) return "idle";
  if (status === VAULT_STATUS.Closed) return "landed";
  return "idle";
}

function fmtSafe(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function useVaultPositions(enabled: boolean) {
  return useQuery({
    queryKey: ["vault-positions", contracts.vault],
    enabled: enabled && hasDeployments(),
    staleTime: 12_000,
    refetchInterval: 25_000,
    retry: 1,
    queryFn: async (): Promise<Position[]> => {
      const count = await client.readContract({
        address: contracts.vault,
        abi: vaultAbi,
        functionName: "positionCount",
      });
      const n = Number(count);
      const rows: Position[] = [];

      for (let id = 1; id <= n; id++) {
        const p = await client.readContract({
          address: contracts.vault,
          abi: vaultAbi,
          functionName: "position",
          args: [BigInt(id)],
        });
        if (Number(p[7]) === VAULT_STATUS.None) continue;

        const tokenAddr = p[0] as `0x${string}`;
        const feed = p[2] as `0x${string}`;
        const tokenDecimals = Number(p[4]);
        const feedDecimals = Number(p[5]);
        const mode = Number(p[6]);
        const symbol = tokenFromFeed(feed);
        const spot = await feedSpot(feed, feedDecimals);

        const amount = Number(formatUnits(p[1], tokenDecimals));
        const anchorOnChain = Number(p[15]) / 10 ** feedDecimals;
        const stopFixed = Number(p[14]) / 10 ** feedDecimals;
        const trailBps = Number(p[9]);

        let highWater = anchorOnChain || spot || 0;
        let stopLevel = stopFixed;

        if (mode === MODE_TRAILING) {
          if (spot && spot > highWater) highWater = spot;
          stopLevel = trailStopUsd(highWater, trailBps);
        } else if (mode === MODE_FIXED) {
          stopLevel = stopFixed;
          highWater = spot ?? stopFixed;
        }

        rows.push({
          id: `v${id}`,
          vaultId: id,
          token: symbol,
          tokenAddress: tokenAddr,
          feedAddress: feed,
          amount,
          stopType: mode === MODE_TRAILING ? "trailing" : "fixed",
          trailPct: trailBps / 100,
          highWater,
          stopLevel,
          status: mapStatus(Number(p[7])),
          safeAddress: fmtSafe(p[8]),
          safeFull: p[8],
          swapToStable: p[12] !== "0x0000000000000000000000000000000000000000",
          onChain: true,
          liveSpot: spot,
        });
      }

      return rows;
    },
  });
}

export function useVaultOwner(enabled: boolean) {
  return useQuery({
    queryKey: ["vault-owner", contracts.vault],
    enabled: enabled && hasDeployments(),
    staleTime: 60_000,
    queryFn: async () =>
      client.readContract({
        address: contracts.vault,
        abi: vaultAbi,
        functionName: "owner",
      }),
  });
}