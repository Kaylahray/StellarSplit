import { Injectable, Logger } from '@nestjs/common';
import { Horizon } from '@stellar/stellar-sdk';
import { HorizonApi } from '@stellar/stellar-sdk/lib/horizon/horizon_api';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private readonly horizonServer: Horizon.Server;

  constructor() {
    // Using testnet for development; in production, this should be configurable
    this.horizonServer = new Horizon.Server(
      process.env.STELLAR_NETWORK === 'mainnet'
        ? 'https://horizon.stellar.org'
        : 'https://horizon-testnet.stellar.org'
    );
  }

  /**
   * Verify a Stellar transaction by its hash
   * @param txHash The transaction hash to verify
   * @returns Transaction details or null if not found
   */
  async verifyTransaction(txHash: string): Promise<{
    valid: boolean;
    amount: number;
    asset: string;
    sender: string;
    receiver: string;
    timestamp: string;
  } | null> {
    try {
      this.logger.log(`Verifying transaction: ${txHash}`);
      
      // Fetch the transaction from Horizon
      const transaction = await this.horizonServer.transactions()
        .transaction(txHash)
        .call();

      // Check if transaction exists and is successful
      if (!transaction) {
        this.logger.warn(`Transaction not found: ${txHash}`);
        return null;
      }

      // Verify transaction is successful (not failed)
      if (transaction.successful !== true) {
        this.logger.warn(`Transaction failed: ${txHash}`);
        return {
          valid: false,
          amount: 0,
          asset: '',
          sender: '',
          receiver: '',
          timestamp: transaction.created_at,
        };
      }

      // Parse transaction operations to find payment details
      const operations = await this.horizonServer.operations()
        .forTransaction(txHash)
        .limit(100) // Limit to reasonable number of operations
        .call();

      // Find the payment operation (typically the first one)
      const paymentOp = operations.records.find((op: HorizonApi.BaseOperationResponse) => 
        op.type === 'payment' || op.type === 'path_payment_strict_receive' || op.type === 'path_payment_strict_send'
      );

      if (!paymentOp) {
        this.logger.warn(`No payment operation found in transaction: ${txHash}`);
        return {
          valid: false,
          amount: 0,
          asset: '',
          sender: transaction.source_account,
          receiver: '',
          timestamp: transaction.created_at,
        };
      }

      // Extract details based on operation type
      let amount = 0;
      let asset = '';
      let receiver = '';

      if (paymentOp.type === 'payment') {
        const paymentOperation = paymentOp as HorizonApi.PaymentOperationResponse;
        amount = parseFloat(paymentOperation.amount);
        asset = `${paymentOperation.asset_type === 'native' ? 'XLM' : paymentOperation.asset_code}-${paymentOperation.asset_issuer}`;
        receiver = paymentOperation.to;
      } else if (paymentOp.type.includes('path_payment')) {
        // For path payments, use the destination amount
        if (paymentOp.type === 'path_payment_strict_receive') {
          const strictReceiveOp = paymentOp as HorizonApi.PathPaymentOperationResponse;
          amount = parseFloat(strictReceiveOp.amount);
          asset = `${strictReceiveOp.asset_type === 'native' ? 'XLM' : strictReceiveOp.asset_code}-${strictReceiveOp.asset_issuer}`;
          receiver = strictReceiveOp.to;
        } else if (paymentOp.type === 'path_payment_strict_send') {
          const strictSendOp = paymentOp as HorizonApi.PathPaymentStrictSendOperationResponse;
          amount = parseFloat(strictSendOp.amount);
          asset = `${strictSendOp.asset_type === 'native' ? 'XLM' : strictSendOp.asset_code}-${strictSendOp.asset_issuer}`;
          receiver = strictSendOp.to;
        }
      }

      this.logger.log(`Successfully verified transaction: ${txHash}, amount: ${amount} ${asset}`);

      return {
        valid: true,
        amount,
        asset,
        sender: transaction.source_account,
        receiver,
        timestamp: transaction.created_at,
      };
    } catch (error) {
      this.logger.error(`Error verifying transaction ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Get account details from Stellar
   * @param accountId The Stellar account ID
   * @returns Account details
   */
  async getAccountDetails(accountId: string) {
    try {
      return await this.horizonServer.accounts().accountId(accountId).call();
    } catch (error) {
      this.logger.error(`Error fetching account details for ${accountId}:`, error);
      throw error;
    }
  }

  /**
   * Check if an account exists and is active
   * @param accountId The Stellar account ID
   * @returns Boolean indicating if account exists and is active
   */
  async isAccountActive(accountId: string): Promise<boolean> {
    try {
      const account = await this.getAccountDetails(accountId);
      return !!account && account.subentry_count >= 0;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }
}