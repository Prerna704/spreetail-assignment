import { query } from '../config/db.js';

export async function listExchangeRates(_req, res) {
  const result = await query(
    `SELECT * FROM exchange_rates
     ORDER BY effective_date DESC, source_currency, target_currency`
  );
  res.json({ exchangeRates: result.rows });
}

export async function createExchangeRate(req, res) {
  const result = await query(
    `INSERT INTO exchange_rates (source_currency, target_currency, rate, effective_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_currency, target_currency, effective_date)
     DO UPDATE SET rate = EXCLUDED.rate
     RETURNING *`,
    [req.body.sourceCurrency, req.body.targetCurrency, req.body.rate, req.body.effectiveDate]
  );
  res.status(201).json({ exchangeRate: result.rows[0] });
}
