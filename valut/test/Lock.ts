import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, emma, liz, jr] = await hre.ethers.getSigners();

    const Token = await hre.ethers.getContractFactory("Emma");
    const token = await Token.deploy();
    const Vault = await hre.ethers.getContractFactory("TokenVault");
    const vault = await Vault.deploy(token.target, "EToken", "ETK");

    return { owner, token, emma, liz, jr, vault };
  }

  describe("Deployment", function () {
    it("Should set the right token address", async function () {
      const { token, vault } = await loadFixture(deployOneYearLockFixture);

      expect(vault.target).to.be.properAddress;
      expect(vault.target).to.be.properAddress;
    });
    it("Should set the right token name", async function () {
      const { token, vault } = await loadFixture(deployOneYearLockFixture);

      expect(await vault.name()).to.equal("EToken");
    });
  });
  describe("Deposit", function () {
    it("should deposit fund and withdraw with yield intrest of 10 %", async function name() {
      const { token, vault, emma } = await loadFixture(
        deployOneYearLockFixture
      );
      await token.mint(emma.address, 1000);
      await token.connect(emma).approve(vault.target, 1000);
      await vault.connect(emma)._deposit(100);
      expect(await vault.balanceOf(emma.address)).to.equal(100);
      expect(await token.balanceOf(emma.address)).to.equal(900);
      expect(await token.balanceOf(vault.target)).to.equal(100);
      await vault.connect(emma)._withdraw(50, emma.address);
    });
    it("should revert", async function name() {
      const { token, vault, emma } = await loadFixture(
        deployOneYearLockFixture
      );
      await token.mint(emma.address, 1000);
      await token.connect(emma).approve(vault.target, 1000);
      await vault.connect(emma)._deposit(100);
      expect(await vault.balanceOf(emma.address)).to.equal(100);
      expect(await token.balanceOf(emma.address)).to.equal(900);
      expect(await token.balanceOf(vault.target)).to.equal(100);
      expect(vault.connect(emma)._withdraw(100, emma.address)).to.revertedWith(
        'ERC4626ExceededMaxRedeem("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", 55, 45)'
      );
    });
  });
});
