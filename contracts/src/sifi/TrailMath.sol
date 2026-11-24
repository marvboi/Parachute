// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

/// @dev Shared stop math for the vault and the reactive watcher.
library TrailMath {
    uint256 internal constant BPS = 10_000;
    uint16 internal constant MIN_TRAIL_BPS = 10; // 0.1%
    uint16 internal constant MAX_TRAIL_BPS = 5_000; // 50%

    /// @dev Stop level for a trailing position: high minus trail%. Rounds down.
    function trailStop(uint256 high, uint16 trailBps) internal pure returns (uint256) {
        return (high * (BPS - trailBps)) / BPS;
    }

    /// @dev Ratchets the high-water mark. Never moves down.
    function ratchet(uint256 high, uint256 price) internal pure returns (uint256) {
        return price > high ? price : high;
    }

    /// @dev True when the price is at or below the trailing stop for `high`.
    function trailHit(uint256 price, uint256 high, uint16 trailBps) internal pure returns (bool) {
        return high != 0 && price <= trailStop(high, trailBps);
    }

    function validTrail(uint16 trailBps) internal pure returns (bool) {
        return trailBps >= MIN_TRAIL_BPS && trailBps <= MAX_TRAIL_BPS;
    }

    /// @dev Converts `amount` of a token into payout units at an oracle price,
    /// minus slippage. Assumes the payout token is worth one unit of the feed quote.
    function minOut(
        uint256 amount,
        uint256 price,
        uint8 tokenDecimals,
        uint8 feedDecimals,
        uint8 payoutDecimals,
        uint16 slippageBps
    ) internal pure returns (uint256) {
        // amount and price are both bounded to uint128 by callers, so the product fits.
        uint256 value = (amount * price) / (10 ** feedDecimals);
        value = (value / BPS) * (BPS - slippageBps) + ((value % BPS) * (BPS - slippageBps)) / BPS;
        if (payoutDecimals >= tokenDecimals) return value * (10 ** (payoutDecimals - tokenDecimals));
        return value / (10 ** (tokenDecimals - payoutDecimals));
    }
}
