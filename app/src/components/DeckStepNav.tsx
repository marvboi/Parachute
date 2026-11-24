type Step = { n: number; label: string; href: string };

const STEPS: Step[] = [
  { n: 1, label: "Vault", href: "#positions" },
  { n: 2, label: "Chart", href: "#chart" },
  { n: 3, label: "Arm stop", href: "#create" },
  { n: 4, label: "Path", href: "#timeline" },
];

export function DeckStepNav() {
  return (
    <nav className="deck-step-nav" aria-label="App steps">
      <ol className="deck-step-list">
        {STEPS.map((s) => (
          <li key={s.n}>
            <a className="deck-step-link" href={s.href}>
              <span className="deck-step-num tabular">{s.n}</span>
              <span className="deck-step-label">{s.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}