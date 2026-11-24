// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {DemoAggregator} from "../../src/sifi/DemoAggregator.sol";

/// @dev DEMO ONLY, destination/origin chain. A feed you push yourself, so a stop can be
/// fired on cue during a video. Real positions should use a Chainlink aggregator.
contract DeployDemoFeed is Script {
    function run() external returns (DemoAggregator feed) {
        string memory label = vm.envOr("DEMO_FEED_LABEL", string("ETH / USD"));
        int256 first = int256(vm.envOr("DEMO_FEED_PRICE", uint256(2_000e8)));

        vm.startBroadcast();
        feed = new DemoAggregator(8, label);
        feed.push(first);
        vm.stopBroadcast();

        console.log("DEMO_FEED", address(feed));
    }
}
