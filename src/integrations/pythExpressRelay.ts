import dotenv from 'dotenv';
import { Keypair, Transaction } from '@solana/web3.js';
import {
  Client,
  OpportunityParams,
  BidParams,
  BidStatus,
} from '@pythnetwork/express-relay-js';

dotenv.config();

export type OpportunityHandler = (opportunity: OpportunityParams) => void;
export type BidStatusHandler = (status: BidStatus) => void;

export class PythExpressRelay {
  private static instance: PythExpressRelay;
  private client: Client;
  private keypair: Keypair;

  private constructor(
    bidStatusCallback: BidStatusHandler,
    opportunityCallback: OpportunityHandler
  ) {
    // Securely load private key from .env
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not set in .env');
    }
    const rawKey = JSON.parse(process.env.PRIVATE_KEY);
    this.keypair = Keypair.fromSecretKey(Uint8Array.from(rawKey));

    // Initialize client
    this.client = new Client(
      { baseUrl: 'https://per.pyth.network/' },
      bidStatusCallback,
      opportunityCallback
    );
  }

  public static async getInstance(
    bidStatusCallback: BidStatusHandler,
    opportunityCallback: OpportunityHandler
  ): Promise<PythExpressRelay> {
    if (!this.instance) {
      this.instance = new PythExpressRelay(bidStatusCallback, opportunityCallback);
      await this.instance.client.subscribeChains(['solana']);
    }
    return this.instance;
  }

  public async submitBid(opportunityId: string, amount: string) {
    const bidParams: BidParams = {
      opportunityId,
      amount,
      signer: this.keypair,
    };
    return this.client.submitBid(bidParams);
  }

  // Add a method to generate and submit a bid for an opportunity
  public async generateAndSubmitBid(opportunity: any) {
    // 1. Parse opportunity/order info
    // 2. (Your logic here) - Generate transaction instructions for the opportunity
    // For demo, create a dummy transaction. Replace with your real logic.
    const transaction = new Transaction();
    // ... add instructions to transaction ...

    // 3. Sign the transaction
    transaction.feePayer = this.keypair.publicKey;
    transaction.recentBlockhash = opportunity.blockhash || '';
    transaction.sign(this.keypair);

    // 4. Serialize transaction to base64
    const serializedTx = transaction.serialize().toString('base64');

    // 5. Build bid object
    const bid = {
      transaction: serializedTx,
      chain_id: 'solana',
      env: 'svm',
    };

    // 6. Submit bid
    return this.client.submitBid(bid);
  }
} 