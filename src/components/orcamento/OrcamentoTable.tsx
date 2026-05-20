import { Copy, Download, Edit3, Eye, FileSpreadsheet, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateBR, formatOrcamentoNumero } from '../../lib/formatters'
import type { Orcamento } from '../../types'
import { StatusBadge } from './StatusBadge'

type Props = {
  orcamentos: Orcamento[]
  compact?: boolean
  canDelete?: boolean
  onDelete: (orcamento: Orcamento) => void
  onDuplicate: (orcamento: Orcamento) => void
  onDownloadPdf: (orcamento: Orcamento) => void
  onDownloadXlsx: (orcamento: Orcamento) => void
}

export function OrcamentoTable({
  orcamentos,
  compact = false,
  canDelete = false,
  onDelete,
  onDuplicate,
  onDownloadPdf,
  onDownloadXlsx,
}: Props) {
  if (orcamentos.length === 0) {
    return (
      <div className="empty-state">
        <strong>Nenhum orcamento encontrado</strong>
        <span>Ajuste os filtros ou crie um novo orcamento.</span>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Data</th>
            <th>Cliente/Servico</th>
            <th>Total</th>
            <th>Status</th>
            {!compact ? <th>Criado por</th> : null}
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.map((orcamento) => {
            const isDeleted = orcamento.status === 'excluido'
            return (
              <tr key={orcamento.id} className={isDeleted ? 'row-deleted' : undefined}>
                <td>{formatOrcamentoNumero(orcamento.numero)}</td>
                <td>{formatDateBR(orcamento.dataOrcamento)}</td>
                <td className="strong-cell">
                  <span className="cell-stack">
                    <span>{orcamento.servicoCliente}</span>
                    {orcamento.clienteNome ? <small>{orcamento.clienteNome}</small> : null}
                    {isDeleted ? (
                      <small className="deleted-audit-line">
                        Excluido por {orcamento.excluidoPorNome ?? 'admin'}: {orcamento.excluidoMotivo}
                      </small>
                    ) : null}
                  </span>
                </td>
                <td>{formatCurrency(orcamento.total)}</td>
                <td>
                  <StatusBadge status={orcamento.status} />
                </td>
                {!compact ? <td>{orcamento.criadoPorNome}</td> : null}
                <td>
                  <div className="row-actions">
                    <Link title="Ver" to={`/orcamentos/${orcamento.id}`}>
                      <Eye size={16} />
                    </Link>
                    {!isDeleted ? (
                      <Link title="Editar" to={`/orcamentos/${orcamento.id}/editar`}>
                        <Edit3 size={16} />
                      </Link>
                    ) : null}
                    {!isDeleted ? (
                      <button title="Duplicar" type="button" onClick={() => onDuplicate(orcamento)}>
                        <Copy size={16} />
                      </button>
                    ) : null}
                    <button title="Baixar PDF" type="button" onClick={() => onDownloadPdf(orcamento)}>
                      <Download size={16} />
                    </button>
                    <button title="Baixar XLSX" type="button" onClick={() => onDownloadXlsx(orcamento)}>
                      <FileSpreadsheet size={16} />
                    </button>
                    {canDelete && !isDeleted ? (
                      <button className="danger-icon" title="Excluir" type="button" onClick={() => onDelete(orcamento)}>
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
