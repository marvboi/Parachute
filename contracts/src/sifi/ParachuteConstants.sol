// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

/// @dev Chain and feed addresses for the Parachute / SiFi Reactive Omni demo.
library ParachuteConstants {
  uint256 internal constant LASNA_CHAIN_ID = 5318007;
  uint256 internal constant BASE_SEPOLIA_CHAIN_ID = 84532;

  /// Reactive callback proxy on Base Sepolia (only this contract may call `executeStop`).
  address internal constant CALLBACK_PROXY = 0x476F44b11F5C942c58f4c8E3d0300E5710743585;

  uint256 internal constant ANSWER_UPDATED =
    0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f;

  address internal constant ETH_USD_BASE_SEPOLIA = 0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3;
  address internal constant BTC_USD_BASE_SEPOLIA = 0x961AD289351459A45fC90884eF3AB0278ea95DDE;
  address internal constant LINK_USD_BASE_SEPOLIA = 0xAc6DB6d5538Cd07f58afee9dA736ce192119017B;
}