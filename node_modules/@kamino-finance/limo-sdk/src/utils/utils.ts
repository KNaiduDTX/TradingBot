import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as LimoErrors from "../rpc_client/errors";
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  Signer,
  SystemProgram,
  TransactionSignature,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { Decimal } from "decimal.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createBurnCheckedInstruction,
  createBurnInstruction,
  createCloseAccountInstruction,
  createInitializeMintInstruction,
  createMintToCheckedInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import { Env } from "./setup";
import LOANBOOK_IDL from "../rpc_client/limo.json";
import { LimoClient, limoId, WRAPPED_SOL_MINT } from "../Limo";
import { GlobalConfig } from "../rpc_client/accounts/GlobalConfig";
import { PROGRAM_ID } from "../rpc_client/programId";

// @ts-ignore
import { binary_to_base58 } from "base58-js";
import { Order } from "../rpc_client/accounts";
import { get } from "http";
import BN from "bn.js";

export const LimoIdl = LOANBOOK_IDL as anchor.Idl;
export const WAD = new Decimal("1".concat(Array(18 + 1).join("0")));
export const DEFAULT_TXN_FEE_LAMPORTS = 5000;

const ESCROW_VAULT_SEED = "escrow_vault";
const GLOBAL_AUTH_SEED = "authority";
const EXPRESS_RELAY_MEATADATA_SEED = "metadata";
const EXPRESS_RELAY_CONFIG_ROUTER_SEED = "config_router";
const INTERMEDIARY_OUTPUT_TOKEN_ACCOUNT_SEED = "intermediary";
const EVENT_AUTHORITY_SEED = "__event_authority";

export interface GlobalAccounts {
  globalAdmin: Keypair;
  globalConfig: Keypair;

  pdaAuthority: PublicKey;

  tokens: Map<string, TokenInfo>;

  vaults: Map<string, PublicKey>;

  limoClient: LimoClient;
}

export class TokenInfo {
  symbol: string;
  mint: PublicKey;
  mintDecimals: number;

  constructor(symbol: string, mint: PublicKey, mintDecimal: number) {
    this.symbol = symbol;
    this.mint = mint;
    this.mintDecimals = mintDecimal;
  }
}

export interface UserAccounts {
  owner: Keypair;
  tokenAtas: Map<string, PublicKey>;
}

export function getLimoProgramId(cluster: string) {
  return PROGRAM_ID;
}

export function parseKeypairFile(file: string): Keypair {
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(require("fs").readFileSync(file))),
  );
}

export function divCeil(a: BN, b: BN): BN {
  return a.add(b).sub(new BN(1)).div(b);
}

export function amountToLamportsBN(amount: Decimal, decimals: number): BN {
  let factor = Math.pow(10, decimals);
  return new BN(amount.mul(factor).floor().toString());
}

export function amountToLamportsDecimal(
  amount: Decimal,
  decimals: number,
): Decimal {
  let factor = Math.pow(10, decimals);
  return amount.mul(factor);
}

export function lamportsToAmountBN(amount: BN, decimals: number): Decimal {
  let factor = new BN(Math.pow(10, decimals));
  return new Decimal(amount.div(factor).toString());
}

export function lamportsToAmountDecimal(
  amount: Decimal,
  decimals: number,
): Decimal {
  let factor = Math.pow(10, decimals);
  return amount.div(factor);
}

export async function createMint(
  provider: anchor.AnchorProvider,
  authority: PublicKey,
  decimals: number = 6,
): Promise<PublicKey> {
  const mint = anchor.web3.Keypair.generate();
  return await createMintFromKeypair(provider, authority, mint, decimals);
}

export async function createMintFromKeypair(
  provider: anchor.AnchorProvider,
  authority: PublicKey,
  mint: Keypair,
  decimals: number = 6,
): Promise<PublicKey> {
  const instructions = await createMintInstructions(
    provider,
    authority,
    mint.publicKey,
    decimals,
  );
  console.log("Mint auth", authority.toString());

  const tx = new anchor.web3.Transaction();
  tx.add(...instructions);

  await provider.sendAndConfirm(tx, [mint]);
  return mint.publicKey;
}

