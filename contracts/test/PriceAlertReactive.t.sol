// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {PriceAlertReactive} from "../src/PriceAlertReactive.sol";
import {PriceAlertCallback} from "../src/PriceAlertCallback.sol";
import {Owned} from "../src/Owned.sol";
import {MockSystem} from "./mocks/MockSystem.sol";

contract PriceAlertReactiveTest is Test {
    address internal constant SYSTEM = 0x8888888888888888888888888888888888888888;
    uint256 internal constant REACTIVE_IGNORE =
        0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
    uint256 internal constant TOPIC0 = uint256(keccak256("PriceReported(bytes32,uint256)"));
    bytes32 internal constant CALLBACK_EVENT = keccak256("Callback(uint256,address,uint64,bytes)");
    bytes32 internal constant ALERT_REQUESTED = keccak256("AlertRequested(bytes32,uint256,uint256)");
    uint256 internal constant ORIGIN_CHAIN_ID = 84532;
    uint256 internal constant DESTINATION_CHAIN_ID = 84532;

    address internal origin = makeAddr("origin");
    address internal destination;
    address internal proxy = makeAddr("proxy");
    bytes32 internal asset = bytes32("ETH/USD");
    uint256 internal threshold = 2000 ether;

    PriceAlertReactive internal reactive;
    PriceAlertCallback internal callback;

    function setUp() public {
        vm.etch(SYSTEM, address(new MockSystem()).code);

        reactive = new PriceAlertReactive(
            ORIGIN_CHAIN_ID,
            origin,
            DESTINATION_CHAIN_ID,
            asset,
            threshold,
            true
        );

        callback = new PriceAlertCallback(IPayable(payable(proxy)), address(reactive));
        destination = address(callback);

        vm.prank(reactive.owner());
        reactive.setCallbackRecipient(destination, 1_000_000);
    }

    function _log(bytes32 reportedAsset, uint256 price) internal view returns (IReactive.LogRecord memory log) {
        log = _logOn(ORIGIN_CHAIN_ID, origin, TOPIC0, 2, reportedAsset, price);
    }

    function _logOn(
        uint256 chainId,
        address contractAddress,
        uint256 topic0,
        uint256 opCode,
        bytes32 reportedAsset,
        uint256 price
    ) internal pure returns (IReactive.LogRecord memory log) {
        log = IReactive.LogRecord({
            chainId: chainId,
            contractAddress: contractAddress,
            topic0: topic0,
            topic1: uint256(reportedAsset),
            topic2: 0,
            topic3: 0,
            data: abi.encode(price),
            blockNumber: 1,
            opCode: opCode,
            blockHash: 0,
            txHash: 0,
            logIndex: 0
        });
    }

    function _system() internal pure returns (MockSystem) {
        return MockSystem(payable(SYSTEM));
    }

    function _callbackCount() internal view returns (uint256 count) {
        count = _system().callbackCount();
    }

    function _assertNoCallback(Vm.Log[] memory logs) internal view {
        assertEq(_callbackCount(), 0, "requestCallbackV_1_0 was called");
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != CALLBACK_EVENT, "legacy Callback event was emitted");
            assertTrue(logs[i].topics[0] != ALERT_REQUESTED, "AlertRequested was emitted");
        }
    }

    function test_constructorSubscribesToOriginAndWiresDestination() public {
        MockSystem sys = _system();
        (
            uint256 chainId,
            address contractAddress,
            uint256 topic0,
            uint256 topic1,
            uint256 topic2,
            uint256 topic3
        ) = sys.lastSubscribe();

        assertEq(sys.subscribeCount(), 1);
        assertEq(chainId, ORIGIN_CHAIN_ID);
        assertEq(contractAddress, origin);
        assertEq(topic0, TOPIC0);
        assertEq(topic1, REACTIVE_IGNORE);
        assertEq(topic2, REACTIVE_IGNORE);
        assertEq(topic3, REACTIVE_IGNORE);

        assertEq(reactive.originChainId(), ORIGIN_CHAIN_ID);
        assertEq(reactive.originContract(), origin);
        assertEq(reactive.destinationChainId(), DESTINATION_CHAIN_ID);
        assertEq(reactive.callbackRecipient(), destination);
        assertEq(reactive.callbackGasLimit(), 1_000_000);
    }

    function test_constructorSubscribeCallMatchesExpectCall() public {
        address otherOrigin = makeAddr("origin2");
        vm.expectCall(
            SYSTEM,
            abi.encodeWithSignature(
                "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
                ORIGIN_CHAIN_ID,
                otherOrigin,
                TOPIC0,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE,
                REACTIVE_IGNORE
            )
        );
        new PriceAlertReactive(
            ORIGIN_CHAIN_ID,
            otherOrigin,
            11155111,
            asset,
            threshold,
            true
        );
    }

    function test_reactRequestsCallbackWhenPriceCrossesUp() public {
        uint256 price = 2100 ether;
        bytes memory payload = abi.encodeWithSignature(
            "onAlert(address,bytes32,uint256,uint256)",
            address(0),
            asset,
            price,
            threshold
        );

        vm.expectCall(
            SYSTEM,
            abi.encodeCall(
                ISystemContract.requestCallbackV_1_0,
                (
                    ISystemContract.CallbackConfiguration_V_1_0({
                        chainId: DESTINATION_CHAIN_ID,
                        recipient: destination,
                        gasLimit: 1_000_000,
                        payload: payload
                    })
                )
            )
        );

        vm.prank(SYSTEM);
        reactive.react(_log(asset, price));

        MockSystem sys = _system();
        assertEq(sys.callbackCount(), 1);
        assertFalse(reactive.armed());

        (uint256 chainId, address recipient, uint64 gasLimit, bytes memory got) = sys.lastCallback();
        assertEq(chainId, DESTINATION_CHAIN_ID);
        assertEq(recipient, destination);
        assertEq(gasLimit, 1_000_000);
        assertEq(got, payload);
    }

    function test_crossingDeliversToDestinationThroughProxy() public {
        uint256 price = 2100 ether;

        vm.prank(SYSTEM);
        reactive.react(_log(asset, price));

        (uint256 chainId, address recipient, uint64 gasLimit, bytes memory payload) = _system().lastCallback();
        assertEq(chainId, DESTINATION_CHAIN_ID);
        assertEq(recipient, destination);
        assertEq(gasLimit, 1_000_000);

        // Omni injects the reactive contract address into the first argument, not a separate RVM id.
        bytes memory delivered = payload;
        bytes20 injected = bytes20(address(reactive));
        for (uint256 i; i < 20; ++i) {
            delivered[16 + i] = injected[i];
        }

        vm.prank(proxy);
        (bool ok,) = destination.call(delivered);
        assertTrue(ok);

        (bytes32 storedAsset, uint256 storedPrice, uint256 storedThreshold,) = callback.lastAlert();
        assertEq(storedAsset, asset);
        assertEq(storedPrice, price);
        assertEq(storedThreshold, threshold);
        assertEq(callback.alertCount(), 1);
    }

    function test_reactDoesNothingBelowThreshold() public {
        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(asset, 1999 ether));
        _assertNoCallback(vm.getRecordedLogs());
        assertTrue(reactive.armed());
    }

    function test_reactFiresWhenPriceEqualsThresholdAbove() public {
        // above=true: price >= threshold fires, so equality is a crossing.
        vm.prank(SYSTEM);
        reactive.react(_log(asset, threshold));
        assertEq(_callbackCount(), 1);
        assertFalse(reactive.armed());
    }

    function test_reactFiresWhenPriceEqualsThresholdBelow() public {
        vm.prank(reactive.owner());
        reactive.setThreshold(asset, threshold, false);

        vm.prank(SYSTEM);
        reactive.react(_log(asset, threshold));
        assertEq(_callbackCount(), 1);
        assertFalse(reactive.armed());
    }

    function test_reactCrossesDownAndIgnoresPricesAboveThreshold() public {
        vm.prank(reactive.owner());
        reactive.setThreshold(asset, threshold, false);

        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(asset, 2001 ether));
        _assertNoCallback(vm.getRecordedLogs());
        assertTrue(reactive.armed());

        vm.prank(SYSTEM);
        reactive.react(_log(asset, 1999 ether));
        assertEq(_callbackCount(), 1);
        assertFalse(reactive.armed());
    }

    function test_reactDisarmsSoRapidEventsDoNotDuplicate() public {
        vm.prank(SYSTEM);
        reactive.react(_log(asset, 2100 ether));

        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(asset, 2200 ether));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(_callbackCount(), 1);
        assertFalse(reactive.armed());
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != CALLBACK_EVENT);
            assertTrue(logs[i].topics[0] != ALERT_REQUESTED);
        }

        vm.prank(reactive.owner());
        reactive.rearm();

        vm.prank(SYSTEM);
        reactive.react(_log(asset, 2300 ether));
        assertEq(_callbackCount(), 2);
        assertFalse(reactive.armed());
    }

    function test_reactIgnoresWrongChainContractOrTopic() public {
        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_logOn(11155111, origin, TOPIC0, 2, asset, 2100 ether));
        _assertNoCallback(vm.getRecordedLogs());

        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_logOn(ORIGIN_CHAIN_ID, makeAddr("other"), TOPIC0, 2, asset, 2100 ether));
        _assertNoCallback(vm.getRecordedLogs());

        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_logOn(ORIGIN_CHAIN_ID, origin, uint256(keccak256("Swap()")), 2, asset, 2100 ether));
        _assertNoCallback(vm.getRecordedLogs());

        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_logOn(ORIGIN_CHAIN_ID, origin, TOPIC0, 3, asset, 2100 ether));
        _assertNoCallback(vm.getRecordedLogs());

        assertTrue(reactive.armed());
    }

    function test_reactDoesNothingForOtherAsset() public {
        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(bytes32("BTC/USD"), 3000 ether));
        _assertNoCallback(vm.getRecordedLogs());
        assertTrue(reactive.armed());
    }

    function test_reactRevertsForCallerOtherThanSystem() public {
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), SYSTEM));
        reactive.react(_log(asset, 2100 ether));
    }

    function test_setCallbackRecipientOnlyOwner() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert(Owned.NotOwner.selector);
        reactive.setCallbackRecipient(destination, 1_000_000);
    }
}
