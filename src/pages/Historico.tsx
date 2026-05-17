import { FileDown, FileSpreadsheet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { OrcamentoFilters } from '../components/orcamento/OrcamentoFilters'
import { OrcamentoTable } from '../components/orcamento/OrcamentoTable'
import { exportOrcamentosCsv } from '../lib/csv'
import { downloadBlob, downloadText } from '../lib/downloads'
import { DEFAULT_FILTERS, useOrcamentos } from '../hooks/useOrcamentos'
import { useOrcamentoActions } from '../hooks/useOrcamentoActions'

export function Historico() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const { filtered, creators, loading, error, reload } = useOrcamentos(filters)
  const actions = useOrcamentoActions(reload)
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageItems = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page])

  function handleFiltersChange(nextFilters: typeof filters) {
    setFilters(nextFilters)
    setPage(1)
  }

  async function exportXlsx() {
    const [{ createHistoricoWorkbook }, { workbookToBlob }] = await Promise.all([
      import('../lib/history-xlsx'),
      import('../lib/xlsx'),
    ])
    const workbook = await createHistoricoWorkbook(filtered)
    downloadBlob(await workbookToBlob(workbook), 'Historico_Orcamentos_CKF.xlsx')
  }

  function exportCsv() {
    downloadText(exportOrcamentosCsv(filtered), 'Historico_Orcamentos_CKF.csv')
  }

  return (
    <section className="page-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Histórico de orçamentos</h2>
            <p>Arquivo-mestre com filtros, ações rápidas e exportação da listagem filtrada.</p>
          </div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={exportCsv}>
              <FileDown size={17} />
              CSV
            </button>
            <button className="secondary-button" type="button" onClick={exportXlsx}>
              <FileSpreadsheet size={17} />
              XLSX
            </button>
          </div>
        </div>
        <OrcamentoFilters filters={filters} onChange={handleFiltersChange} creators={creators} />
        {loading ? <div className="skeleton-block">Carregando histórico...</div> : null}
        {error ? <div className="error-state">{error}</div> : null}
        {!loading ? (
          <>
            <OrcamentoTable
              orcamentos={pageItems}
              onDelete={actions.setPendingDelete}
              onDuplicate={actions.duplicate}
              onDownloadPdf={actions.downloadPdf}
              onDownloadXlsx={actions.downloadXlsx}
            />
            <div className="pagination-bar">
              <span>
                {filtered.length} registro{filtered.length === 1 ? '' : 's'} filtrado
                {filtered.length === 1 ? '' : 's'}
              </span>
              <div className="button-row">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <strong>
                  Página {page} de {pageCount}
                </strong>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={page === pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
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
