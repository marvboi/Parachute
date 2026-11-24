// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

interface IParachuteVault {
  enum StopType {
    Fixed,
    Trailing
  }

  struct Position {
    uint256 id;
    address owner;
    address token;
    uint256 amount;
    StopType stopType;
    uint256 trailBps;
    int256 fixedStopPrice;
    int256 highWaterMark;
    int256 trailingStopPrice;
    address safeAddress;
    bool swapToStable;
    bool triggered;
    bool landed;
  }

  function onPriceUpdate(address priceFeed, int256 answer, uint256 updatedAt) external;

  function positionCount() external view returns (uint256);
}