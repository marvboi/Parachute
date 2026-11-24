// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {StopLossReactive} from "../src/StopLossReactive.sol";

contract DeployStopLossReactive is Script {
    function run() external {
        address origin = vm.envAddress("PRICE_REPORTER");
        uint256 originChainId = vm.envUint("ORIGIN_CHAIN_ID");
        uint256 destinationChainId = vm.envUint("DESTINATION_CHAIN_ID");
        bytes32 asset = vm.envBytes32("ASSET");

        vm.startBroadcast();
        StopLossReactive reactive = new StopLossReactive(
            originChainId,
            origin,
            destinationChainId,
            asset
        );
        vm.stopBroadcast();

        console.log("StopLossReactive", address(reactive));
    }
}
