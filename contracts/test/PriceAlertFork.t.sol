// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {PriceReporter} from "../src/PriceReporter.sol";

contract PriceAlertForkTest is Test {
    bytes32 internal constant TOPIC0 = keccak256("PriceReported(bytes32,uint256)");

    function testFork_reportPriceOnBaseSepolia() public {
        if (!vm.envExists("BASE_SEPOLIA_RPC")) {
            vm.skip(true);
        }

        vm.createSelectFork(vm.envString("BASE_SEPOLIA_RPC"));
        assertEq(block.chainid, 84532);

        PriceReporter reporter = new PriceReporter();
        bytes32 asset = bytes32("ETH/USD");
        uint256 price = 2100 ether;

        vm.recordLogs();
        reporter.reportPrice(asset, price);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 1);
        assertEq(logs[0].topics[0], TOPIC0);
        assertEq(logs[0].topics[1], asset);
        assertEq(abi.decode(logs[0].data, (uint256)), price);
    }
}
