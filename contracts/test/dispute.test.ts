import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type {
  MilestoneEscrow,
  MockERC20,
  MediatorRegistry,
} from "../typechain-types";

describe("Dispute flow", function () {
  const TOTAL = ethers.parseEther("1000");
  const M_AMOUNT = ethers.parseEther("300");

  async function deployFixture() {
    const [owner, client, freelancer, mediator, nonMediator] =
      await ethers.getSigners();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = (await MockERC20Factory.deploy(
      "Mock USDC",
      "mUSDC",
      18
    )) as unknown as MockERC20;

    const RegistryFactory =
      await ethers.getContractFactory("MediatorRegistry");
    const registry = (await RegistryFactory.deploy(
      await token.getAddress(),
      owner.address
    )) as unknown as MediatorRegistry;

    const STAKE = ethers.parseEther("100");
    await token.mint(mediator.address, STAKE);
    await token
      .connect(mediator)
      .approve(await registry.getAddress(), STAKE);
    await registry.connect(mediator).register(STAKE);

    const EscrowFactory =
      await ethers.getContractFactory("MilestoneEscrow");
    const escrow = (await EscrowFactory.deploy(
      1n,
      client.address,
      freelancer.address,
      await token.getAddress(),
      TOTAL,
      await registry.getAddress()
    )) as unknown as MilestoneEscrow;

    await token.mint(client.address, TOTAL);
    await token
      .connect(client)
      .approve(await escrow.getAddress(), TOTAL);
    await escrow.connect(client).createProject(TOTAL);
    await escrow.connect(client).addMilestone(M_AMOUNT, "Disputed milestone");

    return {
      escrow,
      token,
      registry,
      owner,
      client,
      freelancer,
      mediator,
      nonMediator,
    };
  }

  async function disputedFixture() {
    const base = await deployFixture();
    await base.escrow.connect(base.freelancer).markDelivered(0n);
    await base.escrow.connect(base.client).raiseDispute(0n);
    return base;
  }

  describe("raiseDispute", function () {
    it("client can raise dispute on a LOCKED milestone", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await escrow.connect(client).raiseDispute(0n);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(3n); 
    });

    it("freelancer can raise dispute on a LOCKED milestone", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).raiseDispute(0n);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(3n);
    });

    it("client can raise dispute on a DELIVERED milestone", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).markDelivered(0n);
      await escrow.connect(client).raiseDispute(0n);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(3n); 
    });

    it("emits DisputeRaised event", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await expect(escrow.connect(client).raiseDispute(0n))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(1n, 0n, client.address);
    });

    it("reverts if caller is not a party", async function () {
      const { escrow, nonMediator } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(nonMediator).raiseDispute(0n)
      ).to.be.revertedWith("MilestoneEscrow: not a project party");
    });

    it("reverts if milestone already RELEASED", async function () {
      const { escrow, client, freelancer } = await loadFixture(deployFixture);
      await escrow.connect(freelancer).markDelivered(0n);
      await escrow.connect(client).approveMilestone(0n);
      await expect(
        escrow.connect(client).raiseDispute(0n)
      ).to.be.revertedWith(
        "MilestoneEscrow: cannot dispute in current state"
      );
    });
  });

  describe("resolveDispute: mediator rules for freelancer", function () {
    it("transfers milestone amount to freelancer", async function () {
      const { escrow, token, freelancer, mediator } =
        await loadFixture(disputedFixture);
      await expect(
        escrow.connect(mediator).resolveDispute(0n, true)
      ).to.changeTokenBalance(token, freelancer, M_AMOUNT);
    });

    it("sets milestone state to RELEASED", async function () {
      const { escrow, mediator } = await loadFixture(disputedFixture);
      await escrow.connect(mediator).resolveDispute(0n, true);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(2n); // RELEASED
    });

    it("emits DisputeResolved with freelancerWon=true", async function () {
      const { escrow, mediator, freelancer } =
        await loadFixture(disputedFixture);
      await expect(escrow.connect(mediator).resolveDispute(0n, true))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(1n, 0n, mediator.address, true);
    });
  });

  describe("resolveDispute: mediator refunds client", function () {
    it("transfers milestone amount back to client", async function () {
      const { escrow, token, client, mediator } =
        await loadFixture(disputedFixture);
      await expect(
        escrow.connect(mediator).resolveDispute(0n, false)
      ).to.changeTokenBalance(token, client, M_AMOUNT);
    });

    it("sets milestone state to REFUNDED", async function () {
      const { escrow, mediator } = await loadFixture(disputedFixture);
      await escrow.connect(mediator).resolveDispute(0n, false);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(4n);
    });

    it("emits DisputeResolved with freelancerWon=false", async function () {
      const { escrow, mediator, client } =
        await loadFixture(disputedFixture);
      await expect(escrow.connect(mediator).resolveDispute(0n, false))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(1n, 0n, mediator.address, false);
    });
  });

  describe("resolveDispute: non-mediator reverts", function () {
    it("reverts if called by client", async function () {
      const { escrow, client } = await loadFixture(disputedFixture);
      await expect(
        escrow.connect(client).resolveDispute(0n, true)
      ).to.be.revertedWith("MilestoneEscrow: not approved mediator");
    });

    it("reverts if called by freelancer", async function () {
      const { escrow, freelancer } = await loadFixture(disputedFixture);
      await expect(
        escrow.connect(freelancer).resolveDispute(0n, true)
      ).to.be.revertedWith("MilestoneEscrow: not approved mediator");
    });

    it("reverts if called by random address", async function () {
      const { escrow, nonMediator } = await loadFixture(disputedFixture);
      await expect(
        escrow.connect(nonMediator).resolveDispute(0n, true)
      ).to.be.revertedWith("MilestoneEscrow: not approved mediator");
    });

    it("reverts if mediator was revoked before resolving", async function () {
      const { escrow, registry, owner, mediator } =
        await loadFixture(disputedFixture);
      await registry.connect(owner).revoke(mediator.address);
      await expect(
        escrow.connect(mediator).resolveDispute(0n, true)
      ).to.be.revertedWith("MilestoneEscrow: not approved mediator");
    });

    it("reverts if milestone is not in DISPUTED state", async function () {
      const { escrow, mediator } = await loadFixture(deployFixture);
      
      await expect(
        escrow.connect(mediator).resolveDispute(0n, true)
      ).to.be.revertedWith("MilestoneEscrow: not disputed");
    });
  });
});
