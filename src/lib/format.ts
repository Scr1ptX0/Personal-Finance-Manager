import { CURRENCIES, Currency } from '@/types/finance';

export function formatMoney(amount: number, currency: Currency): string {
  const { symbol } = CURRENCIES[currency] || { symbol: '' };
  return `${symbol}${amount.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
