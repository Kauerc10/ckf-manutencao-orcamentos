# Identificacao de cliente no orcamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir automaticamente a identificacao comercial completa do cliente no formulario, preview e PDF, preservando a criacao de orcamentos sem cliente cadastrado.

**Architecture:** Um formatador puro deriva as linhas de apresentacao do cliente a partir do cadastro e e reutilizado pelo vinculo, preview e PDF. `servicoCliente` continua sendo a foto textual persistida da identificacao, evitando migracao e preservando o conteudo dos documentos ja emitidos.

**Tech Stack:** React 19, TypeScript, Vitest, React-PDF, Supabase.

## Global Constraints

- Nao alterar o schema ou criar migracoes Supabase.
- Manter a possibilidade de salvar orcamento sem cliente cadastrado.
- Ao vincular um cliente, usar nome/razao social, CPF/CNPJ formatado e cidade/UF disponivel.
- Preview HTML e PDF devem usar o mesmo formatador de linhas do cliente.
- Orcamentos existentes devem continuar exibiveis, sem migracao retroativa.
- Executar `npm test`, `npm run lint` e `npm run build` antes da entrega.

---

### Task 1: Criar o formatador de identificacao de cliente

**Files:**
- Modify: `src/lib/orcamento-cliente-link.ts`
- Test: `src/lib/orcamento-cliente-link.test.ts`

**Interfaces:**
- Consumes: `Cliente` de `src/types/index.ts` e `formatClienteDocumento` de `src/lib/clientes.ts`.
- Produces: `formatClienteIdentificacao(cliente: Cliente): string`.

- [ ] **Step 1: Escrever os testes que falham**

  Em `src/lib/orcamento-cliente-link.test.ts`, importar `formatClienteIdentificacao` e adicionar casos para CNPJ com cidade/UF, CPF sem localidade e localidade parcial:

  ```ts
  expect(formatClienteIdentificacao(baseCliente)).toBe(
    'Cliente Operacional | CNPJ 12.345.678/0001-90 | Sao Paulo/SP',
  )
  expect(formatClienteIdentificacao({ ...baseCliente, tipo: 'cpf', documento: '12345678901', cidade: '', uf: '' })).toBe(
    'Cliente Operacional | CPF 123.456.789-01',
  )
  expect(formatClienteIdentificacao({ ...baseCliente, cidade: '', uf: 'SP' })).toBe(
    'Cliente Operacional | CNPJ 12.345.678/0001-90 | SP',
  )
  ```

- [ ] **Step 2: Executar o teste para confirmar a falha**

  Run: `npm test -- src/lib/orcamento-cliente-link.test.ts`

  Expected: falha de importacao porque `formatClienteIdentificacao` ainda nao existe.

- [ ] **Step 3: Implementar o formatador minimo**

  Em `src/lib/orcamento-cliente-link.ts`, adicionar:

  ```ts
  import { formatClienteDocumento } from './clientes'

  export function formatClienteIdentificacao(cliente: Cliente): string {
    const documento = `${cliente.tipo.toUpperCase()} ${formatClienteDocumento(cliente.documento)}`
    const localidade = [cliente.cidade.trim(), cliente.uf.trim()].filter(Boolean).join('/')
    return [cliente.nome.trim(), documento, localidade].filter(Boolean).join(' | ')
  }
  ```

