import * as Instructions from "../rpc_client/instructions";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import { TransactionInstruction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getEventAuthorityPDA,
  getExpressRelayConfigRouterPDA,
  getExpressRelayMetadataPDA,
  getPdaAuthority,
  getTokenVaultPDA,
} from "./utils";
import { BN } from "@coral-xyz/anchor";
import {
  UpdateGlobalConfigMode,
  UpdateGlobalConfigModeKind,
} from "../rpc_client/types/index";
import { GlobalConfig } from "../rpc_client/accounts";

export interface OrderParams {
  quoteTokenMint: PublicKey;
  baseTokenMint: PublicKey;
  quoteTokenAmount: BN;
  baseTokenAmount: BN;
  side: "bid" | "ask";
}

export function initializeGlobalConfig(
  adminAuthority: PublicKey,
  globalConfig: PublicKey,
  pdaAuthority: PublicKey,
  programId: PublicKey,
): TransactionInstruction {
  let accounts: Instructions.InitializeGlobalConfigAccounts = {
    adminAuthority,
    pdaAuthority,
    globalConfig,
  };

  let ix = Instructions.initializeGlobalConfig(accounts, programId);

  return ix;
}

export function initializeVault(
  owner: PublicKey,
  globalConfig: PublicKey,
  mint: PublicKey,
  programId: PublicKey,
  mintProgramId: PublicKey,
): TransactionInstruction {
  let vault = getTokenVaultPDA(programId, globalConfig, mint);
  let pdaAuthority = getPdaAuthority(programId, globalConfig);
  let accounts: Instructions.InitializeVaultAccounts = {
    payer: owner,
    globalConfig,
    pdaAuthority,
    mint,
    vault,
    tokenProgram: mintProgramId,
    systemProgram: anchor.web3.SystemProgram.programId,
  };

  let ix = Instructions.initializeVault(accounts, programId);

  return ix;
}

export function createOrder(
  maker: PublicKey,
  globalConfig: PublicKey,
  order: PublicKey,
  orderParams: OrderParams,
  programId: PublicKey,
  baseTokenMintProgramId: PublicKey,
  quoteTokenMintProgramId: PublicKey,
): TransactionInstruction {
  let quoteTokenVault = getTokenVaultPDA(
    programId,
    globalConfig,
    orderParams.quoteTokenMint,
  );
  let baseTokenVault = getTokenVaultPDA(
    programId,
    globalConfig,
    orderParams.baseTokenMint,
  );

  let pdaAuthority = getPdaAuthority(programId, globalConfig);
  let accounts: Instructions.CreateOrderAccounts = {
    maker,
    globalConfig,
    pdaAuthority,
    order,
    inputMint:
      orderParams.side === "bid"
        ? orderParams.baseTokenMint
        : orderParams.quoteTokenMint,
    outputMint:
      orderParams.side === "bid"
        ? orderParams.quoteTokenMint
        : orderParams.baseTokenMint,
    makerAta:
      orderParams.side === "bid"
        ? getAssociatedTokenAddress(
            maker,
            orderParams.baseTokenMint,
            baseTokenMintProgramId,
          )
        : getAssociatedTokenAddress(
            maker,
            orderParams.quoteTokenMint,
            quoteTokenMintProgramId,
          ),
    inputVault: orderParams.side === "bid" ? baseTokenVault : quoteTokenVault,
    inputTokenProgram:
      orderParams.side === "bid"
        ? baseTokenMintProgramId
        : quoteTokenMintProgramId,
    outputTokenProgram:
      orderParams.side === "bid"
        ? quoteTokenMintProgramId
        : baseTokenMintProgramId,
    eventAuthority: getEventAuthorityPDA(programId),
    program: programId,
    systemProgram: SystemProgram.programId,
  };

  let args: Instructions.CreateOrderArgs = {
    inputAmount: new BN(
      orderParams.side === "bid"
        ? orderParams.baseTokenAmount
        : orderParams.quoteTokenAmount,
    ),
    outputAmount: new BN(
      orderParams.side === "bid"
        ? orderParams.quoteTokenAmount
        : orderParams.baseTokenAmount,
    ),
    orderType: orderParams.side === "bid" ? 0 : 1,
  };
  let ix = Instructions.createOrder(args, accounts, programId);

  return ix;
}

