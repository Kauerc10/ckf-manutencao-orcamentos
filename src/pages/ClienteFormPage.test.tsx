import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ClienteFormPage } from './ClienteFormPage'
import type { Profile } from '../types'

// Mock react-router-dom's navigate and params
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: undefined }),
  }
})

// Mock stores & hooks
type MockAuthState = {
  profile: Profile
}

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (state: MockAuthState) => unknown) => selector({
    profile: {
      id: 'test-user',
      nome: 'Test User',
      email: 'test@ckf.com',
      ativo: true,
      role: 'admin',
      criadoEm: '',
    },
  })
}))

vi.mock('../hooks/useClientes', () => ({
  useClientes: () => ({
    clientes: [],
    loading: false
  })
}))

vi.mock('../data/clienteRepository', () => ({
  getCliente: vi.fn(),
  saveCliente: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

describe('ClienteFormPage - CEP and CNPJ Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('triggers CEP lookup when 8 digits are entered and auto-populates fields', async () => {
    const mockCepResponse = {
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP'
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCepResponse)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <ClienteFormPage />
      </MemoryRouter>
    )

    const cepInput = screen.getByLabelText(/cep/i) as HTMLInputElement
    
    // Simulate typing CEP
    fireEvent.change(cepInput, { target: { value: '01001-000' } })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/')
    })

    await waitFor(() => {
      const logradouroInput = screen.getByLabelText(/logradouro/i) as HTMLInputElement
      const bairroInput = screen.getByLabelText(/bairro/i) as HTMLInputElement
      const cidadeInput = screen.getByLabelText(/cidade/i) as HTMLInputElement
      const ufInput = screen.getByLabelText(/uf/i) as HTMLInputElement

      expect(logradouroInput.value).toBe('Praça da Sé')
      expect(bairroInput.value).toBe('Sé')
      expect(cidadeInput.value).toBe('São Paulo')
      expect(ufInput.value).toBe('SP')
    })
  })

  it('triggers CNPJ search on button click and auto-populates business details', async () => {
    const mockCnpjResponse = {
      razao_social: 'Empresa Teste SA',
      nome_fantasia: 'Teste Fantasia',
      cnpj: '57461028000143',
      ddd_telefone_1: '4733332222',
      email: 'contato@teste.com',
      cep: '89010000',
      logradouro: 'Rua São Paulo',
      numero: '455',
      bairro: 'Itoupava Seca',
      municipio: 'Blumenau',
      uf: 'SC'
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCnpjResponse)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <ClienteFormPage />
      </MemoryRouter>
    )

    // Ensure we are in CNPJ mode (CNPJ button is active)
    const cnpjToggle = screen.getByRole('button', { name: /^cnpj$/i })
    fireEvent.click(cnpjToggle)

    const docInput = screen.getByLabelText(/cnpj/i) as HTMLInputElement
    fireEvent.change(docInput, { target: { value: '57.461.028/0001-43' } })

    const searchBtn = screen.getByRole('button', { name: /consultar cnpj/i })
    fireEvent.click(searchBtn)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://brasilapi.com.br/api/cnpj/v1/57461028000143')
    })

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/razão social/i) as HTMLInputElement
      const phoneInput = screen.getByLabelText(/telefone principal/i) as HTMLInputElement
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const logradouroInput = screen.getByLabelText(/logradouro/i) as HTMLInputElement

      expect(nameInput.value).toBe('Empresa Teste SA')
      expect(phoneInput.value).toBe('(47) 3333-2222')
      expect(emailInput.value).toBe('contato@teste.com')
      expect(logradouroInput.value).toBe('Rua São Paulo')
    })
  })
})