export async function getMintDecimals(
  connection: Connection,
  mint: PublicKey,
): Promise<number> {
  const mintProgramOwner = await getMintsProgramOwner(connection, mint);
  let info = await getMint(
    connection,
    mint,
    connection.commitment,
    mintProgramOwner,
  );
  return info.decimals;
}

export async function getMintsProgramOwner(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  const mintAccount = await connection.getAccountInfo(mint);

  if (!mintAccount) {
    throw new Error("Mint not found");
  }

  return mintAccount.owner;
}

async function createMintInstructions(
  provider: anchor.AnchorProvider,
  authority: PublicKey,
  mint: PublicKey,
  decimals: number,
): Promise<TransactionInstruction[]> {
  return [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint,
      space: 82,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
      programId: TOKEN_PROGRAM_ID,
    }),

    createInitializeMintInstruction(
      mint,
      decimals,
      authority,
      null,
      TOKEN_PROGRAM_ID,
    ),
  ];
}

export async function printMultisigTx(tx: Transaction) {
  console.log(binary_to_base58(tx.serializeMessage()));
}

export async function printSimulateTx(conn: Connection, tx: Transaction) {
  console.log(
    "Tx in B64",
    `https://explorer.solana.com/tx/inspector?message=${encodeURIComponent(
      tx.serializeMessage().toString("base64"),
    )}`,
  );

  let res = await conn.simulateTransaction(tx);
  console.log("Simulate Response", res);
  console.log("");
}

export async function solAirdrop(
  provider: anchor.AnchorProvider,
  account: PublicKey,
  solAirdrop: Decimal,
): Promise<Decimal> {
  const airdropTxnId = await provider.connection.requestAirdrop(
    account,
    amountToLamportsDecimal(solAirdrop, 9).toNumber(),
  );
  await provider.connection.confirmTransaction(airdropTxnId);
  return await getSolBalance(provider, account);
}

export async function solAirdropMin(
  provider: anchor.AnchorProvider,
  account: PublicKey,
  minSolAirdrop: Decimal,
): Promise<Decimal> {
  const airdropBatchAmount = Decimal.max(50, minSolAirdrop);
  let currentBalance = await getSolBalance(provider, account);
  while (currentBalance.lt(minSolAirdrop)) {
    try {
      await provider.connection.requestAirdrop(
        account,
        amountToLamportsDecimal(airdropBatchAmount, 9).toNumber(),
      );
    } catch (e) {
      await sleep(100);
      console.log("Error", e);
    }
    await sleep(100);
    currentBalance = await getSolBalance(provider, account);
  }
  return currentBalance;
}

export async function checkIfAccountExists(
  connection: Connection,
  account: PublicKey,
): Promise<boolean> {
  return (await connection.getAccountInfo(account)) != null;
}

