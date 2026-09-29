import { expect, it } from 'vitest'
import { ajustarPreco, diferencaPreco } from './precos'
it('aplica porcentagem sobre o padrão em centavos e compara valores diretos', () => {
  expect(ajustarPreco(100, -10)).toBe(90)
  expect(ajustarPreco(100, 20)).toBe(120)
  expect(ajustarPreco(1.01, 50)).toBe(1.52)
  expect(diferencaPreco(110, 90)).toEqual({ reais: -20, percentual: -18.18 })
  expect(diferencaPreco(0, 10)).toEqual({ reais: 10, percentual: null })
  expect(() => ajustarPreco(100, -101)).toThrow()
  expect(() => ajustarPreco(100, NaN)).toThrow()
})
