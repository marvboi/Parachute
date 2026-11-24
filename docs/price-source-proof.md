# Price source proof (Base Sepolia Chainlink)

Parachute reactive subscriptions watch **real** `AnswerUpdated` events on Base Sepolia (`84532`) from these Chainlink v3 aggregators:

| Feed     | Aggregator                                                                 |
| -------- | -------------------------------------------------------------------------- |
| ETH/USD  | `0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3`                             |
| BTC/USD  | `0x961AD289351459A45fC90884eF3AB0278ea95DDE`                             |
| LINK/USD | `0xAc6DB6d5538Cd07f58afee9dA736ce192119017B`                             |

Public RPC: `https://sepolia.base.org` (no API key).

## AnswerUpdated topic

`topic0` = `0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f`  
(`keccak256("AnswerUpdated(int256,uint256,uint256)")`)

## Snapshot rounds (verified via `cast call … latestRoundData()`)

Values use Chainlink 8-decimal answers unless noted.

### ETH / USD

| Round ID | Answer (8d)   | Updated at (unix) |
| -------- | ------------- | ----------------- |
| 297341   | 168680000000  | 1795513600        |

### BTC / USD

| Round ID | Answer (8d)     | Updated at (unix) |
| -------- | --------------- | ----------------- |
| 324668   | 6003806779304   | 1795513590        |

### LINK / USD

| Round ID | Answer (8d)  | Updated at (unix) |
| -------- | ------------ | ----------------- |
| 295003   | 902754266    | 1795513435        |

## Reactive chain

- Lasna reactive network chain id: `5318007`
- Explorer: https://lasna.reactscan.net

## Cross-chain flow

1. Chainlink emits `AnswerUpdated` on Base Sepolia.
2. `ParachuteReactive` on Lasna (`react`) evaluates open stops.
3. Callback to `ParachuteVault` on Base Sepolia moves funds to the configured safe address (optional stable swap hook).