export function getAssociatedTokenAddress(
  owner: PublicKey,
  tokenMintAddress: PublicKey,
  tokenProgram: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(
    tokenMintAddress,
    owner,
    true,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function createAssociatedTokenAccountIdempotentInstruction(
  owner: PublicKey,
  mint: PublicKey,
  payer: PublicKey = owner,
  tokenProgram: PublicKey,
  ata?: PublicKey,
): [PublicKey, TransactionInstruction] {
  let ataAddress = ata;
  if (!ataAddress) {
    ataAddress = getAssociatedTokenAddress(owner, mint, tokenProgram);
  }
  const createUserTokenAccountIx = createAssociatedTokenAccountInstruction(
    payer,
    ataAddress,
    owner,
    mint,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  // idempotent ix discriminator is 1
  createUserTokenAccountIx.data = Buffer.from([1]);
  return [ataAddress, createUserTokenAccountIx];
}

export function createAtaIdempotent(
  user: PublicKey,
  payer: PublicKey,
  mint: PublicKey,
  mintTokenProgram: PublicKey,
): { ata: PublicKey; createAtaIx: TransactionInstruction } {
  const [ata, createAtaIx] = createAssociatedTokenAccountIdempotentInstruction(
    user,
    mint,
    payer,
    mintTokenProgram,
  );

  return { ata, createAtaIx };
}

export async function setupAta(
  provider: anchor.AnchorProvider,
  tokenMintAddress: PublicKey,
  payer: Keypair,
  owner: PublicKey = payer.publicKey,
): Promise<PublicKey> {
  const ata = getAssociatedTokenAddress(
    owner,
    tokenMintAddress,
    TOKEN_PROGRAM_ID,
  );
  if (!(await checkIfAccountExists(provider.connection, ata))) {
    const [, ix] = createAssociatedTokenAccountIdempotentInstruction(
      owner,
      tokenMintAddress,
      payer.publicKey,
      TOKEN_PROGRAM_ID,
      ata,
    );
    const tx = new Transaction().add(ix);
    await provider.sendAndConfirm(tx, [payer]);
  }
  return ata;
}

export async function mintTo(
  provider: anchor.AnchorProvider,
  mintPubkey: PublicKey,
  tokenAccount: PublicKey,
  amount: number,
  decimals: number,
) {
  const tx = new Transaction().add(
    createMintToCheckedInstruction(
      mintPubkey, // mint
      tokenAccount, // receiver (sholud be a token account)
      provider.wallet.publicKey, // mint authority
      amount, // amount. if your decimals is 8, you mint 10^8 for 1 token.
      decimals,
    ),
  );

  await provider.sendAndConfirm(tx, [], {
    skipPreflight: true,
  });
}

export function getMockSwapInstructions(
  provider: anchor.AnchorProvider,
  user: PublicKey,
  swapInputMint: PublicKey,
  swapOutputMint: PublicKey,
  swapInAmountDecimal: Decimal,
  swapOutAmountDecimal: Decimal,
  inTokenDecimals: number,
  outTokenDecimals: number,
): anchor.web3.TransactionInstruction[] {
  let mintToIx: TransactionInstruction[] = [];
  if (swapOutputMint.equals(WRAPPED_SOL_MINT)) {
    // transfer WSOL to user
    mintToIx.push(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: getAssociatedTokenAddress(
          user,
          swapOutputMint,
          TOKEN_PROGRAM_ID,
        ),
        lamports: amountToLamportsDecimal(
          swapOutAmountDecimal,
          outTokenDecimals,
        ).toNumber(),
      }),
    );
    mintToIx.push(
      new TransactionInstruction({
        keys: [
          {
            pubkey: getAssociatedTokenAddress(
              user,
              swapOutputMint,
              TOKEN_PROGRAM_ID,
            ),
            isSigner: false,
            isWritable: true,
          },
        ],
        data: Buffer.from(new Uint8Array([17])),
        programId: TOKEN_PROGRAM_ID,
      }),
    );
  } else {
    mintToIx.push(
      createMintToCheckedInstruction(
        swapOutputMint, // mint
        getAssociatedTokenAddress(user, swapOutputMint, TOKEN_PROGRAM_ID),
        provider.wallet.publicKey, // mint authority
        amountToLamportsDecimal(
          swapOutAmountDecimal,
          outTokenDecimals,
        ).toNumber(),
        outTokenDecimals,
      ),
    );
  }

  let burnIx: TransactionInstruction[] = [];

  if (swapInputMint.equals(WRAPPED_SOL_MINT)) {
    burnIx.push(
      createCloseAccountInstruction(
        getAssociatedTokenAddress(user, swapInputMint, TOKEN_PROGRAM_ID),
        user,
        user,
        [],
        TOKEN_PROGRAM_ID,
      ),
    ); // close WSOL ATA so sol is back to native
    burnIx.push(
      SystemProgram.transfer({
        fromPubkey: user,
        toPubkey: provider.wallet.publicKey,
        lamports: amountToLamportsDecimal(
          swapInAmountDecimal,
          inTokenDecimals,
        ).toNumber(),
      }),
    );
    burnIx.push(
      createAtaIdempotent(
        user,
        provider.wallet.publicKey,
        WRAPPED_SOL_MINT,
        TOKEN_PROGRAM_ID,
      ).createAtaIx,
    ); //reinitialise WSOL ATA as this is supposed to exist
  } else {
    burnIx.push(
      createBurnInstruction(
        getAssociatedTokenAddress(user, swapInputMint, TOKEN_PROGRAM_ID),
        swapInputMint,
        user,
        amountToLamportsDecimal(
          swapInAmountDecimal,
          inTokenDecimals,
        ).toNumber(),
      ),
    );
  }

  return [...burnIx, ...mintToIx];
}

export async function transferToken(
  provider: anchor.AnchorProvider,
  fromAccount: Signer,
  fromTokenAccount: PublicKey,
  toTokenAccount: PublicKey,
  amount: number,
) {
  let tx = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromAccount.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );
  await web3.sendAndConfirmTransaction(provider.connection, tx, [fromAccount]);
  await sleep(500);
}

