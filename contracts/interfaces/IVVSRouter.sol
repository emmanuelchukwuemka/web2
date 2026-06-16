// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Uniswap V2-compatible router interface (VVS Finance is a V2 fork)
interface IVVSRouter {
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
        );

    function WETH() external pure returns (address);

    function factory() external pure returns (address);
}