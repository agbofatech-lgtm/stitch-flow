import { CurrencyCode } from '../types';

export function safeCurrency(
  currency?: string,
  fallback: CurrencyCode = 'GHS'
): CurrencyCode {
  if (currency === 'USD' || currency === 'GHS' || currency === 'NGN' || currency === 'GBP') {
    return currency;
  }

  return fallback;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'GHS'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  const labels: Record<CurrencyCode, string> = {
    USD: 'USD',
    GHS: 'GHS',
    NGN: 'NGN',
    GBP: 'GBP',
  };

  return `${labels[currency]} ${safeAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
