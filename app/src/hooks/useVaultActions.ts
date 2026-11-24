import { useCallback, useState } from "react";
import {
  parseEther,
  parseUnits,
  type Address,
  type Hash,
} from "viem";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { CHAIN_BASE_SEPOLIA, contracts, hasDeployments } from "../config/contracts";
import type { CreateStopDraft } from "../components/CreateStopFlow";
import { FEED_BY_TOKEN, TOKEN_CONTRACT } from "../lib/tokenMap";
import { erc20Abi, vaultAbi, wethAbi } from "../lib/vaultAbi";

export type TxPhase =
  | "idle"
  | "wrap"
  | "approve"
  | "open"
  | "arm"
  | "pending"
  | "confirmed"
  | "failed"
  | "cancelled";

export type TxState = {
  phase: TxPhase;
  hash?: Hash;
  message?: string;
};

function friendlyError(err: unknown): string {
  const e = err as { code?: number; shortMessage?: string; message?: string };
  if (e?.code === 4001 || e?.message?.includes("User rejected")) return "cancelled";
  return e?.shortMessage || e?.message || "Transaction failed";
}

export function useVaultActions(onSuccess: () => void) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [state, setState] = useState<TxState>({ phase: "idle" });

  const waitReceipt = useCallback(
    async (hash: Hash) => {
      setState({ phase: "pending", hash });
      const r = await publicClient!.waitForTransactionReceipt({ hash });
      if (r.status === "reverted") throw new Error("Reverted");
      setState({ phase: "confirmed", hash });
      onSuccess();
      return r;
    },
    [onSuccess, publicClient],
  );

  const wrapEth = useCallback(
    async (amountEth: string) => {
      if (!address) throw new Error("No wallet");
      if (chainId !== CHAIN_BASE_SEPOLIA) await switchChainAsync({ chainId: CHAIN_BASE_SEPOLIA });
      setState({ phase: "wrap" });
      const hash = await writeContractAsync({
        address: TOKEN_CONTRACT.ETH!,
        abi: wethAbi,
        functionName: "deposit",
        value: parseEther(amountEth),
      });
      await waitReceipt(hash);
    },
    [address, chainId, switchChainAsync, waitReceipt, writeContractAsync],
  );

  const openAndArm = useCallback(
    async (draft: CreateStopDraft) => {
      if (!address || !publicClient || !hasDeployments()) throw new Error("Unavailable");
      if (chainId !== CHAIN_BASE_SEPOLIA) await switchChainAsync({ chainId: CHAIN_BASE_SEPOLIA });

      const token =
        draft.token === "ETH"
          ? TOKEN_CONTRACT.ETH!
          : (TOKEN_CONTRACT[draft.token] as Address | undefined);
      if (!token) throw new Error("Token not configured on Base Sepolia");

      const feed = FEED_BY_TOKEN[draft.token];
      const amount = parseEther(draft.amount || "0");
      const safe = (draft.safeAddress as Address) || address;

      setState({ phase: "approve" });
      const hashApprove = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [contracts.vault, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashApprove });

      setState({ phase: "open" });
      const hashOpen = await writeContractAsync({
        address: contracts.vault,
        abi: vaultAbi,
        functionName: "open",
        args: [token, amount, feed, 8, safe],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashOpen });
      const positionId = await publicClient.readContract({
        address: contracts.vault,
        abi: vaultAbi,
        functionName: "positionCount",
      });

      const payout = "0x0000000000000000000000000000000000000000" as Address;
      const adapter = payout;
      const slippage = 0;

      setState({ phase: "arm" });
      let hashArm: Hash;
      if (draft.stopType === "fixed") {
        const stop = parseUnits(draft.fixedPrice || "0", 8);
        hashArm = await writeContractAsync({
          address: contracts.vault,
          abi: vaultAbi,
          functionName: "armFixed",
          args: [positionId, stop, payout, adapter, slippage],
        });
      } else {
        const trail = Math.round(Number(draft.trailPct) * 100);
        hashArm = await writeContractAsync({
          address: contracts.vault,
          abi: vaultAbi,
          functionName: "armTrailing",
          args: [positionId, trail, 0n, payout, adapter, slippage],
        });
      }
      await waitReceipt(hashArm);
    },
    [address, chainId, publicClient, switchChainAsync, waitReceipt, writeContractAsync],
  );

  const run = useCallback(
    async (draft: CreateStopDraft, wrapFirst: boolean) => {
      try {
        setState({ phase: "idle" });
        if (wrapFirst && draft.token === "ETH") await wrapEth(draft.amount);
        await openAndArm(draft);
      } catch (err) {
        const msg = friendlyError(err);
        if (msg === "cancelled") setState({ phase: "cancelled" });
        else setState({ phase: "failed", message: msg });
        throw err;
      }
    },
    [openAndArm, wrapEth],
  );

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, run, wrapEth, reset };
}