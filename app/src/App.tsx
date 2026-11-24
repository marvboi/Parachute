import { useCallback, useMemo, useState } from "react";
import { FallNarrative } from "./fall/FallNarrative";
import { Header } from "./components/Header";
import { LivePriceChart } from "./components/LivePriceChart";
import { PositionCards } from "./components/PositionCards";
import { CreateStopFlow, type CreateStopDraft } from "./components/CreateStopFlow";
import { CrossChainTimeline } from "./components/CrossChainTimeline";
import { StatsStrip } from "./components/StatsStrip";
import { PackingDeck } from "./components/PackingDeck";
import { DEMO_POSITIONS, PROOF_PRICES, buildDemoTimeline } from "./data/demoSeed";
import { useChainlinkPrices } from "./hooks/useChainlinkPrice";
export default function App() {
  const [demoMode, setDemoMode] = useState(true);
  const [positions, setPositions] = useState(DEMO_POSITIONS);
  const [selectedId, setSelectedId] = useState(DEMO_POSITIONS[0].id);
  const [swapGround, setSwapGround] = useState(true);

  const selected = positions.find((p) => p.id === selectedId) ?? positions[0];
  const live = useChainlinkPrices(["ETH", "BTC", "LINK"], !demoMode);

  const ethSpot = useMemo(() => {
    if (!demoMode && live.data?.ETH) return live.data.ETH.price;
    return PROOF_PRICES.ETH;
  }, [demoMode, live.data]);

  const spot = useMemo(() => {
    if (!demoMode && live.data?.[selected.token]) {
      return live.data[selected.token].price;
    }
    return PROOF_PRICES[selected.token];
  }, [demoMode, live.data, selected.token]);

  const timeline = useMemo(() => buildDemoTimeline(selected.token), [selected.token]);

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

  const onReachApp = useCallback(() => {
    /* optional: analytics hook */
  }, []);

  return (
    <div className="parachute-page">
      <Header demoMode={demoMode} onToggleDemo={() => setDemoMode((d) => !d)} minimal />
      <FallNarrative ethSpot={ethSpot} onReachApp={onReachApp} />
      <PackingDeck swapGround={swapGround}>
        <StatsStrip positions={positions} demoMode={demoMode} />
        <div className="app-deck-grid">
          <LivePriceChart
            token={selected.token}
            basePrice={spot}
            trailPct={selected.stopType === "trailing" ? selected.trailPct : 5}
            animated={demoMode}
          />
          <PositionCards positions={positions} selectedId={selectedId} onSelect={setSelectedId} />
          <CreateStopFlow
            demoMode={demoMode}
            onSubmit={onCreate}
            onLandingMode={setSwapGround}
            armedCount={positions.filter((p) => p.status === "armed").length}
          />
          <CrossChainTimeline steps={timeline} />
        </div>
      </PackingDeck>
      <footer className="site-footer">
        <p>Parachute · Reactive buildathon — public data only · Base Sepolia Chainlink + Lasna reactive</p>
      </footer>
    </div>
  );
}