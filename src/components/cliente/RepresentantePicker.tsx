import { Link } from 'react-router-dom'
import { UserPlus, AlertCircle } from 'lucide-react'
import type { Cliente } from '../../types'
import { getActiveRepresentantes } from '../../lib/cliente-search'

interface RepresentantePickerProps {
  cliente: Cliente | null
  selectedRepresentanteId: string | null
  onSelectRepresentante: (representanteId: string | null) => void
}

export function RepresentantePicker({
  cliente,
  selectedRepresentanteId,
  onSelectRepresentante,
}: RepresentantePickerProps) {
  // Renders null for CPF clients or when no client is selected
  if (!cliente || cliente.tipo !== 'cnpj') {
    return null
  }

  const activeReps = getActiveRepresentantes(cliente)
  const hasReps = activeReps.length > 0

  return (
    <div className="representante-picker">
      <label htmlFor="representante-select">Representante do cliente</label>

      {hasReps ? (
        <div className="select-wrapper">
          <select
            id="representante-select"
            value={selectedRepresentanteId ?? ''}
            onChange={(e) => onSelectRepresentante(e.target.value || null)}
          >
            <option value="">Não informado / Sem representante</option>
            {activeReps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.nome} · {rep.cargo} {rep.principal ? ' (Principal)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="representante-warning-banner">
          <div className="warning-content">
            <AlertCircle size={16} className="text-warning" />
            <span>Nenhum representante ativo cadastrado para este cliente.</span>
          </div>
          <Link
            className="secondary-button text-sm flex-center gap-1 mt-1"
            to={`/clientes/${cliente.id}/editar`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UserPlus size={14} />
            Gerenciar representantes
          </Link>
        </div>
      )}
    </div>
  )
}
