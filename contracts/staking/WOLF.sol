// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WOLF
 * @notice Platform governance and staking token for the N.W.O Launchpad.
 *         Fixed supply — entire amount minted to the deployer at construction.
 *         ERC20Permit is included so stakers can approve the Staking contract
 *         in a single gasless transaction (EIP-2612).
 */
contract WOLF is ERC20, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18; // 1 billion

    constructor(address initialHolder)
        ERC20("N.W.O Wolf", "WOLF")
        ERC20Permit("N.W.O Wolf")
        Ownable(msg.sender)
    {
        require(initialHolder != address(0), "WOLF: zero holder");
        _mint(initialHolder, MAX_SUPPLY);
    }
}