- [ ] **Step 4: Executar os testes do helper**

  Run: `npm test -- src/lib/orcamento-cliente-link.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commitar a unidade testada**

  ```bash
  git add src/lib/orcamento-cliente-link.ts src/lib/orcamento-cliente-link.test.ts
  git commit -m "feat: formatar identificacao de cliente"
  ```

### Task 2: Atualizar o vinculo e o formulario de orcamento

**Files:**
- Modify: `src/lib/orcamento-cliente-link.ts`
- Modify: `src/lib/orcamento-cliente-link.test.ts`
- Modify: `src/components/orcamento/OrcamentoEditor.tsx`
- Modify: `src/lib/validations.ts`
- Test: `src/lib/orcamento-cliente-link.test.ts`

**Interfaces:**
- Consumes: `formatClienteIdentificacao(cliente)` da Task 1.
- Produces: `createClienteLinkPatch(cliente, currentServicoCliente)` que sempre substitui `servicoCliente` por uma foto atual ao vincular e preserva `currentServicoCliente` ao desvincular.

- [ ] **Step 1: Ajustar os testes de vinculo para a nova regra**

  Em `src/lib/orcamento-cliente-link.test.ts`, substituir expectativas de `servicoCliente: 'Cliente Operacional'` por `servicoCliente: 'Cliente Operacional | CNPJ 12.345.678/0001-90 | Sao Paulo/SP'`. Alterar o teste de troca para garantir que um texto manual anterior nao bloqueia a foto do novo cliente:

  ```ts
  expect(createClienteLinkPatch(baseCliente, 'Cliente manual anterior').servicoCliente).toBe(
    'Cliente Operacional | CNPJ 12.345.678/0001-90 | Sao Paulo/SP',
  )
  ```

- [ ] **Step 2: Executar o teste para confirmar a falha**

  Run: `npm test -- src/lib/orcamento-cliente-link.test.ts`

  Expected: falha porque `createClienteLinkPatch` ainda preserva texto existente na troca.

- [ ] **Step 3: Aplicar a regra no helper e no editor**

  Em `createClienteLinkPatch`, definir `servicoCliente: formatClienteIdentificacao(cliente)` quando `cliente` existir. No editor, trocar o label e a entrada atual por:

  ```tsx
  <label className="span-2">
    {selectedCliente ? 'Cliente no orcamento' : 'Cliente nao cadastrado'}
    <input
      value={draft.servicoCliente}
      readOnly={Boolean(selectedCliente)}
      onChange={(event) => setDraft({ ...draft, servicoCliente: event.target.value })}
      placeholder="Informe o nome do cliente"
    />
  </label>
  ```

  Atualizar a mensagem de validacao para `Informe o cliente.`; manter a regra de dois caracteres.

- [ ] **Step 4: Executar os testes afetados**

  Run: `npm test -- src/lib/orcamento-cliente-link.test.ts src/lib/validations.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commitar a unidade testada**

  ```bash
  git add src/lib/orcamento-cliente-link.ts src/lib/orcamento-cliente-link.test.ts src/components/orcamento/OrcamentoEditor.tsx src/lib/validations.ts src/lib/validations.test.ts
  git commit -m "feat: preencher cliente do orcamento automaticamente"
  ```

### Task 3: Exibir o bloco Cliente no preview e no PDF

