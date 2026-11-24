// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

abstract contract ReentrancyGuard {
    uint256 private _status = 1;

    error Reentrancy();

    modifier nonReentrant() {
        if (_status != 1) revert Reentrancy();
        _status = 2;
        _;
        _status = 1;
    }
}
