// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {SifiVault} from "../../src/sifi/SifiVault.sol";
import {SifiReactive} from "../../src/sifi/SifiReactive.sol";
import {DemoAggregator} from "../../src/sifi/DemoAggregator.sol";
import {FeedEvents} from "../../src/sifi/FeedEvents.sol";
import {MockToken} from "../../src/sifi/mocks/MockToken.sol";
import {MockSwapAdapter} from "../../src/sifi/mocks/MockSwapAdapter.sol";
import {SifiMockSystem} from "../mocks/SifiMockSystem.sol";

/// @dev Shared fixture: vault + watcher + two demo feeds, with helpers that play
/// the Reactive Network's part (relay logs into react(), deliver callbacks).
abstract contract SifiBase is Test {
    address internal constant SYSTEM = 0x8888888888888888888888888888888888888888;
    uint256 internal constant CHAIN = 84532;
    uint256 internal constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;

    address internal user = makeAddr("user");
    address internal safe = makeAddr("safe");
    address internal proxy = makeAddr("proxy");
    address internal stranger = makeAddr("stranger");

    SifiMockSystem internal sys;
    SifiVault internal vault;
    SifiReactive internal reactive;
    DemoAggregator internal ethFeed;
    DemoAggregator internal btcFeed;
    MockToken internal weth;
    MockToken internal wbtc;
    MockToken internal usdc;
    MockSwapAdapter internal adapter;

    uint256 internal round;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        vm.etch(SYSTEM, address(new SifiMockSystem()).code);
        sys = SifiMockSystem(payable(SYSTEM));

        weth = new MockToken("Wrapped Ether", "WETH", 18);
        wbtc = new MockToken("Wrapped BTC", "WBTC", 8);
        usdc = new MockToken("USD Coin", "USDC", 6);
        adapter = new MockSwapAdapter(2_000e6); // 1 WETH -> 2000 USDC
        usdc.mint(address(adapter), 10_000_000e6);

        vm.startPrank(user);
        ethFeed = new DemoAggregator(8, "ETH / USD");
        btcFeed = new DemoAggregator(8, "BTC / USD");
        reactive = new SifiReactive(CHAIN, CHAIN);
        vault = new SifiVault(IPayable(payable(proxy)), address(reactive));
        reactive.allowFeed(address(ethFeed), true);
        reactive.allowFeed(address(btcFeed), true);
        reactive.setVault(address(vault), 1_000_000);
        vm.stopPrank();

        weth.mint(user, 1_000 ether);
        wbtc.mint(user, 100e8);
        vm.startPrank(user);
        weth.approve(address(vault), type(uint256).max);
        wbtc.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    // ---------- fixture helpers ----------

    function _open(MockToken token, uint256 amount, DemoAggregator feed) internal returns (uint256 id) {
        vm.prank(user);
        id = vault.open(address(token), amount, address(feed), 8, safe);
    }

    /// @dev Runs an owner call on the vault and relays its config events to the watcher.
    function _armTrailing(uint256 id, uint16 trailBps, uint256 anchor) internal {
        vm.recordLogs();
        vm.prank(user);
        vault.armTrailing(id, trailBps, anchor, address(0), address(0), 0);
        _relayVault();
    }

    function _armFixed(uint256 id, uint256 stop) internal {
        vm.recordLogs();
        vm.prank(user);
        vault.armFixed(id, stop, address(0), address(0), 0);
        _relayVault();
    }

    function _relayVault() internal {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter != address(vault)) continue;
            uint256 t0 = uint256(logs[i].topics[0]);
            if (t0 != FeedEvents.POSITION_ARMED && t0 != FeedEvents.POSITION_DISARMED) continue;
            _react(_record(address(vault), logs[i].topics, logs[i].data, block.number));
        }
    }

    /// @dev Simulates a Chainlink AnswerUpdated log reaching the watcher.
    function _tick(DemoAggregator feed, int256 answer) internal {
        round += 1;
        _tickRaw(address(feed), answer, round, block.timestamp);
    }

    function _tickRaw(address feed, int256 answer, uint256 roundId, uint256 updatedAt) internal {
        bytes32[] memory topics = new bytes32[](3);
        topics[0] = bytes32(FeedEvents.ANSWER_UPDATED);
        topics[1] = bytes32(uint256(answer));
        topics[2] = bytes32(roundId);
        _react(_record(feed, topics, abi.encode(updatedAt), block.number));
    }

    function _record(address emitter, bytes32[] memory topics, bytes memory data, uint256 blockNumber)
        internal
        pure
        returns (IReactive.LogRecord memory r)
    {
        r.chainId = CHAIN;
        r.contractAddress = emitter;
        r.topic0 = uint256(topics[0]);
        if (topics.length > 1) r.topic1 = uint256(topics[1]);
        if (topics.length > 2) r.topic2 = uint256(topics[2]);
        if (topics.length > 3) r.topic3 = uint256(topics[3]);
        r.data = data;
        r.blockNumber = blockNumber;
        r.opCode = topics.length;
    }

    function _react(IReactive.LogRecord memory r) internal {
        vm.prank(SYSTEM);
        reactive.react(r);
    }

    /// @dev Delivers queued callback `i` the way the callback proxy does: the first
    /// argument is overwritten with the requesting reactive contract.
    function _deliver(uint256 i) internal returns (bool ok, bytes memory ret) {
        ISystemContract.CallbackConfiguration_V_1_0 memory cb = sys.callbackAt(i);
        bytes memory payload = _inject(cb.payload, address(reactive));
        vm.prank(proxy);
        (ok, ret) = cb.recipient.call(payload);
    }

    function _inject(bytes memory payload, address sender) internal pure returns (bytes memory out) {
        out = payload;
        assembly {
            mstore(add(out, 36), sender)
        }
    }

    function _subActive(address target, uint256 topic0) internal view returns (bool) {
        return sys.active(sys.key(CHAIN, target, topic0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE)) == 1;
    }

    function _status(uint256 id) internal view returns (SifiVault.Status) {
        return vault.position(id).status;
    }
}
