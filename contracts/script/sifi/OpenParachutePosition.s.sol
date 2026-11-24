// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {SifiVault} from "../../src/sifi/SifiVault.sol";
import {IERC20Like} from "../../src/sifi/IERC20Like.sol";

/// @dev Destination chain. Approves, opens and arms one position from env:
/// POSITION_TOKEN, POSITION_AMOUNT, POSITION_FEED (aggregator), POSITION_SAFE,
/// POSITION_MODE=fixed|trailing, STOP_PRICE or TRAIL_BPS (+ optional ANCHOR_PRICE),
/// optional PAYOUT_TOKEN + SWAP_ADAPTER + SLIPPAGE_BPS. Prices use 8 decimals.
contract OpenParachutePosition is Script {
    function run() external returns (uint256 id) {
        SifiVault vault = SifiVault(payable(vm.envAddress("PARACHUTE_VAULT")));
        address token = vm.envAddress("POSITION_TOKEN");
        uint256 amount = vm.envUint("POSITION_AMOUNT");
        address feed = vm.envAddress("POSITION_FEED");
        address safe = vm.envAddress("POSITION_SAFE");
        string memory mode = vm.envOr("POSITION_MODE", string("trailing"));
        address payout = vm.envOr("PAYOUT_TOKEN", address(0));
        address adapter = vm.envOr("SWAP_ADAPTER", address(0));
        uint16 slippage = uint16(vm.envOr("SLIPPAGE_BPS", uint256(100)));
        if (payout == address(0)) slippage = 0;

        vm.startBroadcast();
        IERC20Like(token).approve(address(vault), amount);
        id = vault.open(token, amount, feed, 8, safe);
        if (keccak256(bytes(mode)) == keccak256("fixed")) {
            vault.armFixed(id, vm.envUint("STOP_PRICE"), payout, adapter, slippage);
        } else {
            uint16 trail = uint16(vm.envUint("TRAIL_BPS"));
            vault.armTrailing(id, trail, vm.envOr("ANCHOR_PRICE", uint256(0)), payout, adapter, slippage);
        }
        vm.stopBroadcast();

        console.log("opened position", id);
    }
}
