import { STATUS_CLASSES, STATUS_LABELS } from '../../lib/constants'
import type { OrcamentoStatus } from '../../types'

type Props = {
  status: OrcamentoStatus
}

export function StatusBadge({ status }: Props) {
  return <span className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</span>
}
