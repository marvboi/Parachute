// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {PriceReporter} from "../src/PriceReporter.sol";
import {PriceAlertReactive} from "../src/PriceAlertReactive.sol";
import {PriceAlertCallback} from "../src/PriceAlertCallback.sol";
import {MockSystem} from "../test/mocks/MockSystem.sol";

/// @dev Local Anvil walkthrough. This simulates the Reactive hop; it is not
/// the on-chain Lasna loop judges will score.
contract LocalDemo is Script {
    address internal constant SYSTEM = 0x8888888888888888888888888888888888888888;
    address internal constant PROXY = address(0xbCBc00000000000000000000000000000000cBCb);
    address internal constant ANVIL0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    bytes32 internal constant PRICE_REPORTED = keccak256("PriceReported(bytes32,uint256)");
    bytes32 internal constant ALERT_TRIGGERED = keccak256("AlertTriggered(bytes32,uint256,uint256)");
    bytes32 internal constant ALERT_REQUESTED = keccak256("AlertRequested(bytes32,uint256,uint256)");
    bytes32 internal constant CALLBACK_EVENT = keccak256("Callback(uint256,address,uint64,bytes)");

    bytes32 internal constant ASSET = bytes32("ETH/USD");
    uint256 internal constant THRESHOLD = 2000 ether;

    PriceReporter internal reporter;
    PriceAlertReactive internal reactive;
    PriceAlertCallback internal callback;

    function run() external {
        console.log("=================================================");
        console.log("LOCAL DEMO - simulated Reactive hop");
        console.log("Reactive Network cannot watch a local Anvil chain.");
        console.log("This script impersonates the system contract and");
        console.log("the callback proxy. Judging still requires a real");
        console.log("Base Sepolia + Lasna deployment and live loop.");
        console.log("=================================================");

        uint256 chainId = block.chainid;
        address deployer = msg.sender;
        if (deployer == address(0)) deployer = ANVIL0;

        vm.startBroadcast(deployer);
        MockSystem template = new MockSystem();
        vm.stopBroadcast();
        _logTx("deploy MockSystem template");

        _setCode(SYSTEM, address(template).code);
        _setBalance(SYSTEM, 100 ether);
        _setBalance(PROXY, 100 ether);
        _impersonate(SYSTEM);
        _impersonate(PROXY);
        console.log("etched MockSystem at SYSTEM", SYSTEM);
        console.log("callback proxy (impersonated)", PROXY);

        vm.startBroadcast(deployer);
        reporter = new PriceReporter();
        reactive = new PriceAlertReactive(chainId, address(reporter), chainId, ASSET, THRESHOLD, true);
        callback = new PriceAlertCallback(IPayable(payable(PROXY)), address(reactive));
        reactive.setCallbackRecipient(address(callback), 1_000_000);
        vm.stopBroadcast();
        _logTx("deploy origin, reactive, destination, and set recipient");

        console.log("PriceReporter         ", address(reporter));
        console.log("PriceAlertReactive    ", address(reactive));
        console.log("PriceAlertCallback    ", address(callback));
        console.log("origin/destination id ", chainId);
        console.log("threshold             ", THRESHOLD);
        console.log("rule                  ", "above=true; equality counts as a crossing");

        _assertSubscribe(chainId);

        _stepReport("below threshold (1999e18)", 1999 ether, false);
        _stepReport("crossing above (2100e18)", 2100 ether, true);
        _stepReport("rapid follow-up while disarmed (2200e18)", 2200 ether, false);

        vm.startBroadcast(deployer);
        reactive.rearm();
        vm.stopBroadcast();
        _logTx("rearm");
        console.log("armed again:", reactive.armed());

        _stepReport("exact threshold after rearm (2000e18)", THRESHOLD, true);

        console.log("=================================================");
        console.log("LOCAL DEMO complete (simulated).");
        console.log("For submission, run the testnet steps in the README.");
        console.log("=================================================");
    }

    function _stepReport(string memory label, uint256 price, bool expectCallback) internal {
        console.log("-------------------------------------------------");
        console.log("step:", label);

        uint256 callbacksBefore = _system().callbackCount();
        uint256 alertsBefore = callback.alertCount();

        vm.recordLogs();
        vm.startBroadcast(msg.sender == address(0) ? ANVIL0 : msg.sender);
        reporter.reportPrice(ASSET, price);
        vm.stopBroadcast();
        _logTx("PriceReporter.reportPrice");

        IReactive.LogRecord memory record = _recordFromLogs(vm.getRecordedLogs(), address(reporter));
        console.log("PriceReported asset");
        console.logBytes32(ASSET);
        console.log("PriceReported price", price);
        console.log("log.chainId", record.chainId);
        console.log("log.contract", record.contractAddress);
        console.log("log.opCode", record.opCode);

        vm.recordLogs();
        vm.startBroadcast(SYSTEM);
        reactive.react(record);
        vm.stopBroadcast();
        _logTx("PriceAlertReactive.react (impersonated SYSTEM)");

        uint256 callbacksAfter = _system().callbackCount();
        bool requested = callbacksAfter > callbacksBefore;
        _logSimulatedEvents(vm.getRecordedLogs());

        if (requested != expectCallback) {
            revert(expectCallback ? "expected a callback" : "did not expect a callback");
        }

        if (!requested) {
            console.log("result: no callback (armed=", _yesNo(reactive.armed()), ")");
            return;
        }

        _logRequestedCallback();

        bytes memory delivered = _injectSender(_currentPayload(), address(reactive));
        vm.recordLogs();
        vm.startBroadcast(PROXY);
        (bool ok, bytes memory err) = address(callback).call(delivered);
        vm.stopBroadcast();
        if (!ok) {
            console.logBytes(err);
            revert("destination callback failed");
        }
        _logTx("PriceAlertCallback.onAlert (impersonated proxy)");
        _logSimulatedEvents(vm.getRecordedLogs());

        require(callback.alertCount() == alertsBefore + 1, "alert was not recorded");
        _assertLastAlert(price);
        console.log("result: callback + AlertTriggered");
        console.log("armed", _yesNo(reactive.armed()));
    }


    function _logRequestedCallback() internal view {
        (uint256 destChain, address recipient, uint64 gasLimit,) = _system().lastCallback();
        console.log("requestCallbackV_1_0 chainId", destChain);
        console.log("requestCallbackV_1_0 recipient", recipient);
        console.log("requestCallbackV_1_0 gasLimit", uint256(gasLimit));
        console.log("legacy Callback event is not used (Omni API)");
    }

    function _currentPayload() internal view returns (bytes memory payload) {
        (,,, payload) = _system().lastCallback();
    }

    function _assertLastAlert(uint256 price) internal view {
        (bytes32 storedAsset, uint256 storedPrice, uint256 storedThreshold,) = callback.lastAlert();
        require(storedAsset == ASSET, "lastAlert asset");
        require(storedPrice == price, "lastAlert price");
        require(storedThreshold == THRESHOLD, "lastAlert threshold");
    }

    function _recordFromLogs(Vm.Log[] memory logs, address emitter)
        internal
        view
        returns (IReactive.LogRecord memory record)
    {
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter != emitter || logs[i].topics.length == 0) continue;
            if (logs[i].topics[0] != PRICE_REPORTED) continue;

            record.chainId = block.chainid;
            record.contractAddress = logs[i].emitter;
            record.topic0 = uint256(logs[i].topics[0]);
            record.topic1 = logs[i].topics.length > 1 ? uint256(logs[i].topics[1]) : 0;
            record.topic2 = logs[i].topics.length > 2 ? uint256(logs[i].topics[2]) : 0;
            record.topic3 = logs[i].topics.length > 3 ? uint256(logs[i].topics[3]) : 0;
            record.data = logs[i].data;
            record.blockNumber = block.number;
            record.opCode = logs[i].topics.length;
            record.blockHash = block.number == 0 ? 0 : uint256(blockhash(block.number - 1));
            record.txHash = 0;
            record.logIndex = i;
            return record;
        }
        revert("PriceReported log not found");
    }

    function _injectSender(bytes memory payload, address sender) internal pure returns (bytes memory delivered) {
        delivered = payload;
        require(delivered.length >= 36, "payload too short");
        bytes20 injected = bytes20(sender);
        for (uint256 i; i < 20; ++i) {
            delivered[16 + i] = injected[i];
        }
    }

    function _logSimulatedEvents(Vm.Log[] memory logs) internal pure {
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics.length == 0) continue;
            bytes32 topic0 = logs[i].topics[0];
            if (topic0 == ALERT_REQUESTED) {
                (bytes32 asset, uint256 price, uint256 threshold) = abi.decode(logs[i].data, (bytes32, uint256, uint256));
                console.log("event AlertRequested asset");
                console.logBytes32(asset);
                console.log("event AlertRequested price", price);
                console.log("event AlertRequested threshold", threshold);
            } else if (topic0 == ALERT_TRIGGERED) {
                (uint256 price, uint256 threshold) = abi.decode(logs[i].data, (uint256, uint256));
                console.log("event AlertTriggered asset");
                if (logs[i].topics.length > 1) console.logBytes32(logs[i].topics[1]);
                console.log("event AlertTriggered price", price);
                console.log("event AlertTriggered threshold", threshold);
            } else if (topic0 == CALLBACK_EVENT) {
                console.log("event Callback (legacy) was emitted");
            }
        }
    }

    function _assertSubscribe(uint256 chainId) internal view {
        (
            uint256 originChain,
            address originContract,
            uint256 topic0,
            ,
            ,
        ) = _system().lastSubscribe();
        require(originChain == chainId, "subscribe chainId");
        require(originContract == address(reporter), "subscribe contract");
        require(topic0 == uint256(PRICE_REPORTED), "subscribe topic0");
        console.log("SYSTEM.subscribe ok for origin", originContract);
    }

    function _system() internal pure returns (MockSystem) {
        return MockSystem(payable(SYSTEM));
    }

    function _yesNo(bool v) internal pure returns (string memory) {
        return v ? "true" : "false";
    }

    function _setCode(address who, bytes memory code) internal {
        vm.rpc("anvil_setCode", string.concat("[\"", vm.toString(who), "\",\"", vm.toString(code), "\"]"));
    }

    function _setBalance(address who, uint256 amount) internal {
        vm.rpc("anvil_setBalance", string.concat("[\"", vm.toString(who), "\",\"", vm.toString(bytes32(amount)), "\"]"));
    }

    function _impersonate(address who) internal {
        vm.rpc("anvil_impersonateAccount", string.concat("[\"", vm.toString(who), "\"]"));
    }

    function _logTx(string memory label) internal view {
        // Hashes are printed from the broadcast JSON after the script exits.
        // Looking them up here would query Anvil during simulation, before any
        // transaction has been sent.
        console.log("tx:", label);
        console.log("  block (simulated)", block.number);
    }
}
