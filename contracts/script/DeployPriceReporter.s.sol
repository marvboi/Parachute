// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {PriceReporter} from "../src/PriceReporter.sol";

contract DeployPriceReporter is Script {
    function run() external {
        vm.startBroadcast();
        PriceReporter reporter = new PriceReporter();
        vm.stopBroadcast();
        console.log("PriceReporter", address(reporter));
    }
}
