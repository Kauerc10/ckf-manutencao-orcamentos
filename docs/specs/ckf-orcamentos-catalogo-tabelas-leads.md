# CKF Orçamentos — Catálogo, tabelas por empresa e atendimento de leads

Status: escopo funcional e pontos de teste aprovados; implementação em `codex/catalogo-tabelas-leads` aguardando revisão e merge.
Projeto de implementação: Kauerc10/ckf-manutencao-orcamentos.
Issue: https://github.com/Kauerc10/ckf-manutencao-orcamentos/issues/40.
Projetos relacionados: Kauerc10/ckf-site-institucional e Kauerc10/ckf-design.

## Problem Statement

Uma empresa cliente solicitou uma tabela fixa de preços para continuar contratando a CKF. A equipe precisa administrar serviços e preços padrão, preparar tabelas comerciais específicas por empresa e entregar um PDF profissional. Hoje o CKF Orçamentos não possui esse catálogo nem essas tabelas.

O CKF Site já envia solicitações a uma função de captura. O repositório do CKF Orçamentos contém o backend e as tabelas dessa captura, mas não oferece painel interno para acompanhar solicitações ou convertê-las em orçamento. Isso impede o aproveitamento estruturado dos contatos recebidos.

## Solution

Entregar primeiro um catálogo interno central e tabelas por empresa com preços próprios, histórico simples e exportação em PDF. O administrador seleciona serviços e define os preços por porcentagem sobre o preço padrão ou por valor direto. A equipe vê a diferença entre os preços; o cliente recebe apenas os valores finais.

Entregar depois uma fila de solicitações para toda a equipe ativa, com responsável opcional, observações, histórico de etapas e conversão assistida em orçamento. A conversão reutiliza os dados enviados pelo site, permite escolher um cliente existente ou completar seu cadastro e mantém manual o preenchimento dos valores do orçamento.

O catálogo será administrado no CKF Orçamentos. Sua apresentação pública no site ficará para uma etapa futura.

## User Stories

1. Como administrador, quero cadastrar um serviço com código, nome, categoria, escopo, unidade e preço padrão para manter uma referência central.
2. Como administrador, quero editar os dados de um serviço para representar corretamente o trabalho oferecido.
3. Como administrador, quero adicionar, substituir ou retirar uma imagem opcional para ilustrar o serviço.
4. Como usuário ativo, quero buscar serviços por código ou nome e filtrar por categoria para consultar o catálogo.
5. Como administrador, quero remover serviços não utilizados e arquivar os que já tenham referências para preservar o histórico.
6. Como usuário ativo, quero distinguir serviços arquivados dos disponíveis para novas tabelas.
7. Como administrador, quero selecionar uma empresa cadastrada para criar sua tabela comercial.
8. Como administrador, quero escolher quais serviços entram na tabela da empresa para apresentar apenas o escopo negociado.
9. Como administrador, quero aplicar uma porcentagem positiva ou negativa sobre o preço padrão de cada serviço para calcular seu preço na empresa.
10. Como administrador, quero digitar diretamente o preço de cada serviço para registrar um valor negociado.
11. Como usuário ativo, quero ver a diferença em reais e porcentagem entre cada preço da empresa e o padrão vigente para compreender a negociação.
12. Como administrador, quero revisar os valores calculados antes de salvar para evitar alterações acidentais.
13. Como administrador, quero que os preços da empresa permaneçam iguais quando o catálogo for reajustado para preservar a negociação.
14. Como administrador, quero alterar explicitamente uma tabela para registrar novos valores ou serviços.
15. Como usuário ativo, quero consultar tabelas anteriores com data e autor para identificar o que foi estabelecido e por quem.
16. Como usuário ativo, quero exportar a tabela atual ou uma anterior em PDF para apresentar os valores correspondentes ao cliente.
17. Como cliente, quero receber um PDF organizado por categoria com código, serviço, escopo, unidade e preço final para avaliar os serviços.
18. Como usuário ativo, quero escolher incluir imagens no PDF quando forem úteis à apresentação.
19. Como cliente, quero um documento legível em várias páginas e visualmente coerente com a CKF.
20. Como administrador, quero restringir alterações de catálogo e tabelas aos administradores para controlar decisões comerciais.
21. Como usuário ativo, quero consultar os preços e usá-los como referência ao preencher manualmente um orçamento.
22. Como usuário ativo, quero visualizar as solicitações recebidas pelo site para iniciar o atendimento.
23. Como usuário ativo, quero pesquisar por protocolo, contato ou empresa e filtrar por etapa e responsável para organizar a fila.
24. Como usuário ativo, quero consultar serviço solicitado, equipamento, urgência, descrição e contato para atender sem pedir novamente informações já fornecidas.
25. Como usuário ativo, quero atribuir um responsável opcional sem bloquear o acesso do restante da equipe.
26. Como usuário ativo, quero registrar observações e acompanhar seu autor e data para manter o contexto do atendimento.
27. Como usuário ativo, quero mudar a etapa e consultar o histórico para acompanhar a evolução da solicitação.
28. Como usuário ativo, quero marcar spam sem apagar os registros de atendimento.
29. Como usuário ativo, quero selecionar um cliente existente durante a conversão para evitar cadastros duplicados.
30. Como usuário ativo, quero completar os dados obrigatórios de um cliente novo preservando as informações do lead.
31. Como usuário ativo, quero criar um orçamento a partir do lead mantendo descrição e contexto disponíveis, com preços manuais.
32. Como usuário ativo, quero acessar o orçamento vinculado e evitar duplicações causadas por clique repetido ou falha de rede.
33. Como usuário ativo, quero registrar ganho ou perda do atendimento sem alterar silenciosamente o estado comercial do orçamento.

