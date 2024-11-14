import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("DecentraLotto", function () {
  let hardhatOurContract, hardhatVrfCoordinatorV2Mock;

  async function deployFixture() {
    const TimeInSecs = 8 * 24 * 60 * 60; // Adjusted to a typical week
    const unlockTime = (await time.latest()) + TimeInSecs;

    // Contracts deployed by the first signer by default
    const [owner, liz, emma, chris, jr, chrisliz, aime] =
      await hre.ethers.getSigners();

    const LottoContractFactory = await ethers.getContractFactory(
      "DecentraLotto"
    );
    const VRFMockFactory = await ethers.getContractFactory(
      "VRFCoordinatorV2Mock"
    );

    hardhatVrfCoordinatorV2Mock = await VRFMockFactory.deploy(0, 0);
    await hardhatVrfCoordinatorV2Mock.createSubscription();
    await hardhatVrfCoordinatorV2Mock.fundSubscription(
      1,
      ethers.parseEther("7")
    );

    hardhatOurContract = await LottoContractFactory.deploy(
      1,
      hardhatVrfCoordinatorV2Mock.target
    );

    return {
      owner,
      liz,
      emma,
      chris,
      jr,
      chrisliz,
      aime,
      hardhatOurContract,
      hardhatVrfCoordinatorV2Mock,
      unlockTime,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { hardhatOurContract, owner } = await loadFixture(deployFixture);
      expect(await hardhatOurContract.owner()).to.equal(owner.address);
    });
  });

  describe("Buying Tickets", function () {
    it("Should allow users to buy tickets", async function () {
      const { hardhatOurContract, liz } = await loadFixture(deployFixture);

      await hardhatOurContract
        .connect(liz)
        .buyTicket({ value: ethers.parseEther("0.1") });
      expect(await hardhatOurContract.ticketCount(liz.address)).to.equal(1);
    });
  });

  describe("Lottery Process", function () {
    it("Should complete the lottery process and pick a winner", async function () {
      const {
        hardhatOurContract,
        hardhatVrfCoordinatorV2Mock,
        liz,
        emma,
        chris,
        chrisliz,
        aime,
        jr,
        owner,
        unlockTime,
      } = await loadFixture(deployFixture);

      // Multiple users buying tickets
      for (const user of [liz, emma, chris, chrisliz, aime, jr]) {
        await hardhatOurContract
          .connect(user)
          .buyTicket({ value: ethers.parseEther("0.1") });
      }

      // Advance time to allow choosing a winner
      await time.increaseTo(unlockTime);

      // Request winner selection
      const tx = await hardhatOurContract.connect(owner).chooseWinner();
      await expect(tx).to.emit(hardhatOurContract, "RequestedRandomness");

      // Fulfill randomness request
      const filter = hardhatOurContract.filters.RequestedRandomness();
      const events = await hardhatOurContract.queryFilter(filter);
      const reqId = events[0].args[0];

      const fulfillTx = await hardhatVrfCoordinatorV2Mock.fulfillRandomWords(
        reqId,
        hardhatOurContract.target
      );

      // Check for Winner event
      const winnerFilter = hardhatOurContract.filters.Winner();
      const winnerEvents = await hardhatOurContract.queryFilter(winnerFilter);
      const winnerAddress = winnerEvents[0].args[0];
      const winnerIndex = winnerEvents[0].args[1];

      console.log(`Winner Address: ${winnerAddress}, Index: ${winnerIndex}`);

      // Validate Winner event emission and balance check
      await expect(fulfillTx)
        .to.emit(hardhatOurContract, "Winner")
        .withArgs(winnerAddress, winnerIndex);
      expect(await hre.ethers.provider.getBalance(winnerAddress)).to.be.gt(
        ethers.parseEther("100")
      );
    });
  });
});
