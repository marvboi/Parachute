import { DEPLOYED_CONTRACTS, GITHUB_CONTRACTS_SOURCE_URL } from "../config/contracts";
import { SIFI_REACTIVE_EXCERPT, SIFI_VAULT_EXCERPT } from "../data/contractExcerpts";
import { Expandable } from "./Expandable";
import { CopyAddressButton, truncateAddress } from "./CopyAddressButton";
import { SolidityCodeBlock } from "../lib/solidityHighlight";

function VerifiedTick() {
  return (
    <span className="verified-tick" aria-hidden title="Verified">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <circle cx="8" cy="8" r="7" fill="rgba(31,157,107,0.15)" stroke="rgba(31,157,107,0.55)" />
        <path
          d="M4.5 8.2 L7 10.7 L11.5 5.5"
          fill="none"
          stroke="#1a7a52"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

type CardProps = {
  name: string;
  chainLabel: string;
  chainId: number;
  address: string;
  explorerUrl: string;
  verifiedUrl: string;
  verifiedLabel: string;
  excerpt: string;
  excerptSummary: string;
};

function ContractCard({
  name,
  chainLabel,
  chainId,
  address,
  explorerUrl,
  verifiedUrl,
  verifiedLabel,
  excerpt,
  excerptSummary,
}: CardProps) {
  return (
    <article className="contract-card glass-inset">
      <header className="contract-card-head">
        <div className="contract-card-title-row">
          <h3 className="contract-card-name">{name}</h3>
          <span className="chain-badge">{chainLabel}</span>
          <span className="chain-badge chain-badge-dim tabular">{chainId}</span>
          <span className="verified-row">
            <VerifiedTick />
            <span className="verified-text">Verified</span>
          </span>
        </div>
        <p className="contract-addr-row tabular">
          <a className="contract-addr mono-input" href={explorerUrl} target="_blank" rel="noreferrer" title={address}>
            {truncateAddress(address)}
          </a>
          <CopyAddressButton address={address} />
        </p>
        <div className="contract-links">
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            Explorer
          </a>
          <a href={verifiedUrl} target="_blank" rel="noreferrer" className="verified-pill">
            {verifiedLabel}
          </a>
        </div>
      </header>
      <Expandable summary={excerptSummary} className="contract-code-expand">
        <SolidityCodeBlock code={excerpt} />
      </Expandable>
    </article>
  );
}

export function ContractsSection() {
  const { reactive, vault } = DEPLOYED_CONTRACTS;
  const showGithub = GITHUB_CONTRACTS_SOURCE_URL.length > 0;

  return (
    <section id="contracts" className="panel panel-app contracts-panel" aria-labelledby="contracts-heading">
      <header className="panel-head panel-head-compact">
        <div>
          <h2 id="contracts-heading">Contracts</h2>
          <p className="muted contract-lead">Deployed SiFi core — verified on-chain.</p>
        </div>
        {showGithub && (
          <a
            className="btn-secondary contract-github"
            href={GITHUB_CONTRACTS_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
          >
            View source on GitHub
          </a>
        )}
      </header>
      <div className="contract-cards">
        <ContractCard
          name={reactive.name}
          chainLabel={reactive.chainLabel}
          chainId={reactive.chainId}
          address={reactive.address}
          explorerUrl={reactive.explorerUrl}
          verifiedUrl={reactive.verifiedUrl}
          verifiedLabel={reactive.verifiedLabel}
          excerpt={SIFI_REACTIVE_EXCERPT}
          excerptSummary="Source excerpt · react() · trailing ratchet · vault callback"
        />
        <ContractCard
          name={vault.name}
          chainLabel={vault.chainLabel}
          chainId={vault.chainId}
          address={vault.address}
          explorerUrl={vault.explorerUrl}
          verifiedUrl={vault.verifiedUrl}
          verifiedLabel={vault.verifiedLabel}
          excerpt={SIFI_VAULT_EXCERPT}
          excerptSummary="Source excerpt · executeStop() callback"
        />
      </div>
    </section>
  );
}