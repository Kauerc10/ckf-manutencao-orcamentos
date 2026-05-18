import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getCliente, saveCliente } from '../data/clienteRepository'
import { formatTags, parseTags } from '../lib/clientes'
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

function emptyDraft(): ClienteDraft {
  return {
    tipo: 'cnpj',
    nome: '',
    documento: '',
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
    cidade: 'Blumenau',
    uf: 'SC',
    referenciaAcesso: '',
    observacoes: '',
    tags: [],
    ativo: true,
    representantes: [emptyRepresentante(true)],
  }
}

function draftFromCliente(cliente: Cliente): ClienteDraft {
  return {
    tipo: cliente.tipo,
    nome: cliente.nome,
    documento: cliente.documento,
    nomeFantasia: cliente.nomeFantasia,
    email: cliente.email,
    telefonePrincipal: cliente.telefonePrincipal,
    telefoneAlternativo: cliente.telefoneAlternativo,
    inscricaoEstadual: cliente.inscricaoEstadual,
    cep: cliente.cep,
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
    representantes: cliente.representantes.length ? cliente.representantes : [emptyRepresentante(true)],
  }
}

export function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const [draft, setDraft] = useState<ClienteDraft>(emptyDraft)
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)

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

  function setTipo(tipo: ClienteTipo) {
    setDraft((current) => ({
      ...current,
      tipo,
      representantes: tipo === 'cnpj' ? (current.representantes.length ? current.representantes : [emptyRepresentante(true)]) : [],
    }))
  }

  function updateRepresentante(index: number, patch: Partial<ClienteRepresentante>) {
    setDraft((current) => ({
      ...current,
      representantes: current.representantes.map((representante, currentIndex) => {
        if (currentIndex !== index) {
          return patch.principal ? { ...representante, principal: false } : representante
        }
        return { ...representante, ...patch }
      }),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    const payload = {
      ...draft,
      tags: parseTags(tagsInput),
      representantes: draft.tipo === 'cnpj' ? draft.representantes : [],
    }
    const result = clienteFormSchema.safeParse(payload)

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Revise os dados do cliente.')
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

  if (loading) return <div className="skeleton-block">Carregando cliente...</div>

  return (
    <section className="page-stack">
      <form className="panel editor-form" onSubmit={handleSubmit}>
        <div className="panel-heading">
          <div>
            <h2>{id ? 'Editar cliente' : 'Novo cliente'}</h2>
            <p>Ficha operacional com contato, endereço e representantes quando houver CNPJ.</p>
          </div>
          <Link className="secondary-button" to={id ? `/clientes/${id}` : '/clientes'}>
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>

        <div className="settings-section-title">
          <h3>Identificação</h3>
        </div>
        <div className="form-grid settings-form-grid">
          <label>
            Tipo
            <select value={draft.tipo} onChange={(event) => setTipo(event.target.value as ClienteTipo)}>
              <option value="cnpj">CNPJ</option>
              <option value="cpf">CPF</option>
            </select>
          </label>
          <label>
            {draft.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}
            <input value={draft.documento} onChange={(event) => updateDraft({ documento: event.target.value })} />
          </label>
          <label>
            {draft.tipo === 'cnpj' ? 'Razão social' : 'Nome'}
            <input value={draft.nome} onChange={(event) => updateDraft({ nome: event.target.value })} />
          </label>
          <label>
            Nome fantasia
            <input value={draft.nomeFantasia} onChange={(event) => updateDraft({ nomeFantasia: event.target.value })} />
          </label>
          <label>
            Inscrição estadual
            <input value={draft.inscricaoEstadual} onChange={(event) => updateDraft({ inscricaoEstadual: event.target.value })} />
          </label>
          <label>
            Tags
            <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="condominio, recorrente" />
          </label>
        </div>

        <div className="settings-section-title">
          <h3>Contato e endereço</h3>
        </div>
        <div className="form-grid settings-form-grid">
          <label>
            Telefone principal
            <input value={draft.telefonePrincipal} onChange={(event) => updateDraft({ telefonePrincipal: event.target.value })} />
          </label>
          <label>
            Telefone alternativo
            <input value={draft.telefoneAlternativo} onChange={(event) => updateDraft({ telefoneAlternativo: event.target.value })} />
          </label>
          <label>
            Email
            <input type="email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} />
          </label>
          <label>
            CEP
            <input value={draft.cep} onChange={(event) => updateDraft({ cep: event.target.value })} />
          </label>
          <label>
            Logradouro
            <input value={draft.logradouro} onChange={(event) => updateDraft({ logradouro: event.target.value })} />
          </label>
          <label>
            Número
            <input value={draft.numero} onChange={(event) => updateDraft({ numero: event.target.value })} />
          </label>
          <label>
            Bairro
            <input value={draft.bairro} onChange={(event) => updateDraft({ bairro: event.target.value })} />
          </label>
          <label>
            Cidade
            <input value={draft.cidade} onChange={(event) => updateDraft({ cidade: event.target.value })} />
          </label>
          <label>
            UF
            <input maxLength={2} value={draft.uf} onChange={(event) => updateDraft({ uf: event.target.value.toUpperCase() })} />
          </label>
          <label>
            Complemento
            <input value={draft.complemento} onChange={(event) => updateDraft({ complemento: event.target.value })} />
          </label>
          <label className="span-2">
            Referência de acesso
            <input value={draft.referenciaAcesso} onChange={(event) => updateDraft({ referenciaAcesso: event.target.value })} />
          </label>
        </div>

        {draft.tipo === 'cnpj' ? (
          <>
            <div className="items-toolbar">
              <h3>Representantes</h3>
              <button
                className="secondary-button"
                type="button"
                onClick={() => updateDraft({ representantes: [...draft.representantes, emptyRepresentante()] })}
              >
                <Plus size={16} />
                Adicionar representante
              </button>
            </div>
            <div className="representantes-list">
              {draft.representantes.map((representante, index) => (
                <div className="representante-row" key={representante.id ?? index}>
                  <input
                    value={representante.nome}
                    onChange={(event) => updateRepresentante(index, { nome: event.target.value })}
                    placeholder="Nome"
                  />
                  <input
                    value={representante.cargo}
                    onChange={(event) => updateRepresentante(index, { cargo: event.target.value })}
                    placeholder="Cargo"
                  />
                  <input
                    value={representante.telefone}
                    onChange={(event) => updateRepresentante(index, { telefone: event.target.value })}
                    placeholder="Telefone"
                  />
                  <input
                    value={representante.email}
                    onChange={(event) => updateRepresentante(index, { email: event.target.value })}
                    placeholder="Email opcional"
                  />
                  <label className="checkbox-line compact-check">
                    <input
                      type="checkbox"
                      checked={representante.principal}
                      onChange={(event) => updateRepresentante(index, { principal: event.target.checked })}
                    />
                    Principal
                  </label>
                  <button
                    className="ghost-icon"
                    type="button"
                    onClick={() => updateDraft({ representantes: draft.representantes.filter((_, currentIndex) => currentIndex !== index) })}
                    aria-label="Remover representante"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <label>
          Observações
          <textarea rows={3} value={draft.observacoes} onChange={(event) => updateDraft({ observacoes: event.target.value })} />
        </label>

        <div className="form-footer">
          <span className="form-note">Clientes arquivados continuam no histórico dos orçamentos.</span>
          <button className="primary-button" type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar cliente'}
          </button>
        </div>
      </form>
    </section>
  )
}
