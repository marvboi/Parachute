import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN_BASE_SEPOLIA, explorerAddress } from "../config/contracts";

export function WalletConnect() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    const wrongChain = chainId !== CHAIN_BASE_SEPOLIA;
    return (
      <div className="wallet-strip">
        <a
          className="wallet-addr tabular"
          href={explorerAddress("baseSepolia", address)}
          target="_blank"
          rel="noreferrer"
        >
          {short}
        </a>
        {wrongChain && (
          <button type="button" className="wallet-btn" onClick={() => switchChain({ chainId: CHAIN_BASE_SEPOLIA })}>
            Base Sepolia
          </button>
        )}
        <button type="button" className="wallet-btn ghost" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="wallet-btn"
      disabled={isPending}
      onClick={() => connect({ connector: injected() })}
    >
      Connect wallet
    </button>
  );
}