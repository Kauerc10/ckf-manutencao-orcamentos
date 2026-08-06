# Identificacao de cliente no orcamento

## Objetivo

Substituir o campo livre `Servico/Cliente` por uma identificacao de destinatario clara e adequada ao documento comercial. Ao vincular um cliente cadastrado, o sistema preenche a identificacao automaticamente; quando nao houver cadastro, permite o preenchimento manual.

## Escopo

- Atualizar o formulario de criacao e edicao de orcamentos.
- Atualizar o preview HTML e o PDF exportado.
- Preservar a compatibilidade de leitura dos orcamentos existentes.
- Cobrir as regras novas com testes unitarios e de interface pertinentes.

Nao fazem parte deste trabalho o cadastro de novos campos no cliente, alteracoes nas migracoes do Supabase, nem mudancas no seletor de representante.

## Experiencia no formulario

O campo atual `Servico/Cliente` passa a se chamar `Cliente no orcamento`.

### Cliente cadastrado vinculado

- O campo e somente leitura.
- Seu valor e gerado pelo cadastro no formato:

  ```text
  <nome ou razao social> | <CPF ou CNPJ formatado> | <cidade>/<UF>
  ```

- A parte de localidade e omitida se cidade e UF estiverem vazias. Se somente uma delas estiver preenchida, a parte disponivel e exibida sem um separador vazio.
- Trocar o cliente atualiza o valor. Desvincular transforma o campo na variante manual.
- A selecao de representante continua independente e nao altera a identificacao do cliente.

### Sem cliente cadastrado

- O campo se chama `Cliente nao cadastrado` e fica editavel.
- O texto continua obrigatorio para salvar um orcamento.
- O valor digitado e tratado como a identificacao exibida ao destinatario, sem tentar inferir CPF/CNPJ ou localidade.

## Documento e preview

O bloco `Servico` passa a se chamar `Cliente` e usa duas linhas para manter nomes longos legiveis:

```text
CLIENTE
<nome ou identificacao manual>
<CPF/CNPJ e localidade, quando houver cliente cadastrado>
```

Para um cliente cadastrado, a primeira linha contem somente nome ou razao social e a segunda contem, por exemplo, `CNPJ 82.660.861/0008-37 | Blumenau/SC`. Para um destinatario manual, exibe somente o texto digitado, sem uma segunda linha vazia.

O preview HTML e o PDF devem compartilhar a mesma funcao de formatacao para evitar divergencia. Os itens seguem sendo a descricao de servicos e materiais.

## Dados e compatibilidade

O banco ja guarda o vinculo, nome e documento do cliente, enquanto `servico_cliente` representa o texto mostrado no documento. Nesta mudanca esse campo passa a ter a semantica de identificacao do destinatario, sem mudanca de schema.

Ao selecionar ou trocar um cliente, o sistema gera e persiste uma foto textual da identificacao em `servico_cliente`. Assim, um orcamento salvo preserva os dados usados no momento da emissao, mesmo se o cadastro do cliente for atualizado posteriormente. A nova localidade tambem fica preservada nessa foto.

Orcamentos historicos nao serao migrados. Eles continuam exibindo seu texto original na primeira linha do bloco Cliente, sem inventar localidade ausente. Ao editar e selecionar novamente um cliente, passam a usar o novo formato.

## Arquitetura

- Criar um formatador puro de identificacao de cliente, reutilizavel pelo editor, preview e PDF.
- Adaptar `createClienteLinkPatch` para gerar a foto textual quando houver cliente vinculado e preservar o texto manual ao desvincular.
- Manter os tipos e a persistencia atuais, evitando migracao desnecessaria.
- Ajustar os componentes de documento para receber linhas de apresentacao derivadas, sem logica de formatacao duplicada.

## Regras de validacao e erros

- O texto de identificacao continua exigindo pelo menos dois caracteres.
- O campo gerado nao pode ser editado enquanto existir `clienteId`.
- CPF/CNPJ e localidade sao complementos de exibicao; a ausencia de localidade nao impede salvar.
- Falhas de carregamento ou troca de cliente mantem o ultimo estado valido do formulario.

## Testes

- Formatador: CPF e CNPJ, localidade completa, parcial e ausente.
- Vinculo: preenche a foto textual, troca o cliente e preserva texto manual ao desvincular.
- Editor: entrada manual quando nao ha cliente e somente leitura quando ha vinculo.
- Documentos: preview e PDF usam o titulo Cliente e mostram ou omitem corretamente a segunda linha.
- Regressao: orcamentos existentes continuam carregando e validando.

## Criterios de aceite

1. Selecionar um cliente cadastrado preenche automaticamente nome/razao social, CPF/CNPJ e cidade/UF no formulario.
2. O preview e o PDF apresentam esse cliente em um bloco legivel e nao como servico.
3. Um orcamento pode ser criado e salvo sem cliente cadastrado por meio do campo manual.
4. O historico existente continua visualizavel sem migracao de banco.
5. A suite de testes, lint e build continuam passando.
