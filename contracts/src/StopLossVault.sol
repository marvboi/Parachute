// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {Owned} from "./Owned.sol";
import {ReentrancyGuard} from "./ReentrancyGuard.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IStopSwap} from "./interfaces/IStopSwap.sol";

/// @dev Destination-chain vault. The owner deposits a token and arms a stop;
/// only a Reactive callback can move the funds to the safe address.
contract StopLossVault is AbstractCallback, Owned, ReentrancyGuard {
    IERC20 public immutable token;

    address public safe;
    address public stable;
    address public swapRouter;
    uint256 public stopPrice;
    uint256 public armId;
    uint256 public minOriginBlock;
    uint256 public lastSeenOriginBlock;
    bool public armed;

    error NotArmed();
    error ArmMismatch();
    error PriceAboveStop();
    error StalePrice();
    error NoDeposit();
    error InvalidStop();
    error TokenTransferFailed();
    error TokenApproveFailed();

    event Deposited(uint256 amount);
    event Armed(uint256 armId, uint256 stopPrice, address safe, uint256 minOriginBlock);
    event Cancelled(uint256 armId);
    event Withdrawn(address to, uint256 amount);
    event StopExecuted(
        uint256 armId, uint256 price, uint256 originBlock, address to, address payoutToken, uint256 amount
    );

    constructor(IPayable callbackProxy, address callbackSender, address token_)
        payable
        AbstractCallback(callbackProxy, callbackSender)
        Owned()
    {
        if (token_ == address(0)) revert ZeroAddress();
        token = IERC20(token_);
    }

    function deposit(uint256 amount) external onlyOwner {
        if (amount == 0) revert NoDeposit();
        _transferFrom(msg.sender, address(this), amount);
        emit Deposited(amount);
    }

    function arm(uint256 stopPrice_, address safe_, uint256 minOriginBlock_, address stable_, address swapRouter_)
        external
        onlyOwner
        returns (uint256 newArmId)
    {
        return _arm(stopPrice_, safe_, minOriginBlock_, stable_, swapRouter_);
    }

    function rearm() external onlyOwner returns (uint256 newArmId) {
        return _arm(stopPrice, safe, minOriginBlock, stable, swapRouter);
    }

    function cancel() external onlyOwner {
        if (!armed) revert NotArmed();
        armed = false;
        emit Cancelled(armId);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        if (armed) {
            armed = false;
            emit Cancelled(armId);
        }
        _transfer(owner, amount);
        emit Withdrawn(owner, amount);
    }

    function executeStopLoss(address reactive, uint256 armId_, uint256 originBlock, uint256 price)
        external
        onlyServiceProvider
        onlyCallbackSender(reactive)
        nonReentrant
    {
        if (!armed) revert NotArmed();
        if (armId_ != armId) revert ArmMismatch();
        if (price > stopPrice) revert PriceAboveStop();
        if (originBlock < minOriginBlock || originBlock <= lastSeenOriginBlock) revert StalePrice();

        armed = false;
        lastSeenOriginBlock = originBlock;

        uint256 amount = token.balanceOf(address(this));
        if (amount == 0) revert NoDeposit();

        address payoutToken = address(token);
        uint256 paid = amount;
        if (swapRouter != address(0) && stable != address(0)) {
            _approve(swapRouter, amount);
            paid = IStopSwap(swapRouter).swapTo(address(token), stable, amount, safe);
            _approve(swapRouter, 0);
            payoutToken = stable;
        } else {
            _transfer(safe, amount);
        }

        emit StopExecuted(armId_, price, originBlock, safe, payoutToken, paid);
    }

    function coverDebt() external {
        _coverDebt();
    }

    function _arm(uint256 stopPrice_, address safe_, uint256 minOriginBlock_, address stable_, address swapRouter_)
        internal
        returns (uint256 newArmId)
    {
        if (stopPrice_ == 0 || safe_ == address(0)) revert InvalidStop();
        if ((stable_ == address(0)) != (swapRouter_ == address(0))) revert InvalidStop();
        if (token.balanceOf(address(this)) == 0) revert NoDeposit();

        armId += 1;
        newArmId = armId;
        stopPrice = stopPrice_;
        safe = safe_;
        minOriginBlock = minOriginBlock_;
        lastSeenOriginBlock = 0;
        stable = stable_;
        swapRouter = swapRouter_;
        armed = true;
        emit Armed(newArmId, stopPrice_, safe_, minOriginBlock_);
    }

    function _transfer(address to, uint256 amount) internal {
        if (!token.transfer(to, amount)) revert TokenTransferFailed();
    }

    function _transferFrom(address from, address to, uint256 amount) internal {
        if (!token.transferFrom(from, to, amount)) revert TokenTransferFailed();
    }

    function _approve(address spender, uint256 amount) internal {
        if (!token.approve(spender, amount)) revert TokenApproveFailed();
    }
}
