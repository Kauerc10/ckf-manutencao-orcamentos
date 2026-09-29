# Catálogo, tabelas comerciais e solicitações do site

## Implantação

Aplicar as migrações `202609290001_catalogo_tabelas_comerciais.sql` e `202609290002_site_ticket_atendimento.sql` em ordem no projeto Supabase usado pelo CKF Orçamentos. A primeira cria o catálogo, as tabelas comerciais, funções de escrita e o bucket privado `catalogo`. A segunda amplia o atendimento de `site_tickets`, corrige o trigger de `updated_at` e cria a conversão transacional em orçamento. Nenhum dado de catálogo ou tabela de exemplo é inserido em produção.

O formulário público do CKF Site continua usando a captura existente. A aplicação web carrega as solicitações com sessão interna ativa. Administradores gerenciam catálogo e tabelas; demais usuários ativos consultam e exportam. Todos os usuários ativos acompanham as solicitações. Os preços dos orçamentos permanecem manuais.

O catálogo principal tem um PDF próprio, independente das tabelas por empresa. Ele lista somente serviços ativos, por categoria, com código, escopo, unidade e preço padrão; imagens são opcionais. O cadastro e a edição de serviço usam uma tela dedicada. Novos códigos são gerados ao salvar no padrão sequencial `CKF-00001` e ficam fixos após a criação; códigos antigos continuam válidos. A unidade informa a base do preço: por exemplo, R$ 250 por peça significa R$ 750 para três peças. Para valor fechado, selecione `serviço` e descreva exatamente o escopo coberto. O formulário mostra exemplos de preenchimento e de cálculo; a quantidade e o preço dos orçamentos continuam manuais.

Se o ambiente não tiver as migrações, os novos painéis mostram um erro de carregamento; aplicar o esquema antes de disponibilizar o frontend. As migrações ainda não foram aplicadas em produção por esta branch.

## Imagens e histórico

O bucket é privado. Somente administradores ativos podem enviar PNG, JPEG ou WebP de até 5 MB; outros usuários ativos conseguem ler por URL assinada. Um novo upload recebe outro nome; arquivos já citados por versões anteriores permanecem no bucket. O PDF ignora uma imagem que não puder ser carregada e mantém o texto e o preço do serviço.

Cada tabela tem uma versão atual por empresa e revisões antigas no campo `historico`, com autor e data definidos pelo servidor. O valor final de cada serviço fica salvo na revisão. Mudar o preço padrão no catálogo altera a comparação interna atual, mas não reajusta a tabela. Remover um serviço já citado em qualquer versão o arquiva. A exportação de uma versão anterior usa os dados preservados naquela versão.

## Atendimento

`site_tickets` mantém os estados antigos. A interface mostra `qualified` como “Em atendimento” sem alterar solicitações legadas. Etapas, responsável e observações entram em `site_ticket_events`, com autor e horário definidos no banco. A conversão escolhe um cliente acessível ao usuário ou cadastra um novo, preenche o contexto do site no editor e cria orçamento, itens, vínculo e evento na mesma transação. Repetir a conversão retorna o orçamento vinculado. A política existente do cadastro de clientes continua: usuários comuns veem seus próprios clientes e administradores veem todos.

## Validação local

`npm run lint`, `npm test`, `npm run build` e `git diff --check` são os checks do projeto. O teste com PGlite aplica todas as migrações e exercita funções, papéis e políticas reais de PostgreSQL; ele não substitui aplicar as migrações no Supabase alvo. O teste de PDF renderiza e extrai texto de múltiplas páginas. Com `CKF_QA_DIR` definido, também salva amostras PDF/PNG para inspeção visual.
