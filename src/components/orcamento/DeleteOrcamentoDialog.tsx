import { ConfirmDialog } from '../ConfirmDialog'
import { formatOrcamentoNumero } from '../../lib/formatters'
import type { Orcamento } from '../../types'

type Props = {
  orcamento: Orcamento | null
  motivo: string
  senha: string
  deleting: boolean
  onMotivoChange: (motivo: string) => void
  onSenhaChange: (senha: string) => void
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function DeleteOrcamentoDialog({
  orcamento,
  motivo,
  senha,
  deleting,
  onMotivoChange,
  onSenhaChange,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <ConfirmDialog
      open={Boolean(orcamento)}
      title="Excluir orçamento?"
      description={`O orçamento ${orcamento ? formatOrcamentoNumero(orcamento.numero) : ''} ficará marcado como excluído e continuará no histórico.`}
      confirmLabel="Marcar como excluído"
      confirmDisabled={!motivo.trim() || !senha.trim()}
      confirming={deleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <label>
        Motivo da exclusão
        <textarea
          rows={3}
          value={motivo}
          onChange={(event) => onMotivoChange(event.target.value)}
          placeholder="Ex.: orçamento duplicado, aberto por engano..."
        />
      </label>
      <label>
        Senha de admin
        <input
          type="password"
          value={senha}
          onChange={(event) => onSenhaChange(event.target.value)}
          autoComplete="current-password"
        />
      </label>
    </ConfirmDialog>
  )
}
