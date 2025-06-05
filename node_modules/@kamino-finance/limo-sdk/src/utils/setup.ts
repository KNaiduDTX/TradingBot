import {
  Connection,
  ConnectionConfig,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  endpointFromCluster,
  getLimoProgramId,
  getPdaAuthority,
  getTokenVaultPDA,
  UserAccounts,
  solAirdrop,
  sleep,
  setupAta,
  mintTo,
  amountToLamportsDecimal,
  GlobalAccounts,
  TokenInfo,
  getAssociatedTokenAddress,
} from "./utils";
import { Cluster, LimoIdl, parseKeypairFile } from "./utils";
import Decimal from "decimal.js";
import { LimoClient, WRAPPED_SOL_MINT } from "../Limo";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export type Env = {
  provider: anchor.AnchorProvider;
  conn: Connection;
  program: anchor.Program;
  admin: Keypair;
  cluster: Cluster;
};

export function setUpProgram(args: {
  clusterOverride?: string;
  adminFilePath?: string;
  programOverride?: PublicKey;
}): Env {
  // Cluster & admin
  if (!args.clusterOverride) {
    throw new Error("Cluster is required");
  }

  const cluster = args.clusterOverride;
  const config: ConnectionConfig = {
    commitment: anchor.AnchorProvider.defaultOptions().commitment,
    confirmTransactionInitialTimeout: 220000,
  };
  const connection = new Connection(endpointFromCluster(cluster), config);

  const payer = args.adminFilePath
    ? parseKeypairFile(args.adminFilePath)
    : Keypair.generate();
  // @ts-ignore
  const wallet = new anchor.Wallet(payer);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions(),
  );
  const admin = payer;
  anchor.setProvider(provider);

  // Programs
  const limoProgramId = args.programOverride || getLimoProgramId(cluster);
  const program = new anchor.Program(LimoIdl, limoProgramId);

  return {
    admin,
    provider,
    conn: connection,
    program,
    cluster: cluster as Cluster,
  };
}

export async function createGlobalAccounts(
  env: Env,
  owner: Keypair = env.admin,
  tokenSymbols: string[] = ["SOL", "USDC", "KMNO"],
): Promise<GlobalAccounts> {
  const globalConfig: Keypair = Keypair.generate();
  const tokenInfos: Map<string, TokenInfo> = new Map();
  const tokenVaults: Map<string, PublicKey> = new Map();

  for (const token of tokenSymbols) {
    if (token === "SOL") {
      tokenInfos.set(token, new TokenInfo(token, WRAPPED_SOL_MINT, 9));
      let tokenVault = getTokenVaultPDA(
        env.program.programId,
        globalConfig.publicKey,
        WRAPPED_SOL_MINT,
      );
      tokenVaults.set(token, tokenVault);
      solAirdrop(env.provider, owner.publicKey, new Decimal(100));
    } else {
      const mint = await createMint(
        env.provider,
        env.provider.wallet.publicKey,
        6,
      );

      let tokenVault = getTokenVaultPDA(
        env.program.programId,
        globalConfig.publicKey,
        mint,
      );
      tokenInfos.set(token, new TokenInfo(token, mint, 6));
      tokenVaults.set(token, tokenVault);

      const tokenAta = await setupAta(env.provider, mint, owner);
      await mintTo(
        env.provider,
        mint,
        tokenAta,
        amountToLamportsDecimal(new Decimal(100000.0), 6).toNumber(),
        6,
      );
    }
  }

  let pdaAuthority = getPdaAuthority(
    env.program.programId,
    globalConfig.publicKey,
  );

  const limoClient = new LimoClient(env.conn, undefined);

  const globalAccounts: GlobalAccounts = {
    globalAdmin: owner,
    globalConfig,
    pdaAuthority,
    tokens: tokenInfos,
    vaults: tokenVaults,
    limoClient,
  };

  solAirdrop(env.provider, pdaAuthority, new Decimal(0.1));

  return globalAccounts;
}

export async function setGlobalAccounts(
  env: Env,
  owner: Keypair = env.admin,
  skipInitVaults: boolean = false,
): Promise<GlobalAccounts> {
  const globalAccounts = await createGlobalAccounts(env, owner);
  const limoClient = globalAccounts.limoClient;

  await limoClient.createGlobalConfig(
    globalAccounts.globalAdmin,
    globalAccounts.globalConfig,
  );

  limoClient.setGlobalConfig(globalAccounts.globalConfig.publicKey);

  if (!skipInitVaults) {
    for (const [, token] of globalAccounts.tokens.entries()) {
      await limoClient.initializeVault(globalAccounts.globalAdmin, token.mint);
    }
  }

  return globalAccounts;
}

export async function createUser(
  env: Env,
  globalAccounts: GlobalAccounts,
  tokenAndAirdropAmounts: { token: string; amount: Decimal }[],
  owner?: Keypair,
): Promise<UserAccounts> {
  if (!owner) {
    owner = new anchor.web3.Keypair();
  }

  const userAtas: Map<string, PublicKey> = new Map();

  for (const { token, amount } of tokenAndAirdropAmounts) {
    const tokenInfo = globalAccounts.tokens.get(token)!;
    userAtas.set(
      token,
      getAssociatedTokenAddress(
        owner.publicKey,
        tokenInfo.mint,
        TOKEN_PROGRAM_ID,
      ),
    );
    if (amount.isZero()) {
      continue;
    }
    if (token === "SOL") {
      await solAirdrop(env.provider, owner.publicKey, amount);
      await sleep(1000);
    } else {
      const tokenAta = await setupAta(env.provider, tokenInfo.mint, owner);
      await mintTo(
        env.provider,
        tokenInfo.mint,
        tokenAta,
        amountToLamportsDecimal(amount, tokenInfo.mintDecimals).toNumber(),
        tokenInfo.mintDecimals,
      );
      await sleep(1000);
    }
  }

  const testingUser: UserAccounts = {
    owner,
    tokenAtas: userAtas,
  };

  return testingUser;
}
