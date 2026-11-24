// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

/// @dev Origin-chain reporter used to poke demo prices.
/// To watch a Uniswap V3 pool instead, subscribe the reactive contract to
/// Swap(address,address,int256,int256,uint160,uint128,int24) on the pool and
/// decode sqrtPriceX96 from the log data.
contract PriceReporter {
    event PriceReported(bytes32 indexed asset, uint256 price);

    function reportPrice(bytes32 asset, uint256 price) external {
        emit PriceReported(asset, price);
    }
}