**Files:**
- Modify: `src/lib/orcamento-cliente-link.ts`
- Modify: `src/lib/orcamento-cliente-link.test.ts`
- Modify: `src/components/orcamento/DocumentPreview.tsx`
- Modify: `src/components/pdf/OrcamentoPDF.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: a foto em `servicoCliente` criada na Task 2.
- Produces: `getClienteDocumentLines(orcamento: Pick<Orcamento, 'clienteId' | 'servicoCliente'>): { nome: string; detalhes: string | null }` e um bloco visual `Cliente` com nome e complemento opcional, identico em conteudo no preview e no PDF.

- [ ] **Step 1: Escrever os testes de linha de documento que falham**

  Em `src/lib/orcamento-cliente-link.test.ts`, adicionar:

  ```ts
  expect(getClienteDocumentLines({
    clienteId: 'cliente-1',
    servicoCliente: 'Cliente Operacional | CNPJ 12.345.678/0001-90 | Sao Paulo/SP',
  })).toEqual({
    nome: 'Cliente Operacional',
    detalhes: 'CNPJ 12.345.678/0001-90 | Sao Paulo/SP',
  })
  ```

  Adicionar tambem um caso de orcamento manual que retorna `{ nome: 'Cliente avulso', detalhes: null }`.

- [ ] **Step 2: Executar o teste para confirmar a falha**

  Run: `npm test -- src/lib/orcamento-cliente-link.test.ts`

  Expected: falha de importacao porque `getClienteDocumentLines` ainda nao existe.

- [ ] **Step 3: Consumir o helper em ambos os documentos**

  Em `src/lib/orcamento-cliente-link.ts`, implementar o helper usando a foto textual persistida. Nao consultar `clienteNome`, pois ele vem de um join e pode mudar depois da emissao:

  ```ts
  export function getClienteDocumentLines(
    orcamento: Pick<Orcamento, 'clienteId' | 'servicoCliente'>,
  ): { nome: string; detalhes: string | null } {
    const identificacao = orcamento.servicoCliente.trim()
    if (!orcamento.clienteId) return { nome: identificacao, detalhes: null }

    const match = identificacao.match(/^(.+?) \\| ((?:CPF|CNPJ) .+)$/)
    return match
      ? { nome: match[1], detalhes: match[2] }
      : { nome: identificacao, detalhes: null }
  }
  ```

  No preview, substituir a linha `Servico:` por:

  ```tsx
  const cliente = getClienteDocumentLines(orcamento)

  <div className="document-service">
    <span>Cliente:</span>
    <div className="document-client-content">
      <strong>{cliente.nome || 'Cliente nao informado'}</strong>
      {cliente.detalhes ? <small>{cliente.detalhes}</small> : null}
    </div>
  </div>
  ```

  Em `src/index.css`, usar `.document-client-content` como a celula direita do grid, mantendo o rotulo em uma coluna e as duas linhas dentro da outra. Ela deve receber as mesmas bordas e padding que a antiga regra de `.document-service strong`; no modo compacto, aplicar `min-height: 20px`, `padding: 4px 6px` e `font-size: 9px`. Definir `display: grid`, `align-content: center` e `gap: 2px` para que o complemento nao crie uma terceira coluna no documento.

  No PDF, importar o mesmo helper e renderizar `Cliente:` na primeira celula, com um `View` de duas linhas na segunda. Adicionar o estilo local e o conteudo abaixo:

  ```tsx
  clientDetails: {
    fontSize: 8,
    color: '#3F4854',
    marginTop: 2,
  },

  <View style={[styles.cell, { width: '82%' }]}>
    <Text>{cliente.nome || 'Cliente nao informado'}</Text>
    {cliente.detalhes ? <Text style={styles.clientDetails}>{cliente.detalhes}</Text> : null}
  </View>
  ```

- [ ] **Step 4: Executar os testes do helper e gerar a aplicacao**

  Run: `npm test -- src/lib/orcamento-cliente-link.test.ts && npm run build`

  Expected: PASS e build do Vite concluido.

- [ ] **Step 5: Commitar a unidade testada**

  ```bash
  git add src/components/orcamento/DocumentPreview.tsx src/components/pdf/OrcamentoPDF.tsx src/index.css src/lib/orcamento-cliente-link.ts src/lib/orcamento-cliente-link.test.ts
  git commit -m "feat: exibir cliente completo nos documentos"
  ```

### Task 4: Verificar regressao e acabamento

**Files:**
- Modify: `src/lib/validations.test.ts` (somente se a mensagem alterada exigir expectativa nova)
- Modify: `src/components/orcamento/OrcamentoEditor.tsx` (somente se lint ou build apontarem ajuste de acessibilidade)

**Interfaces:**
- Consumes: os helpers e componentes das Tasks 1-3.
- Produces: alteracao validada por testes, lint e build.

- [ ] **Step 1: Executar a suite completa**

  Run: `npm test`

  Expected: todos os testes existentes e novos passam.

- [ ] **Step 2: Executar qualidade estatica e build de producao**

  Run: `npm run lint && npm run build`

  Expected: ambos os comandos terminam com codigo zero.

- [ ] **Step 3: Inspecionar o diff final**

  Run: `git diff --check HEAD~3..HEAD && git status --short`

  Expected: sem erros de whitespace e sem arquivos nao relacionados adicionados ao commit.

- [ ] **Step 4: Commitar qualquer ajuste final necessario**

  ```bash
  git add src/lib/validations.test.ts src/components/orcamento/OrcamentoEditor.tsx
  git commit -m "test: cobrir identificacao de cliente no orcamento"
  ```
