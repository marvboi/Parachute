// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {TrailMath} from "../../src/sifi/TrailMath.sol";

contract TrailMathTest is Test {
    function test_trailStopExamples() public pure {
        assertEq(TrailMath.trailStop(2_000e8, 500), 1_900e8);
        assertEq(TrailMath.trailStop(1_681_3915_0000, 1_000), 1_513_2523_5000);
        assertEq(TrailMath.trailStop(0, 500), 0);
    }

    function test_minOutDecimals() public pure {
        // 1 WETH at 1681.3915 USD (8 dec) to USDC (6 dec), 1% slippage
        assertEq(TrailMath.minOut(1 ether, 1_681_3915_0000, 18, 8, 6, 100), 1_664_577_585);
        // 0.5 WBTC (8 dec) at 59807.29 to an 18 dec stable, no slippage
        assertEq(TrailMath.minOut(0.5e8, 5_980_729_000_000, 8, 8, 18, 0), 29_903.645 ether);
        // same token decimals both sides
        assertEq(TrailMath.minOut(10e6, 1e8, 6, 8, 6, 0), 10e6);
    }

    function testFuzz_trailStopBelowHigh(uint96 high, uint16 trail) public pure {
        trail = uint16(bound(trail, TrailMath.MIN_TRAIL_BPS, TrailMath.MAX_TRAIL_BPS));
        uint256 stop = TrailMath.trailStop(high, trail);
        assertLe(stop, high);
        if (high > 0) assertLt(stop, high);
        // stop is within one unit of the exact value
        assertApproxEqAbs(stop * 10_000, uint256(high) * (10_000 - trail), 10_000);
    }

    function testFuzz_trailStopMonotonic(uint96 a, uint96 b, uint16 trail) public pure {
        trail = uint16(bound(trail, TrailMath.MIN_TRAIL_BPS, TrailMath.MAX_TRAIL_BPS));
        (uint96 lo, uint96 hi) = a < b ? (a, b) : (b, a);
        assertLe(TrailMath.trailStop(lo, trail), TrailMath.trailStop(hi, trail));
    }

    function testFuzz_ratchetNeverDrops(uint96 high, uint96 price) public pure {
        uint256 next = TrailMath.ratchet(high, price);
        assertGe(next, high);
        assertGe(next, price);
        assertTrue(next == high || next == price);
    }

    function testFuzz_trailHitMatchesStop(uint96 price, uint96 high, uint16 trail) public pure {
        trail = uint16(bound(trail, TrailMath.MIN_TRAIL_BPS, TrailMath.MAX_TRAIL_BPS));
        bool hit = TrailMath.trailHit(price, high, trail);
        if (high == 0) assertFalse(hit);
        else assertEq(hit, price <= TrailMath.trailStop(high, trail));
    }

    function testFuzz_minOutNeverExceedsValue(uint96 amount, uint96 price, uint8 td, uint8 pd, uint16 slip) public pure {
        td = uint8(bound(td, 0, 18));
        pd = uint8(bound(pd, 0, 18));
        slip = uint16(bound(slip, 0, 2_000));
        uint256 withSlip = TrailMath.minOut(amount, price, td, 8, pd, slip);
        uint256 noSlip = TrailMath.minOut(amount, price, td, 8, pd, 0);
        assertLe(withSlip, noSlip);
    }

    function test_validTrailBounds() public pure {
        assertFalse(TrailMath.validTrail(0));
        assertFalse(TrailMath.validTrail(9));
        assertTrue(TrailMath.validTrail(10));
        assertTrue(TrailMath.validTrail(5_000));
        assertFalse(TrailMath.validTrail(5_001));
    }
}
