import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type {
  MilestoneEscrow,
  MockERC20,
  MediatorRegistry,
  MaliciousERC20,
} from "../typechain-types";

describe("MilestoneEscrow", function () {
  const TOTAL_AMOUNT = ethers.parseEther("1000");
  const MILESTONE_AMOUNT = ethers.parseEther("200");

  async function deployFixture() {
    const [owner, client, freelancer, mediator, stranger] =
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
      TOTAL_AMOUNT,
      await registry.getAddress()
    )) as unknown as MilestoneEscrow;

    await token.mint(client.address, TOTAL_AMOUNT * 2n);
    await token
      .connect(client)
      .approve(await escrow.getAddress(), TOTAL_AMOUNT * 2n);

    return {
      escrow,
      token,
      registry,
      owner,
      client,
      freelancer,
      mediator,
      stranger,
    };
  }

  describe("Deployment", function () {
    it("sets project fields correctly", async function () {
      const { escrow, token, client, freelancer } =
        await loadFixture(deployFixture);
      const p = await escrow.project();
      expect(p.id).to.equal(1n);
      expect(p.client).to.equal(client.address);
      expect(p.freelancer).to.equal(freelancer.address);
      expect(p.token).to.equal(await token.getAddress());
      expect(p.totalAmount).to.equal(TOTAL_AMOUNT);
    });

    it("emits ProjectCreated on deployment", async function () {
      const [owner2, client2, freelancer2] = await ethers.getSigners();
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const token2 = await MockERC20Factory.deploy("T", "T", 18);
      const RegistryFactory =
        await ethers.getContractFactory("MediatorRegistry");
      const registry2 = await RegistryFactory.deploy(
        await token2.getAddress(),
        owner2.address
      );

      const EscrowFactory =
        await ethers.getContractFactory("MilestoneEscrow");
      await expect(
        EscrowFactory.deploy(
          42n,
          client2.address,
          freelancer2.address,
          await token2.getAddress(),
          ethers.parseEther("500"),
          await registry2.getAddress()
        )
      ).to.emit(
        await ethers
          .getContractFactory("MilestoneEscrow")
          .then(() => EscrowFactory.deploy(
            43n,
            client2.address,
            freelancer2.address,
            await token2.getAddress(),
            ethers.parseEther("500"),
            await registry2.getAddress()
          )),
        "ProjectCreated"
      );
    });

    it("reverts if client == freelancer", async function () {
      const [owner2, same] = await ethers.getSigners();
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const token2 = await MockERC20Factory.deploy("T", "T", 18);
      const RegistryFactory =
        await ethers.getContractFactory("MediatorRegistry");
      const registry2 = await RegistryFactory.deploy(
        await token2.getAddress(),
        owner2.address
      );
      const EscrowFactory =
        await ethers.getContractFactory("MilestoneEscrow");
      await expect(
        EscrowFactory.deploy(
          1n,
          same.address,
          same.address,
          await token2.getAddress(),
          ethers.parseEther("100"),
          await registry2.getAddress()
        )
      ).to.be.revertedWith("MilestoneEscrow: client == freelancer");
    });
  });

  describe("createProject", function () {
    it("transfers tokens from client into escrow", async function () {
      const { escrow, token, client } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(client).createProject(TOTAL_AMOUNT)
      ).to.changeTokenBalance(token, escrow, TOTAL_AMOUNT);
    });

    it("reverts if called by non-client", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(freelancer).createProject(TOTAL_AMOUNT)
      ).to.be.revertedWith("MilestoneEscrow: not client");
    });

    it("reverts on zero amount", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(client).createProject(0n)
      ).to.be.revertedWith("MilestoneEscrow: zero amount");
    });
  });

  describe("addMilestone", function () {
    it("adds a milestone and increments count", async function () {
      const { escrow, client } = await loadFixture(deployFixture);
      await escrow.connect(client).addMilestone(MILESTONE_AMOUNT, "Design");
      expect(await escrow.getMilestoneCount()).to.equal(1n);
      const m = await escrow.getMilestone(0n);
      expect(m.amount).to.equal(MILESTONE_AMOUNT);
      expect(m.description).to.equal("Design");
      expect(m.state).to.equal(0n); // LOCKED
    });

    it("reverts if called by non-client", async function () {
      const { escrow, freelancer } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(freelancer).addMilestone(MILESTONE_AMOUNT, "x")
      ).to.be.revertedWith("MilestoneEscrow: not client");
    });
  });

  describe("Happy path: fund → add → deliver → approve", function () {
    async function fundedFixture() {
      const base = await deployFixture();
      await base.escrow
        .connect(base.client)
        .createProject(TOTAL_AMOUNT);
      await base.escrow
        .connect(base.client)
        .addMilestone(MILESTONE_AMOUNT, "Milestone 1");
      return base;
    }

    it("freelancer marks delivered → state becomes DELIVERED", async function () {
      const { escrow, freelancer } = await loadFixture(fundedFixture);
      await escrow.connect(freelancer).markDelivered(0n);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(1n); 
    });

    it("client approves → payment released to freelancer", async function () {
      const { escrow, token, client, freelancer } =
        await loadFixture(fundedFixture);
      await escrow.connect(freelancer).markDelivered(0n);
      await expect(
        escrow.connect(client).approveMilestone(0n)
      ).to.changeTokenBalance(token, freelancer, MILESTONE_AMOUNT);
      const m = await escrow.getMilestone(0n);
      expect(m.state).to.equal(2n);
    });

    it("emits Released event", async function () {
      const { escrow, client, freelancer } =
        await loadFixture(fundedFixture);
      await escrow.connect(freelancer).markDelivered(0n);
      await expect(escrow.connect(client).approveMilestone(0n))
        .to.emit(escrow, "Released")
        .withArgs(1n, 0n, freelancer.address, MILESTONE_AMOUNT);
    });
  });

  describe("Revert cases", function () {
    async function fundedWithMilestone() {
      const base = await deployFixture();
      await base.escrow.connect(base.client).createProject(TOTAL_AMOUNT);
      await base.escrow
        .connect(base.client)
        .addMilestone(MILESTONE_AMOUNT, "M1");
      return base;
    }

    it("markDelivered reverts if not freelancer", async function () {
      const { escrow, client } = await loadFixture(fundedWithMilestone);
      await expect(
        escrow.connect(client).markDelivered(0n)
      ).to.be.revertedWith("MilestoneEscrow: not freelancer");
    });

    it("approveMilestone reverts if not delivered yet", async function () {
      const { escrow, client } = await loadFixture(fundedWithMilestone);
      await expect(
        escrow.connect(client).approveMilestone(0n)
      ).to.be.revertedWith("MilestoneEscrow: not delivered");
    });

    it("approveMilestone reverts if called twice (state check)", async function () {
      const { escrow, client, freelancer } =
        await loadFixture(fundedWithMilestone);
      await escrow.connect(freelancer).markDelivered(0n);
      await escrow.connect(client).approveMilestone(0n);
      await expect(
        escrow.connect(client).approveMilestone(0n)
      ).to.be.revertedWith("MilestoneEscrow: not delivered");
    });

    it("getMilestone reverts for out-of-range id", async function () {
      const { escrow } = await loadFixture(fundedWithMilestone);
      await expect(escrow.getMilestone(99n)).to.be.revertedWith(
        "MilestoneEscrow: milestone does not exist"
      );
    });

    it("stranger cannot call addMilestone", async function () {
      const { escrow, stranger } = await loadFixture(fundedWithMilestone);
      await expect(
        escrow.connect(stranger).addMilestone(MILESTONE_AMOUNT, "x")
      ).to.be.revertedWith("MilestoneEscrow: not client");
    });
  });

  describe("Reentrancy protection", function () {
    it("reverts reentrancy attempt on approveMilestone via malicious token", async function () {
      const [owner2, client2, freelancer2, mediator2] =
        await ethers.getSigners();

      const MaliciousFactory =
        await ethers.getContractFactory("MaliciousERC20");
      const malToken =
        (await MaliciousFactory.deploy()) as unknown as MaliciousERC20;

      const RegistryFactory =
        await ethers.getContractFactory("MediatorRegistry");
      const registry2 = (await RegistryFactory.deploy(
        await malToken.getAddress(),
        owner2.address
      )) as unknown as MediatorRegistry;

      await malToken.mint(mediator2.address, ethers.parseEther("200"));
      await malToken
        .connect(mediator2)
        .approve(await registry2.getAddress(), ethers.parseEther("200"));
      await registry2.connect(mediator2).register(ethers.parseEther("100"));

      const EscrowFactory =
        await ethers.getContractFactory("MilestoneEscrow");
      const escrow2 = (await EscrowFactory.deploy(
        10n,
        client2.address,
        freelancer2.address,
        await malToken.getAddress(),
        ethers.parseEther("500"),
        await registry2.getAddress()
      )) as unknown as MilestoneEscrow;

      await malToken.mint(client2.address, ethers.parseEther("600"));
      await malToken
        .connect(client2)
        .approve(await escrow2.getAddress(), ethers.parseEther("600"));
      await escrow2.connect(client2).createProject(ethers.parseEther("500"));
      await escrow2
        .connect(client2)
        .addMilestone(ethers.parseEther("200"), "Re-entry target");

      await escrow2.connect(freelancer2).markDelivered(0n);

      await malToken.enableAttack(await escrow2.getAddress(), 0);

      // The first call should succeed (reentrancy guard kicks in for the nested call)
      // The outer call completes; the inner re-entry attempt is silently caught by try/catch
      // in MaliciousERC20. We verify state is RELEASED exactly once (amount transferred once).
      await expect(
        escrow2.connect(client2).approveMilestone(0n)
      ).to.changeTokenBalance(malToken, freelancer2, ethers.parseEther("200"));

      const m = await escrow2.getMilestone(0n);
      expect(m.state).to.equal(2n);
    });
  });
});
