import type { Orcamento } from '../../types'
import { OrcamentoCard } from './OrcamentoCard'
import { OrcamentoTable } from './OrcamentoTable'

type Props = {
  orcamentos: Orcamento[]
  compact?: boolean
  onDelete: (orcamento: Orcamento) => void
  onDuplicate: (orcamento: Orcamento) => void
  onDownloadPdf: (orcamento: Orcamento) => void
  onDownloadXlsx: (orcamento: Orcamento) => void
}

/**
 * Responsive wrapper: renders OrcamentoTable on desktop and
 * OrcamentoCard list on mobile. Visibility is toggled purely via
 * CSS media queries so both trees exist in the DOM but only one
 * is displayed, avoiding layout shifts on resize.
 */
export function OrcamentoList({
  orcamentos,
  compact = false,
  onDelete,
  onDuplicate,
  onDownloadPdf,
  onDownloadXlsx,
}: Props) {
  if (orcamentos.length === 0) {
    return (
      <div className="empty-state">
        <strong>Nenhum orçamento encontrado</strong>
        <span>Ajuste os filtros ou crie um novo orçamento.</span>
      </div>
    )
  }

  return (
    <>
      {/* Desktop: traditional table */}
      <div className="desktop-only">
        <OrcamentoTable
          orcamentos={orcamentos}
          compact={compact}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onDownloadPdf={onDownloadPdf}
          onDownloadXlsx={onDownloadXlsx}
        />
      </div>

      {/* Mobile: card list */}
      <div className="mobile-only orcamento-card-list">
        {orcamentos.map((orcamento) => (
          <OrcamentoCard
            key={orcamento.id}
            orcamento={orcamento}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onDownloadPdf={onDownloadPdf}
            onDownloadXlsx={onDownloadXlsx}
          />
        ))}
      </div>
    </>
  )
}
