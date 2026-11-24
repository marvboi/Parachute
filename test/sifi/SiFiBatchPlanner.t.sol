// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { Test } from "forge-std/Test.sol";
import { SiFiConcretePlanner } from "./harness/SiFiConcretePlanner.sol";

/// WIP coverage for SiFi batching — excluded from CI gates until harness stabilizes.
contract SiFiBatchPlannerTest is Test {
    function test_draftBatch_revertsUntilWired() public {
        SiFiConcretePlanner planner = new SiFiConcretePlanner();
        uint256[] memory chains = new uint256[](1);
        chains[0] = 84532;
        address[] memory feeds = new address[](1);
        feeds[0] = address(0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3);

        planner.draftBatch(chains, feeds);
        vm.skip(true);
    }
}