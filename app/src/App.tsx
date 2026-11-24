import { useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { LivePriceChart } from "./components/LivePriceChart";
import { PositionCards } from "./components/PositionCards";
import { CreateStopFlow, type CreateStopDraft } from "./components/CreateStopFlow";
import { CrossChainTimeline } from "./components/CrossChainTimeline";
import { DEMO_POSITIONS, PROOF_PRICES, buildDemoTimeline } from "./data/demoSeed";
import { useChainlinkPrices } from "./hooks/useChainlinkPrice";
import { hasDeployments } from "./config/contracts";

export default function App() {
  const [demoMode, setDemoMode] = useState(true);
  const [positions, setPositions] = useState(DEMO_POSITIONS);
  const [selectedId, setSelectedId] = useState(DEMO_POSITIONS[0].id);

  const selected = positions.find((p) => p.id === selectedId) ?? positions[0];
  const live = useChainlinkPrices(["ETH", "BTC", "LINK"], !demoMode);

  const spot = useMemo(() => {
    if (!demoMode && live.data?.[selected.token]) {
      return live.data[selected.token].price;
    }
    return PROOF_PRICES[selected.token];
  }, [demoMode, live.data, selected.token]);

  const timeline = useMemo(
    () => buildDemoTimeline(selected.token),
    [selected.token],
  );

  const onCreate = (draft: CreateStopDraft) => {
    const id = `p${positions.length + 1}`;
    const level =
      draft.stopType === "fixed"
        ? Number(draft.fixedPrice || spot * 0.9)
        : spot * (1 - Number(draft.trailPct) / 100);
    setPositions((prev) => [
      {
        id,
        token: draft.token,
        amount: Number(draft.amount) || 0,
        stopType: draft.stopType,
        trailPct: Number(draft.trailPct) || 0,
        highWater: spot,
        stopLevel: level,
        status: "armed",
        safeAddress: `${draft.safeAddress.slice(0, 6)}…${draft.safeAddress.slice(-4)}`,
        swapToStable: draft.swapToStable,
      },
      ...prev,
    ]);
    setSelectedId(id);
  };

  return (
    <div className="app-shell">
      <Header demoMode={demoMode} onToggleDemo={() => setDemoMode((d) => !d)} />
      <main>
        <Hero activeToken={selected.token} spot={spot} reactiveReady={hasDeployments() || demoMode} />
        <MotionHeroGrid
          selectedToken={selected.token}
          spot={spot}
          trailPct={selected.stopType === "trailing" ? selected.trailPct : 0}
          demoMode={demoMode}
          positions={positions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={onCreate}
          timeline={timeline}
        />
      </main>
      <footer className="site-footer">
        <p>
          Parachute · Reactive buildathon — public data only · Base Sepolia Chainlink + Lasna reactive
        </p>
      </footer>
    </div>
  );
}

function MotionHeroGrid(props: {
  selectedToken: import("./data/demoSeed").TokenSymbol;
  spot: number;
  trailPct: number;
  demoMode: boolean;
  positions: typeof DEMO_POSITIONS;
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (d: CreateStopDraft) => void;
  timeline: ReturnType<typeof buildDemoTimeline>;
}) {
  return (
    <div className="content-grid">
      <LivePriceChart
        token={props.selectedToken}
        basePrice={props.spot}
        trailPct={props.trailPct || 5}
        animated={props.demoMode}
      />
      <PositionCards positions={props.positions} selectedId={props.selectedId} onSelect={props.onSelect} />
      <CreateStopFlow demoMode={props.demoMode} onSubmit={props.onCreate} />
      <CrossChainTimeline steps={props.timeline} />
    </div>
  );
}