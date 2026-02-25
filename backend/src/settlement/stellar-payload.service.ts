import { Injectable } from "@nestjs/common";

@Injectable()
export class StellarPayloadService {
  /**
   * Generates a SEP-0007 compliant web+stellar URI
   * Format: web+stellar:pay?destination=GC...&amount=10&memo=...
   */
  generatePaymentUri(params: {
    destination: string;
    amount: string;
    assetCode?: string;
    memo?: string;
  }): string {
    const baseUrl = "web+stellar:pay";
    const query = new URLSearchParams({
      destination: params.destination,
      amount: params.amount,
    });

    if (params.assetCode && params.assetCode !== "XLM") {
      // For custom assets, format is CODE:ISSUER
      const [code, issuer] = params.assetCode.split(":");
      query.append("asset_code", code);
      if (issuer) query.append("asset_issuer", issuer);
    }

    if (params.memo) {
      query.append("memo", params.memo);
    }

    return `${baseUrl}?${query.toString()}`;
  }
}