/**
 * Get the custom program error code if there's any in the error message and return parsed error code hex to number string
 * @param errMessage string - error message that would contain the word "custom program error:" if it's a customer program error
 * @returns [boolean, string] - probably not a custom program error if false otherwise the second element will be the code number in string
 */
export const getCustomProgramErrorCode = (
  errMessage: string,
): [boolean, string] => {
  const index = errMessage.indexOf("Custom program error:");
  if (index === -1) {
    return [false, "May not be a custom program error"];
  } else {
    return [
      true,
      `${parseInt(
        errMessage.substring(index + 22, index + 28).replace(" ", ""),
        16,
      )}`,
    ];
  }
};

/**
 *
 * Maps the private Anchor type ProgramError to a normal Error.
 * Pass ProgramErr.msg as the Error message so that it can be used with chai matchers
 *
 * @param fn - function which may throw an anchor ProgramError
 */
export async function mapAnchorError<T>(fn: Promise<T>): Promise<T> {
  try {
    return await fn;
  } catch (e: any) {
    let [isCustomProgramError, errorCode] = getCustomProgramErrorCode(
      JSON.stringify(e),
    );
    if (isCustomProgramError) {
      let error: any;
      if (Number(errorCode)) {
        error = LimoErrors.fromCode(Number(errorCode));
        throw new Error(error);
      } else if (Number(errorCode) >= 6000 && Number(errorCode) <= 7000) {
        errorCode[errorCode.length - 2] === "0"
          ? (errorCode = errorCode.slice(-1))
          : (errorCode = errorCode.slice(-2));
        // @ts-ignore
        error = LimoIdl.errors![errorCode].msg;
        throw new Error(error);
      } else {
        throw new Error(e);
      }
    }
    throw e;
  }
}

export async function getTokenAccountBalance(
  conn: Connection,
  tokenAccount: PublicKey,
): Promise<Decimal> {
  const tokenAccountBalance = await conn.getTokenAccountBalance(tokenAccount);
  return new Decimal(tokenAccountBalance.value.amount).div(
    Decimal.pow(10, tokenAccountBalance.value.decimals),
  );
}

export function createAddExtraComputeUnitFeeTransaction(
  units: number,
  microLamports: number,
): TransactionInstruction[] {
  const ixs: TransactionInstruction[] = [];
  ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units }));
  ixs.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: Number(microLamports.toFixed(0)),
    }),
  );
  return ixs;
}

export async function getSolBalanceInLamports(
  provider: anchor.AnchorProvider,
  account: PublicKey,
): Promise<number> {
  let balance: number | undefined = undefined;
  while (balance === undefined) {
    balance = (await provider.connection.getAccountInfo(account))?.lamports;
  }
  return balance;
}

export async function getSolBalance(
  provider: anchor.AnchorProvider,
  account: PublicKey,
): Promise<Decimal> {
  const balance = new Decimal(await getSolBalanceInLamports(provider, account));
  return lamportsToAmountDecimal(balance, 9);
}