## Implementation Decisions

### Base existente e fronteiras

- Reutilizar a aplicação React/TypeScript, autenticação Supabase, perfis admin/usuario, cadastro de clientes, repositórios de dados e geração de documentos existentes.
- O código atual contém captura pública, idempotência, protocolo, proteção contra abuso e vínculos opcionais de ticket para cliente e orçamento. Preservar o contrato consumido pelo site.
- A existência das migrations e da função no GitHub não comprova que estejam aplicadas no ambiente remoto. Conferir a configuração e as migrations aplicadas antes da implantação.
- Criar módulos internos de catálogo, tabelas comerciais e atendimento. Evitar expandir o editor de orçamentos para aplicar preços automaticamente.
- Manter o modo de demonstração coerente com os comportamentos novos, sem misturar dados de demonstração com dados reais.

### Catálogo e permissões

- Serviço: identidade estável, código único, nome, categoria, escopo, unidade de cobrança, preço padrão em BRL, imagem opcional, situação ativa/arquivada e autoria/datas.
- Categoria e unidade devem ser editáveis pelo administrador por mecanismos simples, sem exigir alteração de código para novos valores.
- Administradores ativos criam e alteram catálogo, imagens e tabelas. Usuários ativos consultam e exportam. Usuários inativos e visitantes não acessam esses dados.
- Aplicar autorização no banco e no armazenamento de imagens, além dos controles de interface.
- Serviços referenciados por tabelas atuais ou históricas não podem sofrer exclusão física. Arquivar impede novas inclusões e preserva referências existentes.
- Imagens são opcionais, com validação de formato/tamanho. Referências usadas no histórico não devem ser destruídas por uma substituição posterior.

### Tabelas e cálculos

- Vincular a tabela à empresa no cadastro existente de clientes. Proposta técnica: uma tabela atual por empresa, com suas revisões anteriores; não criar um segundo cadastro de empresas.
- Cada tabela contém apenas os serviços selecionados. Cada item armazena seu preço final independentemente do catálogo.
- Porcentagem usa o preço padrão atual como base: preço final = preço padrão × (1 + percentual/100). Digitar valor direto define o mesmo campo de preço final.
- Diferença interna em reais = preço final da empresa − preço padrão atual. Diferença percentual = diferença em reais ÷ preço padrão atual × 100.
- Exemplo: padrão R$ 100 e ajuste de −10% produzem R$ 90 e diferença −R$ 10/−10%. Valor direto R$ 120 produz diferença +R$ 20/+20%.
- Se o padrão passar para R$ 110, o preço salvo de R$ 90 permanece intacto; a comparação interna atual passa a −R$ 20/−18,18%.
- Valores monetários são arredondados para centavos com aritmética decimal consistente. Recusar valores negativos, entradas não numéricas e resultados fora da precisão suportada. Preço padrão zero não permite divisão: mostrar diferença em reais e percentual não aplicável.
- Alterações percentuais só são aplicadas por ação explícita. A primeira entrega exige ajuste por item; ajuste em lote não é requisito aprovado.
- Usar edição e salvamento simples, sem publicação, aprovação, expiração ou validade comercial.
- Cada salvamento com mudanças gera uma revisão imutável, com autor identificado pelo servidor e data. Salvar sem mudanças não gera nova revisão.
- Salvar tabela, itens e revisão de forma atômica. Detectar edição concorrente para evitar sobrescrever silenciosamente alterações de outra pessoa.
- Preservar em cada revisão os dados comerciais necessários: empresa, código, nome, categoria, escopo, unidade, preço final, referência do padrão naquele momento e imagem quando utilizada. Mudanças posteriores não reescrevem revisões antigas.
- A comparação da tabela atual usa o padrão vigente; no histórico, identificar a referência de preço registrada naquela revisão para não confundir épocas.

