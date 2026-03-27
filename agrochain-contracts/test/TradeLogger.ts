import { expect } from "chai";
import { ethers } from "hardhat";
import { TradeLogger } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TradeLogger", function () {
  let tradeLogger: TradeLogger;
  let owner: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const TradeLoggerFact = await ethers.getContractFactory("TradeLogger");
    tradeLogger = (await TradeLoggerFact.deploy()) as unknown as TradeLogger;
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await tradeLogger.owner()).to.equal(owner.address);
    });
  });

  describe("Logging", function () {
    const tradeRef = "e2e-order-id-123";
    const escrowState = "RELEASED";
    const deliveryConfirmed = true;
    const timestamp = Math.floor(Date.now() / 1000);
    const buyerHash = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    const sellerHash = ethers.zeroPadValue(ethers.toBeHex(2), 32);

    it("Should allow the owner to log a trade", async function () {
      await expect(
        tradeLogger.logTrade(
          tradeRef,
          escrowState,
          deliveryConfirmed,
          timestamp,
          buyerHash,
          sellerHash
        )
      )
        .to.emit(tradeLogger, "TradeLogged")
        .withArgs(tradeRef, escrowState, deliveryConfirmed, BigInt(timestamp));
    });

    it("Should fail if a non-owner tries to log a trade", async function () {
      await expect(
        tradeLogger.connect(otherAccount).logTrade(
          tradeRef,
          escrowState,
          deliveryConfirmed,
          timestamp,
          buyerHash,
          sellerHash
        )
      ).to.be.revertedWithCustomError(tradeLogger, "OwnableUnauthorizedAccount");
    });

    it("Should fail if trade reference is empty", async function () {
      await expect(
        tradeLogger.logTrade(
          "",
          escrowState,
          deliveryConfirmed,
          timestamp,
          buyerHash,
          sellerHash
        )
      ).to.be.revertedWith("Trade reference required");
    });
  });
});