export type Cluster = "localnet" | "devnet" | "mainnet";
export type SolEnv = {
  cluster: Cluster;
  ownerKeypairPath: string;
  endpoint: string;
};

export function endpointFromCluster(cluster: string | undefined): string {
  switch (cluster) {
    case "mainnet":
      return "FIXTHIS";
    case "devnet":
      return "FIXTHIS";
    case "localnet":
      return "http://127.0.0.1:8899";
  }

  if (cluster) {
    return cluster;
  }

  return "err";
}

export function pubkeyFromFile(filepath: string): PublicKey {
  const fileContents = fs.readFileSync(filepath, "utf8");
  const privateArray = fileContents
    .replace("[", "")
    .replace("]", "")
    .split(",")
    .map(function (item) {
      return parseInt(item, 10);
    });
  const array = Uint8Array.from(privateArray);
  const keypair = Keypair.fromSecretKey(array);
  return keypair.publicKey;
}

export function createAddExtraComputeUnitsTransaction(
  units: number,
): TransactionInstruction {
  return web3.ComputeBudgetProgram.setComputeUnitLimit({ units });
}
export function u16ToBytes(num: number) {
  const arr = new ArrayBuffer(2);
  const view = new DataView(arr);
  view.setUint16(0, num, false);
  return new Uint8Array(arr);
}

export async function accountExist(
  connection: anchor.web3.Connection,
  account: anchor.web3.PublicKey,
) {
  const info = await connection.getAccountInfo(account);
  if (info === null || info.data.length === 0) {
    return false;
  }
  return true;
}

export async function fetchGlobalConfigWithRetry(
  env: Env,
  address: PublicKey,
): Promise<GlobalConfig> {
  return fetchWithRetry(
    async () => await GlobalConfig.fetch(env.conn, address),
    address,
  );
}

export function getPdaAuthority(
  programId: PublicKey,
  globalConfig: PublicKey,
): PublicKey {
  const [pdaAuthority, _pdaAuthorityBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_AUTH_SEED), globalConfig.toBuffer()],
      programId,
    );

  return pdaAuthority;
}

export function getTokenVaultPDA(
  programId: PublicKey,
  globalConfig: PublicKey,
  mint: PublicKey,
): PublicKey {
  const [vault, _vaultBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_VAULT_SEED), globalConfig.toBuffer(), mint.toBuffer()],
    programId,
  );

  return vault;
}

export function getEventAuthorityPDA(programId: PublicKey): PublicKey {
  const [eventAuthority, _eventAuthorityBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(EVENT_AUTHORITY_SEED)],
      programId,
    );

  return eventAuthority;
}

export function getUserSwapBalanceStatePDA(
  maker: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [swapBalanceState, _swapBalanceStateBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("balances"), maker.toBuffer()],
      programId,
    );

  return swapBalanceState;
}

export function getIntermediaryTokenAccountPDA(
  programId: PublicKey,
  order: PublicKey,
): PublicKey {
  const [intermediaryTokenAccount, _intermediaryTokenAccount] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(INTERMEDIARY_OUTPUT_TOKEN_ACCOUNT_SEED), order.toBuffer()],
      programId,
    );

  return intermediaryTokenAccount;
}

export function getExpressRelayMetadataPDA(programId: PublicKey): PublicKey {
  const [metadata, _metadataBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(EXPRESS_RELAY_MEATADATA_SEED)],
      programId,
    );

  return metadata;
}

export function getExpressRelayConfigRouterPDA(
  programId: PublicKey,
  router: PublicKey,
): PublicKey {
  const [configRouter, _configRouterBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(EXPRESS_RELAY_CONFIG_ROUTER_SEED), router.toBuffer()],
      programId,
    );

  return configRouter;
}

async function fetchWithRetry(
  fetch: () => Promise<any>,
  address: PublicKey,
  retries: number = 3,
) {
  for (let i = 0; i < retries; i++) {
    let resp = await fetch();
    if (resp !== null) {
      return resp;
    }
    console.log(
      `[${i + 1}/${retries}] Fetched account ${address} is null. Refetching...`,
    );
  }
  return null;
}

