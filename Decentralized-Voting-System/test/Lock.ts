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

    const lockedAmount = hre.ethers.parseEther("1");
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, to, voter1, voter2, voter3, voter4] =
      await hre.ethers.getSigners();

    const Vote = await hre.ethers.getContractFactory("Vote");
    const vote = await Vote.deploy(unlockTime, owner, [
      voter1,
      voter2,
      voter3,
      voter4,
    ]);

    return { vote, unlockTime, lockedAmount, owner, to, voter1, voter2 };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { vote, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await vote.unlockTime()).to.equal(unlockTime);
    });
  });

  it("Should set the right owner", async function () {
    const { vote, owner } = await loadFixture(deployOneYearLockFixture);

    expect(await vote.owner()).to.equal(owner.address);
  });

  it("Should receive and store the funds to lock", async function () {
    const { vote, lockedAmount, owner } = await loadFixture(
      deployOneYearLockFixture
    );
    await hre.ethers.provider.send("eth_sendTransaction", [
      {
        from: owner.address,
        to: vote.target,
        value: lockedAmount.toString(),
      },
    ]);
    const balance = await hre.ethers.provider.getBalance(vote.target);
    console.log("balance", balance);
    expect(hre.ethers.formatEther(balance)).to.equal(
      hre.ethers.formatEther(lockedAmount)
    );
  });
});

it("Should fail if the unlockTime is not in the future", async function () {
  // We don't use the fixture here because we want a different deployment
  const latestTime = await time.latest();
  const [owner, voter1, voter2, voter3, voter4] = await hre.ethers.getSigners();
  const Lock = await hre.ethers.getContractFactory("Vote");
  await expect(
    Lock.deploy(latestTime, owner, [voter1, voter2, voter3, voter4])
  ).to.be.revertedWith("Unlock time must be in the future");
});

describe("Withdrawals", async function () {
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    const lockedAmount = hre.ethers.parseEther("5");
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, to, voter1, voter2, voter3, voter4] =
      await hre.ethers.getSigners();

    const Vote = await hre.ethers.getContractFactory("Vote");
    const vote = await Vote.deploy(unlockTime, owner, [
      voter1,
      voter2,
      voter3,
      voter4,
    ]);
    await hre.ethers.provider.send("eth_sendTransaction", [
      {
        from: owner.address,
        to: vote.target,
        value: lockedAmount.toString(),
      },
    ]);
    const proposal = await vote
      .connect(owner)
      .proposeAProposal(lockedAmount, to);

    return {
      vote,
      unlockTime,
      lockedAmount,
      owner,
      to,
      voter1,
      voter2,
      voter3,
      voter4,
      proposal,
    };
  }
  describe("Validations", function () {
    it("Should propose a proposal", async function () {
      const { vote, owner, voter1, lockedAmount, to, proposal } =
        await loadFixture(deployOneYearLockFixture);

      expect(proposal).to.be.ok;
      const filter = vote.filters.ProposalCreated();
      const events = await vote.queryFilter(filter);
      expect(events.length).to.equal(1);
      const proposalId = events[0].args[0];
      console.log("proposalId", proposalId);
      expect(events[0].args[0]).to.equal(proposalId);
      expect(events[0].args[1]).to.equal(lockedAmount);
      expect(events[0].args[2]).to.equal(to);
    });
  });
  it("should vote for a proposal", async function () {
    const {
      vote,
      owner,
      voter1,
      voter2,
      voter3,
      lockedAmount,
      to,
      proposal,
      unlockTime,
    } = await loadFixture(deployOneYearLockFixture);

    expect(proposal).to.be.ok;
    const filter = vote.filters.ProposalCreated();
    const events1 = await vote.queryFilter(filter);
    expect(events1.length).to.equal(1);
    const proposalId = events1[0].args[0];
    console.log("proposalId", proposalId);
    const vote1 = await vote.connect(voter1).voteForProposal(proposalId, true);
    const vote2 = await vote.connect(voter2).voteForProposal(proposalId, false);
    const vote3 = await vote.connect(voter3).voteForProposal(proposalId, true);
    const filter1 = vote.filters.Voted();
    const events = await vote.queryFilter(filter1);
    console.log("events", events);

    const getWhohastVoted = await vote.getWhoVotedOnAproposal(proposalId);
    console.log(getWhohastVoted);
    await time.increaseTo(unlockTime);
    const publish = await vote.connect(owner).publishProposal(proposalId);
    const filter3 = vote.filters.Passed();
    const events2 = await vote.queryFilter(filter3);
    console.log(events2);
    const toBalanceb = await hre.ethers.provider.getBalance(to.address);
    console.table(hre.ethers.formatEther(toBalanceb));
    const withdraw = await vote.connect(to).withdrawFunds(proposalId);
    const toBalance = await hre.ethers.provider.getBalance(to.address);
    console.table(hre.ethers.formatEther(toBalance));
    const proposalView = await vote.getProposalDetails(proposalId);
    console.log("proposal", proposalView);
  });
});

//   it("Should revert with the right error if called from another account", async function () {
//     const { lock, unlockTime, otherAccount } = await loadFixture(
//       deployOneYearLockFixture
//     );

//     // We can increase the time in Hardhat Network
//     await time.increaseTo(unlockTime);

//     // We use lock.connect() to send a transaction from another account
//     await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
//       "You aren't the owner"
//     );
//   });

//   it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
//     const { lock, unlockTime } = await loadFixture(
//       deployOneYearLockFixture
//     );

//     // Transactions are sent using the first signer by default
//     await time.increaseTo(unlockTime);

//     await expect(lock.withdraw()).not.to.be.reverted;
//   });
// });

// describe("Events", function () {
//   it("Should emit an event on withdrawals", async function () {
//     const { lock, unlockTime, lockedAmount } = await loadFixture(
//       deployOneYearLockFixture
//     );

//     await time.increaseTo(unlockTime);

//     await expect(lock.withdraw())
//       .to.emit(lock, "Withdrawal")
//       .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
//   });
// });

// describe("Transfers", function () {
//   it("Should transfer the funds to the owner", async function () {
//     const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
//       deployOneYearLockFixture
//     );

//     await time.increaseTo(unlockTime);

//     await expect(lock.withdraw()).to.changeEtherBalances(
//       [owner, lock],
//       [lockedAmount, -lockedAmount]
//     );
//   });
// });
