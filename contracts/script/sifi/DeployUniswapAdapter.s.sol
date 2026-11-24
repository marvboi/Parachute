// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {UniswapV3SwapAdapter} from "../../src/sifi/UniswapV3SwapAdapter.sol";

/// @dev Optional. Single-pool Uniswap V3 adapter for swap-to-stable payouts.
/// Base Sepolia SwapRouter02 by default.
contract DeployUniswapAdapter is Script {
    function run() external returns (UniswapV3SwapAdapter adapter) {
        address router = vm.envOr("UNISWAP_ROUTER", address(0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4));
        uint24 fee = uint24(vm.envOr("UNISWAP_FEE", uint256(3000)));
        vm.startBroadcast();
        adapter = new UniswapV3SwapAdapter(router, fee);
        vm.stopBroadcast();
        console.log("SWAP_ADAPTER", address(adapter));
    }
}
