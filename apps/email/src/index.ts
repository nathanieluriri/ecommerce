import { WorkerEntrypoint } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage, Mailbox } from 'mimetext';
import PostalMime from 'postal-mime';
import { db, ObjectId, scoped, type Collections, type DbEnv } from '@shop/core/db';
import type { EmailService, SendEmailInput, Store } from '@shop/core';
import { render, type TemplateData } from './templates';

export interface Env extends DbEnv {
  MAILER: SendEmail;
  DEFAULT_FROM: string;
  FORWARD_TO?: string;
  RESEND_API_KEY?: string;
  STOREFRONT_URL?: string;
  BROADCAST_BATCH?: string;
}

interface Outgoing {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

async function deliver(env: Env, m: Outgoing) {
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: m.from, to: m.to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo, headers: m.headers }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  const msg = createMimeMessage();
  msg.setSender(m.from);
  msg.setRecipient(m.to);
  msg.setSubject(m.subject);
  if (m.replyTo) msg.setHeader('Reply-To', new Mailbox(m.replyTo));
  for (const [k, v] of Object.entries(m.headers ?? {})) msg.setHeader(k, v);
  msg.addMessage({ contentType: 'text/plain', data: m.text || ' ' });
  msg.addMessage({ contentType: 'text/html', data: m.html });
  await env.MAILER.send(new EmailMessage(m.from, m.to, msg.asRaw()));
}

export function storefrontBase(env: Env, store: Store): string {
  if (store.domains[0]) return `https://${store.domains[0]}`;
  return (env.STOREFRONT_URL ?? '').replace(/\/$/, '');
}

async function sendAndLog(env: Env, c: Collections, store: Store | null, template: string, to: string, data: Parameters<typeof render>[2], kind: Parameters<typeof render>[0], headers?: Record<string, string>) {
  const orderId = data.order?._id;
  const from = store?.emailFrom || env.DEFAULT_FROM;
  const r = render(kind, store, data);
  const record = {
    _id: new ObjectId(),
    storeId: store?._id,
    orderId,
    direction: 'out' as const,
    from,
    to,
    subject: r.subject,
    html: r.html,
    text: r.text,
    template,
    status: 'sent' as 'sent' | 'failed',
    error: undefined as string | undefined,
    createdAt: new Date(),
  };
  try {
    await deliver(env, { from, to, subject: r.subject, html: r.html, text: r.text, replyTo: store?.supportEmail, headers });
  } catch (err) {
    record.status = 'failed';
    record.error = err instanceof Error ? err.message : String(err);
  }
  await c.emails.insertOne(record, { ignoreUndefined: true });
  return { ok: record.status === 'sent', id: record._id.toHexString(), error: record.error };
}

async function runBroadcasts(env: Env) {
  const c = await db(env);
  const batch = Number(env.BROADCAST_BATCH ?? 40);
  const b = await c.broadcasts.findOne({ status: { $in: ['queued', 'sending'] } }, { sort: { createdAt: 1 } });
  if (!b) return;
  const store = await c.stores.findOne({ _id: b.storeId });
  if (!store) {
    await c.broadcasts.updateOne({ _id: b._id }, { $set: { status: 'sent', finishedAt: new Date() } });
    return;
  }
  const subs = await c.subscribers
    .find({ storeId: b.storeId, status: 'subscribed', ...(b.cursor ? { _id: { $gt: b.cursor } } : {}) })
    .sort({ _id: 1 })
    .limit(batch)
    .toArray();
  const base = storefrontBase(env, store);
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    const unsubscribeUrl = `${base}/unsubscribe?t=${s.token}`;
    const r = await sendAndLog(env, c, store, 'broadcast', s.email, { subject: b.subject, text: b.text, unsubscribeUrl }, 'broadcast', {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
    });
    if (r.ok) sent++;
    else failed++;
  }
  const done = subs.length < batch;
  await c.broadcasts.updateOne(
    { _id: b._id },
    {
      $set: { status: done ? 'sent' : 'sending', ...(subs.length ? { cursor: subs[subs.length - 1]!._id } : {}), ...(done ? { finishedAt: new Date() } : {}) },
      $inc: { sent, failed },
    },
  );
}

export default class extends WorkerEntrypoint<Env> implements EmailService {
  async send(input: SendEmailInput) {
    return scoped(async () => {
      const c = await db(this.env);
      const store = input.storeId ? await c.stores.findOne({ _id: new ObjectId(input.storeId) }) : null;
      const order = input.orderId ? await c.orders.findOne({ _id: new ObjectId(input.orderId) }) : null;
      const data: TemplateData = { order: order ?? undefined, note: input.note, link: input.link, items: input.items, subject: input.subject, text: input.text, html: input.html };
      return sendAndLog(this.env, c, store, input.template, input.to, data, input.template);
    });
  }

  async email(message: ForwardableEmailMessage) {
    return scoped(async () => {
      const parsed = await PostalMime.parse(message.raw);
      const c = await db(this.env);
      const store = await c.stores.findOne({ $or: [{ emailFrom: message.to }, { supportEmail: message.to }] });
      await c.emails.insertOne(
        {
          _id: new ObjectId(),
          storeId: store?._id,
          direction: 'in',
          from: message.from,
          to: message.to,
          subject: parsed.subject ?? '(no subject)',
          text: parsed.text,
          html: parsed.html,
          status: 'received',
          read: false,
          createdAt: new Date(),
        },
        { ignoreUndefined: true },
      );
      if (this.env.FORWARD_TO) await message.forward(this.env.FORWARD_TO);
    });
  }

  async scheduled() {
    await scoped(() => runBroadcasts(this.env));
  }

  async fetch() {
    return new Response('shop-email', { status: 200 });
  }
}
