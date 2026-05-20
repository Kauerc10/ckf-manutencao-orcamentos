import { ArrowLeft, Building2, IdCard, MapPin, Plus, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getCliente, saveCliente } from '../data/clienteRepository'
import {
  formatCep,
  formatClienteDocumento,
  formatPhone,
  formatRg,
  formatTags,
  hasClienteAddress,
  normalizeClienteRepresentantesForSave,
  parseTags,
  sanitizeClienteDraftByTipo,
} from '../lib/clientes'
import { clienteFormSchema } from '../lib/validations'
import { useAuthStore } from '../stores/authStore'
import type { Cliente, ClienteDraft, ClienteRepresentante, ClienteTipo } from '../types'

function emptyRepresentante(principal = false): ClienteRepresentante {
  return {
    nome: '',
    cargo: '',
    telefone: '',
    email: '',
    observacao: '',
    principal,
    ativo: true,
  }
}

function labelCaption(title: string, required = true) {
  return (
    <span className="field-label-row">
      <span>{title}</span>
      {required ? <span className="field-badge required">Obrigatorio</span> : null}
    </span>
  )
}

function emptyDraft(): ClienteDraft {
  return {
    tipo: 'cnpj',
    nome: '',
    documento: '',
    rg: '',
    nomeFantasia: '',
    email: '',
    telefonePrincipal: '',
    telefoneAlternativo: '',
    inscricaoEstadual: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    referenciaAcesso: '',
    observacoes: '',
    tags: [],
    ativo: true,
    representantes: [],
  }
}

function draftFromCliente(cliente: Cliente): ClienteDraft {
  return sanitizeClienteDraftByTipo(
    {
      tipo: cliente.tipo,
      nome: cliente.nome,
      // Re-apply masks so the form shows formatted values instead of raw DB strings (BUG-07)
      documento: formatClienteDocumento(cliente.documento),
      rg: formatRg(cliente.rg ?? ''),
      nomeFantasia: cliente.nomeFantasia,
      email: cliente.email,
      telefonePrincipal: formatPhone(cliente.telefonePrincipal),
      telefoneAlternativo: formatPhone(cliente.telefoneAlternativo),
      inscricaoEstadual: cliente.inscricaoEstadual,
      cep: formatCep(cliente.cep),
      logradouro: cliente.logradouro,
      numero: cliente.numero,
      complemento: cliente.complemento,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
      referenciaAcesso: cliente.referenciaAcesso,
      observacoes: cliente.observacoes,
      tags: cliente.tags,
      ativo: cliente.ativo,
      representantes: cliente.representantes,
    },
    cliente.tipo,
  )
}

type DraftField = keyof ClienteDraft

