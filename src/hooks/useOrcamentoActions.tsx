import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { deleteOrcamento, saveOrcamento } from '../data/orcamentoRepository'
import { downloadBlob } from '../lib/downloads'
import { toOrcamentoFilename } from '../lib/formatters'
import { createDuplicateDraft } from '../lib/orcamento'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import type { Orcamento } from '../types'

export function useOrcamentoActions(onAfterChange?: () => Promise<void> | void) {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const settings = useSystemSettingsStore((state) => state.settings)
  const [pendingDelete, setPendingDeleteState] = useState<Orcamento | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const canDelete = profile?.role === 'admin'

  async function refresh() {
    await onAfterChange?.()
  }

  async function duplicate(orcamento: Orcamento) {
    if (!profile) return
    if (orcamento.status === 'excluido') {
      toast.error('Orcamentos excluidos nao podem ser duplicados.')
      return
    }

    const created = await saveOrcamento(createDuplicateDraft(orcamento), profile)
    toast.success(`Orcamento ${created.numero} duplicado.`)
    await refresh()
    navigate(`/orcamentos/${created.id}/editar`)
  }

  function cancelDelete() {
    setPendingDeleteState(null)
    setDeleteReason('')
    setAdminPassword('')
    setDeleting(false)
  }

  function setPendingDelete(orcamento: Orcamento | null) {
    if (!orcamento) {
      cancelDelete()
      return
    }

    if (!canDelete) {
      toast.error('Apenas administradores podem excluir orcamentos.')
      return
    }

    setPendingDeleteState(orcamento)
    setDeleteReason('')
    setAdminPassword('')
  }

  async function verifyAdminPassword() {
    if (!profile) throw new Error('Sessao expirada. Entre novamente.')
    if (profile.role !== 'admin') throw new Error('Apenas administradores podem excluir orcamentos.')
    if (!adminPassword.trim()) throw new Error('Informe a senha de admin.')

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: adminPassword,
      })
      if (error) throw new Error('Senha de admin invalida.')
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !profile || deleting) return

    setDeleting(true)
    try {
      await verifyAdminPassword()
      await deleteOrcamento({ id: pendingDelete.id, motivo: deleteReason }, profile)
      toast.success(`Orcamento ${pendingDelete.numero} marcado como excluido.`)
      cancelDelete()
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nao foi possivel excluir o orcamento.')
      setDeleting(false)
    }
  }

  async function downloadPdf(orcamento: Orcamento) {
    const [{ pdf }, { OrcamentoPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../components/pdf/OrcamentoPDF'),
    ])
    const blob = await pdf(<OrcamentoPDF orcamento={orcamento} settings={settings} />).toBlob()
    downloadBlob(blob, toOrcamentoFilename(orcamento.numero, orcamento.servicoCliente, 'pdf'))
    toast.success('PDF gerado.')
  }

  async function downloadXlsx(orcamento: Orcamento) {
    const { createOrcamentoWorkbook, workbookToBlob } = await import('../lib/xlsx')
    const workbook = await createOrcamentoWorkbook(orcamento, settings)
    const blob = await workbookToBlob(workbook)
    downloadBlob(blob, toOrcamentoFilename(orcamento.numero, orcamento.servicoCliente, 'xlsx'))
    toast.success('XLSX gerado.')
  }

  return {
    adminPassword,
    canDelete,
    deleting,
    deleteReason,
    pendingDelete,
    setAdminPassword,
    setDeleteReason,
    setPendingDelete,
    cancelDelete,
    duplicate,
    confirmDelete,
    downloadPdf,
    downloadXlsx,
  }
}
