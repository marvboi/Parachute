import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { FallNarrative } from "./fall/FallNarrative";
import { Header } from "./components/Header";
import { LivePriceChart } from "./components/LivePriceChart";
import { PositionCards } from "./components/PositionCards";
import { CreateStopFlow, type CreateStopDraft } from "./components/CreateStopFlow";
import { CrossChainTimeline } from "./components/CrossChainTimeline";
import { StatsStrip } from "./components/StatsStrip";
import { PackingDeck } from "./components/PackingDeck";
import { NarrativeBridge } from "./components/NarrativeBridge";
import { DEMO_POSITIONS, PROOF_PRICES, buildDemoTimeline, buildLiveTimeline } from "./data/demoSeed";
import { hasDeployments } from "./config/contracts";
import { useChainlinkPrices } from "./hooks/useChainlinkPrice";
import { useVaultOwner, useVaultPositions } from "./hooks/useVaultPositions";

export default function App() {
  const [demoMode, setDemoMode] = useState(true);
  const [localPositions, setLocalPositions] = useState(DEMO_POSITIONS);
  const [selectedId, setSelectedId] = useState(DEMO_POSITIONS[0].id);
  const [swapGround, setSwapGround] = useState(true);
  const deployed = hasDeployments();

  const vaultQuery = useVaultPositions(deployed);
  const ownerQuery = useVaultOwner(deployed);
  const { address } = useAccount();

  const livePositions = vaultQuery.data;
  const useOnChainList = deployed && livePositions && livePositions.length > 0 && !vaultQuery.isError;

  const positions = useOnChainList ? livePositions : localPositions;

  useEffect(() => {
    if (positions.length && !positions.find((p) => p.id === selectedId)) {
      setSelectedId(positions[0].id);
    }
  }, [positions, selectedId]);

  const selected = positions.find((p) => p.id === selectedId) ?? positions[0];
  const live = useChainlinkPrices(["ETH", "BTC", "LINK"], !demoMode);

  const ethSpot = useMemo(() => {
    if (!demoMode && live.data?.ETH) return live.data.ETH.price;
    if (useOnChainList && livePositions?.[0]?.token === "ETH" && livePositions[0].liveSpot) {
      return livePositions[0].liveSpot;
    }
    return PROOF_PRICES.ETH;
  }, [demoMode, live.data, useOnChainList, livePositions]);

  const spot = useMemo(() => {
    if (selected.liveSpot) return selected.liveSpot;
    if (!demoMode && live.data?.[selected.token]) return live.data[selected.token].price;
    return PROOF_PRICES[selected.token];
  }, [demoMode, live.data, selected]);

  const timeline = useMemo(() => {
    if (selected.onChain) return buildLiveTimeline(selected.token, selected.vaultId);
    return buildDemoTimeline(selected.token);
  }, [selected]);

  const vaultOwner = ownerQuery.data;
  const isVaultOwner =
    deployed && address && vaultOwner && address.toLowerCase() === vaultOwner.toLowerCase();

  const onCreate = (draft: CreateStopDraft) => {
    const id = `p${localPositions.length + 1}`;
    const level =
      draft.stopType === "fixed"
        ? Number(draft.fixedPrice || spot * 0.9)
        : spot * (1 - Number(draft.trailPct) / 100);
    setLocalPositions((prev) => [
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
    void vaultQuery.refetch();
  };

  const onReachApp = useCallback(() => {
    /* optional: analytics hook */
  }, []);

  return (
    <div className="parachute-page">
      <Header demoMode={demoMode} onToggleDemo={() => setDemoMode((d) => !d)} minimal />
      <FallNarrative ethSpot={ethSpot} demoMode={demoMode} onReachApp={onReachApp} />
      <NarrativeBridge />
      <PackingDeck swapGround={swapGround}>
        <div className="page-container">
          <header className="pack-header">
            <h2 className="pack-title proposed-copy">Pack your parachute</h2>
          </header>
          <StatsStrip positions={positions} demoMode={demoMode} />
          <div className="app-deck-grid">
            <LivePriceChart
              token={selected.token}
              basePrice={spot}
              trailPct={selected.stopType === "trailing" ? selected.trailPct : 5}
              animated={demoMode && !useOnChainList}
            />
            <PositionCards
              positions={positions}
              selectedId={selectedId}
              onSelect={setSelectedId}
              liveSource={useOnChainList}
            />
            <CreateStopFlow
              demoMode={demoMode}
              onSubmit={onCreate}
              onLandingMode={setSwapGround}
              armedCount={positions.filter((p) => p.status === "armed").length}
              onChainReady={deployed}
              isVaultOwner={!!isVaultOwner}
              connectedAddress={address}
              onVaultRefresh={() => vaultQuery.refetch()}
            />
            <CrossChainTimeline steps={timeline} />
          </div>
        </div>
      </PackingDeck>
    </div>
  );
}