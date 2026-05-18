import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { deleteOrcamento, saveOrcamento } from '../data/orcamentoRepository'
import { downloadBlob } from '../lib/downloads'
import { toOrcamentoFilename } from '../lib/formatters'
import { createDuplicateDraft } from '../lib/orcamento'
import { useAuthStore } from '../stores/authStore'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import type { Orcamento } from '../types'

export function useOrcamentoActions(onAfterChange?: () => Promise<void> | void) {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const settings = useSystemSettingsStore((state) => state.settings)
  const [pendingDelete, setPendingDelete] = useState<Orcamento | null>(null)

  async function refresh() {
    await onAfterChange?.()
  }

  async function duplicate(orcamento: Orcamento) {
    if (!profile) return
    const created = await saveOrcamento(createDuplicateDraft(orcamento), profile)
    toast.success(`Orçamento ${created.numero} duplicado.`)
    await refresh()
    navigate(`/orcamentos/${created.id}/editar`)
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await deleteOrcamento(pendingDelete.id)
    toast.success(`Orçamento ${pendingDelete.numero} excluído.`)
    setPendingDelete(null)
    await refresh()
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
    pendingDelete,
    setPendingDelete,
    duplicate,
    confirmDelete,
    downloadPdf,
    downloadXlsx,
  }
}
