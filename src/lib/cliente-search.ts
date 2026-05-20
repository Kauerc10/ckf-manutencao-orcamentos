import type { Cliente, ClienteRepresentante } from '../types'


export function normalizeSearchText(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function normalizeSearchDigits(text: string): string {
  if (!text) return ''
  return text.replace(/\D/g, '')
}

export function getClienteSearchText(cliente: Cliente): string {
  const reps = (cliente.representantes || [])
    .map((r) => `${r.nome} ${r.cargo}`)
    .join(' ')
  
  return [
    cliente.nome,
    cliente.nomeFantasia || '',
    cliente.documento,
    normalizeSearchDigits(cliente.documento),
    cliente.email || '',
    cliente.telefonePrincipal || '',
    cliente.telefoneAlternativo || '',
    cliente.cidade || '',
    cliente.uf || '',
    `${cliente.cidade || ''}/${cliente.uf || ''}`,
    (cliente.tags || []).join(' '),
    reps
  ]
    .map(normalizeSearchText)
    .join(' ')
}

export function searchClientes(clientes: Cliente[], search: string, limit = 8): Cliente[] {
  const query = normalizeSearchText(search)
  
  // If query is empty, just return the first `limit` active clients
  if (!query) {
    return clientes.filter((c) => c.ativo).slice(0, limit)
  }

  const terms = query.split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return clientes.filter((c) => c.ativo).slice(0, limit)
  }

  // Filter active clients that match all terms
  const matched = clientes.filter((cliente) => {
    if (!cliente.ativo) return false

    const searchText = getClienteSearchText(cliente)
    const normalizedDoc = normalizeSearchDigits(cliente.documento)
    const normalizedPhone1 = normalizeSearchDigits(cliente.telefonePrincipal || '')
    const normalizedPhone2 = normalizeSearchDigits(cliente.telefoneAlternativo || '')
    const repPhones = (cliente.representantes || []).map((r) => normalizeSearchDigits(r.telefone || ''))

    return terms.every((term) => {
      // Direct text match
      if (searchText.includes(term)) return true

      // Numeric match (for phone, CNPJ, CPF)
      const termDigits = normalizeSearchDigits(term)
      if (termDigits) {
        if (normalizedDoc.includes(termDigits)) return true
        if (normalizedPhone1.includes(termDigits)) return true
        if (normalizedPhone2.includes(termDigits)) return true
        if (repPhones.some((p) => p.includes(termDigits))) return true
      }

      return false
    })
  })

  // Score/rank matched clients
  const scored = matched.map((cliente) => {
    let score = 0
    const nomeNorm = normalizeSearchText(cliente.nome)
    const fantasiaNorm = normalizeSearchText(cliente.nomeFantasia || '')
    const docNorm = normalizeSearchDigits(cliente.documento)
    const queryDigits = normalizeSearchDigits(query)

    // 1. Name starts with query
    if (nomeNorm.startsWith(query)) {
      score += 1000
    }
    // 2. Document matches exactly
    if (queryDigits && docNorm === queryDigits) {
      score += 800
    }
    // 3. Name contains query
    else if (nomeNorm.includes(query)) {
      score += 500
    }
    // 4. Trade name starts with or contains query
    if (fantasiaNorm.startsWith(query)) {
      score += 400
    } else if (fantasiaNorm.includes(query)) {
      score += 300
    }
    // 5. Document contains query digits or phone contains query digits
    if (queryDigits) {
      if (docNorm.includes(queryDigits)) {
        score += 200
      }
      const phone1 = normalizeSearchDigits(cliente.telefonePrincipal || '')
      const phone2 = normalizeSearchDigits(cliente.telefoneAlternativo || '')
      if (phone1.includes(queryDigits) || phone2.includes(queryDigits)) {
        score += 150
      }
    }
    // 6. Representative name or cargo contains query
    const repMatch = (cliente.representantes || []).some((r) => {
      const name = normalizeSearchText(r.nome)
      const cargo = normalizeSearchText(r.cargo)
      return name.includes(query) || cargo.includes(query)
    })
    if (repMatch) {
      score += 100
    }
    // 7. Tags or Cidade contains query
    const tagsMatch = (cliente.tags || []).some((t) => normalizeSearchText(t).includes(query))
    if (tagsMatch) {
      score += 50
    }
    const cidadeNorm = normalizeSearchText(cliente.cidade || '')
    const ufNorm = normalizeSearchText(cliente.uf || '')
    if (cidadeNorm.includes(query) || ufNorm.includes(query)) {
      score += 40
    }

    return { cliente, score }
  })

  // Sort by score descending. If equal, alphabetically by name.
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.cliente.nome.localeCompare(b.cliente.nome)
  })

  return scored.map((item) => item.cliente).slice(0, limit)
}

export function getActiveRepresentantes(cliente: Cliente): ClienteRepresentante[] {
  if (!cliente || !cliente.representantes) return []
  return cliente.representantes.filter((r) => r.ativo)
}

export function getPrincipalRepresentante(cliente: Cliente): ClienteRepresentante | null {
  const activeReps = getActiveRepresentantes(cliente)
  if (activeReps.length === 0) return null
  const principal = activeReps.find((r) => r.principal)
  return principal || activeReps[0] || null
}
