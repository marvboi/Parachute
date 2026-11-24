// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {PriceAlertReactive} from "../src/PriceAlertReactive.sol";

contract DeployPriceAlertReactive is Script {
    function run() external {
        address origin = vm.envAddress("PRICE_REPORTER");
        uint256 originChainId = vm.envUint("ORIGIN_CHAIN_ID");
        uint256 destinationChainId = vm.envUint("DESTINATION_CHAIN_ID");
        bytes32 asset = vm.envBytes32("ASSET");
        uint256 threshold = vm.envUint("THRESHOLD");
        bool above = vm.envBool("ABOVE");

        vm.startBroadcast();
        PriceAlertReactive reactive = new PriceAlertReactive(
            originChainId,
            origin,
            destinationChainId,
            asset,
            threshold,
            above
        );
        vm.stopBroadcast();

        console.log("PriceAlertReactive", address(reactive));
    }
}
