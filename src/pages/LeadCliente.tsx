import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTicket } from '../data/leadRepository'
import { ClienteFormPage } from './ClienteFormPage'
import type { SiteTicket } from '../types/leads'
export function LeadCliente() {
  const { ticketId } = useParams()
  const [ticket, setTicket] = useState<SiteTicket | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (ticketId)
      void getTicket(ticketId)
        .then((t) => {
          if (active) {
            setTicket(t)
            if (!t) setError('Solicitação não encontrada.')
          }
        })
        .catch(() => {
          if (active) setError('Falha ao carregar solicitação.')
        })
    return () => {
      active = false
    }
  }, [ticketId])
  if (error)
    return (
      <div className="panel" role="alert">
        {error} <Link to="/leads">Voltar</Link>
      </div>
    )
  if (!ticket) return <div className="panel">Carregando dados do contato...</div>
  return (
    <ClienteFormPage
      key={ticket.id}
      returnTo={`/leads/${ticket.id}`}
      initial={{
        tipo: ticket.company_name ? 'cnpj' : 'cpf',
        nome: ticket.company_name || ticket.contact_name,
        telefonePrincipal: ticket.phone,
        email: ticket.email,
        cidade: ticket.city,
        uf: ticket.uf,
        observacoes: `Solicitação ${ticket.public_id}. Contato: ${ticket.contact_name}.`,
        representantes: ticket.company_name
          ? [
              {
                nome: ticket.contact_name,
                cargo: '',
                telefone: ticket.phone,
                email: ticket.email,
                observacao: 'Contato da solicitação do site',
                principal: true,
                ativo: true,
              },
            ]
          : [],
      }}
    />
  )
}
