// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IERC20} from "./interfaces/IERC20.sol";
import {IStopSwap} from "./interfaces/IStopSwap.sol";

/// @dev 1:1 swap for local and unit tests. Not a real AMM.
contract MockStopSwap is IStopSwap {
    error SwapFailed();

    function swapTo(address tokenIn, address tokenOut, uint256 amountIn, address to)
        external
        returns (uint256 amountOut)
    {
        if (to == address(0) || amountIn == 0) revert SwapFailed();
        amountOut = amountIn;
        if (!IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn)) revert SwapFailed();
        if (!IERC20(tokenOut).transfer(to, amountOut)) revert SwapFailed();
    }
}
