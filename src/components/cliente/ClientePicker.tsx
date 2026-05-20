import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, X, MapPin, Phone, Mail, Edit } from 'lucide-react'
import type { Cliente } from '../../types'
import { searchClientes } from '../../lib/cliente-search'
import { formatClienteDocumento, formatPhone, getClienteEndereco } from '../../lib/clientes'

interface ClientePickerProps {
  clientes: Cliente[]
  selectedClienteId: string | null
  onSelectCliente: (clienteId: string | null) => void
  reloadClientes: () => Promise<void>
}

export function ClientePicker({
  clientes,
  selectedClienteId,
  onSelectCliente,
  reloadClientes,
}: ClientePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reload client data on window focus to get changes from new tabs
  useEffect(() => {
    const handleWindowFocus = () => {
      void reloadClientes()
    }
    window.addEventListener('focus', handleWindowFocus)
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [reloadClientes])

  // Get active client list and filter by search
  const activeClientes = React.useMemo(() => clientes.filter((c) => c.ativo), [clientes])
  const searchResults = React.useMemo(() => {
    return searchClientes(activeClientes, searchQuery, 8)
  }, [activeClientes, searchQuery])

  // Reset focused index when query or open state changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [searchQuery, isOpen])

  const selectedCliente = React.useMemo(() => {
    if (!selectedClienteId) return null
    return clientes.find((c) => c.id === selectedClienteId) || null
  }, [clientes, selectedClienteId])

  // Handle select customer
  const handleSelect = (cliente: Cliente) => {
    onSelectCliente(cliente.id)
    setSearchQuery('')
    setIsOpen(false)
  }

  // Handle clear/unlink customer
  const handleUnlink = () => {
    onSelectCliente(null)
    // Delay focus slightly to ensure the input exists in DOM
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Close dropdown on click outside
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

  // Keyboard navigation accessibility
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
    } else if (event.key === 'ArrowDown') {
      if (!isOpen) {
        setIsOpen(true)
      } else if (searchResults.length > 0) {
        event.preventDefault()
        setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev))
      }
    } else if (event.key === 'ArrowUp') {
      if (isOpen && searchResults.length > 0) {
        event.preventDefault()
        setFocusedIndex((prev) => (prev > -1 ? prev - 1 : -1))
      }
    } else if (event.key === 'Enter') {
      if (isOpen) {
        event.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
          handleSelect(searchResults[focusedIndex])
        } else if (searchResults.length > 0) {
          handleSelect(searchResults[0])
        }
      }
    }
  }

  return (
    <div className="cliente-picker" ref={containerRef}>
      {selectedCliente ? (
        // Selected Customer Card Panel (Premium Light Theme Aesthetic)
        <div className="cliente-selected-card">
          <div className="card-header">
            <div className="title-area">
              <span className={`badge ${selectedCliente.tipo === 'cnpj' ? 'cnpj' : 'cpf'}`}>
                {selectedCliente.tipo.toUpperCase()}
              </span>
              <h3>{selectedCliente.nome}</h3>
              {selectedCliente.nomeFantasia && (
                <span className="nome-fantasia">({selectedCliente.nomeFantasia})</span>
              )}
            </div>
            <button
              type="button"
              className="unlink-button"
              onClick={handleUnlink}
              title="Desvincular cliente"
              aria-label="Desvincular cliente"
            >
              <X size={16} />
              <span>Desvincular</span>
            </button>
          </div>

          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">{selectedCliente.tipo === 'cnpj' ? 'CNPJ' : 'CPF'}:</span>
                <span className="info-val">{formatClienteDocumento(selectedCliente.documento)}</span>
              </div>
              {selectedCliente.telefonePrincipal && (
                <div className="info-item">
                  <Phone size={14} className="text-muted" />
                  <span className="info-val">{formatPhone(selectedCliente.telefonePrincipal)}</span>
                </div>
              )}
              {selectedCliente.email && (
                <div className="info-item span-all">
                  <Mail size={14} className="text-muted" />
                  <span className="info-val">{selectedCliente.email}</span>
                </div>
              )}
              <div className="info-item span-all">
                <MapPin size={14} className="text-muted" />
                <span className="info-val">{getClienteEndereco(selectedCliente)}</span>
              </div>
            </div>

            {selectedCliente.tags && selectedCliente.tags.length > 0 && (
              <div className="card-tags">
                {selectedCliente.tags.map((tag) => (
                  <span key={tag} className="tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card-footer">
            <Link
              className="secondary-button flex-center gap-1"
              to={`/clientes/${selectedCliente.id}/editar`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Edit size={14} />
              Editar ficha do cliente
            </Link>
          </div>
        </div>
      ) : (
        // Search Input & Autocomplete Popover/Stacked panel
        <div className="cliente-search-container">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="cliente-picker-input"
              placeholder="Buscar por nome, fantasia, CPF/CNPJ, representante ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls="cliente-picker-results"
              aria-autocomplete="list"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-input-button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Autocomplete Results Panel (popover below input on desktop, full-width stacked on mobile) */}
          {isOpen && (
            <div
              id="cliente-picker-results"
              className="cliente-picker-results"
              role="listbox"
              aria-label="Resultados da busca de clientes"
            >
              {searchResults.length > 0 ? (
                searchResults.map((cliente, index) => (
                  <div
                    key={cliente.id}
                    className={`cliente-result-card${index === focusedIndex ? ' focused' : ''}`}
                    role="option"
                    aria-selected={index === focusedIndex}
                    // Prevent blur from closing the results panel before mouse click is registered
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelect(cliente)
                    }}
                  >
                    <div className="result-card-header">
                      <strong className="result-name">{cliente.nome}</strong>
                      <span className={`badge ${cliente.tipo === 'cnpj' ? 'cnpj' : 'cpf'}`}>
                        {cliente.tipo.toUpperCase()}
                      </span>
                    </div>
                    {cliente.nomeFantasia && (
                      <div className="result-fantasia">{cliente.nomeFantasia}</div>
                    )}
                    <div className="result-details">
                      <span>Doc: {formatClienteDocumento(cliente.documento)}</span>
                      {cliente.cidade && (
                        <span className="result-location">
                          · {cliente.cidade}/{cliente.uf}
                        </span>
                      )}
                    </div>
                    {cliente.tags && cliente.tags.length > 0 && (
                      <div className="result-tags">
                        {cliente.tags.map((tag) => (
                          <span key={tag} className="tag-badge-small">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-results">Nenhum cliente ativo encontrado</div>
              )}
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="quick-client-link-panel">
            <div className="button-row">
              <Link className="secondary-button text-sm" to="/clientes/novo" target="_blank">
                <Plus size={14} />
                Cadastrar em nova aba
              </Link>
              <button
                className="secondary-button text-sm"
                type="button"
                onClick={() => void reloadClientes()}
              >
                <RefreshCw size={14} />
                Atualizar clientes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
