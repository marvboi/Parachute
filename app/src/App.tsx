import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { FallNarrative } from "./fall/FallNarrative";
import { Header } from "./components/Header";
import { LivePriceChart } from "./components/LivePriceChart";
import { PositionCards } from "./components/PositionCards";
import { CreateStopFlow } from "./components/CreateStopFlow";
import { CrossChainTimeline } from "./components/CrossChainTimeline";
import { StatsStrip } from "./components/StatsStrip";
import { PackingDeck } from "./components/PackingDeck";
import { NarrativeBridge } from "./components/NarrativeBridge";
import { DEFAULT_CHART, buildLiveTimeline, type Position, type TokenSymbol } from "./data/positions";
import { hasDeployments } from "./config/contracts";
import { useChainlinkPrices } from "./hooks/useChainlinkPrice";
import { useVaultOwner, useVaultPositions } from "./hooks/useVaultPositions";

const FALLBACK_CHART: Position = {
  id: "none",
  token: "ETH",
  amount: 0,
  stopType: "trailing",
  trailPct: 5,
  highWater: 0,
  stopLevel: 0,
  status: "idle",
  safeAddress: "",
  swapToStable: false,
};

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [swapGround, setSwapGround] = useState(true);
  const deployed = hasDeployments();

  const vaultQuery = useVaultPositions(deployed);
  const ownerQuery = useVaultOwner(deployed);
  const { address } = useAccount();

  const positions = vaultQuery.data ?? [];
  const live = useChainlinkPrices(["ETH", "BTC", "LINK"], true);

  useEffect(() => {
    if (!positions.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !positions.find((p) => p.id === selectedId)) {
      setSelectedId(positions[0].id);
    }
  }, [positions, selectedId]);

  const selected = useMemo(() => {
    if (!positions.length) return { ...FALLBACK_CHART, liveSpot: live.data?.ETH?.price };
    return positions.find((p) => p.id === selectedId) ?? positions[0];
  }, [positions, selectedId, live.data]);

  const ethSpot = useMemo(() => {
    if (live.data?.ETH?.price) return live.data.ETH.price;
    const ethPos = positions.find((p) => p.token === "ETH");
    if (ethPos?.liveSpot) return ethPos.liveSpot;
    return DEFAULT_CHART.ETH;
  }, [live.data, positions]);

  const spot = useMemo(() => {
    if (selected?.liveSpot) return selected.liveSpot;
    if (live.data?.[selected.token as TokenSymbol]?.price) {
      return live.data[selected.token as TokenSymbol].price;
    }
    return DEFAULT_CHART[selected.token as TokenSymbol];
  }, [live.data, selected]);

  const timeline = useMemo(
    () =>
      selected && selected.id !== "none"
        ? buildLiveTimeline(selected.token, selected.vaultId)
        : buildLiveTimeline("ETH"),
    [selected],
  );

  const vaultOwner = ownerQuery.data;
  const isVaultOwner =
    deployed && address && vaultOwner && address.toLowerCase() === vaultOwner.toLowerCase();

  const onReachApp = useCallback(() => {
    /* optional */
  }, []);

  const vaultStatus = vaultQuery.isLoading
    ? "loading"
    : vaultQuery.isError
      ? "error"
      : positions.length === 0
        ? "empty"
        : "ready";

  return (
    <div className="parachute-page">
      <Header minimal />
      <FallNarrative ethSpot={ethSpot} onReachApp={onReachApp} />
      <NarrativeBridge />
      <PackingDeck swapGround={swapGround}>
        <div className="page-container">
          <header className="pack-header">
            <h2 className="pack-title proposed-copy">Pack your parachute</h2>
          </header>
          {positions.length > 0 && <StatsStrip positions={positions} />}
          <div className="app-deck-grid">
            {vaultStatus !== "empty" && vaultStatus !== "error" && (
              <LivePriceChart
                token={selected.token as TokenSymbol}
                basePrice={spot}
                trailPct={selected.stopType === "trailing" ? selected.trailPct : 5}
                animated
              />
            )}
            <PositionCards
              positions={positions}
              selectedId={selectedId ?? ""}
              onSelect={setSelectedId}
              status={vaultStatus}
              onRetry={() => vaultQuery.refetch()}
            />
            <CreateStopFlow
              onLandingMode={setSwapGround}
              armedCount={positions.filter((p) => p.status === "armed").length}
              onChainReady={deployed}
              isVaultOwner={!!isVaultOwner}
              connectedAddress={address}
              spotPrice={spot}
              onVaultRefresh={() => vaultQuery.refetch()}
            />
            {vaultStatus === "ready" && selected && <CrossChainTimeline steps={timeline} />}
          </div>
        </div>
      </PackingDeck>
    </div>
  );
}