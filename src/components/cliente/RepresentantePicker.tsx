import { useId } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Mail, Phone, UserPlus } from 'lucide-react'
import type { Cliente } from '../../types'
import { getActiveRepresentantes } from '../../lib/cliente-search'
import { formatPhone } from '../../lib/clientes'

type RepresentantePickerProps = {
  cliente: Cliente | null
  selectedRepresentanteId: string | null
  onSelectRepresentante: (representanteId: string | null) => void
}

export function RepresentantePicker({
  cliente,
  selectedRepresentanteId,
  onSelectRepresentante,
}: RepresentantePickerProps) {
  const labelId = useId()

  if (!cliente || cliente.tipo !== 'cnpj') {
    return null
  }

  const activeReps = getActiveRepresentantes(cliente)

  return (
    <div className="representante-picker">
      <span id={labelId} className="field-label-row">
        Representante do cliente
      </span>

      {activeReps.length > 0 ? (
        <div className="representante-options" role="radiogroup" aria-labelledby={labelId}>
          <button
            type="button"
            className={`representante-option-card ${!selectedRepresentanteId ? 'selected' : ''}`}
            onClick={() => onSelectRepresentante(null)}
            role="radio"
            aria-checked={!selectedRepresentanteId}
          >
            <strong>Sem representante informado</strong>
            <span>O orçamento ficará vinculado apenas ao cliente.</span>
          </button>

          {activeReps.map((rep) => (
            <button
              key={rep.id ?? rep.nome}
              type="button"
              className={`representante-option-card ${selectedRepresentanteId === rep.id ? 'selected' : ''}`}
              onClick={() => onSelectRepresentante(rep.id ?? null)}
              role="radio"
              aria-checked={selectedRepresentanteId === rep.id}
            >
              <div className="representante-card-header">
                <strong>{rep.nome}</strong>
                {rep.principal ? <span className="rep-badge">Principal</span> : null}
              </div>
              <span>{rep.cargo || 'Cargo nao informado'}</span>
              <span className="representante-line">
                <Phone size={13} aria-hidden="true" />
                {rep.telefone ? formatPhone(rep.telefone) : 'Telefone nao informado'}
              </span>
              {rep.email ? (
                <span className="representante-line">
                  <Mail size={13} aria-hidden="true" />
                  {rep.email}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="representante-warning-banner">
          <div className="warning-content">
            <AlertCircle size={16} className="text-warning" />
            <span>Este CNPJ nao possui representantes ativos.</span>
          </div>
          <Link
            className="secondary-button text-sm"
            to={`/clientes/${cliente.id}/editar`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <UserPlus size={14} />
            Editar ficha do cliente
          </Link>
        </div>
      )}
    </div>
  )
}