export function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [draft, setDraft] = useState<ClienteDraft>(emptyDraft)
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [showAddressWarning, setShowAddressWarning] = useState(false)

  useEffect(() => {
    if (!id) return
    void getCliente(id).then((cliente) => {
      if (cliente) {
        const next = draftFromCliente(cliente)
        setDraft(next)
        setTagsInput(formatTags(next.tags))
      }
      setLoading(false)
    })
  }, [id])

  function updateDraft(patch: Partial<ClienteDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function updateField<K extends DraftField>(field: K, value: ClienteDraft[K]) {
    updateDraft({ [field]: value } as Pick<ClienteDraft, K>)
  }

  function updateMaskedField(field: DraftField, value: string) {
    if (field === 'documento') {
      updateField('documento', formatClienteDocumento(value))
      return
    }

    if (field === 'rg') {
      updateField('rg', formatRg(value))
      return
    }

    if (field === 'telefonePrincipal' || field === 'telefoneAlternativo') {
      updateField(field, formatPhone(value) as ClienteDraft[typeof field])
      return
    }

    if (field === 'cep') {
      updateField('cep', formatCep(value))
      return
    }

    updateField(field, value as ClienteDraft[typeof field])
  }

  function setTipo(tipo: ClienteTipo) {
    // BUG-09: Guard against silently discarding existing representatives when switching to CPF
    if (tipo === 'cpf') {
      const hasRepresentantes = draft.representantes.some((r) => r.nome.trim() !== '' || r.cargo.trim() !== '' || r.telefone.trim() !== '')
      if (hasRepresentantes) {
        const confirmed = window.confirm(
          'Ao alterar para CPF, todos os representantes cadastrados serão removidos. Deseja continuar?'
        )
        if (!confirmed) return
      }
    }
    setDraft((current) => sanitizeClienteDraftByTipo(current, tipo))
  }

  function addRepresentante() {
    setDraft((current) => ({
      ...current,
      representantes: [...current.representantes, emptyRepresentante(current.representantes.length === 0)],
    }))
  }

  function removeRepresentante(index: number) {
    setDraft((current) => {
      // BUG-11: Allow empty list — don't inject blank representante when deleting the last one
      const remaining = current.representantes.filter((_, currentIndex) => currentIndex !== index)
      if (remaining.length > 0 && !remaining.some((representante) => representante.principal)) {
        remaining[0] = { ...remaining[0], principal: true }
      }
      return { ...current, representantes: remaining }
    })
  }

  function updateRepresentante(index: number, patch: Partial<ClienteRepresentante>) {
    setDraft((current) => ({
      ...current,
      representantes: current.representantes.map((representante, currentIndex) => {
        if (currentIndex !== index) return patch.principal ? { ...representante, principal: false } : representante
        return { ...representante, ...patch }
      }),
    }))
  }

  const summary = useMemo(() => {
    const identity = draft.documento ? formatClienteDocumento(draft.documento) : draft.tipo.toUpperCase()
    if (!draft.nome.trim()) return `Novo ${draft.tipo === 'cpf' ? 'cliente PF' : 'cliente PJ'}`
    return [draft.nome.trim(), identity].join(' - ')
  }, [draft.documento, draft.nome, draft.tipo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveDraft()
  }

  async function saveDraft(skipAddressWarning = false) {
    if (!profile) return

    const payload = {
      ...draft,
      tags: parseTags(tagsInput),
      representantes: draft.tipo === 'cnpj' ? normalizeClienteRepresentantesForSave(draft.representantes) : [],
    }
    const result = clienteFormSchema.safeParse(payload)

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Revise os dados do cliente.')
      return
    }

    if (!skipAddressWarning && !hasClienteAddress(result.data)) {
      setShowAddressWarning(true)
      return
    }

    setSaving(true)
    try {
      const saved = await saveCliente({ ...result.data, id }, profile)
      toast.success('Cliente salvo.')
      navigate(`/clientes/${saved.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar cliente.')
    } finally {
      setSaving(false)
    }
  }

  function closeAddressWarningAndEdit() {
    setShowAddressWarning(false)
    document.getElementById('cliente-endereco-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <div className="skeleton-block">Carregando cliente...</div>

  return (
    <section className="page-stack">
      <form className="panel editor-form client-form-shell" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <h2>{id ? 'Editar cliente' : 'Novo cliente'}</h2>
          </div>
          <Link className="secondary-button" to={id ? `/clientes/${id}` : '/clientes'}>
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>

        <section className="client-flow-hero">
          <div>
            <span className="eyebrow dark">Cadastro operacional</span>
            <h3>{summary}</h3>
          </div>
          <div className="client-progress-strip" aria-label="Blocos do cadastro">
            <span>Identificacao</span>
            <span>Contato</span>
            <span>Endereco</span>
            {draft.tipo === 'cnpj' ? <span>Representantes</span> : null}
            <span>Observacoes</span>
          </div>
        </section>

        <section className="client-form-section">
          <div className="client-section-heading">
            <ShieldCheck size={18} />
            <div>
              <h3>Tipo e identificacao</h3>
            </div>
          </div>

          <div className="client-type-toggle" role="tablist" aria-label="Tipo de cliente">
            <button
              className={draft.tipo === 'cpf' ? 'type-chip active' : 'type-chip'}
              type="button"
              onClick={() => setTipo('cpf')}
            >
              <UserRound size={16} />
              CPF
            </button>
            <button
              className={draft.tipo === 'cnpj' ? 'type-chip active' : 'type-chip'}
              type="button"
              onClick={() => setTipo('cnpj')}
            >
              <Building2 size={16} />
              CNPJ
            </button>
          </div>

          <div className="client-section-grid">
            <label className="span-2">
              {labelCaption(draft.tipo === 'cnpj' ? 'Razao social' : 'Nome completo')}
              <input
                autoComplete={draft.tipo === 'cnpj' ? 'organization' : 'name'}
                value={draft.nome}
                onChange={(event) => updateField('nome', event.target.value)}
              />
            </label>

            <label>
              {labelCaption(draft.tipo === 'cnpj' ? 'CNPJ' : 'CPF')}
              <input
                inputMode="numeric"
                autoComplete="off"
                value={draft.documento}
                onChange={(event) => updateMaskedField('documento', event.target.value)}
              />
            </label>

            {draft.tipo === 'cpf' ? (
              <label>
                {labelCaption('RG', false)}
                <input inputMode="numeric" value={draft.rg} onChange={(event) => updateMaskedField('rg', event.target.value)} />
              </label>
            ) : null}

            {draft.tipo === 'cnpj' ? (
              <>
                <label>
                  {labelCaption('Nome fantasia', false)}
                  <input
                    autoComplete="organization"
                    value={draft.nomeFantasia}
                    onChange={(event) => updateField('nomeFantasia', event.target.value)}
                  />
                </label>

                <label>
                  {labelCaption('Inscricao estadual', false)}
                  <input value={draft.inscricaoEstadual} onChange={(event) => updateField('inscricaoEstadual', event.target.value)} />
                </label>
              </>
            ) : null}
          </div>
        </section>

        <section className="client-form-section">
          <div className="client-section-heading">
            <IdCard size={18} />
            <div>
              <h3>Contato</h3>
            </div>
          </div>

          <div className="client-section-grid">
            <label>
              {labelCaption('Telefone principal')}
              <input
                inputMode="tel"
                autoComplete="tel"
                value={draft.telefonePrincipal}
                onChange={(event) => updateMaskedField('telefonePrincipal', event.target.value)}
              />
            </label>
            <label>
              {labelCaption('Telefone alternativo', false)}
              <input
                inputMode="tel"
                autoComplete="tel-national"
                value={draft.telefoneAlternativo}
                onChange={(event) => updateMaskedField('telefoneAlternativo', event.target.value)}
              />
            </label>
            <label className="span-2">
              {labelCaption('Email', false)}
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={draft.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="client-form-section" id="cliente-endereco-section">
          <div className="client-section-heading">
            <MapPin size={18} />
            <div>
              <h3>Endereco</h3>
            </div>
          </div>

          <div className="client-section-grid">
            <label>
              {labelCaption('CEP', false)}
              <input inputMode="numeric" autoComplete="postal-code" value={draft.cep} onChange={(event) => updateMaskedField('cep', event.target.value)} />
            </label>
            <label className="span-2">
              {labelCaption('Logradouro', false)}
              <input autoComplete="address-line1" value={draft.logradouro} onChange={(event) => updateField('logradouro', event.target.value)} />
            </label>
            <label>
              {labelCaption('Numero', false)}
              <input inputMode="numeric" autoComplete="address-line2" value={draft.numero} onChange={(event) => updateField('numero', event.target.value)} />
            </label>
            <label>
              {labelCaption('Complemento', false)}
              <input value={draft.complemento} onChange={(event) => updateField('complemento', event.target.value)} />
            </label>
            <label>
              {labelCaption('Bairro', false)}
              <input autoComplete="address-level3" value={draft.bairro} onChange={(event) => updateField('bairro', event.target.value)} />
            </label>
            <label>
              {labelCaption('Cidade', false)}
              <input autoComplete="address-level2" value={draft.cidade} onChange={(event) => updateField('cidade', event.target.value)} />
            </label>
            <label>
              {labelCaption('UF', false)}
              <input
                autoComplete="address-level1"
                maxLength={2}
                value={draft.uf}
                onChange={(event) => updateField('uf', event.target.value.toUpperCase())}
              />
            </label>
            <label className="span-2">
              {labelCaption('Referencia de acesso', false)}
              <input value={draft.referenciaAcesso} onChange={(event) => updateField('referenciaAcesso', event.target.value)} />
            </label>
          </div>
        </section>

        {draft.tipo === 'cnpj' ? (
          <section className="client-form-section">
            <div className="items-toolbar client-section-toolbar">
              <div className="client-section-heading">
                <UserRound size={18} />
                <div>
                  <h3>Representantes</h3>
                </div>
              </div>
              <button className="secondary-button" type="button" onClick={addRepresentante}>
                <Plus size={16} />
                Adicionar representante
              </button>
            </div>

            <div className="representantes-list polished">
              {draft.representantes.map((representante, index) => (
                <article className="representante-editor-card" key={representante.id ?? index}>
                  <div className="representante-card-header">
                    <div>
                      <strong>{representante.nome || `Representante ${index + 1}`}</strong>
                      <span>{representante.cargo || 'Contato operacional do CNPJ'}</span>
                    </div>
                    <div className="representante-card-actions">
                      <button
                        className={representante.principal ? 'secondary-button principal-chip active' : 'secondary-button principal-chip'}
                        type="button"
                        onClick={() => updateRepresentante(index, { principal: true })}
                      >
                        Principal
                      </button>
                      <button className="ghost-icon" type="button" onClick={() => removeRepresentante(index)} aria-label="Remover representante">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="client-section-grid representative-grid">
                    <label>
                      {labelCaption('Nome')}
                      <input value={representante.nome} onChange={(event) => updateRepresentante(index, { nome: event.target.value })} />
                    </label>
                    <label>
                      {labelCaption('Cargo', false)}
                      <input value={representante.cargo} onChange={(event) => updateRepresentante(index, { cargo: event.target.value })} />
                    </label>
                    <label>
                      {labelCaption('Telefone', false)}
                      <input
                        inputMode="tel"
                        value={representante.telefone}
                        onChange={(event) => updateRepresentante(index, { telefone: formatPhone(event.target.value) })}
                      />
                    </label>
                    <label>
                      {labelCaption('Email', false)}
                      <input
                        type="email"
                        inputMode="email"
                        value={representante.email}
                        onChange={(event) => updateRepresentante(index, { email: event.target.value })}
                      />
                    </label>
                    <label className="span-2">
                      {labelCaption('Observacao', false)}
                      <input
                        value={representante.observacao}
                        onChange={(event) => updateRepresentante(index, { observacao: event.target.value })}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="client-form-section">
          <div className="client-section-heading">
            <Save size={18} />
            <div>
              <h3>Observacoes e organizacao</h3>
            </div>
          </div>

          <div className="client-section-grid">
            <label className="span-2">
              {labelCaption('Tags', false)}
              <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="condominio, recorrente, residencial" />
            </label>
            <label className="span-2">
              {labelCaption('Observacoes', false)}
              <textarea rows={4} value={draft.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} />
            </label>
          </div>
        </section>

        <div className="form-footer client-submit-bar">
          <span className="form-note">Clientes arquivados continuam no historico dos orcamentos e da operacao.</span>
          <button className="primary-button" type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>

        {showAddressWarning ? (
          <div className="modal-backdrop" role="presentation">
            <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="address-warning-title">
              <h2 id="address-warning-title">Salvar sem endereco?</h2>
              <p>
                Este cliente sera salvo sem endereco operacional. Voce pode completar depois, mas visitas tecnicas e filtros por
                local ficarao incompletos por enquanto.
              </p>
              <div className="dialog-actions">
                <button className="secondary-button" type="button" onClick={closeAddressWarningAndEdit}>
                  Corrigir ou preencher
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowAddressWarning(false)
                    void saveDraft(true)
                  }}
                >
                  Salvar sem endereco
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  )
}
