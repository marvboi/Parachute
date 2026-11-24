// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {PriceReporter} from "../src/PriceReporter.sol";

contract PriceReporterTest is Test {
    bytes32 internal constant TOPIC0 = keccak256("PriceReported(bytes32,uint256)");

    PriceReporter internal reporter;

    function setUp() public {
        reporter = new PriceReporter();
    }

    function test_reportPriceEmitsIndexedAssetAndPriceData() public {
        bytes32 asset = bytes32("ETH/USD");
        uint256 price = 2100 ether;

        vm.recordLogs();
        reporter.reportPrice(asset, price);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(logs.length, 1);
        assertEq(logs[0].emitter, address(reporter));
        assertEq(logs[0].topics.length, 2);
        assertEq(logs[0].topics[0], TOPIC0);
        assertEq(logs[0].topics[1], asset);
        assertEq(abi.decode(logs[0].data, (uint256)), price);
    }

    function test_reportPriceHasNoThresholdLogic() public {
        // The reporter is a pokeable source. Thresholds live on the reactive contract.
        vm.recordLogs();
        reporter.reportPrice(bytes32("ETH/USD"), 0);
        reporter.reportPrice(bytes32("ETH/USD"), type(uint256).max);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2);
        assertEq(abi.decode(logs[0].data, (uint256)), 0);
        assertEq(abi.decode(logs[1].data, (uint256)), type(uint256).max);
    }
}
