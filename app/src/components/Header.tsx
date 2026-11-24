import { ParachuteLogo } from "./ParachuteLogo";

type Props = {
  demoMode: boolean;
  onToggleDemo: () => void;
};

export function Header({ demoMode, onToggleDemo }: Props) {
  return (
    <header className="site-header">
      <ParachuteLogo size={36} />
      <nav className="header-nav" aria-label="Primary">
        <a href="#positions">Positions</a>
        <a href="#create">Create stop</a>
        <a href="#timeline">Cross-chain</a>
      </nav>
      <MotionToggle demoMode={demoMode} onToggleDemo={onToggleDemo} />
    </header>
  );
}

function MotionToggle({ demoMode, onToggleDemo }: Props) {
  return (
    <button type="button" className={`demo-toggle ${demoMode ? "on" : ""}`} onClick={onToggleDemo}>
      <span className="demo-dot" />
      {demoMode ? "Demo mode" : "Live prices"}
    </button>
  );
}