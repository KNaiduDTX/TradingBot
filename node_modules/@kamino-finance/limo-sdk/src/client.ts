#!/usr/bin/env npx ts-node

import * as anchor from "@coral-xyz/anchor";
import { Command } from "commander";
import { initializeClient } from "./commands/utils";
import {
  amountToLamportsDecimal,
  createMintFromKeypair,
  getLimoProgramId,
  getMintDecimals,
  mintTo,
  setupAta,
  sleep,
} from "./utils";
import { PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";
import fs from "fs";
import path from "path";
import {
  getKaminoTokenMintsFromApi,
  initGlobalConfigCommand,
  initVault,
  initVaultsFromMintsListFile,
} from "./commands/initCommands";
import dotenv from "dotenv";
import {
  placeOrder,
  listOrders,
  getAllOrders,
  permissionlessTakeOrder,
  listOrdersForUser,
} from "./commands/orderCommands";
import {
  updateGlobalConfig,
  updateGlobalConfigAdmin,
} from "./commands/updateCommands";
import {
  listenToOrderChanges,
  listenToOrderChangesForMaker,
  listenToOrderChangesForQuoteAndBase,
} from "./commands/websocketCommands";
import { Order } from "./rpc_client/accounts";
import { LimoClient } from "./Limo";
dotenv.config({
  path: `../.env${process.env.ENV ? "." + process.env.ENV : ""}`,
});

async function main() {
  const commands = new Command();

  commands
    .name("limo-cli")
    .description("CLI to interact with the LIMO program");

  commands
    .command("init-global-config")
    .option("--global-config-file-path <string>")
    .action(async ({ globalConfigFilePath }) => {
      await initGlobalConfigCommand(globalConfigFilePath);
    });

  commands
    .command("init-vault")
    .requiredOption("--mint <string>")
    .requiredOption(
      "--mode <string>",
      "multisig - will print bs58 txn only, simulate - will print bs64 txn explorer link and simulation, execute - to execute txn",
    )
    .action(async ({ mint, mode }) => {
      await initVault(new PublicKey(mint), mode);
    });

  commands
    .command("init-vaults-from-mints-list")
    .requiredOption("--mints-list-file-path <string>")
    .requiredOption(
      "--mode <string>",
      "multisig - will print bs58 txn only, simulate - will print bs64 txn explorer link and simulation, execute - to execute txn",
    )
    .action(async ({ mintsListFilePath, mode }) => {
      await initVaultsFromMintsListFile(mintsListFilePath, mode);
    });

  commands.command("get-kamino-token-mints").action(async () => {
    await getKaminoTokenMintsFromApi();
  });
  commands
    .command("update-global-config")
    .requiredOption(
      "--update-mode <string>",
      "string value of the update mode, found in rpc_client/types/UpdateGlobalConfigMode.ts",
    )
    .requiredOption("--value <string>")
    .requiredOption(
      "--mode <string>",
      "multisig - will print bs58 txn only, simulate - will print bs64 txn explorer link and simulation, execute - to execute txn",
    )
    .action(async ({ updateMode, value, mode }) => {
      await updateGlobalConfig(updateMode, value, mode);
    });

  commands
    .command("update-global-config-admin")
    .option(
      "--global-config <string>",
      "global config pubkey - if not provided will use the global config from the env",
    )
    .requiredOption(
      "--mode <string>",
      "multisig - will print bs58 txn only, simulate - will print bs64 txn explorer link and simulation, execute - to execute txn",
    )
    .action(async ({ globalConfig, mode }) => {
      await updateGlobalConfigAdmin(globalConfig, mode);
    });

  commands
    .command("place-bid")
    .option("--quote <string>")
    .option("--base <string>")
    .option("--price <string>")
    .option("--base-amount <string>")
    .action(async ({ quote, base, price, baseAmount }) => {
      await placeOrder(
        quote,
        base,
        parseFloat(baseAmount),
        parseFloat(price),
        "bid",
      );
    });

  commands
    .command("place-ask")
    .option("--quote <string>")
    .option("--base <string>")
    .option("--price <string>")
    .option("--quote-amount <string>")
    .action(async ({ quote, base, price, quoteAmount }) => {
      await placeOrder(
        quote,
        base,
        parseFloat(quoteAmount),
        parseFloat(price),
        "ask",
      );
    });

  commands
    .command("take-order-permissionless")
    .requiredOption("--order <string>", "Order address")
    .option(
      "--amount-to-take <string>",
      "Input amount to take as a decimal number - if not provided will take the full amount",
    )
    .option(
      "--amount-tip <string>",
      "Tip amount as a decimal number - if not provided will be 0",
    )
    .requiredOption(
      "--mode <string>",
      "multisig - will print bs58 txn only, simulate - will print bs64 txn explorer link and simulation, execute - to execute txn",
    )
    .action(async ({ order, amountToTake, amountTip, mode }) => {
      await permissionlessTakeOrder(
        new PublicKey(order),
        amountToTake,
        amountTip,
        mode,
      );
    });

  commands
    .command("list-orders-for-user")
    .requiredOption("--user <string>", "User address")
    .action(async ({ user }) => {
      await listOrdersForUser(new PublicKey(user));
    });

  commands
    .command("list-orders")
    .requiredOption("--quote <string>")
    .requiredOption("--base <string>")
    .option(
      "--filter-out-remaining-amount-base-token <string>",
      "Filter out orders with remaining amount less than the provided value for the base token",
    )
    .option(
      "--filter-out-remaining-amount-quote-token <string>",
      "Filter out orders with remaining amount less than the provided value for the quote token",
    )
    .action(
      async ({
        quote,
        base,
        filterOutRemainingAmountBaseToken,
        filterOutRemainingAmountQuoteToken,
      }) => {
        await listOrders(
          quote,
          base,
          filterOutRemainingAmountBaseToken,
          filterOutRemainingAmountQuoteToken,
        );
      },
    );

  commands.command("listen-to-order-changes").action(async () => {
    await listenToOrderChanges();
  });

  commands
    .command("listen-to-latest-filled-orders-changes-for-base-and-quote")
    .requiredOption("--quote-mint <string>")
    .requiredOption("--base-mint <string>")
    .action(async ({ quoteMint, baseMint }) => {
      await listenToOrderChangesForQuoteAndBase(
        new PublicKey(quoteMint),
        new PublicKey(baseMint),
      );
    });

  commands
    .command("listen-to-orders-changes-for-maker")
    .requiredOption("--maker <string>")
    .action(async ({ maker }) => {
      await listenToOrderChangesForMaker(new PublicKey(maker));
    });

  commands.command("get-all-orders").action(async ({}) => {
    await getAllOrders();
  });

  commands.command("create-mint").action(async () => {
    const admin = process.env.ADMIN;
    const rpc = process.env.RPC_ENV;
    const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);

    const tokenMint = new anchor.web3.Keypair();

    await createMintFromKeypair(env.provider, env.admin.publicKey, tokenMint);

    console.log("New mint: ", tokenMint.publicKey.toString());

    // create ./tmp folder if it doesn't exist
    if (!fs.existsSync("./tmp")) {
      fs.mkdirSync("./tmp");
    }

    const finalPath = path.resolve(
      process.cwd(),
      "tmp",
      tokenMint.publicKey.toString() + ".json",
    );
    fs.writeFileSync(finalPath, tokenMint.secretKey);
    console.log(
      "Written to: ",
      "./tmp/" + tokenMint.publicKey.toString() + ".json",
    );
  });

  commands
    .command("create-ata")
    .option(`--admin <string>`, "The admin keypair file")
    .option(`--cluster <string>`, "The Solana cluster to use")
    .option(`--mint <string>`, "The Mint to use")
    .action(async ({ admin, cluster, mint }) => {
      const env = initializeClient(
        cluster,
        admin,
        getLimoProgramId(cluster),
        false,
      );
      const tokenMint = new PublicKey(mint);
      const ata = await setupAta(env.provider, tokenMint, env.admin);
      console.log("new ata: ", ata.toString());
    });

  commands
    .command("mint-token")
    .option(`--owner <string>`, "The owner to mint for")
    .option(`--mint <string>`, "The Mint to use")
    .option(`--amount <string>`, "The amount to reward")
    .action(async ({ owner, mint, amount }) => {
      const admin = process.env.ADMIN;
      const rpc = process.env.RPC_ENV;
      const env = initializeClient(rpc!, admin!, getLimoProgramId(rpc!), false);

      const tokenMint = new PublicKey(mint);

      const ownerAta = await setupAta(
        env.provider,
        tokenMint,
        env.admin,
        new PublicKey(owner),
      );

      const mintDecimals = await getMintDecimals(
        env.provider.connection,
        tokenMint,
      );
      const amountLamports = amountToLamportsDecimal(
        new Decimal(amount),
        mintDecimals,
      );

      // Create ata if necessary
      await sleep(2000);

      // Mint to ata
      await mintTo(
        env.provider,
        tokenMint,
        ownerAta,
        amountLamports.toNumber(),
        mintDecimals,
      );

      await sleep(2000);
      const balance =
        await env.provider.connection.getTokenAccountBalance(ownerAta);

      console.log(
        "Minted",
        amount,
        tokenMint.toString(),
        "final balance:",
        balance.value.uiAmount,
      );
    });

  await commands.parseAsync();
}

main()
  .then(() => {
    process.exit();
  })
  .catch((e) => {
    console.error("\nLimo CLI exited with error:\n\n", e);
    process.exit(1);
  });
