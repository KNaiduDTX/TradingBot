import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { Env, setUpProgram } from "../utils";

export function createAddExtraComputeUnitFeeTransaction(
  units: number,
  microLamports: number,
): TransactionInstruction[] {
  const ixns: TransactionInstruction[] = [];
  ixns.push(ComputeBudgetProgram.setComputeUnitLimit({ units }));
  ixns.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports }));
  return ixns;
}

export function initializeClient(
  cluster: string,
  admin: string | undefined,
  programId: PublicKey,
  multisig: boolean,
  debug: boolean = false,
): Env {
  let resolvedCluster: string;
  let resolvedAdmin: string;

  if (cluster) {
    resolvedCluster = cluster;
  } else {
    throw "Must specify cluster";
  }

  if (admin) {
    resolvedAdmin = admin;
  } else {
    console.log("Running without an admin keypair!");
    resolvedAdmin = "";
  }

  // Get connection first
  const env: Env = setUpProgram({
    adminFilePath: resolvedAdmin,
    clusterOverride: cluster,
    programOverride: programId,
  });

  !multisig && debug && console.log("\nSettings ⚙️");
  !multisig &&
    debug &&
    console.log("Program ID:", env.program.programId.toString());
  !multisig && debug && console.log("Admin:", resolvedAdmin);
  !multisig && debug && console.log("Cluster:", resolvedCluster);

  return env;
}

export function unwrap(val: any): any {
  if (val) {
    return val;
  } else {
    throw new Error("Value is null");
  }
}

function colouredString(code: string, msg: string) {
  if (process.env.NODE_ENV !== "production") {
    return `\x1b${code}${msg}\x1b[0m`;
  }
  return msg;
}

export function red(msg: string) {
  return colouredString("[31m", msg);
}

export function green(msg: string) {
  return colouredString("[32m", msg);
}

export function magenta(msg: string) {
  return colouredString("[35m", msg);
}

export function yellow(msg: string) {
  return colouredString("[33m", msg);
}

export function blue(msg: string): string {
  return colouredString("[34m", msg);
}

export function cyan(msg: string): string {
  return colouredString("[36m", msg);
}

export function lightRed(msg: string): string {
  return colouredString("[91m", msg);
}

export function lightGreen(msg: string): string {
  return colouredString("[92m", msg);
}

export function lightBlue(msg: string): string {
  return colouredString("[94m", msg);
}

export function lightMagenta(msg: string): string {
  return colouredString("[95m", msg);
}

export function lightCyan(msg: string): string {
  return colouredString("[96m", msg);
}

export function lightYellow(msg: string): string {
  return colouredString("[93m", msg);
}

export function lightWhite(msg: string): string {
  return colouredString("[97m", msg);
}

export function darkGray(msg: string): string {
  return colouredString("[90m", msg);
}

export function lightGray(msg: string): string {
  return colouredString("[37m", msg);
}
