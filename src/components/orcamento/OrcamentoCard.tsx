import { ChevronDown, ChevronUp, Copy, Download, Edit3, Eye, FileSpreadsheet, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateBR, formatOrcamentoNumero } from '../../lib/formatters'
import type { Orcamento } from '../../types'
import { StatusBadge } from './StatusBadge'

type Props = {
  orcamento: Orcamento
  canDelete?: boolean
  onDelete: (orcamento: Orcamento) => void
  onDuplicate: (orcamento: Orcamento) => void
  onDownloadPdf: (orcamento: Orcamento) => void
  onDownloadXlsx: (orcamento: Orcamento) => void
}

export function OrcamentoCard({ orcamento, canDelete = false, onDelete, onDuplicate, onDownloadPdf, onDownloadXlsx }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isDeleted = orcamento.status === 'excluido'

  return (
    <article className="orcamento-card">
      <button className="card-header" type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <div className="card-header-left">
          <span className="card-number">#{formatOrcamentoNumero(orcamento.numero)}</span>
          <span className="card-date">{formatDateBR(orcamento.dataOrcamento)}</span>
        </div>
        <div className="card-header-right">
          <StatusBadge status={orcamento.status} />
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      <div className="card-body">
        <div className="card-info">
          <strong className="card-client">{orcamento.servicoCliente}</strong>
          <span className="card-total">{formatCurrency(orcamento.total)}</span>
        </div>
        {isDeleted ? (
          <small className="deleted-audit-line">
            Excluído por {orcamento.excluidoPorNome ?? 'admin'}: {orcamento.excluidoMotivo}
          </small>
        ) : null}
      </div>

      {expanded ? (
        <div className="card-actions">
          <Link className="card-action-btn" to={`/orcamentos/${orcamento.id}`}>
            <Eye size={16} />
            Ver
          </Link>
          {!isDeleted ? (
            <Link className="card-action-btn" to={`/orcamentos/${orcamento.id}/editar`}>
              <Edit3 size={16} />
              Editar
            </Link>
          ) : null}
          {!isDeleted ? (
            <button className="card-action-btn" type="button" onClick={() => onDuplicate(orcamento)}>
              <Copy size={16} />
              Duplicar
            </button>
          ) : null}
          <button className="card-action-btn" type="button" onClick={() => onDownloadPdf(orcamento)}>
            <Download size={16} />
            PDF
          </button>
          <button className="card-action-btn" type="button" onClick={() => onDownloadXlsx(orcamento)}>
            <FileSpreadsheet size={16} />
            XLSX
          </button>
          {canDelete && !isDeleted ? (
            <button className="card-action-btn card-action-danger" type="button" onClick={() => onDelete(orcamento)}>
              <Trash2 size={16} />
              Excluir
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
