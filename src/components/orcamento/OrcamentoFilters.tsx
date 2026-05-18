import type { Cliente, OrcamentoFilters, OrcamentoStatus } from '../../types'

type Props = {
  filters: OrcamentoFilters
  onChange: (filters: OrcamentoFilters) => void
  creators: Array<{ id: string; nome: string }>
  clientes?: Cliente[]
}

const statuses: Array<OrcamentoStatus | 'todos'> = ['todos', 'rascunho', 'enviado', 'aprovado', 'recusado', 'cancelado']

export function OrcamentoFilters({ filters, onChange, creators, clientes = [] }: Props) {
  return (
    <div className="filters-bar">
      <label>
        Busca
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Nº, cliente ou serviço"
        />
      </label>
      <label>
        Status
        <select
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value as OrcamentoStatus | 'todos' })}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === 'todos' ? 'Todos' : status}
            </option>
          ))}
        </select>
      </label>
      <label>
        Data inicial
        <input
          type="date"
          value={filters.dataInicial}
          onChange={(event) => onChange({ ...filters, dataInicial: event.target.value })}
        />
      </label>
      <label>
        Data final
        <input
          type="date"
          value={filters.dataFinal}
          onChange={(event) => onChange({ ...filters, dataFinal: event.target.value })}
        />
      </label>
      <label>
        Cliente
        <select
          value={filters.clienteId}
          onChange={(event) => onChange({ ...filters, clienteId: event.target.value })}
        >
          <option value="">Todos</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Criado por
        <select
          value={filters.criadoPor}
          onChange={(event) => onChange({ ...filters, criadoPor: event.target.value })}
        >
          <option value="">Todos</option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.nome}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
