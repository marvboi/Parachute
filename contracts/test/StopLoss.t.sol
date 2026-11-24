// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {Owned} from "../src/Owned.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MockStopSwap} from "../src/MockStopSwap.sol";
import {StopLossVault} from "../src/StopLossVault.sol";
import {StopLossReactive} from "../src/StopLossReactive.sol";
import {MockSystem} from "./mocks/MockSystem.sol";

contract StopLossTest is Test {
    address internal constant SYSTEM = 0x8888888888888888888888888888888888888888;
    uint256 internal constant TOPIC0 = uint256(keccak256("PriceReported(bytes32,uint256)"));
    bytes32 internal constant CALLBACK_EVENT = keccak256("Callback(uint256,address,uint64,bytes)");
    uint256 internal constant ORIGIN_CHAIN_ID = 84532;
    uint256 internal constant DESTINATION_CHAIN_ID = 84532;
    uint256 internal constant STOP = 2000 ether;
    uint256 internal constant DEPOSIT = 100 ether;

    address internal origin = makeAddr("origin");
    address internal proxy = makeAddr("proxy");
    address internal user = makeAddr("user");
    address internal safe = makeAddr("safe");
    address internal stranger = makeAddr("stranger");
    bytes32 internal asset = bytes32("ETH/USD");

    MockERC20 internal risk;
    MockERC20 internal stable;
    MockStopSwap internal swap;
    StopLossVault internal vault;
    StopLossReactive internal reactive;

    function setUp() public {
        vm.etch(SYSTEM, address(new MockSystem()).code);

        risk = new MockERC20("Risk", "RISK");
        stable = new MockERC20("Stable", "USDC");
        swap = new MockStopSwap();

        vm.startPrank(user);
        reactive = new StopLossReactive(ORIGIN_CHAIN_ID, origin, DESTINATION_CHAIN_ID, asset);
        vault = new StopLossVault(IPayable(payable(proxy)), address(reactive), address(risk));
        reactive.setCallbackRecipient(address(vault), 1_000_000);
        vm.stopPrank();

        risk.mint(user, 1_000 ether);
        stable.mint(address(swap), 1_000 ether);

        vm.startPrank(user);
        risk.approve(address(vault), type(uint256).max);
        vault.deposit(DEPOSIT);
        uint256 armId = vault.arm(STOP, safe, 0, address(0), address(0));
        reactive.arm(armId, STOP, 0);
        vm.stopPrank();
    }

    function _log(uint256 price, uint256 originBlock) internal view returns (IReactive.LogRecord memory log) {
        log = IReactive.LogRecord({
            chainId: ORIGIN_CHAIN_ID,
            contractAddress: origin,
            topic0: TOPIC0,
            topic1: uint256(asset),
            topic2: 0,
            topic3: 0,
            data: abi.encode(price),
            blockNumber: originBlock,
            opCode: 2,
            blockHash: 0,
            txHash: 0,
            logIndex: 0
        });
    }

    function _system() internal pure returns (MockSystem) {
        return MockSystem(payable(SYSTEM));
    }

    function _deliver(uint256 armId, uint256 originBlock, uint256 price) internal {
        vm.prank(proxy);
        vault.executeStopLoss(address(reactive), armId, originBlock, price);
    }

    function _fire(uint256 price, uint256 originBlock) internal {
        vm.prank(SYSTEM);
        reactive.react(_log(price, originBlock));
        (,,, bytes memory payload) = _system().lastCallback();
        bytes memory delivered = payload;
        bytes20 injected = bytes20(address(reactive));
        for (uint256 i; i < 20; ++i) {
            delivered[16 + i] = injected[i];
        }
        vm.prank(proxy);
        (bool ok,) = address(vault).call(delivered);
        assertTrue(ok);
    }

    function test_noFireAboveStop() public {
        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(2001 ether, 10));
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(_system().callbackCount(), 0);
        assertTrue(reactive.armed());
        assertTrue(vault.armed());
        assertEq(risk.balanceOf(address(vault)), DEPOSIT);
        assertEq(risk.balanceOf(safe), 0);
        for (uint256 i; i < logs.length; ++i) {
            assertTrue(logs[i].topics[0] != CALLBACK_EVENT);
        }
    }

    function test_fireAtStopMovesExactBalanceToSafe() public {
        _fire(STOP, 10);

        assertFalse(reactive.armed());
        assertFalse(vault.armed());
        assertEq(risk.balanceOf(address(vault)), 0);
        assertEq(risk.balanceOf(safe), DEPOSIT);
        assertEq(risk.balanceOf(user), 900 ether);
    }

    function test_fireBelowStopMovesExactBalanceToSafe() public {
        _fire(1999 ether, 11);

        assertEq(risk.balanceOf(address(vault)), 0);
        assertEq(risk.balanceOf(safe), DEPOSIT);
    }

    function test_singleExecution() public {
        _fire(STOP, 10);

        uint256 callbacks = _system().callbackCount();
        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(1500 ether, 11));
        assertEq(_system().callbackCount(), callbacks);
        assertEq(risk.balanceOf(safe), DEPOSIT);

        vm.prank(proxy);
        vm.expectRevert(StopLossVault.NotArmed.selector);
        vault.executeStopLoss(address(reactive), 1, 12, 1500 ether);
    }

    function test_unauthorizedCallersRejected() public {
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), proxy));
        vault.executeStopLoss(address(reactive), 1, 10, STOP);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, stranger, proxy));
        vault.executeStopLoss(address(reactive), 1, 10, STOP);

        address other = makeAddr("otherReactive");
        vm.prank(proxy);
        vm.expectRevert(abi.encodeWithSelector(AbstractCallback.CallbackNotAuthorized.selector, other, address(reactive)));
        vault.executeStopLoss(other, 1, 10, STOP);

        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), SYSTEM));
        reactive.react(_log(STOP, 10));
    }

    function test_ownerWithdrawCancelsAndReturnsTokens() public {
        vm.prank(user);
        vault.withdraw(DEPOSIT);

        assertFalse(vault.armed());
        assertEq(risk.balanceOf(address(vault)), 0);
        assertEq(risk.balanceOf(user), 1_000 ether);
    }

    function test_nonOwnerCannotWithdrawOrCancel() public {
        vm.prank(stranger);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.withdraw(DEPOSIT);

        vm.prank(stranger);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.cancel();

        vm.prank(stranger);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.rearm();
    }

    function test_ownerCancelThenRearm() public {
        vm.prank(user);
        vault.cancel();
        assertFalse(vault.armed());
        assertEq(risk.balanceOf(address(vault)), DEPOSIT);

        vm.prank(user);
        uint256 newArmId = vault.rearm();
        assertEq(newArmId, 2);
        assertTrue(vault.armed());

        vm.prank(user);
        reactive.arm(newArmId, STOP, 0);

        _fire(STOP, 20);
        assertEq(risk.balanceOf(safe), DEPOSIT);
        assertEq(risk.balanceOf(address(vault)), 0);
    }

    function test_staleOriginBlockRejected() public {
        vm.prank(user);
        uint256 armId = vault.arm(STOP, safe, 50, address(0), address(0));
        vm.prank(user);
        reactive.arm(armId, STOP, 50);

        vm.prank(proxy);
        vm.expectRevert(StopLossVault.StalePrice.selector);
        vault.executeStopLoss(address(reactive), armId, 49, STOP);

        assertTrue(vault.armed());
        assertEq(risk.balanceOf(address(vault)), DEPOSIT);

        vm.recordLogs();
        vm.prank(SYSTEM);
        reactive.react(_log(STOP, 49));
        assertEq(_system().callbackCount(), 0);
        assertTrue(reactive.armed());
    }

    function test_outOfOrderOriginBlockRejected() public {
        vm.prank(SYSTEM);
        reactive.react(_log(2100 ether, 20));
        assertEq(reactive.lastSeenOriginBlock(), 20);
        assertEq(_system().callbackCount(), 0);
        assertTrue(reactive.armed());

        vm.prank(SYSTEM);
        reactive.react(_log(1500 ether, 19));
        assertEq(_system().callbackCount(), 0);
        assertTrue(reactive.armed());
        assertTrue(vault.armed());
        assertEq(risk.balanceOf(address(vault)), DEPOSIT);

        _fire(1500 ether, 21);
        assertEq(risk.balanceOf(safe), DEPOSIT);
        assertEq(risk.balanceOf(address(vault)), 0);
    }


    function test_oldArmIdRejectedAfterRearm() public {
        vm.prank(user);
        uint256 newArmId = vault.arm(STOP, safe, 0, address(0), address(0));
        assertEq(newArmId, 2);

        vm.prank(proxy);
        vm.expectRevert(StopLossVault.ArmMismatch.selector);
        vault.executeStopLoss(address(reactive), 1, 10, STOP);
        assertTrue(vault.armed());
        assertEq(risk.balanceOf(address(vault)), DEPOSIT);
    }

    function test_swapPathSendsExactStableToSafe() public {
        vm.prank(user);
        uint256 armId = vault.arm(STOP, safe, 0, address(stable), address(swap));
        vm.prank(user);
        reactive.arm(armId, STOP, 0);

        _fire(1900 ether, 15);

        assertEq(risk.balanceOf(address(vault)), 0);
        assertEq(risk.balanceOf(safe), 0);
        assertEq(stable.balanceOf(safe), DEPOSIT);
        assertEq(risk.balanceOf(address(swap)), DEPOSIT);
        assertEq(stable.balanceOf(address(swap)), 900 ether);
    }

    function test_reactRequestsCallbackWithExactPayload() public {
        bytes memory payload = abi.encodeWithSignature(
            "executeStopLoss(address,uint256,uint256,uint256)",
            address(0),
            uint256(1),
            uint256(10),
            STOP
        );

        vm.expectCall(
            SYSTEM,
            abi.encodeCall(
                ISystemContract.requestCallbackV_1_0,
                (
                    ISystemContract.CallbackConfiguration_V_1_0({
                        chainId: DESTINATION_CHAIN_ID,
                        recipient: address(vault),
                        gasLimit: 1_000_000,
                        payload: payload
                    })
                )
            )
        );

        vm.prank(SYSTEM);
        reactive.react(_log(STOP, 10));

        (uint256 chainId, address recipient, uint64 gasLimit, bytes memory got) = _system().lastCallback();
        assertEq(chainId, DESTINATION_CHAIN_ID);
        assertEq(recipient, address(vault));
        assertEq(gasLimit, 1_000_000);
        assertEq(got, payload);
        assertFalse(reactive.armed());
    }
}
