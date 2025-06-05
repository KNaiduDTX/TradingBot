import { PublicKey } from "@solana/web3.js";
import { initializeClient } from "./utils";
import { getLimoProgramId } from "../utils";
import { LimoClient } from "../Limo";
import { UpdateGlobalConfigMode } from "../rpc_client/types";

export async function updateGlobalConfig(
  updateMode: string,
  value: string,
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

  let valueCasted: number | PublicKey;

  switch (
    UpdateGlobalConfigMode.fromDecoded({ [updateMode]: "" }).discriminator
  ) {
    case UpdateGlobalConfigMode.UpdateEmergencyMode.discriminator:
    case UpdateGlobalConfigMode.UpdateBlockNewOrders.discriminator:
    case UpdateGlobalConfigMode.UpdateBlockOrderTaking.discriminator:
    case UpdateGlobalConfigMode.UpdateFlashTakeOrderBlocked.discriminator:
    case UpdateGlobalConfigMode.UpdateHostFeeBps.discriminator:
    case UpdateGlobalConfigMode.UpdateOrderTakingPermissionless.discriminator:
    case UpdateGlobalConfigMode.UpdateOrderCloseDelaySeconds.discriminator:
    case UpdateGlobalConfigMode.UpdateTxnFeeCost.discriminator:
    case UpdateGlobalConfigMode.UpdateAtaCreationCost.discriminator:
      valueCasted = Number(value);
      break;
    case UpdateGlobalConfigMode.UpdateAdminAuthorityCached.discriminator:
      valueCasted = new PublicKey(value);
      break;
    default:
      throw new Error("Invalid mode");
  }
  await client.getGlobalConfigState();
  await client.updateGlobalConfig(env.admin, updateMode, valueCasted, mode);

  console.log("Global Config updated");
}

export async function updateGlobalConfigAdmin(
  globalConfigString: string | undefined,
  mode: string,
) {
  const admin = process.env.ADMIN;
  const rpc = process.env.RPC_ENV;
  const globalConfig = globalConfigString
    ? globalConfigString
    : process.env.LIMO_GLOBAL_CONFIG;
  const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);
  const client = new LimoClient(
    env.provider.connection,
    new PublicKey(globalConfig!),
  );

  await client.updateGlobalConfigAdmin(env.admin, mode);

  console.log("Global Config Admin updated");
}
