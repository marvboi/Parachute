// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {SifiVault} from "../../src/sifi/SifiVault.sol";
import {SifiReactive} from "../../src/sifi/SifiReactive.sol";
import {DemoAggregator} from "../../src/sifi/DemoAggregator.sol";
import {FeedEvents} from "../../src/sifi/FeedEvents.sol";
import {MockToken} from "../../src/sifi/mocks/MockToken.sol";
import {MockSwapAdapter} from "../../src/sifi/mocks/MockSwapAdapter.sol";
import {SifiMockSystem} from "../../test/mocks/SifiMockSystem.sol";

/// @dev Local Anvil walkthrough of the multi-position vault with fixed and trailing
/// stops. The Reactive hop is simulated: this script relays logs into react() as the
/// system contract and delivers callbacks as the proxy. Prices come from DEMO feeds.
contract LocalSifiDemo is Script {
    address internal constant SYSTEM = 0x8888888888888888888888888888888888888888;
    address internal constant PROXY = address(0xbCBc00000000000000000000000000000000cBCb);
    address internal constant ANVIL0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address internal constant SAFE = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    address internal deployer;
    SifiVault internal vault;
    SifiReactive internal reactive;
    DemoAggregator internal ethFeed;
    DemoAggregator internal btcFeed;
    MockToken internal weth;
    MockToken internal wbtc;
    MockToken internal usdc;
    MockSwapAdapter internal adapter;
    uint256 internal delivered;

    /// @notice Phase 1: deploy, open three positions, arm them.
    function run() external {
        console.log("=================================================");
        console.log("LOCAL PARACHUTE DEMO - simulated Reactive hop, DEMO feeds");
        console.log("phase 1: deploy and arm");
        console.log("=================================================");
        deployer = msg.sender == address(0) ? ANVIL0 : msg.sender;

        _etchSystem();
        _deploy();
        _openPositions();
    }

    /// @notice Phase 2: price ticks, stops fire, owner withdraws. Run as a separate
    /// script call so its simulated timestamps start after phase 1 was mined.
    function ticks(
        SifiVault vault_,
        SifiReactive reactive_,
        DemoAggregator ethFeed_,
        DemoAggregator btcFeed_,
        MockToken weth_,
        MockToken wbtc_,
        MockToken usdc_
    ) external {
        console.log("=================================================");
        console.log("phase 2: price ticks (DEMO feeds)");
        console.log("=================================================");
        deployer = msg.sender == address(0) ? ANVIL0 : msg.sender;
        vault = vault_;
        reactive = reactive_;
        ethFeed = ethFeed_;
        btcFeed = btcFeed_;
        weth = weth_;
        wbtc = wbtc_;
        usdc = usdc_;
        delivered = SifiMockSystem(payable(SYSTEM)).callbackCount();

        _step("ETH 2000", ethFeed, 2_000e8);
        _step("ETH 2100 (new high)", ethFeed, 2_100e8);
        _step("ETH 2180 (new high, trail stop 2071)", ethFeed, 2_180e8);
        _step("BTC 59800", btcFeed, 59_800e8);
        _step("ETH 2120 (dip, holds)", ethFeed, 2_120e8);
        _step("ETH 2069 (through the trail)", ethFeed, 2_069e8);
        _step("BTC 57500 (above fixed stop)", btcFeed, 57_500e8);
        _step("BTC 56900 (through fixed stop)", btcFeed, 56_900e8);
        _step("ETH 1990 (position 1 already closed)", ethFeed, 1_990e8);

        _summary();
        _cancelAndWithdraw();

        console.log("=================================================");
        console.log("LOCAL PARACHUTE DEMO complete (simulated).");
        console.log("=================================================");
    }

    function _etchSystem() internal {
        vm.startBroadcast(deployer);
        SifiMockSystem template = new SifiMockSystem();
        vm.stopBroadcast();
        vm.etch(SYSTEM, address(template).code);
        _rpc("anvil_setCode", string.concat("[\"", vm.toString(SYSTEM), "\",\"", vm.toString(address(template).code), "\"]"));
        _rpc("anvil_setBalance", string.concat("[\"", vm.toString(SYSTEM), "\",\"0x56BC75E2D63100000\"]"));
        _rpc("anvil_setBalance", string.concat("[\"", vm.toString(PROXY), "\",\"0x56BC75E2D63100000\"]"));
        _rpc("anvil_impersonateAccount", string.concat("[\"", vm.toString(SYSTEM), "\"]"));
        _rpc("anvil_impersonateAccount", string.concat("[\"", vm.toString(PROXY), "\"]"));
    }

    function _deploy() internal {
        uint256 chainId = block.chainid;
        vm.startBroadcast(deployer);
        weth = new MockToken("Wrapped Ether", "WETH", 18);
        wbtc = new MockToken("Wrapped BTC", "WBTC", 8);
        usdc = new MockToken("USD Coin", "USDC", 6);
        adapter = new MockSwapAdapter(2_060e6);
        ethFeed = new DemoAggregator(8, "ETH / USD");
        btcFeed = new DemoAggregator(8, "BTC / USD");
        reactive = new SifiReactive(chainId, chainId);
        vault = new SifiVault(IPayable(payable(PROXY)), address(reactive));
        reactive.allowFeed(address(ethFeed), true);
        reactive.allowFeed(address(btcFeed), true);
        reactive.setVault(address(vault), 1_000_000);
        usdc.mint(address(adapter), 1_000_000e6);
        weth.mint(deployer, 10 ether);
        wbtc.mint(deployer, 2e8);
        weth.approve(address(vault), type(uint256).max);
        wbtc.approve(address(vault), type(uint256).max);
        vm.stopBroadcast();

        console.log("SifiReactive  ", address(reactive));
        console.log("SifiVault     ", address(vault));
        console.log("DEMO ETH feed ", address(ethFeed));
        console.log("DEMO BTC feed ", address(btcFeed));
        console.log("WETH / WBTC / USDC", address(weth), address(wbtc), address(usdc));
        console.log("safe          ", SAFE);
        console.log("PHASE2_ARGS", string.concat(
            vm.toString(address(vault)), " ", vm.toString(address(reactive)), " ",
            vm.toString(address(ethFeed)), " ", vm.toString(address(btcFeed)), " ",
            vm.toString(address(weth)), " ", vm.toString(address(wbtc)), " ", vm.toString(address(usdc))
        ));
    }

    function _openPositions() internal {
        vm.recordLogs();
        vm.startBroadcast(deployer);
        uint256 p1 = vault.open(address(weth), 2 ether, address(ethFeed), 8, SAFE);
        vault.armTrailing(p1, 500, 0, address(usdc), address(adapter), 200);
        uint256 p2 = vault.open(address(wbtc), 0.5e8, address(btcFeed), 8, SAFE);
        vault.armFixed(p2, 57_000e8, address(0), address(0), 0);
        uint256 p3 = vault.open(address(weth), 1 ether, address(ethFeed), 8, SAFE);
        vault.armFixed(p3, 1_500e8, address(0), address(0), 0);
        vm.stopBroadcast();
        console.log("-------------------------------------------------");
        console.log("open #1  2 WETH   trailing 5%, swap to USDC, 2% max slippage");
        console.log("open #2  0.5 WBTC fixed stop 57,000");
        console.log("open #3  1 WETH   fixed stop 1,500");
        _pump();
    }

    function _step(string memory label, DemoAggregator feed, int256 answer) internal {
        console.log("-------------------------------------------------");
        console.log("tick:", label);
        vm.recordLogs();
        vm.startBroadcast(deployer);
        feed.push(answer);
        vm.stopBroadcast();
        _pump();
    }

    /// @dev Relays vault config events and feed ticks into react(), then delivers callbacks.
    function _pump() internal {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i; i < logs.length; ++i) {
            Vm.Log memory l = logs[i];
            uint256 t0 = uint256(l.topics[0]);
            bool fromVault = l.emitter == address(vault)
                && (t0 == FeedEvents.POSITION_ARMED || t0 == FeedEvents.POSITION_DISARMED);
            bool fromFeed = (l.emitter == address(ethFeed) || l.emitter == address(btcFeed))
                && t0 == FeedEvents.ANSWER_UPDATED;
            if (!fromVault && !fromFeed) continue;
            vm.recordLogs();
            vm.startBroadcast(SYSTEM);
            reactive.react(_record(l));
            vm.stopBroadcast();
            _logReactive(vm.getRecordedLogs());
        }
        _deliverNew();
    }

    function _deliverNew() internal {
        SifiMockSystem sys = SifiMockSystem(payable(SYSTEM));
        uint256 n = sys.callbackCount();
        for (; delivered < n; ++delivered) {
            ISystemContract.CallbackConfiguration_V_1_0 memory cb = sys.callbackAt(delivered);
            bytes memory payload = cb.payload;
            address r = address(reactive);
            assembly {
                mstore(add(payload, 36), r)
            }
            vm.startBroadcast(PROXY);
            (bool ok, bytes memory err) = cb.recipient.call{gas: cb.gasLimit}(payload);
            vm.stopBroadcast();
            if (!ok) {
                console.log("  callback rejected by vault:");
                console.logBytes(err);
            } else {
                console.log("  callback delivered -> executeStop OK");
            }
        }
    }

    function _record(Vm.Log memory l) internal view returns (IReactive.LogRecord memory r) {
        r.chainId = block.chainid;
        r.contractAddress = l.emitter;
        r.topic0 = uint256(l.topics[0]);
        if (l.topics.length > 1) r.topic1 = uint256(l.topics[1]);
        if (l.topics.length > 2) r.topic2 = uint256(l.topics[2]);
        if (l.topics.length > 3) r.topic3 = uint256(l.topics[3]);
        r.data = l.data;
        r.blockNumber = block.number;
        r.opCode = l.topics.length;
    }

    function _logReactive(Vm.Log[] memory logs) internal pure {
        bytes32 started = keccak256("WatchStarted(uint256,uint64,address,uint8,uint256,uint16,uint256)");
        bytes32 raised = keccak256("HighRaised(uint256,uint256,uint256)");
        bytes32 triggered = keccak256("StopTriggered(uint256,uint64,uint256,uint256,uint256,uint256)");
        bytes32 subscribed = keccak256("FeedSubscribed(address,bool)");
        for (uint256 i; i < logs.length; ++i) {
            bytes32 t0 = logs[i].topics[0];
            if (t0 == started) {
                console.log("  react: watch started for position", uint256(logs[i].topics[1]));
            } else if (t0 == raised) {
                (uint256 high, uint256 level) = abi.decode(logs[i].data, (uint256, uint256));
                console.log("  react: position", uint256(logs[i].topics[1]));
                console.log("         high / trail stop (8 dec)", high, level);
            } else if (t0 == triggered) {
                (uint256 price,, uint256 level,) = abi.decode(logs[i].data, (uint256, uint256, uint256, uint256));
                console.log("  react: STOP TRIGGERED position", uint256(logs[i].topics[1]));
                console.log("         price / stop (8 dec)", price, level);
            } else if (t0 == subscribed) {
                bool on = abi.decode(logs[i].data, (bool));
                console.log(on ? "  react: feed subscribed" : "  react: feed idle, unsubscribed");
            }
        }
    }

    function _summary() internal view {
        console.log("-------------------------------------------------");
        console.log("safe USDC (6 dec)", usdc.balanceOf(SAFE));
        console.log("safe WBTC (8 dec)", wbtc.balanceOf(SAFE));
        console.log("vault WETH left   ", weth.balanceOf(address(vault)));
        require(usdc.balanceOf(SAFE) == 4_120e6, "position 1 payout");
        require(wbtc.balanceOf(SAFE) == 0.5e8, "position 2 payout");
        require(vault.position(3).status == SifiVault.Status.Armed, "position 3 untouched");
    }

    function _cancelAndWithdraw() internal {
        console.log("-------------------------------------------------");
        console.log("owner: cancel #3 and withdraw 1 WETH");
        vm.recordLogs();
        vm.startBroadcast(deployer);
        vault.withdraw(3, 1 ether);
        vm.stopBroadcast();
        _pump();
        require(weth.balanceOf(address(vault)) == 0, "vault not empty");
    }

    function _rpc(string memory method, string memory params) internal {
        vm.rpc(method, params);
    }
}
