import { WorkerEntrypoint } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';
import PostalMime from 'postal-mime';
import { db, ObjectId, type DbEnv } from '@shop/core/db';
import type { EmailService, SendEmailInput } from '@shop/core';
import { render } from './templates';

export interface Env extends DbEnv {
  MAILER: SendEmail;
  DEFAULT_FROM: string;
  FORWARD_TO?: string;
  RESEND_API_KEY?: string;
}

async function deliver(env: Env, from: string, to: string, subject: string, html: string, text: string, replyTo?: string) {
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text, reply_to: replyTo }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }
  const msg = createMimeMessage();
  msg.setSender(from);
  msg.setRecipient(to);
  msg.setSubject(subject);
  if (replyTo) msg.setHeader('Reply-To', replyTo);
  msg.addMessage({ contentType: 'text/plain', data: text || ' ' });
  msg.addMessage({ contentType: 'text/html', data: html });
  await env.MAILER.send(new EmailMessage(from, to, msg.asRaw()));
}

export default class extends WorkerEntrypoint<Env> implements EmailService {
  async send(input: SendEmailInput) {
    const c = await db(this.env);
    const store = input.storeId ? await c.stores.findOne({ _id: new ObjectId(input.storeId) }) : null;
    const from = store?.emailFrom || this.env.DEFAULT_FROM;
    const r = render(input.template, store, input.data ?? {}, input);
    const record = {
      _id: new ObjectId(),
      storeId: store?._id,
      direction: 'out' as const,
      from,
      to: input.to,
      subject: r.subject,
      html: r.html,
      text: r.text,
      template: input.template,
      status: 'sent' as 'sent' | 'failed',
      error: undefined as string | undefined,
      createdAt: new Date(),
    };
    try {
      await deliver(this.env, from, input.to, r.subject, r.html, r.text, store?.supportEmail);
    } catch (err) {
      record.status = 'failed';
      record.error = err instanceof Error ? err.message : String(err);
    }
    await c.emails.insertOne(record);
    return { ok: record.status === 'sent', id: record._id.toHexString(), error: record.error };
  }

  async email(message: ForwardableEmailMessage) {
    const parsed = await PostalMime.parse(message.raw);
    const c = await db(this.env);
    const store = await c.stores.findOne({ $or: [{ emailFrom: message.to }, { supportEmail: message.to }] });
    await c.emails.insertOne({
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
    });
    if (this.env.FORWARD_TO) await message.forward(this.env.FORWARD_TO);
  }

  async fetch() {
    return new Response('shop-email', { status: 200 });
  }
}
