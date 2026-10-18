import { describe, expect, it } from 'vitest';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../src/auth';

describe('auth', () => {
  it('hashes and verifies passwords', async () => {
    const h = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });

  it('signs tokens and rejects tampering and expiry', async () => {
    const t = await signToken({ sub: '1', email: 'a@b.co', role: 'owner' }, 'secret');
    expect((await verifyToken(t, 'secret'))?.email).toBe('a@b.co');
    expect(await verifyToken(t, 'other')).toBeNull();
    expect(await verifyToken(t.replace(/^./, 'x'), 'secret')).toBeNull();
    expect(await verifyToken(await signToken({ sub: '1', email: 'a', role: 'r' }, 'secret', -1), 'secret')).toBeNull();
  });
});
