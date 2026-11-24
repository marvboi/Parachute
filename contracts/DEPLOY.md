# Parachute deploy (owner-operated, cast keystore)

Scripts use **bare** `vm.startBroadcast()`. You sign with Foundry’s keystore (`--account eg. test`), 

## Wallet & RPC (WSL)

```bash
export DEPLOYER="$(cast wallet address --account test)"
export BASE_SEPOLIA_RPC=https://sepolia.base.org
export LASNA_RPC=https://lasna-omni-rpc.rnk.dev
export ETH_CHAIN=84532
export LASNA_CHAIN=5318007
```

Create / unlock the `test` account once with `cast wallet import test` or `cast wallet new test` (password stays in the keystore only).

## Fund the deployer

### Base Sepolia ETH (vault + position gas)

```bash
cast balance "$DEPLOYER" --rpc-url "$BASE_SEPOLIA_RPC" -e
```

You need roughly **≥ 0.05 ETH** on Base Sepolia for deploy + ops (vault constructor sends `VAULT_FUNDING`, default **0.01 ETH**, plus gas).

### Lasna lREACT (reactive contract + subscriptions)

Bridge from Base Sepolia: send ETH to **`0x2afaFD298b23b62760711756088F75B7409f5967`** and call `request(address)` with your deployer:

```bash
cast send 0x2afaFD298b23b62760711756088F75B7409f5967 \
  "request(address)" "$DEPLOYER" \
  --value 2ether \
  --rpc-url "$BASE_SEPOLIA_RPC" \
  --account test
```

- **1 ETH → 100 lREACT** (max **5 ETH** per request).
- Default `REACTIVE_FUNDING` is **2 ETH** of value attached to deploy; use **2–3 ETH** bridge if you want headroom for `coverDebt` / subscriptions.

Check lREACT on Lasna:

```bash
cast balance "$DEPLOYER" --rpc-url "$LASNA_RPC" -e
```

## Deploy order (no chicken-and-egg)

| Contract | Constructor needs vault? | Constructor needs reactive? |
| -------- | ------------------------ | --------------------------- |
| **SifiReactive** (Lasna) | No — `setVault` is step 3 | — |
| **SifiVault** (Base Sepolia) | — | **Yes** — immutable callback sender |

So deploy **reactive first**, then **vault** with that Lasna address, then **connect** the watcher.

Use the **same** keystore account (`test`) as reactive **owner** and vault **owner** so step 3 and `OpenParachutePosition` succeed.

Optional: if you prefer vault-first, you can `cast compute-address "$DEPLOYER" --nonce N` on each chain for counterfactual addresses — not required with the order below.

### Setup env file

```bash
cd contracts
cp .env.example .env
# set PARACHUTE_REACTIVE / PARACHUTE_VAULT after each step
set -a && source .env && set +a
```

Chainlink feeders (Base Sepolia `AnswerUpdated` emitters) are listed in `.env.example`.  
Topic: `0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f`.  
Callback proxy (fixed in vault deploy): `0x476F44b11F5C942c58f4c8E3d0300E5710743585`.

---

### Step 1 — Deploy reactive on Lasna (`5318007`)

```bash
cd contracts
forge script script/sifi/DeployParachuteReactive.s.sol:DeployParachuteReactive \
  --rpc-url "$LASNA_RPC" \
  --chain-id 5318007 \
  --account test \
  --sender "$DEPLOYER" \
  --broadcast \
  -vvvv
```

Copy `PARACHUTE_REACTIVE` from the log into `.env`.

---

### Step 2 — Deploy vault on Base Sepolia (`84532`)

Requires `PARACHUTE_REACTIVE` from step 1.

```bash
export PARACHUTE_REACTIVE=0x...   # from step 1
forge script script/sifi/DeployParachuteVault.s.sol:DeployParachuteVault \
  --rpc-url "$BASE_SEPOLIA_RPC" \
  --chain-id 84532 \
  --account test \
  --sender "$DEPLOYER" \
  --broadcast \
  -vvvv
```

Copy `PARACHUTE_VAULT`. Confirm log `owner` equals `$DEPLOYER`.

---

### Step 3 — Connect watcher to vault (Lasna)

Same account must own the reactive contract (`onlyOwner` on `setVault`).

```bash
export PARACHUTE_VAULT=0x...      # from step 2
forge script script/sifi/ConnectParachute.s.sol:ConnectParachute \
  --rpc-url "$LASNA_RPC" \
  --chain-id 5318007 \
  --account test \
  --sender "$DEPLOYER" \
  --broadcast \
  -vvvv
```

Subscribes to vault `PositionArmed` / `PositionDisarmed` and sets callback gas (`CALLBACK_GAS_LIMIT`, default `1000000`).

---

### Step 4 — Open & arm a position (Base Sepolia)

Vault `onlyOwner` — use the same `$DEPLOYER`.

```bash
export PARACHUTE_VAULT=0x...
export POSITION_TOKEN=0x...
export POSITION_AMOUNT=1000000000000000000
export POSITION_FEED=0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3
export POSITION_SAFE="$DEPLOYER"
export POSITION_MODE=trailing
export TRAIL_BPS=500

forge script script/sifi/OpenParachutePosition.s.sol:OpenParachutePosition \
  --rpc-url "$BASE_SEPOLIA_RPC" \
  --chain-id 84532 \
  --account test \
  --sender "$DEPLOYER" \
  --broadcast \
  -vvvv
```

The Lasna watcher learns the arm from vault events and subscribes to that feed’s `AnswerUpdated` stream.

---

## Local verification (no broadcast)

```bash
cd contracts
forge build
forge test
```

## Security notes

- Vault binds the reactive address at deploy; wrong reactive → redeploy vault.
- Never commit `.env` or keystore passwords.
