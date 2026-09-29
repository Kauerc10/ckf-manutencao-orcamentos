import { OrcamentoEditor } from '../components/orcamento/OrcamentoEditor'
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { getTicket } from '../data/leadRepository'
import { useSystemSettingsStore } from '../stores/systemSettingsStore'
import { createInitialItems } from '../lib/orcamento'
import type { SiteTicket } from '../types/leads'

export function NovoOrcamento() {
  const [params] = useSearchParams()
  const ticketId=params.get('leadId')
  const [ticket,setTicket]=useState<SiteTicket|null>(null)
  const [error,setError]=useState('')
  const settings=useSystemSettingsStore(s=>s.settings)
  useEffect(()=>{let active=true;if(ticketId)void getTicket(ticketId).then(t=>{if(active){setTicket(t);if(!t)setError('Solicitação não encontrada.')}}).catch(()=>{if(active)setError('Falha ao carregar solicitação.')});return()=>{active=false}},[ticketId])
  if(!ticketId)return <OrcamentoEditor />
  if(error)return <div className="panel" role="alert">{error} <Link to="/leads">Voltar à fila</Link></div>
  if(!ticket||ticket.id!==ticketId)return <div className="panel">Carregando dados da solicitação...</div>
  if(ticket.converted_orcamento_id)return <Navigate to={`/orcamentos/${ticket.converted_orcamento_id}`} replace/>
  const itens=createInitialItems(5)
  itens[0]={...itens[0],descricao:`${ticket.service_name}: ${ticket.description}`}
  return <><div className="panel commercial-heading"><p>Solicitação {ticket.public_id} · {ticket.contact_name}. O vínculo será criado ao salvar o orçamento.</p><Link className="secondary-button" to={`/leads/${ticket.id}`}>Voltar ao atendimento</Link></div><OrcamentoEditor key={ticket.id} ticketId={ticket.id} initial={{revisao:0,parentId:null,dataOrcamento:new Date().toISOString().slice(0,10),servicoCliente:ticket.company_name||ticket.contact_name,clienteId:null,representanteId:null,status:'rascunho',validadeDias:settings.validadePadraoDias,observacoes:[`Contato: ${ticket.contact_name} · ${ticket.phone}`,ticket.email,`Equipamento: ${[ticket.equipment_type,ticket.equipment_brand,ticket.equipment_model].filter(Boolean).join(' ')}`,`Local: ${ticket.city} ${ticket.uf}`,`Urgência: ${ticket.urgency}`].filter(Boolean).join('\n'),total:0,itens}}/></>
}
