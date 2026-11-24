# Archived contract stubs (pre–Sifi original restore)

Moved during Run 12 when `/cursor/stores/self/inbox/parachute-contracts-src.tar.gz` replaced the rebuild-from-brief Foundry sources.

| Path | Notes |
| ---- | ----- |
| `ParachuteReactive.sol` | Single-feed stub watcher |
| `ParachuteVault.sol` | Simplified vault + `IParachuteVault` interface |
| `interfaces/` | `IParachuteVault`, `IChainlinkAggregator` |
| `SiFiBatchPlanner.sol` | Batch planner experiment |
| `DeployParachute.s.sol` / `DeploySiFi.s.sol` | Old deploy entrypoints |
| `ParachuteVault.t.sol` | Tests for stub vault |
| `test-sifi-stubs/` | `SiFiBatchPlanner` tests |

Active SiFi stack: `contracts/src/sifi/*`, `contracts/test/sifi/*`, `contracts/script/sifi/*`.