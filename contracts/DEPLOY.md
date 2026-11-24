# Parachute contracts deploy (owner-operated)

Scripts read **only** from the environment. This repo does not broadcast; you run commands locally with a funded wallet.

## Prerequisites

| Item | Notes |
| ---- | ----- |
| Base Sepolia ETH | Pays vault deploy + initial vault funding (`VAULT_FUNDING`) |
| Lasna **lREACT** | Pays reactive deploy + subscription funding (`REACTIVE_FUNDING`) |
| `PRIVATE_KEY` | Hot wallet for deploy/connect only (never commit) |
| Callback proxy | Base Sepolia: `0x476F44b11F5C942c58f4c8E3d0300E5710743585` |

Supported Chainlink feeds on Base Sepolia (already in `.env.example`):

- ETH/USD `0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3`
- BTC/USD `0x961AD289351459A45fC90884eF3AB0278ea95DDE`
- LINK/USD `0xAc6DB6d5538Cd07f58afee9dA736ce192119017B`

Topic monitored: `AnswerUpdated` → `0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f`.

## Setup

```bash
cd contracts
cp .env.example .env
# edit .env — do not commit
forge install   # if lib/ submodules not initialized at repo root
```

From repo root, ensure submodules:

```bash
git submodule update --init --recursive
```

## 1 — Vault on Base Sepolia

Deploy **after** you know the Lasna reactive address (set `PARACHUTE_REACTIVE` in `.env`). The vault binds that address at construction.

```bash
cd contracts
source .env
forge script script/sifi/DeployParachuteVault.s.sol:DeployParachuteVault \
  --rpc-url "$BASE_SEPOLIA_RPC" \
  --broadcast \
  -vvvv
```

Record `PARACHUTE_VAULT` from the log.

## 2 — Reactive on Lasna (5318007)

```bash
forge script script/sifi/DeployParachuteReactive.s.sol:DeployParachuteReactive \
  --rpc-url "$LASNA_RPC" \
  --broadcast \
  -vvvv
```

Record `PARACHUTE_REACTIVE` and ensure `PARACHUTE_FEEDS` lists the three aggregators.

## 3 — Connect watcher to vault

```bash
export PARACHUTE_REACTIVE=0x...
export PARACHUTE_VAULT=0x...
forge script script/sifi/ConnectParachute.s.sol:ConnectParachute \
  --rpc-url "$LASNA_RPC" \
  --broadcast \
  -vvvv
```

This calls `setVault` and subscribes to vault `PositionArmed` / `PositionDisarmed` logs.

## 4 — Arm a position (Base Sepolia)

Use `script/sifi/OpenParachutePosition.s.sol` or call `SifiVault` directly: `open` → `armFixed` or `armTrailing`. The Lasna watcher learns arms from vault events and subscribes to the feed’s `AnswerUpdated` stream.

## Local verification

```bash
cd contracts
forge build
forge test
```

No transactions are sent during CI tests; mocks simulate the Reactive system contract and callback proxy.