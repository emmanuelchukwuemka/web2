// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockVVSRouter
 * @notice Minimal mock of the VVS (Uniswap V2) router for local testing.
 *         Accepts tokens + ETH and returns dummy LP amounts without reverting.
 */
contract MockVVSRouter {
    address public constant WETH_MOCK = address(0xdead1);

    event LiquidityAdded(
        address token,
        uint256 amountToken,
        uint256 amountETH,
        address to
    );

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        require(deadline >= block.timestamp, "MockRouter: expired");
        require(amountTokenDesired >= amountTokenMin, "MockRouter: token slippage");
        require(msg.value >= amountETHMin, "MockRouter: ETH slippage");

        // Pull tokens from the bonding curve
        IERC20(token).transferFrom(msg.sender, address(this), amountTokenDesired);

        emit LiquidityAdded(token, amountTokenDesired, msg.value, to);

        return (amountTokenDesired, msg.value, amountTokenDesired / 1000);
    }

    function WETH() external pure returns (address) {
        return WETH_MOCK;
    }

    function factory() external pure returns (address) {
        return address(0);
    }

    receive() external payable {}
}