import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();
// Fallback to parent .env
dotenv.config({ path: "../.env" });

// Manual parsing fallback (in case of encoding/path issues)
try {
  const fs = require("fs");
  const path = require("path");
  [".env", "../.env"].forEach(p => {
    try {
      if (fs.existsSync(p)) {
        const env = fs.readFileSync(p, "utf8");
        env.split("\n").forEach((line: string) => {
          const [key, value] = line.split("=");
          if (key && value) {
            const k = key.trim();
            const v = value.trim().replace(/^['"](.*)['"]$/, '$1');
            if (k && v && !process.env[k]) {
              process.env[k] = v;
            }
          }
        });
      }
    } catch (e) { }
  });
} catch (e) { }

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.BLOCKCHAIN_PRIVATE_KEY !== undefined ? [process.env.BLOCKCHAIN_PRIVATE_KEY] : [],
      chainId: 84532,
    },
  },
};

export default config;
