import { contractVerification, explorerAddress } from "../config/contracts";

export function VerifiedContractLinks() {
  const { vault, reactive } = contractVerification;
  return (
    <p className="onchain-links onchain-links-verified">
      <a href={explorerAddress("baseSepolia", vault.address)} target="_blank" rel="noreferrer">
        Vault
      </a>
      <a
        className="verified-pill"
        href={vault.verifiedUrl}
        target="_blank"
        rel="noreferrer"
        title={`Verified on ${vault.verifiedLabel}`}
      >
        Verified
      </a>
      <span className="onchain-sep" aria-hidden>
        ·
      </span>
      <a href={explorerAddress("lasna", reactive.address)} target="_blank" rel="noreferrer">
        Reactive
      </a>
      <a
        className="verified-pill"
        href={reactive.verifiedUrl}
        target="_blank"
        rel="noreferrer"
        title={`Verified on ${reactive.verifiedLabel}`}
      >
        Verified
      </a>
    </p>
  );
}