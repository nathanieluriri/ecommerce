import { formatMoney, type CopyTemplate, type EmailTemplate, type Order, type Store } from '@shop/core';

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  order?: Order;
  note?: string;
  link?: string;
  items?: { title: string; stock: number }[];
  subject?: string;
  text?: string;
  html?: string;
  unsubscribeUrl?: string;
}

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

function layout(store: Store | null, body: string, footer = ''): string {
  const accent = store?.themeSettings.accent ?? '#2e2a6b';
  const logo = store?.themeSettings.logoUrl?.startsWith('http')
    ? `<img src="${esc(store.themeSettings.logoUrl)}" alt="${esc(store.name)}" height="28" style="display:block">`
    : esc(store?.name ?? 'Your order');
  const contact = store?.supportEmail ? `Questions? Reply to this email or write to ${esc(store.supportEmail)}.` : '';
  return `<!doctype html><html><body style="margin:0;background:#f1f1f1;font-family:Inter,Arial,sans-serif;color:#303030">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${esc(accent)};color:#fff;padding:20px 28px;font-size:18px;font-weight:600">${logo}</td></tr>
<tr><td style="padding:28px">${body}</td></tr>
<tr><td style="padding:0 28px 24px;font-size:12px;color:#757575">${contact}${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string, accent = '#2e2a6b') =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:${esc(accent)};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(label)}</a></p>`;

function itemsTable(order: Order): string {
  const m = (n: number) => formatMoney(n, order.currency);
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.title)}${i.variantTitle ? ` <span style="color:#757575">(${esc(i.variantTitle)})</span>` : ''} &times; ${i.quantity}</td><td align="right">${m(i.price * i.quantity)}</td></tr>`,
    )
    .join('');
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding-top:6px;${strong ? 'font-weight:600' : ''}">${label}</td><td align="right" style="padding-top:6px;${strong ? 'font-weight:600' : ''}">${value}</td></tr>`;
  return `<table width="100%" style="border-collapse:collapse;font-size:14px">${rows}
<tr><td colspan="2" style="border-top:1px solid #e3e3e3;padding-top:6px"></td></tr>
${row('Subtotal', m(order.subtotal))}
${order.discount ? row(`Discount${order.discountCode ? ` (${esc(order.discountCode)})` : ''}`, `-${m(order.discount)}`) : ''}
${row('Shipping', order.shipping ? m(order.shipping) : 'Free')}
${row('Total', m(order.total), true)}</table>`;
}

function fill(template: string, order: Order | undefined, store: Store | null): string {
  return template
    .replace(/\{number\}/g, order ? String(order.number) : '')
    .replace(/\{name\}/g, order?.customer.name?.split(' ')[0] ?? 'there')
    .replace(/\{store\}/g, store?.name ?? '');
}

const DEFAULT_COPY: Record<CopyTemplate, { subject: string; intro: string }> = {
  order_confirmation: { subject: 'Order #{number} confirmed', intro: 'Thanks for your order, {name}! We will email you again when it ships.' },
  order_shipped: { subject: 'Order #{number} is on its way', intro: 'Good news, {name}: your order has shipped.' },
  order_status: { subject: 'Update on order #{number}', intro: 'There is an update on your order.' },
  order_refunded: { subject: 'Refund for order #{number}', intro: 'We have issued a refund for your order. It can take 5 to 10 business days to appear on your statement.' },
  abandoned_checkout: { subject: 'You left something behind', intro: 'Your cart at {store} is still waiting. Pick up where you left off whenever you are ready.' },
};

const STATUS_LINE: Record<string, string> = {
  delivered: 'Your order was delivered. We hope you love it.',
  cancelled: 'Your order was cancelled. If you were charged, the payment will be refunded.',
  paid: 'Your payment was received and we are preparing your order.',
};

function copy(store: Store | null, t: CopyTemplate, order?: Order) {
  const custom = store?.emailCopy?.[t];
  return {
    subject: fill(custom?.subject || DEFAULT_COPY[t].subject, order, store),
    intro: fill(custom?.intro || DEFAULT_COPY[t].intro, order, store),
  };
}

