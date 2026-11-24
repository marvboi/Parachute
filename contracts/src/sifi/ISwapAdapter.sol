// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

/// @dev Pulls `amountIn` of `tokenIn` from the caller and sends at least `minOut` of `tokenOut` to `to`.
interface ISwapAdapter {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut);
}