export function takeOrder(params: {
  taker: PublicKey;
  maker: PublicKey;
  globalConfig: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  order: PublicKey;
  inputAmountLamports: BN;
  minOutputAmountLamports: BN;
  programId: PublicKey;
  expressRelayProgramId: PublicKey;
  takerInputAta: PublicKey;
  takerOutputAta: PublicKey;
  intermediaryOutputTokenAccount: PublicKey;
  makerOutputAta: PublicKey;
  inputTokenProgram: PublicKey;
  outputTokenProgram: PublicKey;
  permissionlessTipLamports: BN;
  permissionless: boolean;
}): TransactionInstruction {
  let pdaAuthority = getPdaAuthority(params.programId, params.globalConfig);
  let inputVault = getTokenVaultPDA(
    params.programId,
    params.globalConfig,
    params.inputMint,
  );

  let accounts: Instructions.TakeOrderAccounts = {
    taker: params.taker,
    maker: params.maker,
    globalConfig: params.globalConfig,
    pdaAuthority,
    order: params.order,
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputVault,
    expressRelay: params.expressRelayProgramId,
    expressRelayMetadata: getExpressRelayMetadataPDA(
      params.expressRelayProgramId,
    ),
    permission: params.permissionless ? params.programId : params.order,
    configRouter: getExpressRelayConfigRouterPDA(
      params.expressRelayProgramId,
      pdaAuthority,
    ),
    sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    takerInputAta: params.takerInputAta,
    intermediaryOutputTokenAccount: params.intermediaryOutputTokenAccount,
    takerOutputAta: params.takerOutputAta,
    makerOutputAta: params.makerOutputAta,
    inputTokenProgram: params.inputTokenProgram,
    outputTokenProgram: params.outputTokenProgram,
    systemProgram: SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    eventAuthority: getEventAuthorityPDA(params.programId),
    program: params.programId,
  };

  let args: Instructions.TakeOrderArgs = {
    inputAmount: params.inputAmountLamports,
    minOutputAmount: params.minOutputAmountLamports,
    tipAmountPermissionlessTaking: params.permissionlessTipLamports,
  };
  let ix = Instructions.takeOrder(args, accounts, params.programId);

  return ix;
}

export function flashTakeOrder(params: {
  taker: PublicKey;
  maker: PublicKey;
  globalConfig: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  order: PublicKey;
  inputAmountLamports: BN;
  minOutputAmountLamports: BN;
  programId: PublicKey;
  expressRelayProgramId: PublicKey;
  takerInputAta: PublicKey;
  takerOutputAta: PublicKey;
  intermediaryOutputTokenAccount: PublicKey;
  makerOutputAta: PublicKey;
  inputTokenProgram: PublicKey;
  outputTokenProgram: PublicKey;
  permissionlessTipLamports: BN | undefined;
  permissionless: boolean;
}): { startIx: TransactionInstruction; endIx: TransactionInstruction } {
  let pdaAuthority = getPdaAuthority(params.programId, params.globalConfig);
  let inputVault = getTokenVaultPDA(
    params.programId,
    params.globalConfig,
    params.inputMint,
  );

  let startAccounts: Instructions.FlashTakeOrderStartAccounts = {
    taker: params.taker,
    maker: params.maker,
    globalConfig: params.globalConfig,
    pdaAuthority,
    order: params.order,
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputVault,
    expressRelay: params.expressRelayProgramId,
    expressRelayMetadata: getExpressRelayMetadataPDA(
      params.expressRelayProgramId,
    ),
    permission: params.permissionless ? params.programId : params.order,
    configRouter: getExpressRelayConfigRouterPDA(
      params.expressRelayProgramId,
      pdaAuthority,
    ),
    sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    takerInputAta: params.takerInputAta,
    takerOutputAta: params.takerOutputAta,
    intermediaryOutputTokenAccount: params.intermediaryOutputTokenAccount,
    makerOutputAta: params.makerOutputAta,
    inputTokenProgram: params.inputTokenProgram,
    outputTokenProgram: params.outputTokenProgram,
    systemProgram: SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    eventAuthority: getEventAuthorityPDA(params.programId),
    program: params.programId,
  };

  let startArgs: Instructions.FlashTakeOrderStartArgs = {
    inputAmount: new BN(params.inputAmountLamports),
    minOutputAmount: new BN(params.minOutputAmountLamports),
    tipAmountPermissionlessTaking:
      params.permissionlessTipLamports ?? new BN(0),
  };
  let startIx = Instructions.flashTakeOrderStart(
    startArgs,
    startAccounts,
    params.programId,
  );

  let endAccounts: Instructions.FlashTakeOrderEndAccounts = {
    taker: params.taker,
    maker: params.maker,
    globalConfig: params.globalConfig,
    pdaAuthority,
    order: params.order,
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    inputVault,
    expressRelay: params.expressRelayProgramId,
    expressRelayMetadata: getExpressRelayMetadataPDA(
      params.expressRelayProgramId,
    ),
    permission: params.permissionless ? params.programId : params.order,
    configRouter: getExpressRelayConfigRouterPDA(
      params.expressRelayProgramId,
      pdaAuthority,
    ),
    sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    takerInputAta: params.takerInputAta,
    takerOutputAta: params.takerOutputAta,
    intermediaryOutputTokenAccount: params.intermediaryOutputTokenAccount,
    makerOutputAta: params.makerOutputAta,
    inputTokenProgram: params.inputTokenProgram,
    outputTokenProgram: params.outputTokenProgram,
    systemProgram: SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    eventAuthority: getEventAuthorityPDA(params.programId),
    program: params.programId,
  };

  let endArgs: Instructions.FlashTakeOrderEndArgs = {
    inputAmount: new BN(params.inputAmountLamports),
    minOutputAmount: new BN(params.minOutputAmountLamports),
    tipAmountPermissionlessTaking:
      params.permissionlessTipLamports ?? new BN(0),
  };
  let endIx = Instructions.flashTakeOrderEnd(
    endArgs,
    endAccounts,
    params.programId,
  );

  return {
    startIx,
    endIx,
  };
}

