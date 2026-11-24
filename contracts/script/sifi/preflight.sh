#!/usr/bin/env bash
# Read-only checks before and after deploying Parachute. Sends nothing.
set -uo pipefail
BASE="${BASE_SEPOLIA_RPC:-https://sepolia.base.org}"
LASNA="${LASNA_RPC:-https://lasna-rpc.rnk.dev/}"
SYSTEM=0x8888888888888888888888888888888888888888
PROXY="${CALLBACK_PROXY:-0x476F44b11F5C942c58f4c8E3d0300E5710743585}"

echo "== Chainlink feeds on Base Sepolia (proxy -> current aggregator) =="
for pair in "ETH/USD 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1 0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3" \
            "BTC/USD 0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298 0x961AD289351459A45fC90884eF3AB0278ea95DDE" \
            "LINK/USD 0xb113F5A928BCfF189C998ab20d753a47F9dE5A61 0xAc6DB6d5538Cd07f58afee9dA736ce192119017B"; do
  set -- $pair
  agg="$(cast call "$2" 'aggregator()(address)' --rpc-url "$BASE")"
  data="$(cast call "$2" 'latestRoundData()(uint80,int256,uint256,uint256,uint80)' --rpc-url "$BASE" | sed -n 2,4p | awk '{print $1}' | tr '\n' ' ')"
  status="OK"; [[ "${agg,,}" != "${3,,}" ]] && status="CHANGED - use $agg in PARACHUTE_FEEDS and config"
  echo "$1 aggregator $agg [$status]  answer/startedAt/updatedAt: $data"
done
echo "now: $(date +%s)"

if [[ -n "${WALLET:-}" ]]; then
  echo "== Wallet balances =="
  echo "Base Sepolia ETH: $(cast balance "$WALLET" --ether --rpc-url "$BASE")"
  echo "Lasna lREACT:     $(cast balance "$WALLET" --ether --rpc-url "$LASNA")"
fi
if [[ -n "${PARACHUTE_REACTIVE:-}" ]]; then
  echo "== Watcher on Lasna =="
  echo "balance: $(cast balance "$PARACHUTE_REACTIVE" --ether --rpc-url "$LASNA")"
  echo "debt:    $(cast call $SYSTEM 'debt(address)(uint256)' "$PARACHUTE_REACTIVE" --rpc-url "$LASNA")"
  echo "vault:   $(cast call "$PARACHUTE_REACTIVE" 'vault()(address)' --rpc-url "$LASNA")"
fi
if [[ -n "${PARACHUTE_VAULT:-}" ]]; then
  echo "== Vault on Base Sepolia =="
  echo "balance: $(cast balance "$PARACHUTE_VAULT" --ether --rpc-url "$BASE")"
  echo "debt:    $(cast call "$PROXY" 'debt(address)(uint256)' "$PARACHUTE_VAULT" --rpc-url "$BASE")"
  echo "positions: $(cast call "$PARACHUTE_VAULT" 'positionCount()(uint256)' --rpc-url "$BASE")"
fi
