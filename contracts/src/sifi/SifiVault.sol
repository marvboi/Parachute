// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {Owned} from "../Owned.sol";
import {ReentrancyGuard} from "../ReentrancyGuard.sol";
import {IERC20Like} from "./IERC20Like.sol";
import {ISwapAdapter} from "./ISwapAdapter.sol";
import {TrailMath} from "./TrailMath.sol";
import {FeedEvents} from "./FeedEvents.sol";

/// @title SifiVault
/// @dev Personal multi-position vault on the destination chain. Each position holds
/// its own token amount and its own fixed or trailing stop. Only an authenticated
/// Reactive callback can execute a stop, and it can only send funds to that
/// position's safe address. The owner can always cancel and withdraw.
contract SifiVault is AbstractCallback, Owned, ReentrancyGuard {
    enum Status {
        None,
        Idle,
        Armed,
        Executed,
        Closed
    }

    struct Position {
        address token;
        uint96 amount;
        address feed;
        uint64 nonce;
        uint8 tokenDecimals;
        uint8 feedDecimals;
        uint8 mode;
        Status status;
        address safe;
        uint16 trailBps;
        uint16 slippageBps;
        uint64 armedAt;
        address payout;
        address adapter;
        uint256 stopPrice;
        uint256 anchorPrice;
    }

    uint64 public constant MAX_PRICE_AGE_CAP = 1 days;
    uint16 public constant MAX_SLIPPAGE_BPS = 2_000;

    uint256 public nextId = 1;
    uint64 public maxPriceAge = 1 hours;
    mapping(uint256 => Position) internal _positions;
    mapping(address => uint256) public committed;

    event PositionOpened(uint256 indexed id, address indexed token, address indexed feed, uint256 amount, address safe);
    event PositionFunded(uint256 indexed id, uint256 amount, uint256 total);
    event PositionArmed(
        uint256 indexed id,
        uint64 indexed nonce,
        address indexed feed,
        uint8 mode,
        uint256 stopPrice,
        uint16 trailBps,
        uint256 anchorPrice,
        uint64 armedAt
    );
    event PositionDisarmed(uint256 indexed id, uint64 indexed nonce);
    event PositionWithdrawn(uint256 indexed id, address to, uint256 amount);
    event StopExecuted(
        uint256 indexed id,
        uint64 indexed nonce,
        uint256 price,
        uint256 high,
        uint256 stopLevel,
        address payoutToken,
        uint256 paid,
        address safe
    );
    event SwapFallback(uint256 indexed id, bytes reason);
    event MaxPriceAgeSet(uint64 maxPriceAge);
    event Swept(address token, address to, uint256 amount);

    error UnknownPosition();
    error BadStatus();
    error NonceMismatch();
    error InvalidConfig();
    error InvalidAmount();
    error InvalidPrice();
    error PriceBeforeArm();
    error PriceTooOld();
    error StopNotHit();
    error TokenTransferFailed();

    constructor(IPayable callbackProxy, address reactive) payable AbstractCallback(callbackProxy, reactive) Owned() {
        if (reactive == address(0) || address(callbackProxy) == address(0)) revert ZeroAddress();
    }

    // ---------- owner: funds ----------

    /// @notice Opens a position by pulling `amount` of `token` from the owner.
    /// @param feed Price feed on the origin chain the watcher listens to for this token.
    function open(address token, uint256 amount, address feed, uint8 feedDecimals, address safe)
        external
        onlyOwner
        nonReentrant
        returns (uint256 id)
    {
        if (token == address(0) || feed == address(0) || safe == address(0)) revert ZeroAddress();
        if (feedDecimals > 18) revert InvalidConfig();
        uint8 tokenDecimals = _decimals(token);
        uint96 received = _pull(token, amount);

        id = nextId++;
        Position storage p = _positions[id];
        p.token = token;
        p.amount = received;
        p.feed = feed;
        p.tokenDecimals = tokenDecimals;
        p.feedDecimals = feedDecimals;
        p.safe = safe;
        p.status = Status.Idle;
        committed[token] += received;
        emit PositionOpened(id, token, feed, received, safe);
    }

    function fund(uint256 id, uint256 amount) external onlyOwner nonReentrant {
        Position storage p = _live(id);
        uint96 received = _pull(p.token, amount);
        uint256 total = uint256(p.amount) + received;
        if (total > type(uint96).max) revert InvalidAmount();
        p.amount = uint96(total);
        committed[p.token] += received;
        emit PositionFunded(id, received, total);
    }

    /// @notice Withdraws to the owner. Any armed stop on the position is cancelled first.
    function withdraw(uint256 id, uint256 amount) external onlyOwner nonReentrant {
        Position storage p = _live(id);
        if (amount == 0 || amount > p.amount) revert InvalidAmount();
        if (p.status == Status.Armed) _disarm(id, p);
        p.amount -= uint96(amount);
        committed[p.token] -= amount;
        if (p.amount == 0) p.status = Status.Closed;
        _send(p.token, owner, amount);
        emit PositionWithdrawn(id, owner, amount);
    }

    /// @notice Recovers tokens sent here directly, never position funds.
    function sweep(address token, address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 free = IERC20Like(token).balanceOf(address(this)) - committed[token];
        if (free == 0) revert InvalidAmount();
        _send(token, to, free);
        emit Swept(token, to, free);
    }

    // ---------- owner: stops ----------

    /// @notice Fires when price <= stopPrice.
    function armFixed(uint256 id, uint256 stopPrice, address payout, address adapter, uint16 slippageBps)
        external
        onlyOwner
    {
        if (stopPrice == 0 || stopPrice > type(uint96).max) revert InvalidConfig();
        Position storage p = _live(id);
        p.mode = FeedEvents.MODE_FIXED;
        p.stopPrice = stopPrice;
        p.trailBps = 0;
        p.anchorPrice = 0;
        _setPayout(p, payout, adapter, slippageBps);
        _arm(id, p);
    }

    /// @notice Stop trails `trailBps` below the highest price seen since arming.
    /// @param anchorPrice Starting high. Zero lets the first observed price set it.
    function armTrailing(
        uint256 id,
        uint16 trailBps,
        uint256 anchorPrice,
        address payout,
        address adapter,
        uint16 slippageBps
    ) external onlyOwner {
        if (!TrailMath.validTrail(trailBps) || anchorPrice > type(uint96).max) revert InvalidConfig();
        Position storage p = _live(id);
        p.mode = FeedEvents.MODE_TRAILING;
        p.trailBps = trailBps;
        p.anchorPrice = anchorPrice;
        p.stopPrice = 0;
        _setPayout(p, payout, adapter, slippageBps);
        _arm(id, p);
    }

    /// @notice Re-arms with the last stop settings. Works after a cancel or an execution
    /// that left funds (after `fund`).
    function rearm(uint256 id) external onlyOwner {
        Position storage p = _live(id);
        if (p.mode == 0) revert InvalidConfig();
        _arm(id, p);
    }

    function cancel(uint256 id) external onlyOwner {
        Position storage p = _live(id);
        if (p.status != Status.Armed) revert BadStatus();
        _disarm(id, p);
    }

    function setMaxPriceAge(uint64 maxPriceAge_) external onlyOwner {
        if (maxPriceAge_ == 0 || maxPriceAge_ > MAX_PRICE_AGE_CAP) revert InvalidConfig();
        maxPriceAge = maxPriceAge_;
        emit MaxPriceAgeSet(maxPriceAge_);
    }

    // ---------- callback ----------

    /// @notice Reactive callback. The first argument is overwritten by the network
    /// with the requesting reactive contract and checked against the one set at deploy.
    function executeStop(address reactive, uint256 id, uint64 nonce, uint256 price, uint256 high, uint256 updatedAt)
        external
        onlyServiceProvider
        onlyCallbackSender(reactive)
        nonReentrant
    {
        Position storage p = _positions[id];
        if (p.status != Status.Armed) revert BadStatus();
        if (nonce != p.nonce) revert NonceMismatch();
        if (price == 0 || price > type(uint96).max) revert InvalidPrice();
        if (updatedAt < p.armedAt) revert PriceBeforeArm();
        if (updatedAt > block.timestamp || block.timestamp - updatedAt > maxPriceAge) revert PriceTooOld();

        uint256 stopLevel;
        if (p.mode == FeedEvents.MODE_FIXED) {
            stopLevel = p.stopPrice;
            if (price > stopLevel) revert StopNotHit();
        } else {
            if (high < price || high < p.anchorPrice) revert InvalidPrice();
            stopLevel = TrailMath.trailStop(high, p.trailBps);
            if (price > stopLevel) revert StopNotHit();
        }

        uint256 amount = p.amount;
        p.status = Status.Executed;
        p.amount = 0;
        committed[p.token] -= amount;

        (address payoutToken, uint256 paid) = _payout(id, p, amount, price);
        emit StopExecuted(id, nonce, price, high, stopLevel, payoutToken, paid, p.safe);
    }

    function coverDebt() external {
        _coverDebt();
    }

    // ---------- views ----------

    function position(uint256 id) external view returns (Position memory) {
        return _positions[id];
    }

    function positionCount() external view returns (uint256) {
        return nextId - 1;
    }

    // ---------- internal ----------

    function _live(uint256 id) internal view returns (Position storage p) {
        p = _positions[id];
        if (p.status == Status.None) revert UnknownPosition();
        if (p.status == Status.Closed) revert BadStatus();
    }

    function _setPayout(Position storage p, address payout, address adapter, uint16 slippageBps) internal {
        if ((payout == address(0)) != (adapter == address(0))) revert InvalidConfig();
        if (payout == p.token && payout != address(0)) revert InvalidConfig();
        if (slippageBps > MAX_SLIPPAGE_BPS) revert InvalidConfig();
        if (payout != address(0)) _decimals(payout);
        p.payout = payout;
        p.adapter = adapter;
        p.slippageBps = slippageBps;
    }

    function _arm(uint256 id, Position storage p) internal {
        if (p.amount == 0) revert InvalidAmount();
        if (p.status == Status.Armed) emit PositionDisarmed(id, p.nonce);
        p.nonce += 1;
        p.armedAt = uint64(block.timestamp);
        p.status = Status.Armed;
        emit PositionArmed(id, p.nonce, p.feed, p.mode, p.stopPrice, p.trailBps, p.anchorPrice, p.armedAt);
    }

    function _disarm(uint256 id, Position storage p) internal {
        p.status = Status.Idle;
        emit PositionDisarmed(id, p.nonce);
    }

    /// @dev Swaps to the payout token when configured. A failed or short swap falls
    /// back to sending the original token, so a stop is never lost to a bad pool.
    function _payout(uint256 id, Position storage p, uint256 amount, uint256 price)
        internal
        returns (address, uint256)
    {
        address token = p.token;
        address safe = p.safe;
        if (p.adapter != address(0)) {
            address payout = p.payout;
            uint256 floor = TrailMath.minOut(
                amount, price, p.tokenDecimals, p.feedDecimals, _decimals(payout), p.slippageBps
            );
            uint256 before = IERC20Like(payout).balanceOf(safe);
            _approve(token, p.adapter, amount);
            try ISwapAdapter(p.adapter).swap(token, payout, amount, floor, safe) returns (uint256) {
                _approve(token, p.adapter, 0);
                uint256 got = IERC20Like(payout).balanceOf(safe) - before;
                // Other positions in the same token must stay fully backed.
                if (got < floor || IERC20Like(token).balanceOf(address(this)) < committed[token]) {
                    revert TokenTransferFailed();
                }
                return (payout, got);
            } catch (bytes memory reason) {
                _approve(token, p.adapter, 0);
                emit SwapFallback(id, reason);
            }
        }
        _send(token, safe, amount);
        return (token, amount);
    }

    function _pull(address token, uint256 amount) internal returns (uint96) {
        if (amount == 0) revert InvalidAmount();
        uint256 before = IERC20Like(token).balanceOf(address(this));
        if (!IERC20Like(token).transferFrom(msg.sender, address(this), amount)) revert TokenTransferFailed();
        uint256 received = IERC20Like(token).balanceOf(address(this)) - before;
        if (received == 0 || received > type(uint96).max) revert InvalidAmount();
        return uint96(received);
    }

    function _send(address token, address to, uint256 amount) internal {
        uint256 before = IERC20Like(token).balanceOf(to);
        if (!IERC20Like(token).transfer(to, amount)) revert TokenTransferFailed();
        // Revert if a fee-on-transfer token paid less than requested (position accounting assumes exact amounts).
        if (IERC20Like(token).balanceOf(to) - before != amount) revert TokenTransferFailed();
    }

    function _approve(address token, address spender, uint256 amount) internal {
        if (!IERC20Like(token).approve(spender, amount)) revert TokenTransferFailed();
    }

    function _decimals(address token) internal view returns (uint8 d) {
        try IERC20Like(token).decimals() returns (uint8 v) {
            d = v;
        } catch {
            revert InvalidConfig();
        }
        if (d > 18) revert InvalidConfig();
    }
}