export function render(template: EmailTemplate, store: Store | null, data: TemplateData): Rendered {
  const accent = store?.themeSettings.accent;
  const order = data.order;
  const needOrder = () => {
    if (!order) throw new Error(`${template} needs an order`);
    return order;
  };

  switch (template) {
    case 'order_confirmation': {
      const o = needOrder();
      const c = copy(store, template, o);
      return { subject: c.subject, html: layout(store, `${paragraphs(c.intro)}<p style="color:#616161">Order #${o.number}</p>${itemsTable(o)}`), text: `${c.intro}\n\nOrder #${o.number}, total ${formatMoney(o.total, o.currency)}.` };
    }
    case 'order_shipped': {
      const o = needOrder();
      const c = copy(store, template, o);
      const f = o.fulfillment;
      const tracking = f?.trackingNumber ? `<p><strong>${esc(f.carrier ?? 'Tracking')}:</strong> ${esc(f.trackingNumber)}</p>` : '';
      const link = f?.trackingUrl ? button(f.trackingUrl, 'Track your package', accent) : '';
      return {
        subject: c.subject,
        html: layout(store, `${paragraphs(c.intro)}${tracking}${link}${data.note ? paragraphs(data.note) : ''}${itemsTable(o)}`),
        text: `${c.intro}${f?.trackingNumber ? `\n${f.carrier ?? 'Tracking'}: ${f.trackingNumber}` : ''}${f?.trackingUrl ? `\n${f.trackingUrl}` : ''}`,
      };
    }
    case 'order_status': {
      const o = needOrder();
      const c = copy(store, template, o);
      const line = STATUS_LINE[o.status] ?? `Your order is now ${o.status}.`;
      return { subject: c.subject, html: layout(store, `${paragraphs(c.intro)}<h2 style="margin:0 0 12px;font-size:18px">${esc(line)}</h2>${data.note ? paragraphs(data.note) : ''}${itemsTable(o)}`), text: `${c.intro}\n${line}` };
    }
    case 'order_refunded': {
      const o = needOrder();
      const c = copy(store, template, o);
      const amount = o.refundedAmount ? `<p><strong>Refunded:</strong> ${formatMoney(o.refundedAmount, o.currency)}</p>` : '';
      return { subject: c.subject, html: layout(store, `${paragraphs(c.intro)}${amount}${itemsTable(o)}`), text: c.intro };
    }
    case 'abandoned_checkout': {
      const o = needOrder();
      const c = copy(store, template, o);
      if (!data.link) throw new Error('abandoned_checkout needs a link');
      return { subject: c.subject, html: layout(store, `${paragraphs(c.intro)}${itemsTable(o)}${button(data.link, 'Complete your purchase', accent)}`), text: `${c.intro}\n${data.link}` };
    }
    case 'low_stock': {
      const rows = (data.items ?? []).map((i) => `<tr><td style="padding:4px 0">${esc(i.title)}</td><td align="right">${i.stock} left</td></tr>`).join('');
      return {
        subject: `Low stock at ${store?.name ?? 'your store'}`,
        html: layout(store, `<p>These items dropped below your low-stock threshold:</p><table width="100%" style="font-size:14px">${rows}</table>`),
        text: (data.items ?? []).map((i) => `${i.title}: ${i.stock} left`).join('\n'),
      };
    }
    case 'magic_link': {
      if (!data.link) throw new Error('magic_link needs a link');
      return {
        subject: `Sign in to ${store?.name ?? 'your account'}`,
        html: layout(store, `<p>Tap the button to sign in. The link works once and expires in 15 minutes.</p>${button(data.link, 'Sign in', accent)}<p style="color:#757575;font-size:13px">If you did not ask for this, you can ignore this email.</p>`),
        text: `Sign in: ${data.link}\nThe link expires in 15 minutes.`,
      };
    }
    case 'broadcast': {
      const unsub = data.unsubscribeUrl ? `<br><a href="${esc(data.unsubscribeUrl)}" style="color:#757575">Unsubscribe</a>` : '';
      return {
        subject: data.subject ?? '(no subject)',
        html: layout(store, paragraphs(data.text ?? ''), unsub),
        text: `${data.text ?? ''}${data.unsubscribeUrl ? `\n\nUnsubscribe: ${data.unsubscribeUrl}` : ''}`,
      };
    }
    case 'custom':
      return { subject: data.subject ?? '(no subject)', html: data.html ?? layout(store, paragraphs(data.text ?? '')), text: data.text ?? '' };
  }
}
