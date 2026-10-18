const ZERO_DECIMAL = new Set(['jpy', 'krw', 'vnd', 'clp', 'xaf', 'xof', 'ugx', 'rwf']);

export function money(amount: number, currency: string): string {
  const digits = ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 10 ** digits);
}

export const toMinor = (major: string, currency: string) =>
  Math.round(Number(major || 0) * 10 ** (ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2));

export const toMajor = (minor: number | undefined, currency: string) =>
  minor == null ? '' : String(minor / 10 ** (ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2));

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
