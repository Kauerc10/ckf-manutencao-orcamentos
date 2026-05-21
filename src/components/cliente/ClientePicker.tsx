import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Edit, Mail, MapPin, Phone, Plus, RefreshCw, Search, X } from 'lucide-react'
import type { Cliente } from '../../types'
import { searchClientes } from '../../lib/cliente-search'
import { formatClienteDocumento, formatPhone, getClienteEndereco } from '../../lib/clientes'

type ClientePickerProps = {
  clientes: Cliente[]
  selectedCliente: Cliente | null
  loading?: boolean
  onSelect: (cliente: Cliente | null) => void
  onRefresh?: () => Promise<void> | void
}

export function ClientePicker({
  clientes,
  selectedCliente,
  loading = false,
  onSelect,
  onRefresh,
}: ClientePickerProps) {
  const listboxId = useId()
  const inputId = useId()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [isChanging, setIsChanging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeClientes = useMemo(() => clientes.filter((cliente) => cliente.ativo), [clientes])
  const trimmedQuery = searchQuery.trim()
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return activeClientes.slice(0, 5)
    return searchClientes(activeClientes, trimmedQuery, 8)
  }, [activeClientes, trimmedQuery])

  const shouldShowSearch = !selectedCliente || isChanging

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  function resetSearchState() {
    setSearchQuery('')
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  function handleSelect(cliente: Cliente) {
    onSelect(cliente)
    setIsChanging(false)
    resetSearchState()
  }

  function handleUnlink() {
    onSelect(null)
    setIsChanging(false)
    resetSearchState()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  function handleStartChanging() {
    setIsChanging(true)
    setIsOpen(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  function handleCancelChanging() {
    setIsChanging(false)
    resetSearchState()
  }

  async function handleRefresh() {
    if (!onRefresh || refreshing) return

    setRefreshing(true)
    try {
      await onRefresh()
    } catch {
      // The hook exposes the load error to the screen that owns the data.
    } finally {
      setRefreshing(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setFocusedIndex(-1)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      if (searchResults.length > 0) {
        setFocusedIndex((current) => Math.min(current + 1, searchResults.length - 1))
      }
      return
    }

    if (event.key === 'ArrowUp') {
      if (!isOpen || searchResults.length === 0) return
      event.preventDefault()
      setFocusedIndex((current) => Math.max(current - 1, -1))
      return
    }

    if (event.key === 'Enter' && isOpen) {
      event.preventDefault()
      const cliente = focusedIndex >= 0 ? searchResults[focusedIndex] : searchResults[0]
      if (cliente) handleSelect(cliente)
    }
  }

  if (loading && !selectedCliente && clientes.length === 0 && !refreshing) {
    return (
      <div className="cliente-picker cliente-picker-skeleton" aria-busy="true">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line" />
        <div className="skeleton-card" />
      </div>
    )
  }

  return (
    <div className="cliente-picker" ref={containerRef} aria-busy={loading || refreshing}>
      {selectedCliente ? (
        <div className={`cliente-selected-card${isChanging ? ' compact' : ''}`}>
          <div className="card-header">
            <div className="title-area">
              <span className={`badge ${selectedCliente.tipo === 'cnpj' ? 'cnpj' : 'cpf'}`}>
                {selectedCliente.tipo.toUpperCase()}
              </span>
              <h3>{selectedCliente.nome}</h3>
              {selectedCliente.nomeFantasia ? (
                <span className="nome-fantasia">{selectedCliente.nomeFantasia}</span>
              ) : null}
            </div>
          </div>

          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">{selectedCliente.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}</span>
                <span className="info-val">{formatClienteDocumento(selectedCliente.documento)}</span>
              </div>
              {selectedCliente.telefonePrincipal ? (
                <div className="info-item">
                  <Phone size={14} className="text-muted" />
                  <span className="info-val">{formatPhone(selectedCliente.telefonePrincipal)}</span>
                </div>
              ) : null}
              {selectedCliente.email ? (
                <div className="info-item span-all">
                  <Mail size={14} className="text-muted" />
                  <span className="info-val">{selectedCliente.email}</span>
                </div>
              ) : null}
              <div className="info-item span-all">
                <MapPin size={14} className="text-muted" />
                <span className="info-val">{getClienteEndereco(selectedCliente)}</span>
              </div>
            </div>

            {selectedCliente.tags.length > 0 ? (
              <div className="card-tags" aria-label="Tags do cliente">
                {selectedCliente.tags.map((tag) => (
                  <span key={tag} className="tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="cliente-selected-actions">
            <Link
              className="secondary-button"
              to={`/clientes/${selectedCliente.id}/editar`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Edit size={14} />
              Editar ficha
            </Link>
            <button className="secondary-button" type="button" onClick={handleStartChanging}>
              <RefreshCw size={14} />
              Trocar cliente
            </button>
            <button className="danger-button" type="button" onClick={handleUnlink}>
              <X size={14} />
              Desvincular
            </button>
          </div>
        </div>
      ) : null}

      {shouldShowSearch ? (
        <div className="cliente-search-container">
          <div className="cliente-search-row">
            <div className="input-wrapper">
              <Search size={16} className="cliente-search-icon" aria-hidden="true" />
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                className="cliente-picker-input"
                placeholder="Buscar por nome, CPF/CNPJ, RG, telefone, cidade ou representante..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setIsOpen(true)
                  setFocusedIndex(-1)
                }}
                onFocus={() => {
                  setIsOpen(true)
                  setFocusedIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  focusedIndex >= 0 && isOpen ? `${listboxId}-option-${focusedIndex}` : undefined
                }
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="clear-input-button"
                  onClick={() => {
                    setSearchQuery('')
                    setFocusedIndex(-1)
                    inputRef.current?.focus()
                  }}
                  aria-label="Limpar busca"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className="cliente-picker-actions">
              <Link
                className="cliente-icon-button"
                to="/clientes/novo"
                target="_blank"
                title="Cadastrar novo cliente"
                aria-label="Cadastrar novo cliente"
              >
                <Plus size={16} />
              </Link>
              <button
                className="cliente-icon-button"
                type="button"
                onClick={() => void handleRefresh()}
                disabled={!onRefresh || refreshing}
                title={refreshing ? 'Atualizando clientes' : 'Atualizar clientes'}
                aria-label={refreshing ? 'Atualizando clientes' : 'Atualizar clientes'}
                aria-busy={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'cliente-refreshing' : undefined} />
              </button>
            </div>
          </div>

          {isChanging ? (
            <div className="cliente-change-toolbar">
              <button className="secondary-button cliente-change-cancel" type="button" onClick={handleCancelChanging}>
                Cancelar troca
              </button>
            </div>
          ) : null}

          {!trimmedQuery ? (
            <p className="cliente-search-hint">Digite para buscar clientes cadastrados.</p>
          ) : null}

          {isOpen ? (
            <div
              id={listboxId}
              className="cliente-picker-results"
              role="listbox"
              aria-label="Resultados da busca de clientes"
            >
              {loading ? (
                <div className="cliente-loading-state">
                  <div className="skeleton-line skeleton-title" />
                  <div className="skeleton-line" />
                  <div className="skeleton-card" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((cliente, index) => (
                  <div
                    key={cliente.id}
                    id={`${listboxId}-option-${index}`}
                    className={`cliente-result-card${index === focusedIndex ? ' focused' : ''}`}
                    role="option"
                    aria-selected={index === focusedIndex}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleSelect(cliente)
                    }}
                  >
                    <div className="result-card-header">
                      <strong className="result-name">{cliente.nome}</strong>
                      <span className={`badge ${cliente.tipo === 'cnpj' ? 'cnpj' : 'cpf'}`}>
                        {cliente.tipo.toUpperCase()}
                      </span>
                    </div>
                    {cliente.nomeFantasia ? (
                      <div className="result-fantasia">{cliente.nomeFantasia}</div>
                    ) : null}
                    <div className="result-details">
                      <span>{formatClienteDocumento(cliente.documento)}</span>
                      {cliente.rg ? <span>RG {cliente.rg}</span> : null}
                      {cliente.cidade ? <span>{cliente.cidade}/{cliente.uf}</span> : null}
                    </div>
                    {cliente.tags.length > 0 ? (
                      <div className="result-tags">
                        {cliente.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="tag-badge-small">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="cliente-empty-state">
                  <strong>
                    {trimmedQuery
                      ? `Nenhum cliente ativo encontrado para "${trimmedQuery}".`
                      : 'Nenhum cliente ativo cadastrado.'}
                  </strong>
                  <span>Cadastre um novo cliente ou atualize a lista se ele foi criado em outra aba.</span>
                  <div className="button-row wrap">
                    <Link className="secondary-button text-sm" to="/clientes/novo" target="_blank">
                      <Plus size={14} />
                      Cadastrar novo cliente
                    </Link>
                    <button
                      className="secondary-button text-sm"
                      type="button"
                      onClick={() => void handleRefresh()}
                      disabled={!onRefresh || refreshing}
                    >
                      <RefreshCw size={14} className={refreshing ? 'cliente-refreshing' : undefined} />
                      {refreshing ? 'Atualizando...' : 'Atualizar clientes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
