import { useCallback, useState } from "react";

type Props = {
  address: string;
  label?: string;
};

export function CopyAddressButton({ address, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [address]);

  return (
    <button type="button" className="copy-addr-btn tabular" onClick={copy} title="Copy address">
      {copied ? "Copied" : label}
    </button>
  );
}

export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}