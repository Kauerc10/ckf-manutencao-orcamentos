import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { OrcamentoFilters } from '../components/orcamento/OrcamentoFilters'
import { OrcamentoList } from '../components/orcamento/OrcamentoList'
import { formatCurrency } from '../lib/formatters'
import { DEFAULT_FILTERS, useOrcamentos } from '../hooks/useOrcamentos'
import { useOrcamentoActions } from '../hooks/useOrcamentoActions'
import { useClientes } from '../hooks/useClientes'

export function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const { orcamentos, filtered, creators, loading, error, reload } = useOrcamentos(filters)
  const { clientes } = useClientes()
  const actions = useOrcamentoActions(reload)

  const kpis = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthItems = orcamentos.filter((orcamento) => orcamento.dataOrcamento.startsWith(currentMonth))
    const approvedTotal = monthItems
      .filter((orcamento) => orcamento.status === 'aprovado')
      .reduce((sum, orcamento) => sum + orcamento.total, 0)

    return [
      { label: 'Total de orçamentos', value: orcamentos.length },
      { label: 'Orçamentos este mês', value: monthItems.length },
      { label: 'Valor aprovado no mês', value: formatCurrency(approvedTotal) },
      { label: 'Aguardando resposta', value: orcamentos.filter((orcamento) => orcamento.status === 'enviado').length },
    ]
  }, [orcamentos])

  return (
    <section className="page-stack">
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <article className="kpi-card" key={kpi.label}>
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Orçamentos recentes</h2>
            <p>Busque, acompanhe status e exporte documentos oficiais.</p>
          </div>
          <Link className="secondary-button" to="/historico">
            Ver histórico completo
          </Link>
        </div>
        <OrcamentoFilters filters={filters} onChange={setFilters} creators={creators} clientes={clientes} />
        {loading ? <div className="skeleton-block">Carregando orçamentos...</div> : null}
        {error ? <div className="error-state">{error}</div> : null}
        {!loading ? (
          <OrcamentoList
            compact
            orcamentos={filtered.slice(0, 20)}
            onDelete={actions.setPendingDelete}
            onDuplicate={actions.duplicate}
            onDownloadPdf={actions.downloadPdf}
            onDownloadXlsx={actions.downloadXlsx}
          />
        ) : null}
      </section>

      <ConfirmDialog
        open={Boolean(actions.pendingDelete)}
        title="Excluir orçamento?"
        description={`O orçamento ${actions.pendingDelete?.numero ?? ''} será removido definitivamente.`}
        confirmLabel="Excluir"
        onCancel={() => actions.setPendingDelete(null)}
        onConfirm={actions.confirmDelete}
      />
    </section>
  )
}
