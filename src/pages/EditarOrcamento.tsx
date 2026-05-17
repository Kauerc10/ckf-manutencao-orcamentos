import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { OrcamentoEditor } from '../components/orcamento/OrcamentoEditor'
import { getOrcamento } from '../data/orcamentoRepository'
import type { Orcamento } from '../types'

export function EditarOrcamento() {
  const { id } = useParams()
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    void getOrcamento(id).then((data) => {
      setOrcamento(data)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="skeleton-block">Carregando orçamento...</div>
  if (!orcamento) return <div className="error-state">Orçamento não encontrado.</div>

  return <OrcamentoEditor existing={orcamento} />
}
