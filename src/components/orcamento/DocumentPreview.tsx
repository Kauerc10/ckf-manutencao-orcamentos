import type { CSSProperties } from 'react'
import { DOCUMENT_ITEM_ROW_COUNT, EMPRESA } from '../../lib/constants'
import { formatCurrency, formatDateBR } from '../../lib/formatters'
import { normalizeItemsForDocument } from '../../lib/orcamento'
import type { Orcamento } from '../../types'

type Props = {
  orcamento: Orcamento
  compact?: boolean
}

export function DocumentPreview({ orcamento, compact = false }: Props) {
  const rows = normalizeItemsForDocument(orcamento.itens)

  return (
    <section className={compact ? 'document-preview compact' : 'document-preview'} aria-label="Preview do orçamento">
      <div className="document-header">
        <div className="document-logo">CK</div>
        <h2>{EMPRESA.nome}</h2>
        <p>Email: {EMPRESA.email}</p>
        <p>CNPJ: {EMPRESA.cnpj}</p>
        <p>Telefone: {EMPRESA.telefone}</p>
        <p>{EMPRESA.regiao}</p>
      </div>

      <div className="document-meta">
        <span>Data:</span>
        <strong>{formatDateBR(orcamento.dataOrcamento)}</strong>
        <span>Orçamento n°</span>
        <strong>{orcamento.numero || 'Gerado ao salvar'}</strong>
      </div>

      <div className="document-service">
        <span>Serviço:</span>
        <strong>{orcamento.servicoCliente || 'Cliente / Serviço'}</strong>
      </div>

      <div className="document-table" style={{ '--document-rows': DOCUMENT_ITEM_ROW_COUNT } as CSSProperties}>
        <div className="doc-row doc-head">
          <span>QTD</span>
          <span>DESCRIÇÃO</span>
          <span>VLR UNIT</span>
          <span>VLR TOTAL</span>
        </div>
        {rows.map((item, index) => (
          <div className="doc-row" key={`${item.id ?? 'row'}-${index}`}>
            <span>{item.quantidade ?? ''}</span>
            <span>{item.descricao}</span>
            <span>{item.valorUnitario ? formatCurrency(item.valorUnitario) : ''}</span>
            <span>{item.descricao ? formatCurrency(item.valorTotal) : 'R$ -'}</span>
          </div>
        ))}
        <div className="doc-row doc-total">
          <span>Total</span>
          <span>{formatCurrency(orcamento.total)}</span>
        </div>
      </div>

      <div className="document-obs">
        <strong>Obs:</strong>
        <span>{orcamento.observacoes}</span>
      </div>
      <div className="document-validity">VALIDADE DA PROPOSTA {orcamento.validadeDias} DIAS</div>
    </section>
  )
}
