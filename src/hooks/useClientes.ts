import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_CLIENTE_FILTERS, applyClienteFilters, listClientes } from '../data/clienteRepository'
import type { Cliente, ClienteFilters } from '../types'

export { DEFAULT_CLIENTE_FILTERS }

export function useClientes(filters: ClienteFilters = DEFAULT_CLIENTE_FILTERS) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setClientes(await listClientes())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async fetch intentionally hydrates local state
    void load()
  }, [load])

  useEffect(() => {
    function reloadWhenFocused() {
      void load()
    }

    window.addEventListener('focus', reloadWhenFocused)
    return () => window.removeEventListener('focus', reloadWhenFocused)
  }, [load])

  const filtered = useMemo(() => applyClienteFilters(clientes, filters), [clientes, filters])

  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach((cliente) => {
      if (cliente.cidade && cliente.uf) set.add(`${cliente.cidade}/${cliente.uf}`)
    })
    return [...set].sort()
  }, [clientes])

  return { clientes, filtered, cityOptions, loading, error, reload: load }
}
