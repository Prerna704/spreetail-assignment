import { query } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

export const SUPPORTED_CURRENCIES = ['INR', 'USD'];

export function assertCurrency(currency) {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new ApiError(400, `Unsupported currency: ${currency}`);
  }
}

export async function getExchangeRate({ sourceCurrency, targetCurrency, date, client = null }) {
  assertCurrency(sourceCurrency);
  assertCurrency(targetCurrency);

  if (sourceCurrency === targetCurrency) {
    return 1;
  }

  const runner = client ?? { query };
  const result = await runner.query(
    `SELECT rate
     FROM exchange_rates
     WHERE source_currency = $1
       AND target_currency = $2
       AND effective_date <= $3
     ORDER BY effective_date DESC
     LIMIT 1`,
    [sourceCurrency, targetCurrency, date]
  );

  if (!result.rows[0]) {
    throw new ApiError(400, `Missing historical exchange rate ${sourceCurrency}->${targetCurrency} for ${date}`);
  }

  return Number(result.rows[0].rate);
}

export function toMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
