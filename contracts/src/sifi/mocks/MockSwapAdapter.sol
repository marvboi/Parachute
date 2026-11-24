// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISwapAdapter} from "../ISwapAdapter.sol";
import {IERC20Like} from "../IERC20Like.sol";

/// @dev Fixed-rate swap for tests and the local demo. Not a real AMM.
/// `rate` is payout units per 1e18 units of input.
contract MockSwapAdapter is ISwapAdapter {
    uint256 public rate;
    bool public broken;

    error SwapFailed();
    error Slippage();

    constructor(uint256 rate_) {
        rate = rate_;
    }

    function setRate(uint256 rate_) external {
        rate = rate_;
    }

    function setBroken(bool broken_) external {
        broken = broken_;
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        if (broken || to == address(0) || amountIn == 0) revert SwapFailed();
        amountOut = (amountIn * rate) / 1e18;
        if (amountOut < minOut) revert Slippage();
        if (!IERC20Like(tokenIn).transferFrom(msg.sender, address(this), amountIn)) revert SwapFailed();
        if (!IERC20Like(tokenOut).transfer(to, amountOut)) revert SwapFailed();
    }
}
