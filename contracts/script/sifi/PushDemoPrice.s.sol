// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script} from "forge-std/Script.sol";
import {DemoAggregator} from "../../src/sifi/DemoAggregator.sol";

/// @dev DEMO ONLY. Pushes DEMO_FEED_PRICE (8 decimals) to DEMO_FEED.
contract PushDemoPrice is Script {
    function run() external {
        DemoAggregator feed = DemoAggregator(vm.envAddress("DEMO_FEED"));
        int256 price = int256(vm.envUint("DEMO_FEED_PRICE"));
        vm.startBroadcast();
        feed.push(price);
        vm.stopBroadcast();
    }
}
