import type { Cliente, ClienteFilters } from '../types'

export function normalizeDocumento(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatClienteDocumento(value: string): string {
  const digits = normalizeDocumento(value)

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  return value
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
  return `${cliente.logradouro}, ${cliente.numero} - ${cliente.bairro}, ${cliente.cidade}/${cliente.uf}`
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

export function applyClienteFilters(clientes: Cliente[], filters: ClienteFilters): Cliente[] {
  const search = filters.search.trim().toLowerCase()
  const searchDigits = normalizeDocumento(filters.search)

  return clientes.filter((cliente) => {
    const representatives = cliente.representantes.map((representante) => representante.nome.toLowerCase()).join(' ')
    const searchable = [
      cliente.nome,
      cliente.nomeFantasia,
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
