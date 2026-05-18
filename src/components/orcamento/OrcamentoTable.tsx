import { Copy, Download, Edit3, Eye, FileSpreadsheet, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateBR, formatOrcamentoNumero } from '../../lib/formatters'
import type { Orcamento } from '../../types'
import { StatusBadge } from './StatusBadge'

type Props = {
  orcamentos: Orcamento[]
  compact?: boolean
  onDelete: (orcamento: Orcamento) => void
  onDuplicate: (orcamento: Orcamento) => void
  onDownloadPdf: (orcamento: Orcamento) => void
  onDownloadXlsx: (orcamento: Orcamento) => void
}

export function OrcamentoTable({
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
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Data</th>
            <th>Cliente/Serviço</th>
            <th>Total</th>
            <th>Status</th>
            {!compact ? <th>Criado por</th> : null}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.map((orcamento) => (
            <tr key={orcamento.id}>
              <td>{formatOrcamentoNumero(orcamento.numero)}</td>
              <td>{formatDateBR(orcamento.dataOrcamento)}</td>
              <td className="strong-cell">{orcamento.servicoCliente}</td>
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
                  <Link title="Editar" to={`/orcamentos/${orcamento.id}/editar`}>
                    <Edit3 size={16} />
                  </Link>
                  <button title="Duplicar" type="button" onClick={() => onDuplicate(orcamento)}>
                    <Copy size={16} />
                  </button>
                  <button title="Baixar PDF" type="button" onClick={() => onDownloadPdf(orcamento)}>
                    <Download size={16} />
                  </button>
                  <button title="Baixar XLSX" type="button" onClick={() => onDownloadXlsx(orcamento)}>
                    <FileSpreadsheet size={16} />
                  </button>
                  <button className="danger-icon" title="Excluir" type="button" onClick={() => onDelete(orcamento)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
