import { formatMoney, type EmailTemplate, type Order, type Store } from '@shop/core';

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(store: Pick<Store, 'name' | 'themeSettings'> | null, body: string): string {
  const accent = store?.themeSettings.accent ?? '#2e2a6b';
  return `<!doctype html><html><body style="margin:0;background:#f1f1f1;font-family:Inter,Arial,sans-serif;color:#303030">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${esc(accent)};color:#fff;padding:20px 28px;font-size:18px;font-weight:600">${esc(store?.name ?? 'Your order')}</td></tr>
<tr><td style="padding:28px">${body}</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.title)} &times; ${i.quantity}</td><td align="right">${formatMoney(i.price * i.quantity, order.currency)}</td></tr>`,
    )
    .join('');
  return `<table width="100%" style="border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding-top:12px;border-top:1px solid #e3e3e3">Shipping</td><td align="right" style="padding-top:12px;border-top:1px solid #e3e3e3">${formatMoney(order.shipping, order.currency)}</td></tr>
<tr><td style="font-weight:600">Total</td><td align="right" style="font-weight:600">${formatMoney(order.total, order.currency)}</td></tr></table>`;
}

const STATUS_COPY: Record<string, string> = {
  paid: 'Your payment was received and we are preparing your order.',
  fulfilled: 'Your order has shipped.',
  delivered: 'Your order was delivered. We hope you love it.',
  cancelled: 'Your order was cancelled.',
  refunded: 'Your order was refunded.',
};

export function render(
  template: EmailTemplate,
  store: Store | null,
  data: { order?: Order; note?: string },
  custom: { subject?: string; html?: string; text?: string },
): Rendered {
  const order = data.order;
  switch (template) {
    case 'order_confirmation': {
      if (!order) throw new Error('order_confirmation needs data.order');
      const subject = `Order #${order.number} confirmed`;
      const html = layout(
        store,
        `<h2 style="margin:0 0 8px">Thanks for your order${order.customer.name ? `, ${esc(order.customer.name)}` : ''}!</h2>
<p style="margin:0 0 20px;color:#616161">Order #${order.number}. We will email you when it ships.</p>${itemsTable(order)}`,
      );
      return { subject, html, text: `${subject}. Total ${formatMoney(order.total, order.currency)}.` };
    }
    case 'order_status':
    case 'order_refunded': {
      if (!order) throw new Error(`${template} needs data.order`);
      const status = template === 'order_refunded' ? 'refunded' : order.status;
      const line = STATUS_COPY[status] ?? `Your order is now ${status}.`;
      const subject = `Order #${order.number}: ${status}`;
      const note = data.note ? `<p style="color:#616161">${esc(data.note)}</p>` : '';
      return { subject, html: layout(store, `<h2 style="margin:0 0 8px">${esc(line)}</h2>${note}${itemsTable(order)}`), text: `${subject}. ${line}` };
    }
    case 'custom': {
      const subject = custom.subject ?? '(no subject)';
      const html = custom.html ?? layout(store, `<p>${esc(custom.text ?? '')}</p>`);
      return { subject, html, text: custom.text ?? '' };
    }
  }
}
