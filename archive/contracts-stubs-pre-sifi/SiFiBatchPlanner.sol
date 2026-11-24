// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { IReactive } from "reactive/interfaces/IReactive.sol";
import { AbstractReactive } from "reactive/base/AbstractReactive.sol";

/// @dev WIP: batch planner for Set-It-and-Forget-It subscription groups.
abstract contract SiFiBatchPlanner is AbstractReactive {
    struct BatchPlan {
        uint256[] chainIds;
        address[] feeds;
        bool committed;
    }

    BatchPlan internal _plan;

    function react(IReactive.LogRecord calldata) external onlySystem override {
        // WIP — multi-leg orchestration not wired yet
    }

    function draftBatch(uint256[] calldata chainIds, address[] calldata feeds) external {
        require(chainIds.length == feeds.length, "SiFi: length");
        _plan = BatchPlan({ chainIds: chainIds, feeds: feeds, committed: false });
    }
}