export function closeOrderAndClaimTip(params: {
  maker: PublicKey;
  globalConfig: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  order: PublicKey;
  programId: PublicKey;
  makerInputAta: PublicKey;
  inputTokenProgram: PublicKey;
}): TransactionInstruction {
  let pdaAuthority = getPdaAuthority(params.programId, params.globalConfig);
  let inputVault = getTokenVaultPDA(
    params.programId,
    params.globalConfig,
    params.inputMint,
  );

  let accounts: Instructions.CloseOrderAndClaimTipAccounts = {
    maker: params.maker,
    order: params.order,
    globalConfig: params.globalConfig,
    pdaAuthority,
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    makerInputAta: params.makerInputAta,
    inputVault,
    inputTokenProgram: params.inputTokenProgram,
    systemProgram: SystemProgram.programId,
    eventAuthority: getEventAuthorityPDA(params.programId),
    program: params.programId,
  };

  let ix = Instructions.closeOrderAndClaimTip(accounts, params.programId);

  return ix;
}

export function withdrawHostTipIx(params: {
  admin: PublicKey;
  globalConfig: PublicKey;
  programId: PublicKey;
}): TransactionInstruction {
  let pdaAuthority = getPdaAuthority(params.programId, params.globalConfig);

  let accounts: Instructions.WithdrawHostTipAccounts = {
    adminAuthority: params.admin,
    globalConfig: params.globalConfig,
    pdaAuthority,
    systemProgram: SystemProgram.programId,
  };

  let ix = Instructions.withdrawHostTip(accounts, params.programId);

  return ix;
}

export function updateGlobalConfigIx(
  admin: PublicKey,
  globalConfig: PublicKey,
  mode: UpdateGlobalConfigModeKind,
  value: number | PublicKey,
  programId: PublicKey,
): TransactionInstruction {
  let accounts: Instructions.UpdateGlobalConfigAccounts = {
    adminAuthority: admin,
    globalConfig,
  };

  let args: Instructions.UpdateGlobalConfigArgs = {
    mode: mode.discriminator,
    value: encodedUpdateGlobalConfigValue(mode, value),
  };

  let ix = Instructions.updateGlobalConfig(args, accounts, programId);

  return ix;
}

export function updateGlobalConfigAdminIx(
  globalConfigAddress: PublicKey,
  globalConfig: GlobalConfig,
  programId: PublicKey,
): TransactionInstruction {
  let accounts: Instructions.UpdateGlobalConfigAdminAccounts = {
    adminAuthorityCached: globalConfig.adminAuthorityCached,
    globalConfig: globalConfigAddress,
  };

  let ix = Instructions.updateGlobalConfigAdmin(accounts, programId);

  return ix;
}

function encodedUpdateGlobalConfigValue(
  mode: UpdateGlobalConfigModeKind,
  value: number | PublicKey,
): Array<number> {
  const valueData = Buffer.alloc(128);
  let valueNumber: number;
  let valuePublicKey: Buffer;
  switch (mode.discriminator) {
    case UpdateGlobalConfigMode.UpdateEmergencyMode.discriminator:
    case UpdateGlobalConfigMode.UpdateFlashTakeOrderBlocked.discriminator:
    case UpdateGlobalConfigMode.UpdateBlockNewOrders.discriminator:
    case UpdateGlobalConfigMode.UpdateBlockOrderTaking.discriminator:
    case UpdateGlobalConfigMode.UpdateOrderTakingPermissionless.discriminator:
      valueNumber = value as number;
      valueData.writeUIntLE(valueNumber, 0, 1);
      break;
    case UpdateGlobalConfigMode.UpdateHostFeeBps.discriminator:
      valueNumber = value as number;
      valueData.writeUInt16LE(valueNumber, 0);
      break;
    case UpdateGlobalConfigMode.UpdateOrderCloseDelaySeconds.discriminator:
    case UpdateGlobalConfigMode.UpdateAtaCreationCost.discriminator:
    case UpdateGlobalConfigMode.UpdateTxnFeeCost.discriminator:
    case UpdateGlobalConfigMode.UpdateOrderCloseDelaySeconds.discriminator:
      valueNumber = value as number;
      valueData.writeBigUInt64LE(BigInt(value.toString()), 0);
      break;
    case UpdateGlobalConfigMode.UpdateAdminAuthorityCached.discriminator:
      valuePublicKey = (value as PublicKey).toBuffer();
      valuePublicKey.copy(valueData, 0);
      break;
  }

  const uint8Array = new Uint8Array(valueData);
  return Array.from(uint8Array);
}
