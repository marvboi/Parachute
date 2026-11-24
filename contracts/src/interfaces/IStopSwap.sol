// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

interface IStopSwap {
    function swapTo(address tokenIn, address tokenOut, uint256 amountIn, address to)
        external
        returns (uint256 amountOut);
}
