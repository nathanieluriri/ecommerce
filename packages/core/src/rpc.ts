import type { CartInput, FulfillmentInput } from './schemas';
import type { OrderStatus } from './types';

export type EmailTemplate =
  | 'order_confirmation'
  | 'order_shipped'
  | 'order_status'
  | 'order_refunded'
  | 'abandoned_checkout'
  | 'low_stock'
  | 'magic_link'
  | 'broadcast'
  | 'custom';

export interface SendEmailInput {
  storeId?: string;
  to: string;
  template: EmailTemplate;
  orderId?: string;
  note?: string;
  link?: string;
  items?: { title: string; stock: number }[];
  subject?: string;
  html?: string;
  text?: string;
}

export interface EmailService {
  send(input: SendEmailInput): Promise<{ ok: boolean; id: string; error?: string }>;
}

export interface OrdersService {
  createCheckout(input: CartInput): Promise<{ orderId: string; url: string }>;
  updateStatus(input: {
    orderId: string;
    status: OrderStatus;
    note?: string;
    by?: string;
    notify?: boolean;
    fulfillment?: FulfillmentInput;
  }): Promise<{ ok: true }>;
  refund(input: { orderId: string; amount?: number; by?: string }): Promise<{ ok: true; refundId: string }>;
  addNote(input: { orderId: string; note: string; by?: string }): Promise<{ ok: true }>;
}

export type Binding<T> = Fetcher & T;
