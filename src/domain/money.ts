/**
 * Money is an integer number of centavos. 63100 means PHP 631.00.
 *
 * Never floats: a cashier who tenders the exact total must not be told the
 * amount is short because 706.72 compared unequal to itself, and partial
 * payments must settle a balance to exactly zero.
 */
export type Centavos = number

export function fromPesos(pesos: number): Centavos {
  return Math.round(pesos * 100)
}

export function toPesos(amount: Centavos): number {
  return amount / 100
}

/** The single rounding point for any rate applied to money. Half-up. */
export function applyRate(amount: Centavos, rate: number): Centavos {
  return Math.round(amount * rate)
}

export type VatBreakdown = {
  net: Centavos
  vat: Centavos
}

/**
 * VAT is inclusive and never added to a total (decision D1). The net is
 * derived first so net + vat always equals the total exactly.
 */
export function breakDownVat(total: Centavos, rate: number): VatBreakdown {
  const net = Math.round(total / (1 + rate))

  return { net, vat: total - net }
}

/** Parses keypad input such as "1,000" or "706.72". Null when not an amount. */
export function parseAmountInput(raw: string): Centavos | null {
  const cleaned = raw.replace(/[\u20B1,\s]/g, '')

  if (cleaned === '' || cleaned === '.' || !/^\d*(\.\d{0,2})?$/.test(cleaned)) {
    return null
  }

  const value = Number(cleaned)

  return Number.isFinite(value) ? Math.round(value * 100) : null
}
