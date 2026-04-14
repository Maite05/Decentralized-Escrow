import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { EscrowFactory, MockERC20, MediatorRegistry } from "../typechain-types";

describe("EscrowFactory", function () {
  async function deployFixture() {
    const [owner, client, freelancer, clientB] = await ethers.getSigners();

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

    const FactoryFactory = await ethers.getContractFactory("EscrowFactory");
    const factory = (await FactoryFactory.deploy(
      await registry.getAddress(),
      owner.address  // feeRecipient
    )) as unknown as EscrowFactory;

    return { factory, token, registry, owner, client, freelancer, clientB };
  }

  describe("Deployment", function () {
    it("stores mediatorRegistry address", async function () {
      const { factory, registry } = await loadFixture(deployFixture);
      expect(await factory.mediatorRegistry()).to.equal(
        await registry.getAddress()
      );
    });

    it("stores feeRecipient address", async function () {
      const { factory, owner } = await loadFixture(deployFixture);
      expect(await factory.feeRecipient()).to.equal(owner.address);
    });

    it("reverts with zero registry address", async function () {
      const [owner] = await ethers.getSigners();
      const FactoryFactory = await ethers.getContractFactory("EscrowFactory");
      await expect(
        FactoryFactory.deploy(ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("EscrowFactory: zero registry");
    });

    it("reverts with zero feeRecipient address", async function () {
      const { registry } = await loadFixture(deployFixture);
      const FactoryFactory = await ethers.getContractFactory("EscrowFactory");
      await expect(
        FactoryFactory.deploy(await registry.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("EscrowFactory: zero feeRecipient");
    });

    it("starts with zero project count", async function () {
      const { factory } = await loadFixture(deployFixture);
      expect(await factory.projectCount()).to.equal(0n);
    });
  });

  describe("createProject", function () {
    it("deploys a unique MilestoneEscrow address per call", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      const tokenAddr = await token.getAddress();

      const tx1 = await factory
        .connect(client)
        .createProject(freelancer.address, tokenAddr, ethers.parseEther("500"));
      const receipt1 = await tx1.wait();
      const tx2 = await factory
        .connect(client)
        .createProject(freelancer.address, tokenAddr, ethers.parseEther("500"));
      const receipt2 = await tx2.wait();

      const iface = factory.interface;
      const log1 = receipt1!.logs
        .map(l => { try { return iface.parseLog(l); } catch { return null; } })
        .find(l => l?.name === "ProjectCreated");
      const log2 = receipt2!.logs
        .map(l => { try { return iface.parseLog(l); } catch { return null; } })
        .find(l => l?.name === "ProjectCreated");

      expect(log1).to.not.be.null;
      expect(log2).to.not.be.null;
      expect(log1!.args.escrow).to.not.equal(log2!.args.escrow);
    });

    it("increments projectCount", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      await factory
        .connect(client)
        .createProject(
          freelancer.address,
          await token.getAddress(),
          ethers.parseEther("100")
        );
      expect(await factory.projectCount()).to.equal(1n);
      await factory
        .connect(client)
        .createProject(
          freelancer.address,
          await token.getAddress(),
          ethers.parseEther("100")
        );
      expect(await factory.projectCount()).to.equal(2n);
    });

    it("indexes by client correctly", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      await factory
        .connect(client)
        .createProject(
          freelancer.address,
          await token.getAddress(),
          ethers.parseEther("200")
        );
      const projects = await factory.getProjectsByClient(client.address);
      expect(projects.length).to.equal(1);
    });

    it("indexes by freelancer correctly", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      await factory
        .connect(client)
        .createProject(
          freelancer.address,
          await token.getAddress(),
          ethers.parseEther("200")
        );
      const projects = await factory.getProjectsByFreelancer(
        freelancer.address
      );
      expect(projects.length).to.equal(1);
    });

    it("two different clients produce separate index entries", async function () {
      const { factory, token, client, freelancer, clientB } =
        await loadFixture(deployFixture);
      const tokenAddr = await token.getAddress();
      await factory
        .connect(client)
        .createProject(freelancer.address, tokenAddr, ethers.parseEther("100"));
      await factory
        .connect(clientB)
        .createProject(freelancer.address, tokenAddr, ethers.parseEther("100"));

      expect(
        (await factory.getProjectsByClient(client.address)).length
      ).to.equal(1);
      expect(
        (await factory.getProjectsByClient(clientB.address)).length
      ).to.equal(1);
      expect(
        (await factory.getProjectsByFreelancer(freelancer.address)).length
      ).to.equal(2);
    });

    it("getAllProjects grows with each deployment", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      const tokenAddr = await token.getAddress();
      await factory
        .connect(client)
        .createProject(freelancer.address, tokenAddr, ethers.parseEther("50"));
      await factory
        .connect(client)
        .createProject(freelancer.address, tokenAddr, ethers.parseEther("50"));
      expect((await factory.getAllProjects()).length).to.equal(2);
    });

    it("emits ProjectCreated with correct args", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      const amount = ethers.parseEther("300");
      const tokenAddr = await token.getAddress();

      const tx = await factory
        .connect(client)
        .createProject(freelancer.address, tokenAddr, amount);
      const receipt = await tx.wait();
      const iface = factory.interface;
      const log = receipt!.logs
        .map(l => { try { return iface.parseLog(l); } catch { return null; } })
        .find(l => l?.name === "ProjectCreated");

      expect(log).to.not.be.null;
      expect(log!.args.projectId).to.equal(1n);
      expect(log!.args.client).to.equal(client.address);
      expect(log!.args.freelancer).to.equal(freelancer.address);
      expect(log!.args.token).to.equal(tokenAddr);
      expect(log!.args.totalAmount).to.equal(amount);
    });

    it("reverts for zero freelancer", async function () {
      const { factory, token, client } = await loadFixture(deployFixture);
      await expect(
        factory
          .connect(client)
          .createProject(
            ethers.ZeroAddress,
            await token.getAddress(),
            ethers.parseEther("100")
          )
      ).to.be.revertedWith("EscrowFactory: zero freelancer");
    });

    it("reverts for zero amount", async function () {
      const { factory, token, client, freelancer } =
        await loadFixture(deployFixture);
      await expect(
        factory
          .connect(client)
          .createProject(freelancer.address, await token.getAddress(), 0n)
      ).to.be.revertedWith("EscrowFactory: zero amount");
    });
  });
});
