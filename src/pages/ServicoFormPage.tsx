import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, saveServico } from '../data/catalogoRepository'
import { uploadCatalogoImage } from '../lib/catalogo-images'
import { formatCurrency, formatDateTimeBR, parseLocalizedNumber } from '../lib/formatters'
import { useAuthStore } from '../stores/authStore'
import { ServicoImagem } from '../components/ServicoImagem'
import type { Servico, ServicoDraft } from '../types/comercial'

const UNIDADES = ['unidade', 'hora', 'metro', 'serviço'] as const
const PRECOS_EXEMPLO: Record<string, number> = { unidade: 250, hora: 180, metro: 80, serviço: 500 }
const VAZIO: ServicoDraft = {
  codigo: '',
  nome: '',
  categoria: '',
  escopo: '',
  unidade: 'unidade',
  precoPadrao: 0,
  imagem: '',
  ativo: true,
}
function exemploCobranca(unidade: string, preco: number): string {
  if (unidade === 'serviço') return `1 serviço fechado = ${formatCurrency(preco)} pelo escopo descrito.`
  const nome = { unidade: 'peças', hora: 'horas', metro: 'metros' }[unidade as 'unidade' | 'hora' | 'metro']
  if (!nome) return `3 × ${formatCurrency(preco)} por ${unidade || 'unidade'} = ${formatCurrency(preco * 3)}.`
  return `3 ${nome} × ${formatCurrency(preco)} = ${formatCurrency(preco * 3)}.`
}
export function ServicoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const admin = profile?.ativo && profile.role === 'admin'
  const [servicos, setServicos] = useState<Servico[]>([])
  const [draft, setDraft] = useState<ServicoDraft>(VAZIO)
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    let active = true
    void listServicos()
      .then((all) => {
        if (!active) return
        setServicos(all)
        if (id) {
          const found = all.find((s) => s.id === id)
          if (found) {
            setDraft(found)
            setPrice(String(found.precoPadrao))
          } else setError('Serviço não encontrado.')
        }
        setLoading(false)
      })
      .catch(() => {
        if (active) {
          setError('Não foi possível carregar o catálogo.')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [id])
  if (!admin) return <Navigate to="/catalogo" replace />
  if (loading) return <div className="panel">Carregando serviço...</div>
  if (error)
    return (
      <div className="panel" role="alert">
        <p>{error}</p>
        <Link to="/catalogo">Voltar ao catálogo</Link>
      </div>
    )
  const atual = servicos.find((s) => s.id === id)
  const unidadeSelecionada = UNIDADES.includes(draft.unidade as (typeof UNIDADES)[number]) ? draft.unidade : 'outro'
  const valor = parseLocalizedNumber(price)
  const precoInvalido = price.trim() !== '' && (valor === null || valor < 0 || valor > 9999999999.99)
  let exemploPreco = `Exemplo: ${exemploCobranca(draft.unidade, PRECOS_EXEMPLO[draft.unidade] ?? 250)}`
  if (precoInvalido) exemploPreco = 'Informe um valor válido, como 250,00.'
  else if (price && valor !== null) exemploPreco = exemploCobranca(draft.unidade, valor)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!profile || valor === null || precoInvalido) {
      toast.error('Informe um preço válido.')
      return
    }
    setSaving(true)
    try {
      const saved = await saveServico({ ...draft, precoPadrao: valor }, profile)
      toast.success(`Serviço ${saved.codigo} salvo no catálogo.`)
      navigate('/catalogo')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o serviço.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <section className="page-stack commercial-page">
      <form className="panel commercial-form service-editor" onSubmit={submit}>
        <header className="service-editor-header">
          <h2>{id ? 'Editar serviço' : 'Novo serviço'}</h2>
          <Link className="secondary-button" to="/catalogo">
            <ArrowLeft size={16} />
            Voltar ao catálogo
          </Link>
        </header>
        <p className="service-code">
          {atual ? `Código ${atual.codigo}` : 'Código gerado ao salvar · ex.: CKF-00001'}
        </p>
        <div className="commercial-fields">
          <label>
            Nome do serviço
            <input
              required
              maxLength={200}
              placeholder="Ex.: Soldagem de estrutura metálica"
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
            />
          </label>
          <label>
            Categoria
            <input
              required
              maxLength={200}
              list="categorias-servico"
              placeholder="Ex.: Soldagem"
              value={draft.categoria}
              onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
            />
          </label>
          <label className="commercial-wide">
            Escopo incluído
            <textarea
              required
              maxLength={2000}
              rows={5}
              placeholder="Ex.: Preparação da peça, soldagem e acabamento de uma estrutura. Materiais adicionais e transporte não incluídos."
              value={draft.escopo}
              onChange={(e) => setDraft({ ...draft, escopo: e.target.value })}
            />
          </label>
          <label>
            Unidade de cobrança
            <select
              value={unidadeSelecionada}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  unidade: e.target.value === 'outro' ? '' : e.target.value,
                })
              }
            >
              <option value="unidade">Por unidade ou peça</option>
              <option value="hora">Por hora</option>
              <option value="metro">Por metro</option>
              <option value="serviço">Por serviço fechado</option>
              <option value="outro">Outra unidade</option>
            </select>
          </label>
          {unidadeSelecionada === 'outro' && (
            <label>
              Qual é a unidade?
              <input
                required
                maxLength={200}
                placeholder="Ex.: visita, equipamento, m²"
                value={draft.unidade}
                onChange={(e) => setDraft({ ...draft, unidade: e.target.value })}
              />
            </label>
          )}
          <label>
            Preço padrão por {draft.unidade || 'unidade'} (R$)
            <input
              required
              inputMode="decimal"
              aria-invalid={precoInvalido}
              placeholder="Ex.: 250,00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <output className={precoInvalido ? 'service-price-example service-price-error' : 'service-price-example'} aria-live="polite">
              {exemploPreco}
            </output>
          </label>
        </div>
        <div className="commercial-fields">
          <label className="commercial-wide">
            Imagem (opcional)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={saving || uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !profile) return
                setUploading(true)
                try {
                  const path = await uploadCatalogoImage(file, profile)
                  setDraft((current) => ({ ...current, imagem: path }))
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Falha no envio da imagem.')
                } finally {
                  setUploading(false)
                }
              }}
            />
            <small>PNG, JPEG ou WebP · até 5 MB</small>
          </label>
        </div>
        {draft.imagem ? (
          <div className="commercial-actions">
            <ServicoImagem path={draft.imagem} nome={draft.nome} />
            <button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, imagem: '' })}>
              Retirar imagem
            </button>
          </div>
        ) : null}
        <label className="commercial-check">
          <input
            type="checkbox"
            checked={draft.ativo}
            onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })}
          />
          Disponível para novas tabelas
        </label>
        {atual && (
          <p className="form-note">
            Criado por {atual.criadorNome} em {formatDateTimeBR(atual.criadoEm)} · Última alteração por{' '}
            {atual.autorNome} em {formatDateTimeBR(atual.atualizadoEm)}
          </p>
        )}
        <datalist id="categorias-servico">
          {[...new Set(servicos.map((s) => s.categoria))].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="form-footer">
          {atual && valor !== atual.precoPadrao && (
            <span className="form-note">Tabelas já salvas mantêm os preços anteriores.</span>
          )}
          <button className="primary-button" disabled={saving || uploading}>
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar serviço'}
          </button>
        </div>
      </form>
    </section>
  )
}
