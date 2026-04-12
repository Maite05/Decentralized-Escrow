// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IEscrow {
    function approveMilestone(uint256 milestoneId) external;
}

/// @title MaliciousERC20
/// @notice ERC-20 that attempts a reentrancy attack during `transfer`.
///         Used exclusively in reentrancy tests — never deploy to mainnet.
contract MaliciousERC20 is ERC20 {
    address public targetEscrow;
    uint256 public targetMilestone;
    bool private _attacking;
    bool public attackEnabled;

    constructor() ERC20("Malicious", "MAL") {}

    function enableAttack(address escrow, uint256 milestone) external {
        targetEscrow = escrow;
        targetMilestone = milestone;
        attackEnabled = true;
    }

    function disableAttack() external {
        attackEnabled = false;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @dev Overrides transfer to attempt re-entry into approveMilestone.
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool result) {
        result = super.transfer(to, amount);
        if (attackEnabled && !_attacking) {
            _attacking = true;
            // This call should revert due to ReentrancyGuard
            try IEscrow(targetEscrow).approveMilestone(targetMilestone) {} catch {}
            _attacking = false;
        }
    }
}
