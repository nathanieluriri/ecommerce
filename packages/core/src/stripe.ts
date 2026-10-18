import Stripe from 'stripe';

export function stripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

export type { Stripe };
