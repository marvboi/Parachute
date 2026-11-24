// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {SifiVault} from "../../src/sifi/SifiVault.sol";
import {SifiReactive} from "../../src/sifi/SifiReactive.sol";
import {TrailMath} from "../../src/sifi/TrailMath.sol";
import {FeedEvents} from "../../src/sifi/FeedEvents.sol";
import {SifiBase} from "./SifiBase.sol";

/// @dev Full loop: vault event -> react -> callback -> vault, with the network simulated.
contract SifiFlowTest is SifiBase {
    function test_endToEndTrailingWithSwap() public {
        uint256 id = _open(weth, 2 ether, ethFeed);
        vm.recordLogs();
        vm.prank(user);
        vault.armTrailing(id, 500, 0, address(usdc), address(adapter), 300);
        _relayVault();

        _tick(ethFeed, 1_900e8);
        _tick(ethFeed, 2_050e8);
        _tick(ethFeed, 2_000e8);
        assertEq(sys.callbackCount(), 0);
        _tick(ethFeed, 1_940e8); // 5% under 2050 is 1947.5
        assertEq(sys.callbackCount(), 1);

        (bool ok,) = _deliver(0);
        assertTrue(ok);
        assertEq(usdc.balanceOf(safe), 4_000e6);
        assertEq(uint8(_status(id)), uint8(SifiVault.Status.Executed));
        assertFalse(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
    }

    function test_duplicateCallbackDeliveryIsHarmless() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tick(ethFeed, 1_800e8);
        (bool ok,) = _deliver(0);
        assertTrue(ok);
        (bool again, bytes memory ret) = _deliver(0);
        assertFalse(again);
        assertEq(bytes4(ret), SifiVault.BadStatus.selector);
        assertEq(weth.balanceOf(safe), 1 ether);
    }

    function test_cancelRacesTriggerSafely() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tick(ethFeed, 1_800e8); // callback queued
        vm.prank(user);
        vault.cancel(id); // owner cancels before delivery
        (bool ok, bytes memory ret) = _deliver(0);
        assertFalse(ok);
        assertEq(bytes4(ret), SifiVault.BadStatus.selector);
        assertEq(weth.balanceOf(address(vault)), 1 ether);
    }

    function test_rearmRacesOldCallback() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tick(ethFeed, 1_800e8); // nonce 1 callback queued
        _armFixed(id, 1_500e8); // owner moves the stop, nonce 2
        (bool ok, bytes memory ret) = _deliver(0);
        assertFalse(ok);
        assertEq(bytes4(ret), SifiVault.NonceMismatch.selector);
        assertEq(uint8(_status(id)), uint8(SifiVault.Status.Armed));
    }

    function test_lateDeliveryRejectedAsStale() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tick(ethFeed, 1_800e8);
        vm.warp(block.timestamp + 2 hours);
        (bool ok, bytes memory ret) = _deliver(0);
        assertFalse(ok);
        assertEq(bytes4(ret), SifiVault.PriceTooOld.selector);
    }

    function test_multiTokenIndependentStops() public {
        uint256 e1 = _open(weth, 1 ether, ethFeed);
        uint256 e2 = _open(weth, 5 ether, ethFeed);
        uint256 b1 = _open(wbtc, 1e8, btcFeed);
        _armTrailing(e1, 300, 2_000e8);
        _armFixed(e2, 1_500e8);
        _armTrailing(b1, 800, 60_000e8);

        _tick(ethFeed, 2_200e8);
        _tick(btcFeed, 62_000e8);
        _tick(ethFeed, 2_130e8); // e1 stop is 2134, fires
        _tick(btcFeed, 58_000e8); // b1 stop is 57040, holds

        assertEq(sys.callbackCount(), 1);
        (bool ok,) = _deliver(0);
        assertTrue(ok);
        assertEq(weth.balanceOf(safe), 1 ether);
        assertEq(uint8(_status(e2)), uint8(SifiVault.Status.Armed));
        assertEq(uint8(_status(b1)), uint8(SifiVault.Status.Armed));

        _tick(btcFeed, 57_000e8);
        assertEq(sys.callbackCount(), 2);
        (ok,) = _deliver(1);
        assertTrue(ok);
        assertEq(wbtc.balanceOf(safe), 1e8);
        assertEq(weth.balanceOf(address(vault)), 5 ether);
    }

    /// @dev Random price path checked against a reference model of the trail.
    function testFuzz_trailMatchesModel(uint256 seed, uint16 trail, uint64 anchorRaw) public {
        trail = uint16(bound(trail, TrailMath.MIN_TRAIL_BPS, 2_000));
        uint256 anchor = bound(anchorRaw, 0, 3_000e8);
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armTrailing(id, trail, anchor);

        uint256 high = anchor;
        uint256 price = 2_000e8;
        int256 fireAt = -1;
        for (uint256 i; i < 40; ++i) {
            seed = uint256(keccak256(abi.encode(seed, i)));
            // move between -6% and +6%, never to zero
            uint256 moveBps = seed % 1_200;
            price = moveBps >= 600 ? price + (price * (moveBps - 600)) / 10_000 : price - (price * moveBps) / 10_000;
            if (price == 0) price = 1;

            _tick(ethFeed, int256(price));
            if (fireAt < 0) {
                high = price > high ? price : high;
                if (price <= (high * (10_000 - trail)) / 10_000) fireAt = int256(i);
            }
        }

        if (fireAt < 0) {
            assertEq(sys.callbackCount(), 0);
            (,,,,,,, uint256 got) = reactive.watches(id);
            assertEq(got, high);
        } else {
            assertEq(sys.callbackCount(), 1); // fires exactly once
            (bool ok,) = _deliver(0);
            assertTrue(ok);
            assertEq(weth.balanceOf(safe), 1 ether);
        }
    }

    /// @dev Fixed and trailing positions on one feed never affect each other's outcome.
    function testFuzz_multiPositionIsolation(uint256 seed, uint16 trailA, uint64 stopB) public {
        trailA = uint16(bound(trailA, 100, 2_000));
        uint256 fixedStop = bound(stopB, 1_000e8, 1_999e8);
        uint256 a = _open(weth, 1 ether, ethFeed);
        uint256 b = _open(weth, 2 ether, ethFeed);
        _armTrailing(a, trailA, 2_000e8);
        _armFixed(b, fixedStop);

        uint256 high = 2_000e8;
        uint256 price = 2_000e8;
        bool aFired;
        bool bFired;
        uint256 expectCallbacks;
        for (uint256 i; i < 30; ++i) {
            seed = uint256(keccak256(abi.encode(seed, i)));
            uint256 moveBps = seed % 1_000;
            price = moveBps >= 500 ? price + (price * (moveBps - 500)) / 10_000 : price - (price * moveBps) / 10_000;
            _tick(ethFeed, int256(price));
            if (!aFired) {
                high = price > high ? price : high;
                if (price <= (high * (10_000 - trailA)) / 10_000) {
                    aFired = true;
                    expectCallbacks++;
                }
            }
            if (!bFired && price <= fixedStop) {
                bFired = true;
                expectCallbacks++;
            }
        }
        assertEq(sys.callbackCount(), expectCallbacks);
        for (uint256 i; i < expectCallbacks; ++i) {
            (bool ok,) = _deliver(i);
            assertTrue(ok);
        }
        uint256 expectedSafe = (aFired ? 1 ether : 0) + (bFired ? 2 ether : 0);
        assertEq(weth.balanceOf(safe), expectedSafe);
        assertEq(weth.balanceOf(address(vault)), 3 ether - expectedSafe);
        assertEq(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED), !(aFired && bFired));
    }
}
