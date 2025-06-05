import { Keypair, PublicKey } from "@solana/web3.js";
import { GlobalConfig } from "../rpc_client/accounts";
import { initializeClient } from "./utils";
import {
  getLimoProgramId,
  getSolBalanceInLamports,
  getTokenAccountBalance,
  getTokenVaultPDA,
  parseKeypairFile,
  PublicKeySet,
} from "../utils";
import { LimoClient } from "../Limo";
import * as fs from "fs";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";

export async function initGlobalConfigCommand(globalConfigFilePath?: string) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  console.log("rpc", rpc);
  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const globalConfig = globalConfigFilePath
    ? parseKeypairFile(globalConfigFilePath)
    : Keypair.generate();
  const client = new LimoClient(env.provider.connection, undefined);
  await client.createGlobalConfig(env.admin, globalConfig);

  let globalConfigState: GlobalConfig | null = await GlobalConfig.fetch(
    env.provider.connection,
    globalConfig.publicKey,
  );
  console.log(
    "Global Config",
    globalConfig.publicKey.toString(),
    globalConfigState?.toJSON(),
  );
}

export async function initVault(mint: PublicKey, mode: string) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;
  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );
  let vault = getTokenVaultPDA(
    client.getProgramID(),
    new PublicKey(globalConfig!),
    mint,
  );

  await client.initializeVault(env.admin, mint, mode);

  mode !== "multisig" && console.log("Vault", vault.toString());
}

export async function initVaultsFromMintsListFile(
  mintsListFilePath: string,
  mode: string,
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = process.env.LIMO_GLOBAL_CONFIG;
  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  const fileContents = fs.readFileSync(mintsListFilePath, "utf8");

  // Parse the file contents into an array of mints
  let mints: string[];
  try {
    mints = JSON.parse(fileContents);
    if (!Array.isArray(mints)) {
      throw new Error("File doesn't have an array");
    }
  } catch (error) {
    console.error("Error parsing mints list file:", error);
    process.exit(1);
  }

  console.log("Mints to initialize vaults for:", mints.length);

  const mintsSet = new PublicKeySet(mints.map((mint) => new PublicKey(mint)));

  for (let mint of mintsSet.toArray()) {
    const mintPk = new PublicKey(mint);
    const vaultAddress = getTokenVaultPDA(
      client.getProgramID(),
      new PublicKey(globalConfig!),
      mintPk,
    );
    try {
      const vaultBalance = (
        await client.getConnection().getAccountInfo(vaultAddress)
      )?.lamports;
      if (vaultBalance! > 0) {
        mode !== "multisig" &&
          console.log(
            `Vault ${vaultAddress.toString()} already has a balance of ${vaultBalance} so is initialized`,
          );
        continue;
      }
    } catch (error) {
      // do nothing
    }

    await client.initializeVault(env.admin, mintPk, mode);

    mode !== "multisig" && console.log("Vault", vaultAddress.toString());
  }
}

export async function getAllMintsFromKaminoResources() {}

const API_URL = "https://cdn.kamino.finance/resources.json";

type Link = {
  title: string;
  url: string;
};

type TokenInfo = {
  heading: string;
  links: Link[];
  text: string;
  oracle: string;
  mint: string;
};

type Tokens = {
  [key: string]: TokenInfo;
};

export async function getKaminoTokenMintsFromApi() {
  console.log("Fetching mints from API...");
  const supportedTokenMints: PublicKey[] = [];

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: any = await response.json();
    const tokensDict: Tokens = data["mainnet-beta"].tokens;
    for (const token of Object.values(tokensDict)) {
      supportedTokenMints.push(new PublicKey(token.mint));
    }
  } catch (error) {
    console.log("Failed to fetch token mints:", error);
  }

  fs.writeFileSync(
    "./kaminoTokenMints.json",
    JSON.stringify(supportedTokenMints),
  );

  console.log("Written to: ", "./kaminoTokenMints.json");
}
