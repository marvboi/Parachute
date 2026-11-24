// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {SifiReactive} from "../../src/sifi/SifiReactive.sol";
import {ParachuteConstants} from "../../src/sifi/ParachuteConstants.sol";

/// @dev Lasna. Deploys the watcher, funds it, and allows the feeds in PARACHUTE_FEEDS
/// (comma-separated aggregator addresses, the contracts that emit AnswerUpdated).
contract DeployParachuteReactive is Script {
    function run() external returns (SifiReactive reactive) {
        uint256 feedChainId = vm.envOr("FEED_CHAIN_ID", ParachuteConstants.BASE_SEPOLIA_CHAIN_ID);
        uint256 vaultChainId = vm.envOr("VAULT_CHAIN_ID", ParachuteConstants.BASE_SEPOLIA_CHAIN_ID);
        uint256 funding = vm.envOr("REACTIVE_FUNDING", uint256(2 ether));
        address[] memory feeds = vm.envAddress("PARACHUTE_FEEDS", ",");
        require(
            block.chainid == ParachuteConstants.LASNA_CHAIN_ID || block.chainid == 1597 || block.chainid == 31337,
            "not a Reactive chain"
        );

        vm.startBroadcast();
        reactive = new SifiReactive{value: funding}(feedChainId, vaultChainId);
        for (uint256 i; i < feeds.length; ++i) {
            reactive.allowFeed(feeds[i], true);
        }
        vm.stopBroadcast();

        console.log("PARACHUTE_REACTIVE", address(reactive));
        for (uint256 i; i < feeds.length; ++i) console.log("allowed feed", feeds[i]);
    }
}
