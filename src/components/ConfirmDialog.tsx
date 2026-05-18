import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmDisabled?: boolean
  confirming?: boolean
  children?: ReactNode
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmDisabled = false,
  confirming = false,
  children,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{description}</p>
        {children ? <div className="dialog-fields">{children}</div> : null}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={confirming}>
            Cancelar
          </button>
          <button className="danger-button" type="button" onClick={onConfirm} disabled={confirmDisabled || confirming}>
            {confirming ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
