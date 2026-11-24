# Parachute

Automated on-chain stop-loss protection for the Reactive Omni buildathon (**Set It and Forget It** track).

- **Reactive contract** on Lasna (`5318007`) subscribes to real Chainlink `AnswerUpdated` events on Base Sepolia.
- **Vault** on Base Sepolia receives callbacks and lands funds to a safe address (optional stable swap hook).

## Repo layout

| Path | Purpose |
| ---- | ------- |
| `src/` | Foundry contracts (`ParachuteReactive`, `ParachuteVault`) |
| `src/sifi/` | WIP batch planner (SiFi track experiments) |
| `app/` | Vite + React frontend |
| `docs/price-source-proof.md` | On-chain Chainlink feed proof |

## Contracts

```bash
export PATH="$PATH:$HOME/.foundry/bin"
forge build
forge test
```

SiFi tests are intentionally skipped (`test/sifi`).

## Frontend

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173 — **Demo mode** is on by default (seeded from `docs/price-source-proof.md`). Toggle **Live prices** to read Chainlink via public Base Sepolia RPC (`https://sepolia.base.org`).

Configure deployed addresses in `app/src/config/contracts.ts` after deployment.

## Chains & explorers

- Base Sepolia: https://sepolia.basescan.org
- Lasna: https://lasna.reactscan.net

## Security

Never commit `.env`, private keys, or RPC URLs with secrets. Deployment scripts read `PRIVATE_KEY` from the environment only at broadcast time.