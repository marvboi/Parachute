// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {PriceAlertCallback} from "../src/PriceAlertCallback.sol";

contract PriceAlertCallbackTest is Test {
    address internal proxy = makeAddr("proxy");
    address internal reactive = makeAddr("reactive");
    bytes32 internal asset = bytes32("ETH/USD");

    PriceAlertCallback internal callback;

    function setUp() public {
        callback = new PriceAlertCallback(IPayable(payable(proxy)), reactive);
    }

    function test_onAlertRecordsFromAuthorizedProxyAndSender() public {
        vm.prank(proxy);
        callback.onAlert(reactive, asset, 2100 ether, 2000 ether);

        (bytes32 storedAsset, uint256 price, uint256 threshold, uint256 triggeredAt) = callback.lastAlert();
        assertEq(storedAsset, asset);
        assertEq(price, 2100 ether);
        assertEq(threshold, 2000 ether);
        assertEq(triggeredAt, block.timestamp);
        assertEq(callback.alertCount(), 1);
    }

    function test_onAlertRevertsIfCallerIsNotProxy() public {
        vm.expectRevert(
            abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), proxy)
        );
        callback.onAlert(reactive, asset, 2100 ether, 2000 ether);
    }

    function test_onAlertRevertsIfStrangerCallsWithReactiveAddress() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(
            abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, makeAddr("stranger"), proxy)
        );
        callback.onAlert(reactive, asset, 2100 ether, 2000 ether);
    }

    function test_onAlertRevertsIfInjectedSenderDoesNotMatch() public {
        address other = makeAddr("otherReactive");
        vm.prank(proxy);
        vm.expectRevert(
            abi.encodeWithSelector(AbstractCallback.CallbackNotAuthorized.selector, other, reactive)
        );
        callback.onAlert(other, asset, 2100 ether, 2000 ether);
    }
}
