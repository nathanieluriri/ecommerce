const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export function minorUnits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? 0 : 2;
}

export function formatMoney(amount: number, currency: string, locale = 'en-US'): string {
  const digits = minorUnits(currency);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(
    amount / 10 ** digits,
  );
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** minorUnits(currency));
}