### PDF

- Reutilizar a infraestrutura atual baseada em React PDF e as configurações oficiais de empresa; consultar os ativos e diretrizes oficiais do CKF Design durante a implementação visual.
- Direção: papel branco, cabeçalho preto, detalhes amarelos CKF, hierarquia clara e tabela legível. A referência é o documento comercial atual, sem transportar sua regra de validade de orçamento para a tabela de serviços.
- Informar empresa destinatária, título e identificação/data da tabela. Organizar por categoria com código, serviço, escopo, unidade e preço final em reais.
- Imagens opcionais por exportação; sem imagens, a tabela mantém o conteúdo completo. Falhas de imagem não podem impedir a leitura dos dados comerciais.
- O modelo de dados entregue ao renderizador do PDF deve conter apenas campos destinados ao cliente. Não incluir preço padrão interno, diferença, percentual de ajuste ou observações internas, inclusive em metadados.
- Suportar descrições longas, múltiplas páginas, cabeçalhos de coluna repetidos e paginação sem sobreposição ou cortes de conteúdo.
- Exportar revisões anteriores a partir de seus dados preservados. Não é necessário guardar cada PDF binário nem prometer reprodução byte a byte do arquivo.

### Leads e conversão

- Toda a equipe ativa pode consultar e atualizar atendimentos. Responsável opcional aponta para um usuário interno; autoria das ações é registrada pelo servidor.
- Etapas visíveis: Novo, Em atendimento, Orçamento criado, Ganho, Perdido e Spam.
- Compatibilizar os estados existentes: new → Novo; contacted/qualified → Em atendimento; budget_created → Orçamento criado; converted → Ganho; lost → Perdido; spam → Spam. Preservar dados legados e testar a adaptação antes de qualquer migração destrutiva.
- Histórico registra mudanças de etapa, atribuições e observações com autor/data. Não permitir que edições comuns apaguem a trilha anterior.
- Acesso authenticated à tabela de leads está revogado no schema inspecionado. Criar grants e políticas restritas a perfis internos ativos; não liberar leitura pública.
- Corrigir a incompatibilidade identificada entre o trigger de atualização e a coluna de data de site_tickets, validando a definição vigente antes da mudança.
- Conversão exige selecionar cliente existente ou completar o cadastro novo. CPF/CNPJ e endereço exigidos pelo cadastro não podem ser inventados a partir do lead.
- Reutilizar o fluxo de orçamento para contato, cliente e descrição/contexto. Não converter automaticamente a categoria recebida pelo site em um serviço do novo catálogo: são conceitos distintos nesta fase.
- Valores e itens comerciais permanecem sob preenchimento manual. Não aplicar tabela da empresa, sugerir preços automaticamente ou refatorar o editor para consumir catálogo.
- Marcar Orçamento criado somente após persistir o orçamento e seu vínculo. Cancelar o fluxo não altera o lead para essa etapa.
- Garantir idempotência da conversão e impedir orçamento órfão em falha parcial. Repetir a ação retorna/abre o orçamento já vinculado. A implementação deve escolher uma operação transacional no servidor que preserve as regras atuais do orçamento.
- Ganho e Perdido são estados do atendimento, atualizados explicitamente. Sincronização automática com o estado do orçamento fica fora desta entrega.

### Sequência de implementação e critérios de aceite

**Entrega 1 — Catálogo, tabelas por empresa e PDF.**

1. Criar persistência, autorização e interface de catálogo, incluindo imagem e arquivamento. Aceite: administrador cadastra/edita; usuário consulta; visitante não lê; serviço utilizado preserva referências ao ser arquivado.
2. Entregar seleção de empresa/serviços, preço percentual ou direto, comparação e histórico. Depende do catálogo. Aceite: os exemplos de cálculo acima funcionam; reajuste padrão não altera preço negociado; revisão anterior mantém conteúdo e autor; conflitos de edição são tratados.
3. Entregar consulta e PDF das tabelas atuais e históricas. Depende das revisões. Aceite: documento segue identidade CKF, contém os campos aprovados e nenhum dado de diferença interna; tabelas extensas e imagens opcionais mantêm legibilidade.

