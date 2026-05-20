import type { Cliente, ClienteDraft, ClienteFilters, ClienteTipo, ClienteRepresentante } from '../types'

export function normalizeDocumento(value: string): string {
  return value.replace(/\D/g, '')
}

export function normalizeRg(value: string): string {
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase()
}

export function formatClienteDocumento(value: string): string {
  const digits = normalizeDocumento(value)

  if (digits.length <= 11) {
    const cpf = digits.slice(0, 11)
    if (cpf.length <= 3) return cpf
    if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
    if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
  }

  const cnpj = digits.slice(0, 14)
  if (cnpj.length <= 2) return cnpj
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

export function formatRg(value: string): string {
  const normalized = normalizeRg(value)

  if (normalized.length <= 2) return normalized
  if (normalized.length <= 5) return `${normalized.slice(0, 2)}.${normalized.slice(2)}`
  if (normalized.length <= 8) return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5)}`
  return `${normalized.slice(0, 2)}.${normalized.slice(2, 5)}.${normalized.slice(5, 8)}-${normalized.slice(8, 9)}`
}

export function formatCep(value: string): string {
  const digits = normalizeDocumento(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatPhone(value: string): string {
  const digits = normalizeDocumento(value).slice(0, 11)

  if (digits.length <= 2) return digits ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value)
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeDocumento(value)
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false

  const calcDigit = (base: string, factor: number) => {
    const sum = base.split('').reduce((acc, digit) => {
      const next = acc + Number(digit) * factor
      factor -= 1
      return next
    }, 0)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }

  return calcDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) && calcDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeDocumento(value)
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const secondWeights = [6, ...firstWeights]

  return (
    calcDigit(cnpj.slice(0, 12), firstWeights) === Number(cnpj[12]) &&
    calcDigit(cnpj.slice(0, 13), secondWeights) === Number(cnpj[13])
  )
}

export function getClienteDisplayName(cliente: Pick<Cliente, 'nome'>): string {
  return cliente.nome
}

export function getClienteEndereco(cliente: Pick<Cliente, 'logradouro' | 'numero' | 'bairro' | 'cidade' | 'uf'>): string {
  const ruaNumero = [cliente.logradouro, cliente.numero].filter(Boolean).join(', ')
  const bairro = cliente.bairro.trim()
  const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join('/')
  const endereco = [ruaNumero, bairro, cidadeUf].filter(Boolean).join(' - ')
  return endereco || 'Endereco nao informado'
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function formatTags(tags: string[]): string {
  return tags.join(', ')
}

export function sanitizeClienteDraftByTipo(draft: ClienteDraft, tipo: ClienteTipo): ClienteDraft {
  const base: ClienteDraft = {
    ...draft,
    tipo,
  }

  if (tipo === 'cpf') {
    return {
      ...base,
      rg: normalizeRg(base.rg),
      nomeFantasia: '',
      inscricaoEstadual: '',
      representantes: [],
    }
  }

  return {
    ...base,
    rg: '',
    representantes: base.representantes,
  }
}

export function hasClienteAddress(draft: Pick<ClienteDraft, 'cep' | 'logradouro' | 'numero' | 'bairro' | 'cidade' | 'uf'>): boolean {
  return [draft.cep, draft.logradouro, draft.numero, draft.bairro, draft.cidade, draft.uf].some((value) => value.trim().length > 0)
}

function hasRepresentanteData(representante: Pick<ClienteRepresentante, 'nome' | 'cargo' | 'telefone' | 'email' | 'observacao'>): boolean {
  return [representante.nome, representante.cargo, representante.telefone, representante.email, representante.observacao].some(
    (value) => (value ?? '').trim().length > 0,
  )
}

export function normalizeClienteRepresentantesForSave(representantes: ClienteRepresentante[]): ClienteRepresentante[] {
  const cleaned = representantes.filter(hasRepresentanteData)
  if (!cleaned.length) return []
  if (cleaned.some((representante) => representante.principal && representante.ativo)) return cleaned
  return cleaned.map((representante, index) => (index === 0 ? { ...representante, principal: true } : representante))
}

export function applyClienteFilters(clientes: Cliente[], filters: ClienteFilters): Cliente[] {
  const search = filters.search.trim().toLowerCase()
  const searchDigits = normalizeDocumento(filters.search)

  return clientes.filter((cliente) => {
    const representatives = cliente.representantes.map((representante) => representante.nome.toLowerCase()).join(' ')
    const searchable = [
      cliente.nome,
      cliente.nomeFantasia,
      cliente.rg,
      cliente.email,
      cliente.telefonePrincipal,
      cliente.cidade,
      cliente.uf,
      representatives,
      cliente.tags.join(' '),
    ]
      .join(' ')
      .toLowerCase()

    const matchesSearch =
      !search ||
      searchable.includes(search) ||
      (searchDigits ? normalizeDocumento(cliente.documento).includes(searchDigits) : false)
    const matchesTipo = filters.tipo === 'todos' || cliente.tipo === filters.tipo
    const matchesStatus =
      filters.status === 'todos' ||
      (filters.status === 'ativos' && cliente.ativo) ||
      (filters.status === 'arquivados' && !cliente.ativo)
    const matchesCity = !filters.cidadeUf || `${cliente.cidade}/${cliente.uf}` === filters.cidadeUf

    return matchesSearch && matchesTipo && matchesStatus && matchesCity
  })
}
