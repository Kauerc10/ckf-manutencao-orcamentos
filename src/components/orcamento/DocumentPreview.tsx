import type { CSSProperties } from 'react'
import { BRAND_ASSETS, DOCUMENT_ITEM_ROW_COUNT } from '../../lib/constants'
import { formatCurrency, formatDateBR, formatOrcamentoNumero } from '../../lib/formatters'
import { normalizeItemsForDocument } from '../../lib/orcamento'
import { useSystemSettingsStore } from '../../stores/systemSettingsStore'
import type { Orcamento, SystemSettings } from '../../types'

type Props = {
  orcamento: Orcamento
  compact?: boolean
  settingsOverride?: SystemSettings
}

export function DocumentPreview({ orcamento, compact = false, settingsOverride }: Props) {
  const storedSettings = useSystemSettingsStore((state) => state.settings)
  const settings = settingsOverride ?? storedSettings
  const rows = normalizeItemsForDocument(orcamento.itens)
  const classes = [
    'document-preview',
    compact ? 'compact' : '',
    settings.previewDensidade === 'confortavel' ? 'density-comfort' : 'density-compact',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} aria-label="Preview do orçamento">
      <div className="document-header">
        {settings.mostrarLogoDocumentos ? (
          <img className="document-brand-logo" src={BRAND_ASSETS.logoHorizontalWhiteAmberPng} alt="CKF Manutenção" />
        ) : (
          <div className="document-logo">CKF</div>
        )}
        <p>Email: {settings.empresa.email}</p>
        <p>CNPJ: {settings.empresa.cnpj}</p>
        <p>Telefone: {settings.empresa.telefone}</p>
        <p>{settings.empresa.regiao}</p>
      </div>

      <div className="document-meta">
        <span>Data:</span>
        <strong>{formatDateBR(orcamento.dataOrcamento)}</strong>
        <span>Orçamento n°</span>
        <strong>{orcamento.numero ? formatOrcamentoNumero(orcamento.numero) : 'Gerado ao salvar'}</strong>
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
