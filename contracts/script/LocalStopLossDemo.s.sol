// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {PriceReporter} from "../src/PriceReporter.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockStopSwap} from "../src/MockStopSwap.sol";
import {StopLossVault} from "../src/StopLossVault.sol";
import {StopLossReactive} from "../src/StopLossReactive.sol";
import {MockSystem} from "../test/mocks/MockSystem.sol";

/// @dev Local Anvil walkthrough for Auto Stop-Loss. Simulates the Reactive hop.
contract LocalStopLossDemo is Script {
    address internal constant SYSTEM = 0x8888888888888888888888888888888888888888;
    address internal constant PROXY = address(0xbCBc00000000000000000000000000000000cBCb);
    address internal constant ANVIL0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address internal constant SAFE = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    bytes32 internal constant PRICE_REPORTED = keccak256("PriceReported(bytes32,uint256)");
    bytes32 internal constant STOP_EXECUTED =
        keccak256("StopExecuted(uint256,uint256,uint256,address,address,uint256)");
    bytes32 internal constant ASSET = bytes32("ETH/USD");
    uint256 internal constant STOP = 2000 ether;

    PriceReporter internal reporter;
    MockERC20 internal risk;
    MockERC20 internal stable;
    MockStopSwap internal swapper;
    StopLossReactive internal reactive;
    StopLossVault internal vault;
    uint256 internal nextOriginBlock = 1;

    function run() external {
        console.log("=================================================");
        console.log("LOCAL STOP-LOSS DEMO - simulated Reactive hop");
        console.log("Reactive Network cannot watch a local Anvil chain.");
        console.log("Judging still requires a real Base Sepolia + Lasna run.");
        console.log("=================================================");

        address deployer = msg.sender;
        if (deployer == address(0)) deployer = ANVIL0;
        uint256 chainId = block.chainid;

        _etchSystem(deployer);
        _deploy(deployer, chainId);
        _depositAndArmSwap(deployer);

        _stepReport("price above stop (2100e18)", 2100 ether, false);
        _logBalances("after above-stop report");
        _stepReport("price at stop (2000e18), swap to stable", STOP, true);
        _logBalances("after stop execution (stable to safe)");
        _stepReport("second report while disarmed (1900e18)", 1900 ether, false);
        _logBalances("after second report (no double execution)");

        _cancelAndWithdraw(deployer);
        _rearmDirectAndFire(deployer);

        console.log("=================================================");
        console.log("LOCAL STOP-LOSS DEMO complete (simulated).");
        console.log("=================================================");
    }

    function _etchSystem(address deployer) internal {
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
    }

    function _deploy(address deployer, uint256 chainId) internal {
        vm.startBroadcast(deployer);
        risk = new MockERC20("Risk", "RISK");
        stable = new MockERC20("Stable", "USDC");
        swapper = new MockStopSwap();
        reporter = new PriceReporter();
        reactive = new StopLossReactive(chainId, address(reporter), chainId, ASSET);
        vault = new StopLossVault(IPayable(payable(PROXY)), address(reactive), address(risk));
        reactive.setCallbackRecipient(address(vault), 1_000_000);
        risk.mint(deployer, 1_000 ether);
        stable.mint(address(swapper), 1_000 ether);
        vm.stopBroadcast();
        _logTx("deploy tokens, reporter, reactive, vault, and mint");

        console.log("PriceReporter      ", address(reporter));
        console.log("StopLossReactive   ", address(reactive));
        console.log("StopLossVault      ", address(vault));
        console.log("risk token         ", address(risk));
        console.log("stable token       ", address(stable));
        console.log("mock swap          ", address(swapper));
        console.log("safe wallet        ", SAFE);
        console.log("stop price         ", STOP);
        console.log("rule               ", "fire when price <= stop; once per arm");
    }

    function _depositAndArmSwap(address deployer) internal {
        vm.startBroadcast(deployer);
        risk.approve(address(vault), type(uint256).max);
        vault.deposit(100 ether);
        uint256 armId = vault.arm(STOP, SAFE, 0, address(stable), address(swapper));
        reactive.arm(armId, STOP, 0);
        vm.stopBroadcast();
        _logTx("deposit 100 RISK and arm with 1:1 swap to stable");
        console.log("armId", armId);
        _logBalances("after first arm");
    }

    function _cancelAndWithdraw(address deployer) internal {
        console.log("-------------------------------------------------");
        console.log("step: deposit 50, arm, cancel, withdraw to owner");

        vm.startBroadcast(deployer);
        vault.deposit(50 ether);
        uint256 armId = vault.arm(STOP, SAFE, 0, address(0), address(0));
        reactive.arm(armId, STOP, 0);
        vault.cancel();
        reactive.cancel();
        uint256 before = risk.balanceOf(deployer);
        vault.withdraw(50 ether);
        vm.stopBroadcast();
        _logTx("deposit, arm, cancel, withdraw");

        require(!vault.armed() && !reactive.armed(), "still armed");
        require(risk.balanceOf(address(vault)) == 0, "vault not empty");
        require(risk.balanceOf(deployer) == before + 50 ether, "owner withdraw mismatch");
        console.log("result: cancelled and 50 RISK returned to owner");
        _logBalances("after cancel and withdraw");
    }

    function _rearmDirectAndFire(address deployer) internal {
        console.log("-------------------------------------------------");
        console.log("step: deposit 40, rearm, fire below stop (direct transfer)");

        vm.startBroadcast(deployer);
        vault.deposit(40 ether);
        uint256 armId = vault.arm(STOP, SAFE, 0, address(0), address(0));
        reactive.arm(armId, STOP, 0);
        vm.stopBroadcast();
        _logTx("deposit 40 RISK and rearm (no swap)");
        console.log("armId", armId);

        uint256 safeRiskBefore = risk.balanceOf(SAFE);
        _stepReport("price below stop after rearm (1500e18)", 1500 ether, true);
        require(risk.balanceOf(SAFE) == safeRiskBefore + 40 ether, "safe RISK mismatch");
        require(risk.balanceOf(address(vault)) == 0, "vault not empty after rearm fire");
        _logBalances("after rearm execution (RISK to safe)");
    }

    function _stepReport(string memory label, uint256 price, bool expectCallback) internal {
        console.log("-------------------------------------------------");
        console.log("step:", label);

        uint256 callbacksBefore = _system().callbackCount();

        vm.recordLogs();
        vm.startBroadcast(msg.sender == address(0) ? ANVIL0 : msg.sender);
        reporter.reportPrice(ASSET, price);
        vm.stopBroadcast();
        _logTx("PriceReporter.reportPrice");

        IReactive.LogRecord memory record = _recordFromLogs(vm.getRecordedLogs(), address(reporter));
        console.log("PriceReported price", price);
        console.log("log.blockNumber", record.blockNumber);

        vm.recordLogs();
        vm.startBroadcast(SYSTEM);
        reactive.react(record);
        vm.stopBroadcast();
        _logTx("StopLossReactive.react (impersonated SYSTEM)");

        uint256 callbacksAfter = _system().callbackCount();
        bool requested = callbacksAfter > callbacksBefore;
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
        (bool ok, bytes memory err) = address(vault).call(delivered);
        vm.stopBroadcast();
        if (!ok) {
            console.logBytes(err);
            revert("executeStopLoss failed");
        }
        _logTx("StopLossVault.executeStopLoss (impersonated proxy)");
        _logStopExecuted(vm.getRecordedLogs());
        console.log("result: callback + StopExecuted");
        console.log("armed", _yesNo(reactive.armed()));
    }

    function _recordFromLogs(Vm.Log[] memory logs, address emitter)
        internal
        returns (IReactive.LogRecord memory record)
    {
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter != emitter || logs[i].topics.length == 0) continue;
            if (logs[i].topics[0] != PRICE_REPORTED) continue;
            record.chainId = block.chainid;
            record.contractAddress = logs[i].emitter;
            record.topic0 = uint256(logs[i].topics[0]);
            record.topic1 = logs[i].topics.length > 1 ? uint256(logs[i].topics[1]) : 0;
            record.data = logs[i].data;
            // Simulation often sits on one block; advance so later reports are not treated as stale.
            record.blockNumber = nextOriginBlock;
            nextOriginBlock += 1;
            record.opCode = logs[i].topics.length;
            return record;
        }
        revert("PriceReported log not found");
    }

    function _logRequestedCallback() internal view {
        (uint256 destChain, address recipient, uint64 gasLimit,) = _system().lastCallback();
        console.log("requestCallbackV_1_0 chainId", destChain);
        console.log("requestCallbackV_1_0 recipient", recipient);
        console.log("requestCallbackV_1_0 gasLimit", uint256(gasLimit));
    }

    function _currentPayload() internal view returns (bytes memory payload) {
        (,,, payload) = _system().lastCallback();
    }

    function _injectSender(bytes memory payload, address sender) internal pure returns (bytes memory delivered) {
        delivered = payload;
        require(delivered.length >= 36, "payload too short");
        bytes20 injected = bytes20(sender);
        for (uint256 i; i < 20; ++i) {
            delivered[16 + i] = injected[i];
        }
    }

    function _logStopExecuted(Vm.Log[] memory logs) internal pure {
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics.length == 0 || logs[i].topics[0] != STOP_EXECUTED) continue;
            (
                uint256 armId,
                uint256 price,
                uint256 originBlock,
                address to,
                address payoutToken,
                uint256 amount
            ) = abi.decode(logs[i].data, (uint256, uint256, uint256, address, address, uint256));
            console.log("event StopExecuted armId", armId);
            console.log("event StopExecuted price", price);
            console.log("event StopExecuted originBlock", originBlock);
            console.log("event StopExecuted to", to);
            console.log("event StopExecuted payoutToken", payoutToken);
            console.log("event StopExecuted amount", amount);
        }
    }

    function _logBalances(string memory label) internal view {
        console.log("balances:", label);
        console.log("  vault RISK", risk.balanceOf(address(vault)));
        console.log("  safe  RISK", risk.balanceOf(SAFE));
        console.log("  safe  USDC", stable.balanceOf(SAFE));
        console.log("  owner RISK", risk.balanceOf(ANVIL0));
        console.log("  vault armed", _yesNo(vault.armed()));
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
        console.log("tx:", label);
        console.log("  block (simulated)", block.number);
    }
}
