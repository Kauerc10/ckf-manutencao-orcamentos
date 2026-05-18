import { Building2, Lock, Save, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { systemSettingsSchema } from '../lib/validations'
import { useAuthStore } from '../stores/authStore'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import type { SystemSettings } from '../types'

function cloneSettings(settings: SystemSettings): SystemSettings {
  return {
    ...settings,
    empresa: { ...settings.empresa },
  }
}

export function Configuracoes() {
  const profile = useAuthStore((state) => state.profile)
  const settings = useSystemSettingsStore((state) => state.settings)
  const loading = useSystemSettingsStore((state) => state.loading)
  const saveSettings = useSystemSettingsStore((state) => state.save)
  const isAdmin = profile?.role === 'admin'
  const [form, setForm] = useState<SystemSettings>(() => cloneSettings(settings))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(cloneSettings(settings))
  }, [settings])

  const canEditText = useMemo(
    () =>
      isAdmin
        ? 'Você pode alterar os dados oficiais usados no sistema, PDF e XLSX.'
        : 'Você pode consultar estas configurações. Alterações ficam restritas a administradores.',
    [isAdmin],
  )

  async function handleSubmit() {
    if (!profile || !isAdmin) {
      toast.error('Apenas administradores podem salvar configurações.')
      return
    }

    const result = systemSettingsSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Revise as configurações.')
      return
    }

    try {
      await saveSettings({ ...form, ...result.data, id: 'default' }, profile)
      toast.success('Configurações atualizadas.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.')
    }
  }

  return (
    <section className="settings-page page-stack">
      <div className="panel settings-hero">
        <div>
          <span className="eyebrow dark">Configurações</span>
          <h2>Dados da empresa e preferências</h2>
          <p>{canEditText}</p>
        </div>
        <div className={isAdmin ? 'role-chip admin' : 'role-chip'}>
          {isAdmin ? <SlidersHorizontal size={16} /> : <Lock size={16} />}
          {isAdmin ? 'Acesso admin' : 'Somente leitura'}
        </div>
      </div>

      <div className="settings-grid">
        <form className="panel settings-panel" onSubmit={(event) => event.preventDefault()}>
          <div className="settings-section-title">
            <Building2 size={18} />
            <div>
              <h3>Empresa</h3>
              <p>Esses dados aparecem no orçamento, no PDF e na planilha.</p>
            </div>
          </div>

          <div className="form-grid settings-form-grid">
            <label className="span-2">
              Nome
              <input
                disabled={!isAdmin || loading}
                value={form.empresa.nome}
                onChange={(event) => setForm({ ...form, empresa: { ...form.empresa, nome: event.target.value } })}
              />
            </label>
            <label>
              CNPJ
              <input
                disabled={!isAdmin || loading}
                value={form.empresa.cnpj}
                onChange={(event) => setForm({ ...form, empresa: { ...form.empresa, cnpj: event.target.value } })}
              />
            </label>
            <label>
              Email
              <input
                disabled={!isAdmin || loading}
                type="email"
                value={form.empresa.email}
                onChange={(event) => setForm({ ...form, empresa: { ...form.empresa, email: event.target.value } })}
              />
            </label>
            <label>
              Telefone
              <input
                disabled={!isAdmin || loading}
                value={form.empresa.telefone}
                onChange={(event) => setForm({ ...form, empresa: { ...form.empresa, telefone: event.target.value } })}
              />
            </label>
            <label>
              Região
              <input
                disabled={!isAdmin || loading}
                value={form.empresa.regiao}
                onChange={(event) => setForm({ ...form, empresa: { ...form.empresa, regiao: event.target.value } })}
              />
            </label>
          </div>

          <div className="settings-divider" />

          <div className="settings-section-title">
            <SlidersHorizontal size={18} />
            <div>
              <h3>Preferências do sistema</h3>
              <p>Padrões aplicados aos novos orçamentos e à prévia oficial.</p>
            </div>
          </div>

          <div className="form-grid settings-form-grid">
            <label>
              Validade padrão (dias)
              <input
                disabled={!isAdmin || loading}
                inputMode="numeric"
                value={form.validadePadraoDias}
                onChange={(event) =>
                  setForm({ ...form, validadePadraoDias: Number.parseInt(event.target.value || '0', 10) })
                }
              />
            </label>
            <label>
              Densidade da prévia
              <select
                disabled={!isAdmin || loading}
                value={form.previewDensidade}
                onChange={(event) =>
                  setForm({ ...form, previewDensidade: event.target.value as SystemSettings['previewDensidade'] })
                }
              >
                <option value="compacta">Compacta</option>
                <option value="confortavel">Confortável</option>
              </select>
            </label>
            <label className="checkbox-line">
              <input
                disabled={!isAdmin || loading}
                type="checkbox"
                checked={form.mostrarLogoDocumentos}
                onChange={(event) => setForm({ ...form, mostrarLogoDocumentos: event.target.checked })}
              />
              Mostrar logo nos documentos
            </label>
            <label className="span-2">
              Observações padrão
              <textarea
                disabled={!isAdmin || loading}
                rows={4}
                value={form.observacoesPadrao}
                onChange={(event) => setForm({ ...form, observacoesPadrao: event.target.value })}
              />
            </label>
          </div>

          <div className="form-footer settings-footer">
            <span>{loading ? 'Sincronizando...' : 'Configurações carregadas'}</span>
            <button className="primary-button" type="button" disabled={!isAdmin || loading} onClick={handleSubmit}>
              <Save size={16} />
              Salvar configurações
            </button>
          </div>
        </form>

        <aside className="panel settings-summary">
          <span className="eyebrow dark">Prévia dos dados</span>
          <h3>{form.empresa.nome}</h3>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{form.empresa.email}</dd>
            </div>
            <div>
              <dt>CNPJ</dt>
              <dd>{form.empresa.cnpj}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{form.empresa.telefone}</dd>
            </div>
            <div>
              <dt>Região</dt>
              <dd>{form.empresa.regiao}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}
