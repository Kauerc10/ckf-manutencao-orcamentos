# CKF Manutenção - Sistema de Orçamentos

<p align="center">
  <img src="https://img.shields.io/badge/Status-V1%20Funcional-22C55E?style=for-the-badge" alt="Status do Projeto" />
  <img src="https://img.shields.io/badge/Licença-Uso%20de%20Portfólio-111827?style=for-the-badge" alt="Licença" />
  <img src="https://img.shields.io/badge/Projeto-Sistema%20Interno-F59E0B?style=for-the-badge" alt="Sistema Interno" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-0F172A?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-1E1E2E?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-111827?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-0F172A?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS" />
</p>

<p align="center">
  Sistema web para criação, organização, consulta e exportação de orçamentos da <strong>CKF Manutenção</strong>.
</p>

<p align="center">
  <strong>React</strong> · <strong>TypeScript</strong> · <strong>Vite</strong> · <strong>Supabase</strong> · <strong>Tailwind CSS</strong> · <strong>CSV/XLSX Export</strong>
</p>

---

## Sobre o Projeto

O **CKF Manutenção - Sistema de Orçamentos** é uma aplicação web administrativa desenvolvida para auxiliar na criação, gestão, consulta e exportação de orçamentos de serviços de manutenção mecânica.

O projeto nasceu com o objetivo de transformar um processo operacional que poderia ser manual e descentralizado em uma solução mais organizada, padronizada e profissional.

A aplicação possui uma interface interna com navegação lateral, tela de histórico, filtros, ações de exportação e estrutura preparada para evolução futura, incluindo geração de documentos comerciais em PDF e melhorias no fluxo de gestão de clientes e serviços.

---

## Contexto da Marca

A **CKF Manutenção** atua com manutenção mecânica em Blumenau/SC e região.

Dados institucionais utilizados no contexto do sistema:

```txt
CKF MANUTENÇÃO
Email: CK.manutencaoblu@gmail.com
CNPJ: 57.461.028/0001-43
Telefone: (47) 99261-4114
BLUMENAU E REGIÃO
```

A identidade visual do sistema foi construída para transmitir:

- Confiança.
- Robustez.
- Organização.
- Precisão técnica.
- Clareza operacional.
- Profissionalismo.
- Segurança visual.
- Atendimento local confiável.

---

## Objetivo

O objetivo principal do projeto é oferecer uma ferramenta interna para que a CKF Manutenção consiga controlar seus orçamentos de forma mais eficiente, clara e profissional.

A proposta envolve:

- Reduzir dependência de processos manuais.
- Padronizar a criação e consulta de orçamentos.
- Facilitar a busca por registros anteriores.
- Permitir exportação de dados.
- Melhorar a apresentação comercial da empresa.
- Criar uma base técnica preparada para futuras automações.

---

## Funcionalidades

- Criação de novos orçamentos.
- Listagem e histórico de orçamentos.
- Busca por número, cliente ou serviço.
- Filtros por status.
- Filtros por data inicial e data final.
- Filtro por usuário criador.
- Exportação da listagem em CSV.
- Exportação da listagem em XLSX.
- Interface administrativa com navegação lateral.
- Layout alinhado à identidade visual da CKF Manutenção.
- Integração com Supabase.
- Estrutura preparada para geração futura de PDF.
- Organização pensada para manutenção e evolução do sistema.

---

## Principais Telas

### Dashboard

Área inicial do sistema, preparada para centralizar indicadores, atalhos e informações gerais sobre os orçamentos.

### Novo Orçamento

Fluxo destinado à criação de novos registros de orçamento, com estrutura preparada para evolução do cadastro de cliente, itens, serviços e valores.

### Histórico

Tela de consulta dos orçamentos cadastrados, com filtros, paginação e ações de exportação.

### Exportação

Estrutura voltada à exportação de dados em formatos úteis para controle administrativo, como CSV e XLSX.

---

## Tecnologias Utilizadas

| Tecnologia | Uso no Projeto |
|---|---|
| React | Construção da interface |
| TypeScript | Tipagem e maior segurança no desenvolvimento |
| Vite | Ambiente de desenvolvimento e build |
| Supabase | Backend, banco de dados e autenticação |
| Tailwind CSS | Estilização da interface |
| HTML5 | Estrutura da aplicação |
| CSS3 | Complemento visual e responsividade |
| CSV/XLSX | Exportação de dados |

---

## Identidade Visual

A interface foi construída com uma estética escura, técnica e industrial, buscando se aproximar do universo visual de manutenção mecânica, operação e serviços técnicos.

Principais decisões visuais:

- Base escura.
- Alto contraste.
- Cards organizados.
- Botões de ação destacados.
- Navegação lateral fixa.
- Tipografia limpa.
- Layout administrativo direto.
- Cores sólidas e profissionais.
- Visual coerente com uma empresa técnica local.

