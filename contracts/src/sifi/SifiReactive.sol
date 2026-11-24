// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";
import {Owned} from "../Owned.sol";
import {TrailMath} from "./TrailMath.sol";
import {FeedEvents} from "./FeedEvents.sol";

/// @title SifiReactive
/// @dev Lasna watcher for SifiVault. It learns positions from the vault's own
/// PositionArmed / PositionDisarmed events, listens to Chainlink AnswerUpdated
/// logs for each allowed feed, ratchets trailing highs, and requests one callback
/// per position when its stop is hit. Feeds with no live positions are
/// unsubscribed so an idle watcher costs nothing.
contract SifiReactive is AbstractReactive, Owned {
    struct Feed {
        bool allowed;
        bool subscribed;
        uint16 live;
        uint64 lastUpdatedAt;
        uint128 lastRound;
        int256 lastAnswer;
    }

    struct Watch {
        address feed;
        uint8 mode;
        bool live;
        uint16 trailBps;
        uint64 nonce;
        uint64 armedAt;
        uint256 stopPrice;
        uint256 high;
    }

    uint16 public constant MAX_WATCHES_PER_FEED = 10;

    uint256 public immutable feedChainId;
    uint256 public immutable vaultChainId;

    address public vault;
    uint64 public callbackGasLimit = 1_000_000;

    mapping(address => Feed) public feeds;
    mapping(uint256 => Watch) public watches;
    mapping(address => uint256[]) internal _watchList;
    mapping(uint256 => uint256) internal _watchIndex;

    event VaultSet(address vault, uint64 gasLimit);
    event FeedAllowed(address indexed feed, bool allowed);
    event FeedSubscribed(address indexed feed, bool subscribed);
    event WatchStarted(uint256 indexed id, uint64 indexed nonce, address indexed feed, uint8 mode, uint256 stopPrice, uint16 trailBps, uint256 high);
    event WatchStopped(uint256 indexed id, uint64 indexed nonce);
    event WatchRejected(uint256 indexed id, uint64 indexed nonce, uint8 reason);
    event PriceSeen(address indexed feed, int256 answer, uint256 roundId, uint256 updatedAt);
    event HighRaised(uint256 indexed id, uint256 high, uint256 stopLevel);
    event StopTriggered(uint256 indexed id, uint64 indexed nonce, uint256 price, uint256 high, uint256 stopLevel, uint256 updatedAt);

    error GasLimitTooLow();
    error FeedBusy();

    uint8 internal constant REJECT_FEED = 1;
    uint8 internal constant REJECT_FULL = 2;
    uint8 internal constant REJECT_CONFIG = 3;

    constructor(uint256 feedChainId_, uint256 vaultChainId_) payable Owned() {
        feedChainId = feedChainId_;
        vaultChainId = vaultChainId_;
    }

    // ---------- owner ----------

    /// @notice Points the watcher at the vault and subscribes to its config events.
    function setVault(address vault_, uint64 gasLimit) external onlyOwner {
        if (vault_ == address(0)) revert ZeroAddress();
        if (gasLimit < 100_000) revert GasLimitTooLow();
        if (vault != address(0)) {
            _vaultSubscription(vault, false);
        }
        vault = vault_;
        callbackGasLimit = gasLimit;
        _vaultSubscription(vault_, true);
        emit VaultSet(vault_, gasLimit);
    }

    /// @notice Allows a price feed (the aggregator address that emits AnswerUpdated).
    function allowFeed(address feed, bool allowed) external onlyOwner {
        if (feed == address(0)) revert ZeroAddress();
        Feed storage f = feeds[feed];
        if (!allowed && f.live != 0) revert FeedBusy();
        f.allowed = allowed;
        emit FeedAllowed(feed, allowed);
    }

    function coverDebt() external {
        _coverDebt();
    }

    // ---------- react ----------

    /// @inheritdoc IReactive
    function react(LogRecord memory log_) external onlySystem {
        if (log_.chainId == vaultChainId && log_.contractAddress == vault && vault != address(0)) {
            if (log_.topic0 == FeedEvents.POSITION_ARMED && log_.opCode == 4) {
                _onArmed(log_);
            } else if (log_.topic0 == FeedEvents.POSITION_DISARMED && log_.opCode == 3) {
                _onDisarmed(uint256(log_.topic1), uint64(log_.topic2));
            }
            return;
        }
        if (log_.chainId == feedChainId && log_.topic0 == FeedEvents.ANSWER_UPDATED && log_.opCode == 3) {
            Feed storage f = feeds[log_.contractAddress];
            if (f.allowed && f.subscribed) _onPrice(log_.contractAddress, f, log_);
        }
    }

    // ---------- views ----------

    function watchList(address feed) external view returns (uint256[] memory) {
        return _watchList[feed];
    }

    function stopLevel(uint256 id) public view returns (uint256) {
        Watch storage w = watches[id];
        if (w.mode == FeedEvents.MODE_FIXED) return w.stopPrice;
        if (w.mode == FeedEvents.MODE_TRAILING) return TrailMath.trailStop(w.high, w.trailBps);
        return 0;
    }

    // ---------- internal ----------

    function _onArmed(LogRecord memory log_) internal {
        uint256 id = log_.topic1;
        uint64 nonce = uint64(log_.topic2);
        address feed = address(uint160(log_.topic3));
        (uint8 mode, uint256 stopPrice, uint16 trailBps, uint256 anchor, uint64 armedAt) =
            abi.decode(log_.data, (uint8, uint256, uint16, uint256, uint64));

        Watch storage w = watches[id];
        if (nonce <= w.nonce) return; // duplicate or out of order
        address previous = w.live ? w.feed : address(0);
        if (previous != address(0)) _drop(id, w);

        w.nonce = nonce;
        if (!feeds[feed].allowed) {
            emit WatchRejected(id, nonce, REJECT_FEED);
            if (previous != address(0)) _idle(previous);
            return;
        }
        bool okMode = (mode == FeedEvents.MODE_FIXED && stopPrice != 0)
            || (mode == FeedEvents.MODE_TRAILING && TrailMath.validTrail(trailBps));
        if (!okMode) {
            emit WatchRejected(id, nonce, REJECT_CONFIG);
            if (previous != address(0)) _idle(previous);
            return;
        }
        if (_watchList[feed].length >= MAX_WATCHES_PER_FEED) {
            emit WatchRejected(id, nonce, REJECT_FULL);
            if (previous != address(0)) _idle(previous);
            return;
        }

        w.feed = feed;
        w.mode = mode;
        w.trailBps = trailBps;
        w.stopPrice = stopPrice;
        w.high = anchor;
        w.armedAt = armedAt;
        w.live = true;
        _watchIndex[id] = _watchList[feed].length;
        _watchList[feed].push(id);

        Feed storage f = feeds[feed];
        f.live += 1;
        if (!f.subscribed) {
            f.subscribed = true;
            _feedSubscription(feed, true);
        }
        if (previous != address(0) && previous != feed) _idle(previous);
        emit WatchStarted(id, nonce, feed, mode, stopPrice, trailBps, anchor);
    }

    function _onDisarmed(uint256 id, uint64 nonce) internal {
        Watch storage w = watches[id];
        if (!w.live || w.nonce != nonce) return;
        address feed = w.feed;
        _drop(id, w);
        _idle(feed);
        emit WatchStopped(id, nonce);
    }

    function _onPrice(address feed, Feed storage f, LogRecord memory log_) internal {
        int256 answer = int256(log_.topic1);
        uint256 round = log_.topic2;
        uint256 updatedAt = abi.decode(log_.data, (uint256));
        if (answer <= 0 || round <= f.lastRound || updatedAt < f.lastUpdatedAt) return;
        if (round > type(uint128).max || updatedAt > type(uint64).max) return;

        f.lastRound = uint128(round);
        f.lastUpdatedAt = uint64(updatedAt);
        f.lastAnswer = answer;
        emit PriceSeen(feed, answer, round, updatedAt);

        uint256 price = uint256(answer);
        uint256[] storage list = _watchList[feed];
        // Walk backwards so swap-and-pop removal is safe.
        for (uint256 i = list.length; i > 0; --i) {
            uint256 id = list[i - 1];
            Watch storage w = watches[id];
            if (updatedAt < w.armedAt) continue;

            uint256 level;
            if (w.mode == FeedEvents.MODE_TRAILING) {
                uint256 high = TrailMath.ratchet(w.high, price);
                if (high != w.high) {
                    w.high = high;
                    emit HighRaised(id, high, TrailMath.trailStop(high, w.trailBps));
                }
                level = TrailMath.trailStop(high, w.trailBps);
            } else {
                level = w.stopPrice;
            }
            if (price > level) continue;

            _fire(id, w, price, level, updatedAt);
        }

        _idle(feed);
    }

    function _fire(uint256 id, Watch storage w, uint256 price, uint256 level, uint256 updatedAt) internal {
        uint64 nonce = w.nonce;
        uint256 high = w.high;
        _drop(id, w);
        emit StopTriggered(id, nonce, price, high, level, updatedAt);

        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: vaultChainId,
                recipient: vault,
                gasLimit: callbackGasLimit,
                payload: abi.encodeWithSignature(
                    "executeStop(address,uint256,uint64,uint256,uint256,uint256)",
                    address(0),
                    id,
                    nonce,
                    price,
                    high,
                    updatedAt
                )
            })
        );
    }

    /// @dev Removes a live watch from its feed list.
    function _drop(uint256 id, Watch storage w) internal {
        address feed = w.feed;
        uint256[] storage list = _watchList[feed];
        uint256 idx = _watchIndex[id];
        uint256 last = list[list.length - 1];
        list[idx] = last;
        _watchIndex[last] = idx;
        list.pop();
        delete _watchIndex[id];
        w.live = false;

        feeds[feed].live -= 1;
    }

    /// @dev Unsubscribes a feed with no live watches, so idle feeds cost nothing.
    function _idle(address feed) internal {
        Feed storage f = feeds[feed];
        if (f.live == 0 && f.subscribed) {
            f.subscribed = false;
            _feedSubscription(feed, false);
        }
    }

    function _feedSubscription(address feed, bool on) internal {
        if (on) {
            SYSTEM.subscribe(feedChainId, feed, FeedEvents.ANSWER_UPDATED, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        } else {
            SYSTEM.unsubscribe(feedChainId, feed, FeedEvents.ANSWER_UPDATED, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        }
        emit FeedSubscribed(feed, on);
    }

    function _vaultSubscription(address vault_, bool on) internal {
        uint256[2] memory topics = [FeedEvents.POSITION_ARMED, FeedEvents.POSITION_DISARMED];
        for (uint256 i; i < 2; ++i) {
            if (on) {
                SYSTEM.subscribe(vaultChainId, vault_, topics[i], REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
            } else {
                SYSTEM.unsubscribe(vaultChainId, vault_, topics[i], REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
            }
        }
    }
}
