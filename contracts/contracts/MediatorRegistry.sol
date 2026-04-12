// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MediatorRegistry
/// @notice Manages a whitelist of approved dispute mediators who must stake tokens
///         before they are permitted to call `resolveDispute` on any MilestoneEscrow.
///         The owner can revoke a mediator and slash their stake to the treasury.
contract MediatorRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // TODO: adjust REQUIRED_STAKE to match your token decimals and desired amount
    uint256 public constant REQUIRED_STAKE = 100 ether;

    /// @notice ERC-20 token used for mediator staking.
    IERC20 public immutable stakeToken;

    /// @notice True if a mediator is currently approved to resolve disputes.
    mapping(address => bool) public approved;

    /// @notice Amount of stakeToken deposited by each mediator.
    mapping(address => uint256) public stake;

    event Registered(address indexed mediator, uint256 amount);
    event Withdrawn(address indexed mediator, uint256 amount);
    event Revoked(address indexed mediator, uint256 slashedAmount);

    /// @param _stakeToken   ERC-20 token mediators must stake.
    /// @param _initialOwner Address that can revoke mediators.
    constructor(
        address _stakeToken,
        address _initialOwner
    ) Ownable(_initialOwner) {
        require(_stakeToken != address(0), "MediatorRegistry: zero token");
        stakeToken = IERC20(_stakeToken);
    }

    /// @notice Stake tokens and become an approved mediator.
    /// @param amount Token amount to stake; must be >= REQUIRED_STAKE.
    function register(uint256 amount) external nonReentrant {
        require(
            amount >= REQUIRED_STAKE,
            "MediatorRegistry: insufficient stake"
        );
        require(!approved[msg.sender], "MediatorRegistry: already registered");
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        stake[msg.sender] += amount;
        approved[msg.sender] = true;
        emit Registered(msg.sender, amount);
    }

    /// @notice Returns whether `mediator` is currently approved.
    function isApproved(address mediator) external view returns (bool) {
        return approved[mediator];
    }

    /// @notice Mediator voluntarily withdraws their stake and surrenders approval.
    function withdraw() external nonReentrant {
        require(approved[msg.sender], "MediatorRegistry: not registered");
        uint256 amount = stake[msg.sender];
        stake[msg.sender] = 0;
        approved[msg.sender] = false;
        stakeToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Owner revokes a mediator and slashes their entire stake to the owner.
    /// @param mediator Address to revoke.
    function revoke(address mediator) external onlyOwner nonReentrant {
        require(approved[mediator], "MediatorRegistry: not approved");
        uint256 slashed = stake[mediator];
        stake[mediator] = 0;
        approved[mediator] = false;
        if (slashed > 0) {
            // Slash: transfer stake to the contract owner (treasury)
            stakeToken.safeTransfer(owner(), slashed);
        }
        emit Revoked(mediator, slashed);
    }
}
