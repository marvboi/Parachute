import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  swapGround: boolean;
};

export function PackingDeck({ children, swapGround }: Props) {
  return (
    <section id="pack-app" className={`pack-app ${swapGround ? "ground-stable" : ""}`}>
      <ValidationHeader />
      {children}
    </section>
  );
}

function ValidationHeader() {
  return (
    <header className="pack-header">
      <h2 className="pack-title proposed-copy">Pack your parachute</h2>
    </header>
  );
}