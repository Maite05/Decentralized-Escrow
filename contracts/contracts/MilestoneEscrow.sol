// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IMediatorRegistry {
    function isApproved(address mediator) external view returns (bool);
}

/// @title MilestoneEscrow
/// @notice Holds ERC-20 funds in a milestone-based escrow between a client and freelancer.
///         Disputes are resolved by an approved mediator from MediatorRegistry.
contract MilestoneEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State {
        LOCKED,
        DELIVERED,
        RELEASED,
        DISPUTED,
        REFUNDED
    }

    struct Project {
        uint256 id;
        address client;
        address freelancer;
        address token;
        uint256 totalAmount; // total target budget
        uint256 createdAt;
    }

    struct Milestone {
        uint256 id;
        uint256 amount;
        State state;
        uint256 deliveredAt;
        string description;
    }

    Project public project;
    Milestone[] private _milestones;
    IMediatorRegistry public immutable registry;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed client,
        address indexed freelancer,
        address token,
        uint256 totalAmount
    );
    event Funded(uint256 indexed projectId, uint256 amount);
    event Delivered(uint256 indexed projectId, uint256 indexed milestoneId);
    event Released(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        address indexed freelancer,
        uint256 amount
    );
    event DisputeRaised(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        address raisedBy
    );
    event DisputeResolved(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        address indexed mediator,
        bool freelancerWon
    );
    event MilestoneAdded(
        uint256 indexed projectId,
        uint256 indexed milestoneId,
        uint256 amount,
        string description
    );

    modifier onlyClient() {
        require(msg.sender == project.client, "MilestoneEscrow: not client");
        _;
    }

    modifier onlyFreelancer() {
        require(
            msg.sender == project.freelancer,
            "MilestoneEscrow: not freelancer"
        );
        _;
    }

    modifier onlyParty() {
        require(
            msg.sender == project.client ||
                msg.sender == project.freelancer,
            "MilestoneEscrow: not a project party"
        );
        _;
    }

    modifier onlyApprovedMediator() {
        require(
            registry.isApproved(msg.sender),
            "MilestoneEscrow: not approved mediator"
        );
        _;
    }

    constructor(
        uint256 _projectId,
        address _client,
        address _freelancer,
        address _token,
        uint256 _totalAmount,
        address _registry
    ) {
        require(_client != address(0), "MilestoneEscrow: zero client");
        require(_freelancer != address(0), "MilestoneEscrow: zero freelancer");
        require(_client != _freelancer, "MilestoneEscrow: client == freelancer");
        require(_token != address(0), "MilestoneEscrow: zero token");
        require(_registry != address(0), "MilestoneEscrow: zero registry");

        project = Project({
            id: _projectId,
            client: _client,
            freelancer: _freelancer,
            token: _token,
            totalAmount: _totalAmount,
            createdAt: block.timestamp
        });
        registry = IMediatorRegistry(_registry);

        emit ProjectCreated(
            _projectId,
            _client,
            _freelancer,
            _token,
            _totalAmount
        );
    }

    /// @notice Client deposits ERC-20 tokens to fund the escrow.
    /// @param amount Token amount to deposit (must be pre-approved).
    function createProject(uint256 amount) external onlyClient nonReentrant {
        require(amount > 0, "MilestoneEscrow: zero amount");
        IERC20(project.token).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        emit Funded(project.id, amount);
    }

    /// @notice Client adds a new milestone defining a deliverable and its payment.
    /// @param amount  Token amount to release on completion.
    /// @param description Human-readable deliverable description.
    function addMilestone(
        uint256 amount,
        string calldata description
    ) external onlyClient {
        require(amount > 0, "MilestoneEscrow: zero milestone amount");
        uint256 milestoneId = _milestones.length;
        _milestones.push(
            Milestone({
                id: milestoneId,
                amount: amount,
                state: State.LOCKED,
                deliveredAt: 0,
                description: description
            })
        );
        emit MilestoneAdded(project.id, milestoneId, amount, description);
    }

    /// @notice Freelancer signals that work for a milestone is complete.
    /// @param milestoneId Index of the milestone.
    function markDelivered(uint256 milestoneId) external onlyFreelancer {
        Milestone storage m = _getMilestone(milestoneId);
        require(m.state == State.LOCKED, "MilestoneEscrow: not locked");
        m.state = State.DELIVERED;
        m.deliveredAt = block.timestamp;
        emit Delivered(project.id, milestoneId);
    }

    /// @notice Client approves delivered work and releases the milestone payment.
    /// @param milestoneId Index of the milestone.
    function approveMilestone(
        uint256 milestoneId
    ) external onlyClient nonReentrant {
        Milestone storage m = _getMilestone(milestoneId);
        require(m.state == State.DELIVERED, "MilestoneEscrow: not delivered");
        m.state = State.RELEASED;
        uint256 amount = m.amount;
        IERC20(project.token).safeTransfer(project.freelancer, amount);
        emit Released(project.id, milestoneId, project.freelancer, amount);
    }

    /// @notice Either party opens a dispute on a LOCKED or DELIVERED milestone.
    /// @param milestoneId Index of the milestone.
    function raiseDispute(uint256 milestoneId) external onlyParty {
        Milestone storage m = _getMilestone(milestoneId);
        require(
            m.state == State.LOCKED || m.state == State.DELIVERED,
            "MilestoneEscrow: cannot dispute in current state"
        );
        m.state = State.DISPUTED;
        emit DisputeRaised(project.id, milestoneId, msg.sender);
    }

    /// @notice An approved mediator resolves an open dispute.
    /// @param milestoneId  Index of the disputed milestone.
    /// @param freelancerWon True → release to freelancer; false → refund client.
    function resolveDispute(
        uint256 milestoneId,
        bool freelancerWon
    ) external onlyApprovedMediator nonReentrant {
        Milestone storage m = _getMilestone(milestoneId);
        require(m.state == State.DISPUTED, "MilestoneEscrow: not disputed");
        uint256 amount = m.amount;
        if (freelancerWon) {
            m.state = State.RELEASED;
            IERC20(project.token).safeTransfer(project.freelancer, amount);
        } else {
            m.state = State.REFUNDED;
            IERC20(project.token).safeTransfer(project.client, amount);
        }
        emit DisputeResolved(
            project.id,
            milestoneId,
            msg.sender,
            freelancerWon
        );
    }

    function getMilestone(
        uint256 id
    ) external view returns (Milestone memory) {
        return _getMilestone(id);
    }

    function getMilestoneCount() external view returns (uint256) {
        return _milestones.length;
    }   

    function _getMilestone(
        uint256 id
    ) internal view returns (Milestone storage) {
        require(
            id < _milestones.length,
            "MilestoneEscrow: milestone does not exist"
        );
        return _milestones[id];
    }
}
