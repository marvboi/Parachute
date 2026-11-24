// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { IParachuteVault } from "./interfaces/IParachuteVault.sol";

/// @title Holds protected positions and executes stop-loss landings on Base Sepolia.
contract ParachuteVault is IParachuteVault {
    address public immutable callbackSender;
    address public owner;

    mapping(address => bool) public supportedFeeds;
    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId = 1;

    event PositionOpened(
        uint256 indexed id,
        address indexed owner,
        address token,
        StopType stopType,
        int256 stopReference
    );
    event TrailingRatchet(uint256 indexed id, int256 highWaterMark, int256 trailingStopPrice);
    event StopTriggered(uint256 indexed id, int256 price, int256 stopLevel);
    event FundsLanded(uint256 indexed id, address safe, uint256 amount);

    error NotAuthorized();
    error UnsupportedFeed();
    error InvalidPosition();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

  modifier onlyReactive() {
    if (msg.sender != callbackSender) revert NotAuthorized();
    _;
  }

    constructor(address callbackSender_, address owner_) {
        callbackSender = callbackSender_;
        owner = owner_;
    }

    function setSupportedFeed(address feed, bool enabled) external onlyOwner {
        supportedFeeds[feed] = enabled;
    }

    function openPosition(
        address token,
        uint256 amount,
        StopType stopType,
        uint256 trailBps,
        int256 fixedStopPrice,
        address safeAddress,
        bool swapToStable
    ) external returns (uint256 id) {
        id = nextPositionId++;
        int256 stopRef = fixedStopPrice;
        if (stopType == StopType.Trailing) {
            stopRef = type(int256).min;
        }

        positions[id] = Position({
            id: id,
            owner: msg.sender,
            token: token,
            amount: amount,
            stopType: stopType,
            trailBps: trailBps,
            fixedStopPrice: fixedStopPrice,
            highWaterMark: stopRef,
            trailingStopPrice: stopRef,
            safeAddress: safeAddress,
            swapToStable: swapToStable,
            triggered: false,
            landed: false
        });

        emit PositionOpened(id, msg.sender, token, stopType, stopRef);
    }

    function onPriceUpdate(address priceFeed, int256 answer, uint256) external onlyReactive {
        if (!supportedFeeds[priceFeed]) revert UnsupportedFeed();

        uint256 total = nextPositionId;
        for (uint256 id = 1; id < total; id++) {
            Position storage pos = positions[id];
            if (pos.triggered || pos.landed || pos.amount == 0) continue;

            if (pos.stopType == StopType.Trailing) {
                if (pos.highWaterMark == type(int256).min || answer > pos.highWaterMark) {
                    pos.highWaterMark = answer;
                    pos.trailingStopPrice = answer - (answer * int256(pos.trailBps)) / 10_000;
                    emit TrailingRatchet(id, pos.highWaterMark, pos.trailingStopPrice);
                }
            }

            int256 level = pos.stopType == StopType.Fixed ? pos.fixedStopPrice : pos.trailingStopPrice;
            if (level != type(int256).min && answer <= level) {
                _land(id, answer, level);
            }
        }
    }

    function _land(uint256 id, int256 price, int256 level) internal {
        Position storage pos = positions[id];
        if (pos.landed) revert InvalidPosition();
        pos.triggered = true;
        pos.landed = true;
        emit StopTriggered(id, price, level);
        emit FundsLanded(id, pos.safeAddress, pos.amount);
    }

    function positionCount() external view returns (uint256) {
        return nextPositionId - 1;
    }
}