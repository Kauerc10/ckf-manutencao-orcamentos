// Decimal cents avoid accumulated binary floating point errors in negotiated prices.
function scaled(value: number, scale: number): bigint {
  if (!Number.isFinite(value) || Math.abs(value) > 9999999999.99) throw new Error('Informe um valor válido.')
  const sign = value < 0 ? -1n : 1n
  const [whole, fraction = ''] = Math.abs(value)
    .toFixed(scale + 1)
    .split('.')
  return sign * (BigInt(whole + fraction.slice(0, scale)) + (Number(fraction[scale]) >= 5 ? 1n : 0n))
}
export function ajustarPreco(padrao: number, percentual: number): number {
  if (padrao < 0 || percentual < -100) throw new Error('O preço final não pode ser negativo.')
  const product = scaled(padrao, 2) * (10000n + scaled(percentual, 2))
  const result = Number((product + 5000n) / 10000n) / 100
  if (result > 9999999999.99) throw new Error('Preço acima do limite.')
  return result
}
export function diferencaPreco(padrao: number, preco: number) {
  const base = scaled(padrao, 2)
  const diff = scaled(preco, 2) - base
  return {
    reais: Number(diff) / 100,
    percentual: base === 0n ? null : Math.round(Number(diff * 10000n) / Number(base)) / 100,
  }
}
export function normalizarPreco(value: number) {
  if (value < 0) throw new Error('O preço não pode ser negativo.')
  return Number(scaled(value, 2)) / 100
}
