import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  swapGround: boolean;
};

export function PackingDeck({ children, swapGround }: Props) {
  return (
    <section id="pack-app" className={`pack-app ${swapGround ? "ground-stable" : ""}`}>
      {children}
    </section>
  );
}
