// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {Owned} from "../../src/Owned.sol";
import {SifiReactive} from "../../src/sifi/SifiReactive.sol";
import {FeedEvents} from "../../src/sifi/FeedEvents.sol";
import {DemoAggregator} from "../../src/sifi/DemoAggregator.sol";
import {SifiBase} from "./SifiBase.sol";

contract SifiReactiveTest is SifiBase {
    function _live(uint256 id) internal view returns (bool live) {
        (,, live,,,,,) = reactive.watches(id);
    }

    function _high(uint256 id) internal view returns (uint256 high) {
        (,,,,,,, high) = reactive.watches(id);
    }

    function _feedSubscribed(address feed) internal view returns (bool s) {
        (, s,,,,) = reactive.feeds(feed);
    }

    function test_setVaultSubscribesToConfigEvents() public view {
        assertTrue(_subActive(address(vault), FeedEvents.POSITION_ARMED));
        assertTrue(_subActive(address(vault), FeedEvents.POSITION_DISARMED));
        // idle feeds are not subscribed
        assertFalse(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
    }

    function test_setVaultMovesSubscription() public {
        address other = makeAddr("otherVault");
        vm.prank(user);
        reactive.setVault(other, 500_000);
        assertFalse(_subActive(address(vault), FeedEvents.POSITION_ARMED));
        assertTrue(_subActive(other, FeedEvents.POSITION_ARMED));
        assertEq(reactive.callbackGasLimit(), 500_000);
    }

    function test_ownerOnlyAdmin() public {
        vm.startPrank(stranger);
        vm.expectRevert(Owned.NotOwner.selector);
        reactive.setVault(stranger, 1_000_000);
        vm.expectRevert(Owned.NotOwner.selector);
        reactive.allowFeed(stranger, true);
        vm.stopPrank();
        vm.prank(user);
        vm.expectRevert(SifiReactive.GasLimitTooLow.selector);
        reactive.setVault(address(vault), 99_999);
    }

    function test_reactOnlySystem() public {
        IReactive.LogRecord memory r;
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, stranger, SYSTEM));
        reactive.react(r);
    }

    function test_armSubscribesFeedAndDisarmUnsubscribes() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        assertTrue(_live(id));
        assertTrue(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));

        vm.recordLogs();
        vm.prank(user);
        vault.cancel(id);
        _relayVault();
        assertFalse(_live(id));
        assertFalse(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
        assertFalse(_feedSubscribed(address(ethFeed)));
    }

    function test_fixedFiresAtOrBelowStop() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tick(ethFeed, 1_950e8);
        assertEq(sys.callbackCount(), 0);
        _tick(ethFeed, 1_900e8); // equality fires
        assertEq(sys.callbackCount(), 1);
        assertFalse(_live(id));
        // self-paused after the last watch fired
        assertFalse(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
    }

    function test_trailingRatchetsThenFires() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armTrailing(id, 500, 2_000e8); // 5%
        assertEq(reactive.stopLevel(id), 1_900e8);
        _tick(ethFeed, 2_100e8);
        assertEq(_high(id), 2_100e8);
        assertEq(reactive.stopLevel(id), 1_995e8);
        _tick(ethFeed, 2_050e8); // dip, high holds
        assertEq(_high(id), 2_100e8);
        _tick(ethFeed, 1_996e8);
        assertEq(sys.callbackCount(), 0);
        _tick(ethFeed, 1_995e8);
        assertEq(sys.callbackCount(), 1);
    }

    function test_trailingZeroAnchorUsesFirstPrice() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armTrailing(id, 1_000, 0);
        _tick(ethFeed, 1_681e8);
        assertEq(_high(id), 1_681e8);
        assertEq(sys.callbackCount(), 0);
    }

    function test_priceGapFiresWithActualPrice() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armTrailing(id, 500, 2_000e8);
        _tick(ethFeed, 1_200e8); // gap far through the stop
        assertEq(sys.callbackCount(), 1);
        (bool ok,) = _deliver(0);
        assertTrue(ok);
        assertEq(weth.balanceOf(safe), 1 ether);
        assertEq(id, 1);
    }

    function test_duplicateAndOldRoundsIgnored() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armTrailing(id, 500, 2_000e8);
        _tickRaw(address(ethFeed), 2_200e8, 10, block.timestamp);
        _tickRaw(address(ethFeed), 2_200e8, 10, block.timestamp); // duplicate
        _tickRaw(address(ethFeed), 1_000e8, 9, block.timestamp); // older round, would fire
        assertEq(sys.callbackCount(), 0);
        assertEq(_high(id), 2_200e8);
    }

    function test_zeroAndNegativeAnswersIgnored() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tickRaw(address(ethFeed), 0, 1, block.timestamp);
        _tickRaw(address(ethFeed), -5, 2, block.timestamp);
        assertEq(sys.callbackCount(), 0);
        assertTrue(_live(id));
    }

    function test_priceFromBeforeArmIgnored() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _tickRaw(address(ethFeed), 1_000e8, 1, block.timestamp - 1);
        assertEq(sys.callbackCount(), 0);
    }

    function test_wrongChainOrEmitterIgnored() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);

        bytes32[] memory topics = new bytes32[](3);
        topics[0] = bytes32(FeedEvents.ANSWER_UPDATED);
        topics[1] = bytes32(uint256(1_000e8));
        topics[2] = bytes32(uint256(1));
        IReactive.LogRecord memory r = _record(address(ethFeed), topics, abi.encode(block.timestamp), 1);
        r.chainId = 11155111;
        _react(r);
        r.chainId = CHAIN;
        r.contractAddress = makeAddr("impostor");
        _react(r);
        r.contractAddress = address(ethFeed);
        r.opCode = 2; // wrong topic count
        _react(r);
        assertEq(sys.callbackCount(), 0);
        assertTrue(_live(id));
    }

    function test_forgedVaultEventFromOtherEmitterIgnored() public {
        bytes32[] memory topics = new bytes32[](4);
        topics[0] = bytes32(FeedEvents.POSITION_ARMED);
        topics[1] = bytes32(uint256(7));
        topics[2] = bytes32(uint256(1));
        topics[3] = bytes32(uint256(uint160(address(ethFeed))));
        bytes memory data = abi.encode(uint8(1), uint256(1e30), uint16(0), uint256(0), uint64(block.timestamp));
        _react(_record(makeAddr("fakeVault"), topics, data, 1));
        assertFalse(_live(7));
    }

    function test_unallowedFeedRejected() public {
        DemoAggregator rogue = new DemoAggregator(8, "ROGUE");
        vm.prank(user);
        uint256 id = vault.open(address(weth), 1 ether, address(rogue), 8, safe);
        _armFixed(id, 1_900e8);
        assertFalse(_live(id));
        assertFalse(_subActive(address(rogue), FeedEvents.ANSWER_UPDATED));
    }

    function test_rearmReplacesWatchAndStaleNonceIgnored() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _armTrailing(id, 1_000, 2_000e8); // nonce 2 replaces nonce 1
        assertEq(reactive.stopLevel(id), 1_800e8);
        assertEq(reactive.watchList(address(ethFeed)).length, 1);
        _tick(ethFeed, 1_850e8); // would hit the old fixed stop only
        assertEq(sys.callbackCount(), 0);
        assertTrue(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
    }

    function test_disarmForOldNonceIgnored() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armFixed(id, 1_900e8);
        _armFixed(id, 1_800e8);
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = bytes32(FeedEvents.POSITION_DISARMED);
        topics[1] = bytes32(id);
        topics[2] = bytes32(uint256(1));
        _react(_record(address(vault), topics, "", 1));
        assertTrue(_live(id));
    }

    function test_oneTickFiresSeveralPositions() public {
        uint256 a = _open(weth, 1 ether, ethFeed);
        uint256 b = _open(weth, 2 ether, ethFeed);
        uint256 c = _open(weth, 3 ether, ethFeed);
        _armFixed(a, 1_900e8);
        _armTrailing(b, 500, 2_000e8);
        _armFixed(c, 1_500e8);
        _tick(ethFeed, 1_880e8);
        assertEq(sys.callbackCount(), 2);
        assertFalse(_live(a));
        assertFalse(_live(b));
        assertTrue(_live(c));
        assertTrue(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
    }

    function test_feedsAreIndependent() public {
        uint256 e = _open(weth, 1 ether, ethFeed);
        uint256 b = _open(wbtc, 1e8, btcFeed);
        _armFixed(e, 1_900e8);
        _armFixed(b, 50_000e8);
        _tick(btcFeed, 1_000e8); // BTC feed tick below the ETH stop must not touch ETH
        assertEq(sys.callbackCount(), 1);
        assertTrue(_live(e));
        assertFalse(_live(b));
        assertTrue(_subActive(address(ethFeed), FeedEvents.ANSWER_UPDATED));
        assertFalse(_subActive(address(btcFeed), FeedEvents.ANSWER_UPDATED));
    }

    function test_watchCapPerFeed() public {
        uint16 cap = reactive.MAX_WATCHES_PER_FEED();
        for (uint256 i; i < cap; ++i) {
            _armFixed(_open(weth, 1, ethFeed), 1_900e8);
        }
        uint256 extra = _open(weth, 1, ethFeed);
        _armFixed(extra, 1_900e8);
        assertFalse(_live(extra));
        assertEq(reactive.watchList(address(ethFeed)).length, cap);
    }

    function test_cannotDisallowBusyFeed() public {
        _armFixed(_open(weth, 1 ether, ethFeed), 1_900e8);
        vm.prank(user);
        vm.expectRevert(SifiReactive.FeedBusy.selector);
        reactive.allowFeed(address(ethFeed), false);
    }

    function test_callbackPayloadShape() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        _armTrailing(id, 500, 2_000e8);
        _tick(ethFeed, 1_800e8);
        ISystemContract.CallbackConfiguration_V_1_0 memory cb = sys.callbackAt(0);
        bytes memory payload = cb.payload;
        assertEq(cb.chainId, CHAIN);
        assertEq(cb.recipient, address(vault));
        assertEq(cb.gasLimit, 1_000_000);
        bytes memory args = new bytes(payload.length - 4);
        for (uint256 i; i < args.length; ++i) args[i] = payload[i + 4];
        (address injected, uint256 pid, uint64 nonce, uint256 price, uint256 high,) =
            abi.decode(args, (address, uint256, uint64, uint256, uint256, uint256));
        assertEq(injected, address(0));
        assertEq(pid, id);
        assertEq(nonce, 1);
        assertEq(price, 1_800e8);
        assertEq(high, 2_000e8);
    }

    function test_gasForTypicalTick() public {
        for (uint256 i; i < 3; ++i) _armTrailing(_open(weth, 1 ether, ethFeed), 500, 2_000e8);
        uint256 g = gasleft();
        _tick(ethFeed, 2_100e8);
        uint256 used = g - gasleft();
        emit log_named_uint("react gas, 3 trailing watches, new high", used);
        assertLt(used, 900_000);
    }

    function test_gasWorstCaseFullFeedAllFire() public {
        uint16 cap = reactive.MAX_WATCHES_PER_FEED();
        for (uint256 i; i < cap; ++i) _armTrailing(_open(weth, 1 ether, ethFeed), 500, 2_000e8);
        sys.setLight(true);
        uint256 g = gasleft();
        _tick(ethFeed, 1_000e8);
        uint256 used = g - gasleft();
        emit log_named_uint("react gas, full feed, every watch fires", used);
        assertEq(sys.lightCount(), cap);
        assertLt(used, 900_000);
    }
}
