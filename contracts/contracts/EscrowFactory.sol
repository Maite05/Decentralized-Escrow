// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MilestoneEscrow.sol";

/// @title EscrowFactory
/// @notice Deploys a new MilestoneEscrow contract for each project and
///         indexes the resulting addresses by client and by freelancer.
contract EscrowFactory {

    uint256 private _projectCounter;
    address public immutable mediatorRegistry;

    /// @notice All escrow addresses ever deployed, in creation order.
    address[] public allProjects;

    /// @notice Escrow addresses deployed for a given client.
    mapping(address => address[]) public byClient;

    /// @notice Escrow addresses deployed for a given freelancer.
    mapping(address => address[]) public byFreelancer;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed escrow,
        address indexed client,
        address freelancer,
        address token,
        uint256 totalAmount
    );

    constructor(address _mediatorRegistry) {
        require(
            _mediatorRegistry != address(0),
            "EscrowFactory: zero registry"
        );
        mediatorRegistry = _mediatorRegistry;
    }

    /// @notice Deploys a new MilestoneEscrow and registers it in the indexes.
    /// @param freelancer  Address that will receive milestone payments.
    /// @param token       ERC-20 token used for payments.
    /// @param totalAmount Target budget for the project.
    /// @return escrow     Address of the newly deployed MilestoneEscrow.
    function createProject(
        address freelancer,
        address token,
        uint256 totalAmount
    ) external returns (address escrow) {
        require(freelancer != address(0), "EscrowFactory: zero freelancer");
        require(token != address(0), "EscrowFactory: zero token");
        require(totalAmount > 0, "EscrowFactory: zero amount");

        uint256 projectId = ++_projectCounter;

        MilestoneEscrow newEscrow = new MilestoneEscrow(
            projectId,
            msg.sender,
            freelancer,
            token,
            totalAmount,
            mediatorRegistry
        );

        escrow = address(newEscrow);
        byClient[msg.sender].push(escrow);
        byFreelancer[freelancer].push(escrow);
        allProjects.push(escrow);

        emit ProjectCreated(
            projectId,
            escrow,
            msg.sender,
            freelancer,
            token,
            totalAmount
        );
    }

    function getProjectsByClient(
        address client
    ) external view returns (address[] memory) {
        return byClient[client];
    }

    function getProjectsByFreelancer(
        address freelancer
    ) external view returns (address[] memory) {
        return byFreelancer[freelancer];
    }

    function getAllProjects() external view returns (address[] memory) {
        return allProjects;
    }

    function projectCount() external view returns (uint256) {
        return _projectCounter;
    }
}
