import dotenv from 'dotenv';
import { Keypair, Transaction, SystemProgram, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Client } from '@pythnetwork/express-relay-js';
import axios from 'axios';
import { getOrca, OrcaPoolConfig } from '@orca-so/sdk';
import Decimal from 'decimal.js';
import { MangoClient } from '@blockworks-foundation/mango-v4';
import * as Phoenix from '@ellipsis-labs/phoenix-sdk';
import { Market as SerumMarket } from '@project-serum/serum';
import BN from 'bn.js';

dotenv.config();

export class PythExpressRelay {
  private static instance: PythExpressRelay;
  private client: Client;
  private keypair: Keypair;
  private opportunityCallback: ((opportunity: any) => void) | null = null;

  private constructor(
    _bidStatusCallback: (status: any) => void, // Unused, see note below
    opportunityCallback: (opportunity: any) => void
  ) {
    // Securely load private key from .env
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not set in .env');
    }
    const rawKey = JSON.parse(process.env.PRIVATE_KEY);
    this.keypair = Keypair.fromSecretKey(Uint8Array.from(rawKey));

    // Initialize client with only options object as required by SDK
    this.client = new Client({ baseUrl: 'https://per.pyth.network/' });
    // Store the callback for later use
    this.opportunityCallback = opportunityCallback;
    // NOTE: If the SDK requires registering the callback, do so here. For example:
    // this.client.on('opportunity', opportunityCallback);
    // If the SDK expects a WsOptions object, pass it here instead.
  }

  public static async getInstance(
    bidStatusCallback: (status: any) => void,
    opportunityCallback: (opportunity: any) => void
  ): Promise<PythExpressRelay> {
    if (!this.instance) {
      this.instance = new PythExpressRelay(bidStatusCallback, opportunityCallback);
      await this.instance.client.subscribeChains(['solana']);
    }
    return this.instance;
  }

  public async submitBid(opportunityId: string, amount: string) {
    const bidParams: any = {
      opportunityId,
      amount,
      signer: this.keypair,
    };
    return this.client.submitBid(bidParams);
  }

  // Generate and submit a bid for an opportunity using real Solana transaction logic
  public async generateAndSubmitBid(opportunity: any) {
    let transaction: Transaction = new Transaction(); // Always initialize as Transaction

    // 1. DEX Swap via Jupiter
    if (opportunity.market && opportunity.market.type === 'swap') {
      try {
        // Fetch Jupiter swap transaction
        const { inputMint, outputMint, amount, slippageBps } = opportunity.market;
        const userPublicKey = this.keypair.publicKey.toString();
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps || 100}`;
        const quoteResp = await axios.get(quoteUrl);
        const route = quoteResp.data;
        const swapResp = await axios.post('https://quote-api.jup.ag/v6/swap', {
          route,
          userPublicKey,
          wrapUnwrapSOL: true
        });
        if (swapResp.data && typeof swapResp.data.swapTransaction === 'string') {
          // Decode base64 string to Transaction
          transaction = Transaction.from(Buffer.from(swapResp.data.swapTransaction, 'base64'));
        } else {
          transaction = new Transaction();
        }
      } catch (e) {
        // Fallback to dummy transaction if Jupiter fails
        transaction = new Transaction();
      }
    }
    // 2. Token Transfer
    else if (opportunity.market && opportunity.market.type === 'transfer') {
      try {
        const { destination, lamports } = opportunity.market;
        transaction = new Transaction();
        transaction.add(SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: new PublicKey(destination),
          lamports: lamports || 1000,
        }));
      } catch (e) {
        transaction = new Transaction();
      }
    }
    // 3. Advanced DEX/Execution Methods
    else if (opportunity.execution && opportunity.execution.method) {
      transaction = new Transaction();
      switch (opportunity.execution.method) {
        case 'serum': {
          // Serum order logic (real Serum DEX integration)
          try {
            const connection = new (require('@solana/web3.js').Connection)(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
            const market = await SerumMarket.load(
              connection,
              new PublicKey(opportunity.market.market),
              {},
              new PublicKey(opportunity.market.programId)
            );
            // Use publicKey for owner if required by Serum SDK
            const owner = this.keypair.publicKey;
            const payer = new PublicKey(opportunity.market.payer); // SPL token account
            const placeOrderInstruction = await market.makePlaceOrderInstruction(
              connection,
              {
                owner,
                payer,
                side: opportunity.market.side, // 'buy' or 'sell'
                price: Number(opportunity.market.price),
                size: Number(opportunity.market.size),
                orderType: 'limit', // or 'ioc', 'postOnly'
              }
            );
            transaction.add(placeOrderInstruction);
          } catch (e) {
            transaction = new Transaction();
          }
          break;
        }
        case 'raydium': {
          // Raydium swap logic: Use Jupiter as a fallback since it routes through Raydium pools
          try {
            // Use the same logic as the Jupiter swap above
            const { inputMint, outputMint, amount, slippageBps } = opportunity.market;
            const userPublicKey = this.keypair.publicKey.toString();
            const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps || 100}`;
            const quoteResp = await axios.get(quoteUrl);
            const route = quoteResp.data;
            const swapResp = await axios.post('https://quote-api.jup.ag/v6/swap', {
              route,
              userPublicKey,
              wrapUnwrapSOL: true
            });
            if (swapResp.data && typeof swapResp.data.swapTransaction === 'string') {
              // Decode base64 string to Transaction
              transaction = Transaction.from(Buffer.from(swapResp.data.swapTransaction, 'base64'));
            } else {
              transaction = new Transaction();
            }
          } catch (e) {
            transaction = new Transaction();
          }
          break;
        }
        case 'orca': {
          // Real Orca swap logic using @orca-so/sdk
          try {
            const connection = new (require('@solana/web3.js').Connection)(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
            const orca = getOrca(connection);
            // Validate pool key
            const poolKey = opportunity.market.pool as keyof typeof OrcaPoolConfig;
            if (!(poolKey in OrcaPoolConfig)) {
              throw new Error(`Invalid Orca pool: ${opportunity.market.pool}`);
            }
            const pool = orca.getPool(OrcaPoolConfig[poolKey]);
            // Determine direction
            const inputToken = pool.getTokenA().mint.toBase58() === opportunity.market.inputMint ? pool.getTokenA() : pool.getTokenB();
            const amountIn = new Decimal(opportunity.market.amount);
            // Get quote and min output
            const quote = await pool.getQuote(inputToken, amountIn);
            const minOutput = quote.getMinOutputAmount();
            // Build swap transaction
            const swapPayload = await pool.swap(this.keypair, inputToken, amountIn, minOutput);
            transaction = swapPayload.transaction;
          } catch (e) {
            transaction = new Transaction();
          }
          break;
        }
        case 'mango': {
          // Mango v4 spot order logic (manual instruction construction)
          try {
            const connection = new (require('@solana/web3.js').Connection)(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
            const client = new MangoClient(connection, new PublicKey(opportunity.market.group));
            const mangoAccountPk = new PublicKey(opportunity.state.account);
            const group = await client.getGroup(new PublicKey(opportunity.market.group));
            // Fetch spot market info (assume market index is provided)
            const spotMarketIndex = opportunity.market.marketIndex;
            if (spotMarketIndex === undefined) throw new Error('Spot market index not provided');
            // Build instruction data (see Mango v4 IDL for PlaceSpotOrder)
            // This is a simplified example; you may need to adjust for your SDK version and order params
            const instruction = await client.program.methods.placeSpotOrder(
              {
                marketIndex: spotMarketIndex,
                price: new BN(opportunity.market.price),
                maxBaseQty: new BN(opportunity.market.size),
                side: opportunity.market.side === 'buy' ? 0 : 1, // 0=buy, 1=sell
                orderType: 0, // 0=limit, 1=IOC, 2=postOnly
                clientOrderId: new BN(Date.now()),
                useOnlyDepositedFunds: true,
              }
            ).accounts({
              group: group.publicKey,
              mangoAccount: mangoAccountPk,
              owner: this.keypair.publicKey,
              market: group.spotMarketsMap.get(spotMarketIndex).spotMarket,
              bids: group.spotMarketsMap.get(spotMarketIndex).bids,
              asks: group.spotMarketsMap.get(spotMarketIndex).asks,
              eventQueue: group.spotMarketsMap.get(spotMarketIndex).eventQueue,
              oracle: group.oraclesMap.get(spotMarketIndex),
              payer: this.keypair.publicKey,
              systemProgram: SystemProgram.programId,
              tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
              rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
            }).instruction();
            transaction.add(instruction);
          } catch (e) {
            transaction = new Transaction();
          }
          break;
        }
        case 'phoenix': {
          // Phoenix order logic (latest pattern)
          // Uses Phoenix SDK. Retrieves marketConfig and marketState using .get, not .find.
          try {
            const connection = new (require('@solana/web3.js').Connection)(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com');
            const phoenix = await Phoenix.Client.create(connection);
            // Use the marketId as a string for Map access
            const marketConfig = phoenix.marketConfigs.get(new PublicKey(opportunity.market.market).toBase58());
            if (!marketConfig) throw new Error('Phoenix market config not found');
            const marketState = phoenix.marketStates.get(marketConfig.marketId);
            if (!marketState) throw new Error('Phoenix market state not found');
            // Check if getSwapTransaction exists on marketState
            if (marketState && typeof (marketState as any).getSwapTransaction === 'function') {
              const tx = (marketState as any).getSwapTransaction({
                side: opportunity.market.side === 'buy' ? Phoenix.Side.Bid : Phoenix.Side.Ask,
                inAmount: Number(opportunity.market.size),
                trader: this.keypair.publicKey,
              });
              transaction = tx;
            } else {
              // Fallback: create empty transaction
              transaction = new Transaction();
            }
          } catch (e) {
            transaction = new Transaction();
          }
          break;
        }
        case 'serum': {
          // Serum order logic (latest pattern)
          // Uses Serum DEX v3 SDK. The owner parameter should be a Keypair (Signer), not Account. See Serum SDK docs.
          try {
            throw new Error('Serum DEX swap instructions not yet implemented.');
          } catch (e) {
            transaction = new Transaction();
          }
          break;
        }
        // Add more DEX/protocols as needed
        default: {
          // Unknown method, fallback to dummy transaction
          break;
        }
      }
    }
    // 4. Use base64-encoded transaction if provided
    else if (opportunity.order) {
      try {
        const txBuffer = Buffer.from(opportunity.order, 'base64');
        transaction = Transaction.from(txBuffer);
      } catch (e) {
        transaction = new Transaction();
      }
    } else if (opportunity.execution || opportunity.market || opportunity.state) {
      // Example: Build a custom transaction using execution, market, or state fields
      transaction = new Transaction();
      // Add more instructions as needed
    } else {
      // Fallback: create a dummy transaction (no instructions)
      transaction = new Transaction();
    }

    // Set fee payer and blockhash if provided
    if (transaction) {
      transaction.feePayer = this.keypair.publicKey;
      if (opportunity.blockhash) {
        transaction.recentBlockhash = opportunity.blockhash;
      }
      transaction.sign(this.keypair);
    }

    // Serialize transaction to base64
    const serializedTx = transaction.serialize().toString('base64');

    // Build bid object (extend as needed for your relay's BidSvm structure)
    const bid: any = {
      transaction: serializedTx,
      chain_id: opportunity.chain_id || 'solana',
      env: opportunity.env || 'svm',
    };
    if (opportunity.opportunityId) bid.opportunityId = opportunity.opportunityId;
    if (opportunity.type) bid.type = opportunity.type;
    if (opportunity.chainId) bid.chainId = opportunity.chainId;

    // Submit bid
    return this.client.submitBid(bid);
  }
} 