import { Expandable } from "../components/Expandable";

type Props = { progress: number };

function MiniEye({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="loop-svg" aria-hidden>
      <ellipse cx="24" cy="24" rx="18" ry="10" fill="none" stroke={active ? "#FF5B1F" : "#14161C"} strokeWidth="1.5" opacity={active ? 1 : 0.35} />
      <circle cx="24" cy="24" r={active ? 6 : 4} fill={active ? "#FF5B1F" : "#14161C"} className={active ? "pulse-soft" : ""} opacity={active ? 1 : 0.35} />
    </svg>
  );
}

function MiniBolt({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="loop-svg" aria-hidden>
      <path
        d="M26 6 L14 26 H22 L18 42 L36 20 H27 L30 6 Z"
        fill="none"
        stroke={active ? "#FF5B1F" : "#14161C"}
        strokeWidth="1.5"
        opacity={active ? 1 : 0.35}
        className={active ? "pulse-soft" : ""}
      />
    </svg>
  );
}

function MiniChute({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="loop-svg" aria-hidden>
      <path
        d="M8 14 Q24 4 40 14 L24 38 Z"
        fill={active ? "rgba(255,91,31,0.15)" : "none"}
        stroke={active ? "#FF5B1F" : "#14161C"}
        strokeWidth="1.5"
        className={active ? "pulse-soft" : ""}
      />
    </svg>
  );
}

export function HowItWorksRail({ progress }: Props) {
  const cards = [
    { title: "Watch", sub: "Chainlink on Base Sepolia", Icon: MiniEye, at: 0.15 },
    { title: "React", sub: "Lasna evaluates your stop", Icon: MiniBolt, at: 0.45 },
    { title: "Land", sub: "Vault moves funds to safety", Icon: MiniChute, at: 0.75 },
  ];

  return (
    <div className="how-rail">
      {cards.map((c, i) => {
        const active = progress >= c.at - 0.1;
        return (
          <article key={c.title} className="how-card panel-app" style={{ animationDelay: `${i * 80}ms` }}>
            <c.Icon active={active} />
            <h3>{c.title}</h3>
            <Expandable summary="More" size="sm">
              <p>{c.sub}</p>
            </Expandable>
          </article>
        );
      })}
    </div>
  );
}