import type { CartInput } from './schemas';
import type { OrderStatus } from './types';

export type EmailTemplate = 'order_confirmation' | 'order_status' | 'order_refunded' | 'custom';

export interface SendEmailInput {
  storeId?: string;
  to: string;
  template: EmailTemplate;
  orderId?: string;
  note?: string;
  subject?: string;
  html?: string;
  text?: string;
}

export interface EmailService {
  send(input: SendEmailInput): Promise<{ ok: boolean; id: string; error?: string }>;
}

export interface OrdersService {
  createCheckout(input: CartInput): Promise<{ orderId: string; url: string }>;
  updateStatus(input: { orderId: string; status: OrderStatus; note?: string; by?: string; notify?: boolean }): Promise<{ ok: true }>;
  refund(input: { orderId: string; amount?: number; by?: string }): Promise<{ ok: true; refundId: string }>;
  addNote(input: { orderId: string; note: string; by?: string }): Promise<{ ok: true }>;
}

export type Binding<T> = Fetcher & T;
