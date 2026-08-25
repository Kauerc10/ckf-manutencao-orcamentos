import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const corePath = join(process.cwd(), 'supabase/functions/capture-site-ticket/core.ts')
const testIdempotencyKey = 'aaaaaaaaaaaaaaaa'

describe('capture-site-ticket core', () => {
  it('normaliza uma solicitação válida sem carregar linguagem de lead', async () => {
    expect(existsSync(corePath)).toBe(true)

    const { parseTicketRequest } = await import('../../supabase/functions/capture-site-ticket/core.ts')
    const result = parseTicketRequest({
      serviceCategory: 'heavy_machinery',
      serviceSlug: 'manutencao-maquinas-pesadas',
      serviceName: 'Manutenção de máquinas pesadas',
      equipmentType: 'Escavadeira hidráulica',
      contactName: 'João da Silva',
      phone: '(47) 99121-4232',
      email: ' JOAO@EXEMPLO.COM ',
      city: ' Itajaí ',
      uf: 'sc',
      description: 'Equipamento perdeu força hidráulica durante a operação.',
      urgency: 'parada',
      landingPath: '/servicos/manutencao-maquinas-pesadas',
      ctaSource: 'service-page',
      idempotencyKey: testIdempotencyKey,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value.phone).toBe('5547991214232')
    expect(result.value.email).toBe('joao@exemplo.com')
    expect(result.value.city).toBe('Itajaí')
    expect(result.value.uf).toBe('SC')
    expect(JSON.stringify(result.value).toLowerCase()).not.toContain('lead')
  })

  it('rejeita payload incompleto, categoria desconhecida e telefone inválido', async () => {
    expect(existsSync(corePath)).toBe(true)

    const { parseTicketRequest } = await import('../../supabase/functions/capture-site-ticket/core.ts')

    expect(parseTicketRequest({}).ok).toBe(false)
    expect(
      parseTicketRequest({
        serviceCategory: 'qualquer_coisa',
        serviceSlug: 'servico',
        serviceName: 'Serviço',
        contactName: 'Maria',
        phone: '123',
        description: 'Descrição válida para teste.',
        urgency: 'normal',
        idempotencyKey: testIdempotencyKey,
      }).ok,
    ).toBe(false)
  })

  it('marca honeypot preenchido como spam sem persistir os campos do robô', async () => {
    expect(existsSync(corePath)).toBe(true)

    const { parseTicketRequest } = await import('../../supabase/functions/capture-site-ticket/core.ts')
    const result = parseTicketRequest({
      website: 'https://spam.example',
      serviceCategory: 'trucks',
      serviceSlug: 'manutencao-caminhoes',
      serviceName: 'Manutenção de caminhões',
      contactName: 'Bot Teste',
      phone: '47991214232',
      description: 'Mensagem automática indesejada.',
      urgency: 'normal',
      idempotencyKey: testIdempotencyKey,
    })

    expect(result).toEqual({ ok: false, code: 'spam' })
  })

  it('gera identificadores públicos não sequenciais com alfabeto sem caracteres ambíguos', async () => {
    expect(existsSync(corePath)).toBe(true)

    const { createPublicTicketId } = await import('../../supabase/functions/capture-site-ticket/core.ts')
    const id = createPublicTicketId(new Uint8Array([0, 1, 2, 3, 4, 5]))

    expect(id).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(id).toHaveLength(6)
  })
})
