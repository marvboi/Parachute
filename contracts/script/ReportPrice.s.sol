// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {PriceReporter} from "../src/PriceReporter.sol";

contract ReportPrice is Script {
    function run() external {
        PriceReporter reporter = PriceReporter(vm.envAddress("PRICE_REPORTER"));
        bytes32 asset = vm.envBytes32("ASSET");
        uint256 price = vm.envUint("REPORT_PRICE");

        vm.startBroadcast();
        reporter.reportPrice(asset, price);
        vm.stopBroadcast();

        console.log("asset");
        console.logBytes32(asset);
        console.log("price", price);
    }
}