**Entrega 2 — Atendimento e conversão de leads.**

4. Corrigir a base de atualização e autorizar acesso interno; entregar fila, detalhe, responsável e histórico. Aceite: solicitação capturada aparece para equipe ativa, mudanças persistem, usuários externos não leem e o contrato do site continua funcionando.
5. Entregar conversão assistida em orçamento. Depende do painel e dos fluxos existentes de cliente/orçamento; não depende de integração de preços do catálogo. Aceite: cliente existente ou novo válido, contexto reaproveitado, preço manual, vínculo persistido e nenhuma duplicação ao repetir a operação.

Prioridade comercial: concluir a Entrega 1 antes da Entrega 2. A captura já existente deve continuar operando durante ambas. Executar migrations de forma incremental e validar permissões antes de disponibilizar cada painel.

## Testing Decisions

Pontos de teste aprovados pelo usuário:

- Testar comportamentos observáveis pela interface e pelos contratos públicos de operações dos módulos. Evitar testes de estrutura interna, nomes de funções privadas ou contagem de componentes.
- Preferir os repositórios e fluxos de interface já usados no projeto. Há precedentes de Vitest para comportamento dos repositórios, formulários de cliente, captura de tickets, exportações e vínculos de orçamento.
- Catálogo/tabelas: testar a jornada cadastrar serviço → criar tabela → ajustar preço → salvar → alterar padrão → consultar revisão e exportar. Complementar com casos de arredondamento, zero, preço inválido, arquivamento e edição concorrente.
- Segurança: testar com sessões reais de papéis distintos no ambiente de integração. Mocks e ocultar botões não demonstram proteção RLS. Cobrir visitante, inativo, usuário e administrador, incluindo armazenamento de imagens e histórico.
- PDF: validar texto extraído e ausência de preço padrão/diferenças internas, além de inspeção visual do documento renderizado com descrição longa, várias páginas e imagens presentes/ausentes. Não se limitar a conferir props do componente.
- Leads: testar entrada válida pelo contrato de captura, leitura interna, alteração de etapa, atribuição e observação com trilha de autoria. Reutilizar testes existentes de idempotência e abuso.
- Conversão: testar cliente existente, cadastro incompleto, cancelamento, falha, repetição e chamadas concorrentes; confirmar vínculo único e manutenção do preenchimento manual de preços.
- Regressão: manter funcionamento de criação/edição e PDF de orçamento, autenticação e captura do site. Executar os checks exigidos pelo repositório de implementação para cada entrega.
- Ao implementar as interfaces, iniciar o servidor e abrir a prévia no ambiente disponível; avaliar os fluxos essenciais no navegador. Esta especificação, por si, não modifica a aplicação nem exige iniciar um servidor.

## Out of Scope

- Exibição do catálogo ou dos preços no CKF Site, API pública de catálogo e portal do cliente.
- Preenchimento automático de preços nos orçamentos ou alteração ampla do editor atual.
- Validade, expiração, publicação, aprovação ou aceite eletrônico de tabelas.
- Automações de WhatsApp/email, cobrança, pagamentos e módulo fiscal.
- CRM amplo, distribuição automática de leads e sincronização automática de ganho/perda com orçamento.
- Importação em massa, reajuste em lote, descontos em cascata e múltiplas tabelas simultâneas para a mesma empresa.
- Arquivo permanente de binários PDF. O histórico preserva os dados comerciais que permitem exportar tabelas anteriores.

## Further Notes

- As decisões desta especificação consolidam a conversa aprovada; detalhes identificados como propostas técnicas são escolhas de implementação para cumprir esse escopo, não novos fluxos comerciais.
- Referências consultadas: contexto de produto, modelo de clientes/orçamentos, repositórios e testes, esquema e captura de tickets, documento PDF atual do CKF Orçamentos e inventário de ativos do CKF Design. O ambiente Supabase em produção não foi inspecionado nesta etapa.
- Esta cópia acompanha a implementação no CKF Orçamentos. O CKF Site continua fora do escopo desta entrega.
- As migrações precisam ser aplicadas no Supabase antes de liberar os novos painéis para a equipe.