export async function sendAndConfirmInstructions(
  env: Env,
  ixns: [TransactionInstruction],
): Promise<web3.TransactionSignature> {
  let tx = new Transaction();
  for (let i = 0; i < ixns.length; i++) {
    tx.add(ixns[i]);
  }
  let { blockhash } = await env.conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = env.admin.publicKey;

  return await web3.sendAndConfirmTransaction(env.conn, tx, [env.admin]);
}

export async function createKeypairRentExempt(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  address: Keypair,
  size: number,
): Promise<web3.Keypair> {
  const tx = new Transaction();
  tx.add(
    createKeypairRentExemptIxSync(
      provider.wallet.publicKey,
      address,
      size,
      await provider.connection.getMinimumBalanceForRentExemption(size),
      programId,
    ),
  );
  await provider.sendAndConfirm(tx, [address]);
  return address;
}

export async function getOrderRentExemptLamports(
  connection: Connection,
): Promise<number> {
  return await connection.getMinimumBalanceForRentExemption(
    Order.layout.span + 8,
  );
}

export function createKeypairRentExemptIxSync(
  payer: PublicKey,
  account: Keypair,
  size: number,
  lamports: number,
  programId: PublicKey = limoId,
): TransactionInstruction {
  return SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: account.publicKey,
    space: size,
    lamports: lamports,
    programId: programId,
  });
}

export async function createGlobalConfigPublicKeyRentExempt(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
): Promise<Keypair> {
  const config = Keypair.generate();
  const key = await createKeypairRentExempt(
    provider,
    programId,
    config,
    GlobalConfig.layout.getSpan() + 8,
  );
  return key;
}

export async function executeTransaction(
  connection: Connection,
  ix: TransactionInstruction[],
  signer: Keypair,
  extraSigners: Signer[] = [],
): Promise<TransactionSignature> {
  const tx = new Transaction();
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = signer.publicKey;
  tx.add(...ix);

  const sig: TransactionSignature = await sendAndConfirmTransaction(
    connection,
    tx,
    [signer, ...extraSigners],
    { commitment: "confirmed" },
  );

  return sig;
}

export async function buildAndSendTxnWithLogs(
  c: Connection,
  tx: Transaction,
  owner: Keypair,
  signers: Signer[],
) {
  const { blockhash } = await c.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = owner.publicKey;

  try {
    const sig: string = await c.sendTransaction(tx, [owner, ...signers]);
    console.log("Transaction Hash:", sig);
    await sleep(5000);
    const res = await c.getTransaction(sig, {
      commitment: "confirmed",
    });
    console.log("Transaction Logs:\n", res!.meta!.logMessages);
  } catch (e: any) {
    console.log(e);
    await sleep(5000);
    const sig = e.toString().split(" failed ")[0].split("Transaction ")[1];
    const res = await c.getTransaction(sig, {
      commitment: "confirmed",
    });
    console.log("Txn", res!.meta!.logMessages);
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function scaleDownWads(value: anchor.BN) {
  return new Decimal(value.toString()).div(WAD).toNumber();
}

export function convertStakeToAmount(
  stake: Decimal,
  totalStaked: Decimal,
  totalAmount: Decimal,
): Decimal {
  if (stake === new Decimal(0)) {
    return new Decimal(0);
  }

  if (totalStaked !== new Decimal(0)) {
    return stake.mul(totalAmount).div(totalStaked);
  } else {
    return stake.add(totalAmount);
  }
}

export function convertAmountToStake(
  amount: Decimal,
  totalStaked: Decimal,
  totalAmount: Decimal,
): Decimal {
  if (amount === new Decimal(0)) {
    return new Decimal(0);
  }

  if (totalAmount !== new Decimal(0)) {
    return totalStaked.mul(amount).div(totalAmount);
  } else {
    return amount;
  }
}

export const parseTokenSymbol = (tokenSymbol: number[]): string => {
  return String.fromCharCode(...tokenSymbol.filter((x) => x > 0));
};
