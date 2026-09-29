import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { listServicos, saveServico } from '../data/catalogoRepository'
import { uploadCatalogoImage } from '../lib/catalogo-images'
import { formatCurrency, formatDateTimeBR, parseLocalizedNumber } from '../lib/formatters'
import { useAuthStore } from '../stores/authStore'
import { ServicoImagem } from '../components/ServicoImagem'
import type { Servico, ServicoDraft } from '../types/comercial'

const UNIDADES = ['unidade', 'hora', 'metro', 'serviço'] as const
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
function exemploCobranca(unidade: string, preco: number | null): string {
  if (preco === null) return 'Digite o preço para ver um exemplo de cálculo.'
  if (unidade === 'serviço') return `Um serviço fechado custa ${formatCurrency(preco)} pelo escopo descrito.`
  const nome =
    { unidade: 'peças ou equipamentos', hora: 'horas', metro: 'metros' }[unidade as 'unidade' | 'hora' | 'metro'] ??
    unidade
  return `Exemplo: 3 ${nome} × ${formatCurrency(preco)} = ${formatCurrency(preco * 3)}.`
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
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!profile || valor === null) {
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
      <div className="panel commercial-heading">
        <div>
          <span className="eyebrow dark">Cadastro de serviço</span>
          <h2>{id ? 'Editar serviço' : 'Novo serviço'}</h2>
          <p>Descreva o trabalho e defina o que o preço cobre.</p>
        </div>
        <Link className="secondary-button" to="/catalogo">
          <ArrowLeft size={16} />
          Voltar ao catálogo
        </Link>
      </div>
      <form className="panel commercial-form" onSubmit={submit}>
        <div className="service-form-intro">
          <strong>Código do serviço</strong>
          <span>{atual?.codigo ?? 'Gerado automaticamente ao salvar · ex.: CKF-00001'}</span>
          <p>O código identifica o serviço nas tabelas e nos PDFs. Depois de criado, ele permanece o mesmo.</p>
        </div>
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
            <small>Use o nome que a equipe e o cliente reconhecerão.</small>
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
            <small>Agrupa os serviços no catálogo e no PDF.</small>
          </label>
          <label className="commercial-wide">
            Escopo: o que está incluído
            <textarea
              required
              maxLength={2000}
              rows={5}
              placeholder="Ex.: Preparação da peça, soldagem e acabamento de uma estrutura. Materiais adicionais e transporte não incluídos."
              value={draft.escopo}
              onChange={(e) => setDraft({ ...draft, escopo: e.target.value })}
            />
            <small>Descreva limites e exclusões para não aplicar o mesmo preço a trabalhos diferentes.</small>
          </label>
          <label>
            Como o serviço é cobrado?
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
            <small>O preço abaixo corresponde a uma unidade escolhida aqui.</small>
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
              <small>Defina no escopo o que uma unidade inclui.</small>
            </label>
          )}
          <label>
            Preço padrão por {draft.unidade || 'unidade'} (R$)
            <input
              required
              inputMode="decimal"
              placeholder="Ex.: 250,00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <small>É a referência central; cada empresa pode ter um preço negociado.</small>
          </label>
          <div className="service-price-example">
            <strong>Como o valor funciona</strong>
            <p>{exemploCobranca(draft.unidade, valor)}</p>
            <small>No orçamento, quantidade e valor continuam preenchidos manualmente.</small>
          </div>
        </div>
        <div className="service-unit-guide">
          <strong>Exemplos de unidade</strong>
          <div>
            <p>
              <b>Unidade:</b> R$ 250 por peça; 3 peças custam R$ 750.
            </p>
            <p>
              <b>Hora:</b> R$ 180 por hora; 3 horas custam R$ 540.
            </p>
            <p>
              <b>Metro:</b> R$ 80 por metro; 3 metros custam R$ 240.
            </p>
            <p>
              <b>Serviço:</b> valor fechado para o escopo descrito.
            </p>
          </div>
        </div>
        <div className="commercial-fields">
          <label className="commercial-wide">
            Imagem opcional (PNG, JPEG ou WebP, até 5 MB)
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
            <small>O PDF funciona sem imagem. Inclua uma quando ela ajudar a entender o serviço.</small>
          </label>
        </div>
        {draft.imagem ? (
          <div className="commercial-actions">
            <ServicoImagem path={draft.imagem} nome={draft.nome} />
            <button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, imagem: '' })}>
              Retirar imagem
            </button>
          </div>
        ) : (
          <p className="form-note">
            <ImagePlus size={15} /> Nenhuma imagem escolhida.
          </p>
        )}
        <label className="commercial-check">
          <input
            type="checkbox"
            checked={draft.ativo}
            onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })}
          />
          Serviço ativo e disponível para novas tabelas
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
          <span className="form-note">Preços já salvos nas tabelas das empresas permanecem como estão.</span>
          <button className="primary-button" disabled={saving || uploading}>
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar serviço'}
          </button>
        </div>
      </form>
    </section>
  )
}
