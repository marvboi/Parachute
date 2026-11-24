type Step = { n: number; label: string; href: string };

const STEPS: Step[] = [
  { n: 1, label: "Vault", href: "#positions" },
  { n: 2, label: "Chart", href: "#chart" },
  { n: 3, label: "Arm stop", href: "#create" },
  { n: 4, label: "Path", href: "#timeline" },
  { n: 0, label: "Contracts", href: "#contracts" },
];

export function DeckStepNav() {
  return (
    <nav className="deck-step-nav" aria-label="App steps">
      <ol className="deck-step-list">
        {STEPS.map((s) => (
          <li key={s.n}>
            <a className={`deck-step-link ${s.n === 0 ? "deck-step-link-plain" : ""}`} href={s.href}>
              {s.n > 0 && <span className="deck-step-num tabular">{s.n}</span>}
              <span className="deck-step-label">{s.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}