import type { Cliente } from '../types'
import { getActiveRepresentantes, getPrincipalRepresentante } from './cliente-search'

export type ClienteLinkPatch = {
  clienteId: string | null
  clienteNome: string | null
  clienteDocumento: string | null
  representanteId: string | null
  representanteNome: string | null
  servicoCliente: string
}

export type RepresentanteLinkPatch = {
  representanteId: string | null
  representanteNome: string | null
}

export function createClienteLinkPatch(
  cliente: Cliente | null,
  currentServicoCliente: string,
): ClienteLinkPatch {
  if (!cliente) {
    return {
      clienteId: null,
      clienteNome: null,
      clienteDocumento: null,
      representanteId: null,
      representanteNome: null,
      servicoCliente: currentServicoCliente,
    }
  }

  const principal = cliente.tipo === 'cnpj' ? getPrincipalRepresentante(cliente) : null

  return {
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    clienteDocumento: cliente.documento,
    representanteId: principal?.id ?? null,
    representanteNome: principal?.nome ?? null,
    servicoCliente: currentServicoCliente.trim() ? currentServicoCliente : cliente.nome,
  }
}

export function createRepresentantePatch(
  cliente: Cliente | null,
  representanteId: string | null,
): RepresentanteLinkPatch {
  if (!cliente || !representanteId) {
    return {
      representanteId: null,
      representanteNome: null,
    }
  }

  const representante = getActiveRepresentantes(cliente).find((item) => item.id === representanteId)

  return {
    representanteId: representante?.id ?? null,
    representanteNome: representante?.nome ?? null,
  }
}
