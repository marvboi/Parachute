// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {FeedEvents} from "../../src/sifi/FeedEvents.sol";
import {SifiBase} from "./SifiBase.sol";

/// @dev Replays a real AnswerUpdated log captured from the Base Sepolia ETH/USD
/// aggregator (block 62951454, tx 0x0019dc8e...0210) through the watcher.
contract SifiRealLogTest is SifiBase {
    address internal constant ETH_USD_AGG = 0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3;
    uint256 internal constant REAL_ANSWER = 0x2725dfd2b0; // 1681.39150000
    uint256 internal constant REAL_ROUND = 0x48979;
    uint256 internal constant REAL_UPDATED_AT = 0x6b05575f;

    function test_realLogDrivesFixedStop() public {
        assertEq(bytes32(FeedEvents.ANSWER_UPDATED), 0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f);

        vm.warp(REAL_UPDATED_AT - 60);
        vm.prank(user);
        reactive.allowFeed(ETH_USD_AGG, true);
        vm.prank(user);
        uint256 id = vault.open(address(weth), 1 ether, ETH_USD_AGG, 8, safe);
        _armFixed(id, 1_700e8);
        assertTrue(_subActive(ETH_USD_AGG, FeedEvents.ANSWER_UPDATED));

        IReactive.LogRecord memory r;
        r.chainId = CHAIN;
        r.contractAddress = ETH_USD_AGG;
        r.topic0 = FeedEvents.ANSWER_UPDATED;
        r.topic1 = REAL_ANSWER;
        r.topic2 = REAL_ROUND;
        r.data = abi.encode(REAL_UPDATED_AT);
        r.blockNumber = 62951454;
        r.opCode = 3;
        _react(r);

        assertEq(sys.callbackCount(), 1);
        vm.warp(REAL_UPDATED_AT + 30);
        (bool ok,) = _deliver(0);
        assertTrue(ok);
        assertEq(weth.balanceOf(safe), 1 ether);
    }
}
