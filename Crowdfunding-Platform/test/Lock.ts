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
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;
    const goal = hre.ethers.parseEther("20");

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, beneficiary, donor1, donor2, donor3, donor4] =
      await hre.ethers.getSigners();

    const FundRising = await hre.ethers.getContractFactory("FundRising");
    const fundrising = await FundRising.connect(owner).deploy(
      unlockTime,
      goal,
      beneficiary.address,
      5
    );
    const Token = await hre.ethers.getContractFactory("FundRisingT");
    const token = await Token.deploy(fundrising.target);

    return {
      fundrising,
      unlockTime,
      lockedAmount,
      owner,
      otherAccount,
      beneficiary,
      donor1,
      donor2,
      donor3,
      donor4,
      token,
    };
  }

  describe("Deployment", function () {
    it("Should deploy", async function () {
      const { fundrising, token } = await loadFixture(deployOneYearLockFixture);

      expect(token.target).to.be.properAddress;
      expect(fundrising.target).to.be.properAddress;
    });

    it("Should set the right owner", async function () {
      const { fundrising, token, owner } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await fundrising.owner()).to.equal(owner.address);
      expect(await token.owner()).to.equal(fundrising.target);
    });

    it("Should receive and store the funds of donation", async function () {
      const { fundrising, donor1, donor2, donor3, donor4 } = await loadFixture(
        deployOneYearLockFixture
      );
      const donation = hre.ethers.parseEther("5");
      await fundrising.connect(donor1).donate({ value: donation });
      await fundrising.connect(donor2).donate({ value: donation });
      await fundrising.connect(donor3).donate({ value: donation });
      await fundrising.connect(donor4).donate({ value: donation });

      expect(await hre.ethers.provider.getBalance(fundrising.target)).to.equal(
        hre.ethers.parseEther("20")
      );
      expect(await fundrising.donorBalances(donor1.address)).to.equal(donation);
    });
    describe("success", function () {
      it("should transfer to the beneficiary", async function () {
        const {
          fundrising,
          token,
          owner,
          donor1,
          donor2,
          donor3,
          donor4,
          unlockTime,
          beneficiary,
        } = await loadFixture(deployOneYearLockFixture);
        const donation = hre.ethers.parseEther("5");
        await fundrising.connect(donor1).donate({ value: donation });
        await fundrising.connect(donor2).donate({ value: donation });
        await fundrising.connect(donor3).donate({ value: donation });
        await fundrising.connect(donor4).donate({ value: donation });
        await fundrising.connect(donor1).donate({ value: donation });

        await time.increaseTo(unlockTime);
        await fundrising.connect(owner).close();
        console.log(await fundrising.raised());
        console.log(await fundrising.goal());
        console.log(await fundrising.getAmountToReachGoal());
        const beneficiaryBalance = await hre.ethers.provider.getBalance(
          beneficiary.address
        );

        await fundrising.connect(owner).sentToBeneficiary();
        expect(
          await hre.ethers.provider.getBalance(beneficiary.address)
        ).to.equal(hre.ethers.parseEther("25") + beneficiaryBalance);
        const claimToken = await fundrising
          .connect(donor1)
          .claimReward(token.target);
        const claimToken2 = await fundrising
          .connect(donor2)
          .claimReward(token.target);
        expect(await token.balanceOf(donor1.address)).to.not.equal(0);
      });
      it("should refund donors", async function () {
        const {
          fundrising,
          token,
          owner,
          donor1,
          donor2,
          donor3,
          donor4,
          unlockTime,
          beneficiary,
        } = await loadFixture(deployOneYearLockFixture);
        const donation = hre.ethers.parseEther("5");
        await fundrising.connect(donor1).donate({ value: donation });
        await fundrising.connect(donor2).donate({ value: donation });
        await fundrising.connect(donor3).donate({ value: donation });

        await time.increaseTo(unlockTime);
        await fundrising.connect(owner).close();
        console.log(await fundrising.raised());
        console.log(await fundrising.goal());
        console.log(await fundrising.getAmountToReachGoal());
        const donor1Balance = await hre.ethers.provider.getBalance(
          donor1.address
        );
        await fundrising.connect(donor1).claimRefund();

        expect(await fundrising.donorBalances(donor1.address)).to.equal(0);
      });
    });
    describe("Withdrawals", function () {
      describe("Validations", function () {
        it("Should revert with the right error if called too soon", async function () {
          const { fundrising } = await loadFixture(deployOneYearLockFixture);
          await expect(fundrising.sentToBeneficiary()).to.be.revertedWith(
            "Time is not over"
          );
        });
        it("Should revert with the right error if called from another account", async function () {
          const { fundrising, unlockTime, otherAccount } = await loadFixture(
            deployOneYearLockFixture
          );
          // We can increase the time in Hardhat Network
          await time.increaseTo(unlockTime);
          // We use lock.connect() to send a transaction from another account
          await expect(fundrising.connect(otherAccount).close()).to.be.reverted;
        });
      });
      describe("Events", function () {
        it("Should emit an event on deposit", async function () {
          const { fundrising, donor1, unlockTime, lockedAmount } =
            await loadFixture(deployOneYearLockFixture);
          const donation = hre.ethers.parseEther("5");
          await fundrising.connect(donor1).donate({ value: donation });
          const filter = fundrising.filters.donated();
          const event = await fundrising.queryFilter(filter);
          expect(event.length).to.equal(1);
          expect(event[0].args[0]).to.equal(donor1.address);
          expect(event[0].args[1]).to.equal(donation);
        });
      });
    });
  });
});
