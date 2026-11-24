import { parseAbi } from "viem";

export const vaultAbi = parseAbi([
  "function positionCount() view returns (uint256)",
  "function owner() view returns (address)",
  "function open(address token, uint256 amount, address feed, uint8 feedDecimals, address safe) returns (uint256 id)",
  "function armFixed(uint256 id, uint256 stopPrice, address payout, address adapter, uint16 slippageBps)",
  "function armTrailing(uint256 id, uint16 trailBps, uint256 anchorPrice, address payout, address adapter, uint16 slippageBps)",
  "function position(uint256 id) view returns (address token, uint96 amount, address feed, uint64 nonce, uint8 tokenDecimals, uint8 feedDecimals, uint8 mode, uint8 status, address safe, uint16 trailBps, uint16 slippageBps, uint64 armedAt, address payout, address adapter, uint256 stopPrice, uint256 anchorPrice)",
]);

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export const wethAbi = parseAbi([
  "function deposit() payable",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const VAULT_STATUS = {
  None: 0,
  Idle: 1,
  Armed: 2,
  Executed: 3,
  Closed: 4,
} as const;

export const MODE_FIXED = 1;
export const MODE_TRAILING = 2;