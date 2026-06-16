// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LaunchToken
 * @notice Plain ERC20 launched by TokenFactory. The entire supply is minted
 *         to the BondingCurve at creation — no team allocation.
 *         Ownership is transferred to the dead address upon graduation.
 */
contract LaunchToken is ERC20, Ownable {
    uint8 private immutable _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address bondingCurve_,
        address initialOwner_
    ) ERC20(name_, symbol_) Ownable(initialOwner_) {
        _decimals = 18;
        // Entire supply goes to the bonding curve — no pre-mine, no team cut.
        _mint(bondingCurve_, totalSupply_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}