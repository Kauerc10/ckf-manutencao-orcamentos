import { Eye, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { saveOrcamento } from '../../data/orcamentoRepository'
import { DEFAULT_ITEM_ROWS, DEFAULT_VALIDADE_DIAS, MAX_ITEM_ROWS } from '../../lib/constants'
import { parseLocalizedNumber, formatOrcamentoNumero } from '../../lib/formatters'
import { calculateGeneralTotal, calculateItemTotal, createInitialItems } from '../../lib/orcamento'
import { orcamentoFormSchema } from '../../lib/validations'
import { useAuthStore } from '../../stores/authStore'
import { useSystemSettingsStore } from '../../stores/systemSettingsStore'
import { useClientes } from '../../hooks/useClientes'
import type { Orcamento, OrcamentoDraft, OrcamentoItem, OrcamentoStatus } from '../../types'
import { DocumentPreview } from './DocumentPreview'
import { ClientePicker } from '../cliente/ClientePicker'
import { RepresentantePicker } from '../cliente/RepresentantePicker'

type Props = {
  existing?: Orcamento
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function toInputNumber(value: number | null): string {
  return value === null || Number.isNaN(value) ? '' : String(value)
}

function fromInputNumber(value: string): number | null {
  return parseLocalizedNumber(value)
}

function draftFromExisting(existing?: Orcamento, validadePadraoDias = DEFAULT_VALIDADE_DIAS, observacoesPadrao = ''): OrcamentoDraft {
  if (existing) {
    return {
      dataOrcamento: existing.dataOrcamento,
      servicoCliente: existing.servicoCliente,
      clienteId: existing.clienteId ?? null,
      clienteNome: existing.clienteNome ?? null,
      clienteDocumento: existing.clienteDocumento ?? null,
      representanteId: existing.representanteId ?? null,
      representanteNome: existing.representanteNome ?? null,
      status: existing.status,
      observacoes: existing.observacoes,
      validadeDias: existing.validadeDias,
      total: existing.total,
      itens: existing.itens.length ? existing.itens : createInitialItems(DEFAULT_ITEM_ROWS),
    }
  }

  return {
    dataOrcamento: todayIso(),
    servicoCliente: '',
    clienteId: null,
    clienteNome: null,
    clienteDocumento: null,
    representanteId: null,
    representanteNome: null,
    status: 'rascunho',
    observacoes: observacoesPadrao,
    validadeDias: validadePadraoDias,
    total: 0,
    itens: createInitialItems(DEFAULT_ITEM_ROWS),
  }
}

export function OrcamentoEditor({ existing }: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const profile = useAuthStore((state) => state.profile)
  const settings = useSystemSettingsStore((state) => state.settings)
  const settingsLoaded = useSystemSettingsStore((state) => state.loaded)
  const { clientes, reload: reloadClientes } = useClientes()
  const [draft, setDraft] = useState<OrcamentoDraft>(() =>
    draftFromExisting(existing, settings.validadePadraoDias, settings.observacoesPadrao),
  )
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const total = useMemo(() => calculateGeneralTotal(draft.itens), [draft.itens])
  const isDeleted = existing?.status === 'excluido'

  useEffect(() => {
    if (existing || !settingsLoaded) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate defaults after async settings load
    setDraft((current) => ({
      ...current,
      validadeDias:
        current.validadeDias === DEFAULT_VALIDADE_DIAS ? settings.validadePadraoDias : current.validadeDias,
      observacoes: current.observacoes ? current.observacoes : settings.observacoesPadrao,
    }))
  }, [existing, settingsLoaded, settings.observacoesPadrao, settings.validadePadraoDias])

  const preview: Orcamento = {
    id: existing?.id ?? 'preview',
    numero: existing?.numero ?? 0,
    dataOrcamento: draft.dataOrcamento,
    servicoCliente: draft.servicoCliente,
    clienteId: draft.clienteId,
    clienteNome: draft.clienteNome,
    clienteDocumento: draft.clienteDocumento,
    representanteId: draft.representanteId,
    representanteNome: draft.representanteNome,
    status: draft.status,
    observacoes: draft.observacoes,
    validadeDias: draft.validadeDias,
    total,
    criadoPor: existing?.criadoPor ?? profile?.id ?? '',
    criadoPorNome: existing?.criadoPorNome ?? profile?.nome ?? '',
    criadoEm: existing?.criadoEm ?? new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    excluidoEm: existing?.excluidoEm ?? null,
    excluidoPor: existing?.excluidoPor ?? null,
    excluidoPorNome: existing?.excluidoPorNome ?? null,
    exclusaoSolicitadaPor: existing?.exclusaoSolicitadaPor ?? null,
    exclusaoSolicitadaPorNome: existing?.exclusaoSolicitadaPorNome ?? null,
    excluidoMotivo: existing?.excluidoMotivo ?? null,
    itens: draft.itens.map((item) => ({ ...item, valorTotal: calculateItemTotal(item) })),
  }

  useEffect(() => {
    const clienteId = searchParams.get('clienteId')
    if (!clienteId || existing || !clientes.length || draft.clienteId) return
    const cliente = clientes.find((item) => item.id === clienteId)
    if (!cliente) return
    const principal = cliente.representantes.find((representante) => representante.principal && representante.ativo)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate quotation draft from selected client when entering through quick action
    setDraft((current) => ({
      ...current,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteDocumento: cliente.documento,
      representanteId: principal?.id ?? null,
      representanteNome: principal?.nome ?? null,
      servicoCliente: current.servicoCliente.trim() ? current.servicoCliente : cliente.nome,
    }))
  }, [clientes, draft.clienteId, existing, searchParams])

  function selectCliente(clienteId: string | null) {
    const cliente = clientes.find((item) => item.id === clienteId)
    if (!cliente) {
      setDraft((current) => ({
        ...current,
        clienteId: null,
        clienteNome: null,
        clienteDocumento: null,
        representanteId: null,
        representanteNome: null,
      }))
      return
    }

    const principal = cliente.representantes.find((representante) => representante.principal && representante.ativo)
    setDraft((current) => ({
      ...current,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteDocumento: cliente.documento,
      representanteId: principal?.id ?? null,
      representanteNome: principal?.nome ?? null,
      servicoCliente: current.servicoCliente.trim() ? current.servicoCliente : cliente.nome,
    }))
  }

  function selectRepresentante(representanteId: string | null) {
    const cliente = clientes.find((item) => item.id === draft.clienteId)
    const representante = cliente?.representantes.find((item) => item.id === representanteId)
    setDraft((current) => ({
      ...current,
      representanteId: representante?.id ?? null,
      representanteNome: representante?.nome ?? null,
    }))
  }

  function updateItem(index: number, patch: Partial<OrcamentoItem>) {
    setDraft((current) => {
      const itens = current.itens.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const next = { ...item, ...patch }
        return { ...next, valorTotal: calculateItemTotal(next) }
      })
      return { ...current, itens, total: calculateGeneralTotal(itens) }
    })
  }

  function addItem() {
    setDraft((current) => {
      if (current.itens.length >= MAX_ITEM_ROWS) return current
      return {
        ...current,
        itens: [...current.itens, { id: `draft-${current.itens.length}`, quantidade: null, descricao: '', valorUnitario: null, valorTotal: 0 }],
      }
    })
  }

  function removeItem(index: number) {
    setDraft((current) => {
      const itens = current.itens.filter((_, itemIndex) => itemIndex !== index)
      return { ...current, itens: itens.length ? itens : createInitialItems(1), total: calculateGeneralTotal(itens) }
    })
  }

  async function handleSave(viewAfterSave: boolean) {
    if (!profile) return
    if (isDeleted) {
      toast.error('Orcamentos excluidos nao podem ser editados.')
      return
    }

    const payload = { ...draft, total, itens: preview.itens }
    const result = orcamentoFormSchema.safeParse(payload)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Revise os campos do orçamento.')
      return
    }

    setSaving(true)
    try {
      const saved = await saveOrcamento({ ...result.data, total, id: existing?.id }, profile)
      toast.success(`Orçamento ${formatOrcamentoNumero(saved.numero)} salvo.`)
      navigate(viewAfterSave ? `/orcamentos/${saved.id}` : `/orcamentos/${saved.id}/editar`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar orçamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="editor-grid">
        <form className="panel editor-form" onSubmit={(event) => event.preventDefault()}>
          <div className="panel-heading">
            <div>
              <h2>{existing ? `Editar orçamento ${formatOrcamentoNumero(existing.numero, existing.revisao)}` : 'Novo orçamento'}</h2>
              <p>{existing ? 'O número permanece fixo.' : 'O número oficial será gerado ao salvar.'}</p>
            </div>
            <strong className="number-pill">{existing ? formatOrcamentoNumero(existing.numero, existing.revisao) : 'Gerado ao salvar'}</strong>
          </div>

          {existing && ['aprovado', 'recusado', 'cancelado'].includes(existing.status) ? (
            <div className="warning-banner">
              Este orçamento já possui status final. Alterações podem impactar o histórico.
            </div>
          ) : null}

          {isDeleted ? (
            <div className="warning-banner">
              Este orçamento foi marcado como excluído. Ele fica disponível apenas para consulta e auditoria.
            </div>
          ) : null}

          <div className="form-grid">
            <div className="span-2">
              <label>Cliente cadastrado</label>
              <ClientePicker
                clientes={clientes}
                selectedClienteId={draft.clienteId ?? null}
                onSelectCliente={selectCliente}
                reloadClientes={reloadClientes}
              />
            </div>
            {clientes.find((c) => c.id === draft.clienteId)?.tipo === 'cnpj' ? (
              <RepresentantePicker
                cliente={clientes.find((c) => c.id === draft.clienteId) || null}
                selectedRepresentanteId={draft.representanteId ?? null}
                onSelectRepresentante={selectRepresentante}
              />
            ) : (
              <div></div>
            )}
            <label>
              Data
              <input
                type="date"
                value={draft.dataOrcamento}
                onChange={(event) => setDraft({ ...draft, dataOrcamento: event.target.value })}
              />
            </label>
            <label className="span-2">
              Serviço/Cliente
              <input
                value={draft.servicoCliente}
                onChange={(event) => setDraft({ ...draft, servicoCliente: event.target.value })}
                placeholder="Ex.: Filial São José"
              />
            </label>
            <label>
              Status
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value as OrcamentoStatus })}
              >
                <option value="rascunho">Rascunho</option>
                <option value="enviado">Enviado</option>
                <option value="aprovado">Aprovado</option>
                <option value="recusado">Recusado</option>
                <option value="cancelado">Cancelado</option>
                {isDeleted ? <option value="excluido">Excluído</option> : null}
              </select>
            </label>
            <label>
              Validade (dias)
              <input
                inputMode="numeric"
                value={draft.validadeDias}
                onChange={(event) => setDraft({ ...draft, validadeDias: Number.parseInt(event.target.value || '0', 10) })}
              />
            </label>
          </div>

          <div className="items-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h3>Itens</h3>
              {draft.itens.length >= MAX_ITEM_ROWS && (
                <span style={{ fontSize: '0.75rem', color: '#ea580c', backgroundColor: '#ffedd5', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontWeight: 500 }}>
                  Limite máximo de {MAX_ITEM_ROWS} itens atingido para formatação correta do PDF/Excel
                </span>
              )}
            </div>
            <button className="secondary-button" type="button" onClick={addItem} disabled={isDeleted || draft.itens.length >= MAX_ITEM_ROWS}>
              <Plus size={16} />
              Adicionar linha
            </button>
          </div>

          <div className="items-table">
            <div className="items-head">
              <span>QTD</span>
              <span>Descrição</span>
              <span>VLR UNIT</span>
              <span>VLR TOTAL</span>
              <span></span>
            </div>
            {draft.itens.map((item, index) => (
              <div className="items-row" key={item.id ?? index}>
                <input
                  inputMode="decimal"
                  value={toInputNumber(item.quantidade)}
                  onChange={(event) => updateItem(index, { quantidade: fromInputNumber(event.target.value) })}
                />
                <input
                  value={item.descricao}
                  onChange={(event) => updateItem(index, { descricao: event.target.value })}
                  placeholder="Descrição do serviço ou material"
                />
                <input
                  inputMode="decimal"
                  value={toInputNumber(item.valorUnitario)}
                  onChange={(event) => updateItem(index, { valorUnitario: fromInputNumber(event.target.value) })}
                />
                <input
                  inputMode="decimal"
                  value={item.valorTotal || ''}
                  onChange={(event) => updateItem(index, { valorTotal: fromInputNumber(event.target.value) ?? 0 })}
                  disabled={item.quantidade !== null && item.valorUnitario !== null}
                />
                <button className="ghost-icon" type="button" onClick={() => removeItem(index)} aria-label="Remover item" disabled={isDeleted}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <label>
            Observações
            <textarea
              rows={3}
              value={draft.observacoes}
              onChange={(event) => setDraft({ ...draft, observacoes: event.target.value })}
            />
          </label>

          <div className="form-footer">
            <strong>Total geral: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</strong>
            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => navigate(-1)}>
                Cancelar
              </button>
              <button className="secondary-button" type="button" disabled={saving || isDeleted} onClick={() => handleSave(false)}>
                <Save size={16} />
                Salvar rascunho
              </button>
              <button className="primary-button" type="button" disabled={saving || isDeleted} onClick={() => handleSave(true)}>
                Salvar e visualizar
              </button>
            </div>
          </div>
        </form>

        {/* Desktop: inline preview sidebar */}
        <aside className="preview-panel desktop-only">
          <DocumentPreview orcamento={preview} compact />
        </aside>
      </section>

      {/* Mobile: floating preview button */}
      <button
        className="preview-fab mobile-only"
        type="button"
        onClick={() => setPreviewOpen(true)}
        aria-label="Abrir preview do orçamento"
      >
        <Eye size={22} />
      </button>

      {/* Mobile: fullscreen preview modal */}
      {previewOpen ? (
        <div className="preview-modal mobile-only">
          <div className="preview-modal-header">
            <strong>Preview do orçamento</strong>
            <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Fechar preview">
              <X size={22} />
            </button>
          </div>
          <div className="preview-modal-body">
            <DocumentPreview orcamento={preview} />
          </div>
        </div>
      ) : null}
    </>
  )
}
