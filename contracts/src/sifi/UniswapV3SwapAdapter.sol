// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISwapAdapter} from "./ISwapAdapter.sol";
import {IERC20Like} from "./IERC20Like.sol";

interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256);
}

/// @dev Stateless single-pool Uniswap V3 adapter. Holds no funds between calls.
contract UniswapV3SwapAdapter is ISwapAdapter {
    ISwapRouter02 public immutable router;
    uint24 public immutable fee;

    error SwapFailed();

    constructor(address router_, uint24 fee_) {
        if (router_ == address(0)) revert SwapFailed();
        router = ISwapRouter02(router_);
        fee = fee_;
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        if (to == address(0) || amountIn == 0) revert SwapFailed();
        if (!IERC20Like(tokenIn).transferFrom(msg.sender, address(this), amountIn)) revert SwapFailed();
        if (!IERC20Like(tokenIn).approve(address(router), amountIn)) revert SwapFailed();
        amountOut = router.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: to,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20Like(tokenIn).approve(address(router), 0);
    }
}
