import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyOrcamentoFilters, listOrcamentos } from '../data/orcamentoRepository'
import type { Orcamento, OrcamentoFilters } from '../types'

export const DEFAULT_FILTERS: OrcamentoFilters = {
  search: '',
  status: 'todos',
  dataInicial: '',
  dataFinal: '',
  criadoPor: '',
  clienteId: '',
}

export function useOrcamentos(filters: OrcamentoFilters = DEFAULT_FILTERS) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOrcamentos(await listOrcamentos())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar orçamentos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial data synchronization with the selected repository.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const filtered = useMemo(() => applyOrcamentoFilters(orcamentos, filters), [orcamentos, filters])

  const creators = useMemo(() => {
    const map = new Map<string, string>()
    orcamentos.forEach((orcamento) => map.set(orcamento.criadoPor, orcamento.criadoPorNome))
    return [...map.entries()].map(([id, nome]) => ({ id, nome }))
  }, [orcamentos])

  return { orcamentos, filtered, creators, loading, error, reload: load }
}
