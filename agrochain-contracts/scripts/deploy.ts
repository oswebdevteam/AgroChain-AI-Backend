import { ethers } from "hardhat";

async function main() {
  console.log("Starting TradeLogger deployment to Base Sepolia...");

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer found. Please ensure BLOCKCHAIN_PRIVATE_KEY is set in your .env file."
    );
  }
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatUnits(balance, "ether"), "ETH");

  const TradeLogger = await ethers.getContractFactory("TradeLogger");
  const tradeLogger = await TradeLogger.deploy();

  await tradeLogger.waitForDeployment();

  const contractAddress = await tradeLogger.getAddress();

  console.log("--------------------------------------------------");
  console.log("TradeLogger deployed to:", contractAddress);
  console.log("Transaction hash:", tradeLogger.deploymentTransaction()?.hash);
  console.log("--------------------------------------------------");
  console.log("Copy this address to your backend .env under TRADE_LOGGER_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