---

## Arquitetura e Organização

Estrutura geral do projeto:

```txt
CKF/
├── public/
├── src/
├── supabase/
├── .env.example
├── .gitignore
├── DESIGN.md
├── PRODUCT.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── eslint.config.js
└── index.html
```

---

## Como Rodar Localmente

Clone o repositório:

```bash
git clone https://github.com/Kauerc10/ckf-manutencao-orcamentos.git
```

Acesse a pasta do projeto:

```bash
cd ckf-manutencao-orcamentos
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env.local
```

Configure as variáveis necessárias no arquivo `.env.local`.

Execute o projeto em ambiente de desenvolvimento:

```bash
npm run dev
```

---

## Variáveis de Ambiente

Crie um arquivo `.env.local` com base no arquivo `.env.example`.

Exemplo:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

> Nunca publique arquivos `.env`, `.env.local`, `.env.production` ou qualquer arquivo contendo credenciais reais.

---

## Scripts Disponíveis

Executa o projeto em ambiente de desenvolvimento:

```bash
npm run dev
```

Gera a build de produção:

```bash
npm run build
```

Executa uma prévia local da build de produção:

```bash
npm run preview
```

---

## Segurança e Boas Práticas

Este projeto utiliza arquivos de ambiente para proteger informações sensíveis.

Arquivos que não devem ser versionados:

```txt
.env
.env.local
.env.production
.env.development
node_modules/
dist/
*.log
```

O arquivo `.env.example` pode ser versionado, desde que contenha apenas chaves vazias ou exemplos sem dados reais.

---

## Preview

> Adicione aqui imagens do sistema para valorizar o repositório visualmente.

Sugestão de estrutura:

```txt
docs/screenshots/dashboard.png
docs/screenshots/historico.png
docs/screenshots/novo-orcamento.png
```

Exemplo de uso no README:

```md
![Tela de histórico de orçamentos](docs/screenshots/historico.png)
```

---

## Status do Projeto

<p>
  <img src="https://img.shields.io/badge/Versão-V1%20Funcional-22C55E?style=flat-square" alt="Versão" />
  <img src="https://img.shields.io/badge/Estado-Em%20evolução-F59E0B?style=flat-square" alt="Estado" />
</p>

A versão inicial funcional foi concluída com foco em estrutura, interface administrativa, histórico, filtros e exportação de dados.

---

## Melhorias Futuras

- Geração completa de orçamento em PDF.
- Modelo visual personalizado para PDF.
- Cadastro completo de clientes.
- Cadastro de serviços recorrentes.
- Cadastro de equipamentos.
- Dashboard com indicadores comerciais.
- Controle mais detalhado de status dos orçamentos.
- Autenticação e permissões por usuário.
- Histórico de alterações.
- Templates comerciais personalizados.
- Melhorias de responsividade.
- Melhorias no design final da identidade CKF.
- Exportação aprimorada para documentos comerciais.
- Organização de permissões por perfil de usuário.

---

## Aprendizados Aplicados

Durante o desenvolvimento deste projeto, foram aplicados conceitos de:

- Estruturação de aplicações React.
- Uso de TypeScript em sistemas administrativos.
- Integração com Supabase.
- Organização de componentes.
- Criação de filtros e listagens.
- Exportação de dados.
- Design de interface para sistema interno.
- Padronização visual para uma marca real.
- Organização de projeto para portfólio técnico.
- Pensamento de produto aplicado a uma necessidade real.

---

## Diferenciais do Projeto

Este projeto se destaca por não ser apenas uma aplicação genérica de estudo.

Ele foi desenvolvido com base em um contexto real de negócio, envolvendo:

- Marca real.
- Dados institucionais reais.
- Necessidade operacional real.
- Interface administrativa personalizada.
- Fluxo pensado para uso interno.
- Potencial de evolução para documentos comerciais.
- Aplicação prática de tecnologia em um processo empresarial.

---

## Autor

Desenvolvido por **Kauê Ruon Cardoso**.

<p>
  <a href="https://github.com/Kauerc10">
    <img src="https://img.shields.io/badge/GitHub-Kauerc10-111827?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Kauerc10" />
  </a>
  <a href="mailto:kaue.ruon@gmail.com">
    <img src="https://img.shields.io/badge/Email-kaue.ruon%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email Kauê Ruon" />
  </a>
</p>

---

## Licença

Este projeto é disponibilizado publicamente apenas para fins de portfólio, demonstração técnica e avaliação profissional.

Consulte o arquivo [LICENSE.md](LICENSE.md) para mais informações.

<p>
  <img src="https://img.shields.io/badge/Licença-Uso%20de%20Portfólio-111827?style=for-the-badge" alt="Licença de Uso para Portfólio" />
</p>
