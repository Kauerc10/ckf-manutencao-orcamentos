import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TabelaFormPage } from './TabelaFormPage'
import type { Profile } from '../types'
import type { Servico, Tabela } from '../types/comercial'

const mockNavigate = vi.fn()
let mockParams: { id?: string } = {}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  }
})

type MockAuthState = {
  profile: Profile
}

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (state: MockAuthState) => unknown) =>
    selector({
      profile: {
        id: 'admin-1',
        nome: 'Admin User',
        email: 'admin@ckf.com',
        ativo: true,
        role: 'admin',
        criadoEm: '',
      },
    }),
}))

const mockClientes = [
  {
    id: 'empresa-1',
    nome: 'Empresa Alfa Ltda',
    documento: '12.345.678/0001-90',
    tipo: 'cnpj',
    ativo: true,
  },
]

vi.mock('../hooks/useClientes', () => ({
  useClientes: () => ({
    clientes: mockClientes,
    loading: false,
    error: '',
  }),
}))

const mockServicos: Servico[] = [
  {
    id: 'srv-1',
    codigo: 'CKF-00001',
    nome: 'Soldagem TIG',
    categoria: 'Soldagem',
    escopo: 'Solda em tubulação inox.',
    unidade: 'hora',
    precoPadrao: 200,
    imagem: '',
    ativo: true,
    criadoEm: '2026-09-01T10:00:00Z',
    criadorId: 'admin-1',
    criadorNome: 'Admin',
    atualizadoEm: '2026-09-01T10:00:00Z',
    autorId: 'admin-1',
    autorNome: 'Admin',
  },
]

const mockTabelas: Tabela[] = []

const mockSaveTabela = vi.fn().mockImplementation((draft) =>
  Promise.resolve({
    id: 'tab-123',
    versao: 1,
    ...draft,
  })
)

vi.mock('../data/catalogoRepository', () => ({
  listServicos: () => Promise.resolve(mockServicos),
  listTabelas: () => Promise.resolve(mockTabelas),
  saveTabela: (draft: unknown, profile: unknown) => mockSaveTabela(draft, profile),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('TabelaFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = {}
  })

  it('renderiza o formulário de nova tabela e permite selecionar empresa e serviço', async () => {
    render(
      <MemoryRouter>
        <TabelaFormPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nova tabela' })).toBeInTheDocument()
    })

    expect(screen.getByRole('option', { name: /Empresa Alfa Ltda/ })).toBeInTheDocument()
    expect(screen.getByText('Soldagem TIG')).toBeInTheDocument()
    expect(screen.getByText('CKF-00001 · Soldagem')).toBeInTheDocument()

    // Seleciona a empresa
    const empresaSelect = screen.getByLabelText(/empresa/i)
    fireEvent.change(empresaSelect, { target: { value: 'empresa-1' } })

    // Marca o checkbox de inclusão do serviço
    const checkServico = screen.getByRole('checkbox', { name: /incluir soldagem tig/i })
    fireEvent.click(checkServico)

    // Ajusta o preço com percentual (+10%)
    const selectAjuste = screen.getByLabelText(/forma de ajuste de soldagem tig/i)
    fireEvent.change(selectAjuste, { target: { value: 'percentual' } })

    const inputAjuste = screen.getByLabelText(/percentual para soldagem tig/i)
    fireEvent.change(inputAjuste, { target: { value: '10' } })

    const btnAplicar = screen.getByRole('button', { name: 'Aplicar' })
    fireEvent.click(btnAplicar)

    // Submete o formulário
    const btnSalvar = screen.getByRole('button', { name: /salvar tabela/i })
    fireEvent.click(btnSalvar)

    await waitFor(() => {
      expect(mockSaveTabela).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaId: 'empresa-1',
          itens: [{ servicoId: 'srv-1', preco: 220 }],
        }),
        expect.anything()
      )
      expect(mockNavigate).toHaveBeenCalledWith('/tabelas?tabela=tab-123')
    })
  })
})
