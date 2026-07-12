# Requirements Document

## Introduction

Este documento especifica as melhorias no sistema Kurti 3D relacionadas à calculadora de custos de portfólio e à visibilidade de projetos na landing page pública. O sistema atual possui uma calculadora avançada e um portfólio, mas apresenta lacunas na entrada de dados de tempo de impressão, na gestão de visibilidade de projetos e nas ações após o cálculo de custos.

As melhorias abrangem:
1. Controle de visibilidade de projetos (público/privado) com campo na tabela e filtro na landing page
2. Entrada separada de horas e minutos para tempo de impressão
3. Três opções de ação após cálculo: salvar privado, salvar e publicar, criar pedido

## Glossary

- **Sistema_Calculadora**: Módulo de cálculo de custos de projetos de impressão 3D no painel administrativo
- **Sistema_Portfolio**: Sistema de armazenamento e exibição de projetos calculados
- **Landing_Page**: Página pública do site que exibe projetos do portfólio
- **Projeto_Portfolio**: Registro de projeto calculado com todos os parâmetros (nome, categoria, custos, tempo, etc.)
- **Campo_Visibilidade**: Campo booleano 'is_public' na tabela portfolio_projects
- **Interface_Tempo**: Campos separados para entrada de horas e minutos de impressão
- **Botoes_Acao**: Três botões de ação pós-cálculo: "Salvar Privado", "Salvar e Publicar no Site", "Criar Pedido"
- **Usuario_Admin**: Usuário autenticado com acesso ao painel administrativo

## Requirements

### Requirement 1: Controle de Visibilidade de Projetos

**User Story:** Como administrador do sistema, quero controlar quais projetos calculados aparecem na landing page pública, para que eu possa manter projetos em rascunho ou privados enquanto exibo apenas trabalhos finalizados e aprovados para visitantes.

#### Acceptance Criteria

1. THE Sistema_Portfolio SHALL adicionar um campo booleano 'is_public' na tabela 'portfolio_projects' com valor padrão 'false'
2. THE Sistema_Portfolio SHALL adicionar timestamp 'published_at' (nullable) na tabela 'portfolio_projects'
3. WHEN Usuario_Admin salva um Projeto_Portfolio como privado, THE Sistema_Portfolio SHALL definir 'is_public' como 'false' e 'published_at' como NULL
4. WHEN Usuario_Admin salva e publica um Projeto_Portfolio, THE Sistema_Portfolio SHALL definir 'is_public' como 'true' e 'published_at' com o timestamp atual
5. THE Landing_Page SHALL consultar apenas Projeto_Portfolio onde 'is_public' seja 'true'
6. THE Landing_Page SHALL ordenar projetos públicos por 'published_at' em ordem decrescente quando o campo não for NULL
7. WHEN Sistema_Portfolio consulta projetos para exibição pública, THE Sistema_Portfolio SHALL filtrar automaticamente por 'is_public = true'
8. THE Sistema_Calculadora SHALL permitir ao Usuario_Admin alterar a visibilidade de um Projeto_Portfolio existente entre público e privado

### Requirement 2: Interface de Entrada de Tempo Separada

**User Story:** Como administrador cadastrando um projeto, quero inserir o tempo de impressão usando campos separados para horas e minutos, para que a entrada seja mais intuitiva e reduza erros de conversão manual.

#### Acceptance Criteria

1. THE Sistema_Calculadora SHALL exibir dois campos numéricos separados: um para horas e outro para minutos
2. THE Sistema_Calculadora SHALL rotular o campo de horas como "Horas" e o campo de minutos como "Minutos"
3. WHEN Usuario_Admin insere valores nos campos de tempo, THE Sistema_Calculadora SHALL converter automaticamente para o total de minutos antes de salvar
4. THE Sistema_Calculadora SHALL aceitar valores de 0 a 999 no campo de horas
5. THE Sistema_Calculadora SHALL aceitar valores de 0 a 59 no campo de minutos
6. THE Sistema_Calculadora SHALL validar que pelo menos um dos campos (horas ou minutos) seja maior que zero
7. WHEN Sistema_Calculadora exibe um Projeto_Portfolio existente para edição, THE Sistema_Calculadora SHALL converter o total de minutos armazenado de volta para horas e minutos separados
8. THE Sistema_Calculadora SHALL exibir uma prévia em formato legível "Xh Ymin" abaixo dos campos de entrada

### Requirement 3: Três Opções de Ação Pós-Cálculo

**User Story:** Como administrador que calculou os custos de um projeto, quero escolher entre três ações diferentes (salvar privado, salvar e publicar, ou criar pedido imediatamente), para que eu possa seguir diferentes fluxos de trabalho conforme minha necessidade atual.

#### Acceptance Criteria

1. WHEN Usuario_Admin completa o cálculo de um projeto, THE Sistema_Calculadora SHALL exibir três botões de ação distintos
2. THE Sistema_Calculadora SHALL exibir o botão "Salvar Privado" com cor neutra (outline ou ghost variant)
3. THE Sistema_Calculadora SHALL exibir o botão "Salvar e Publicar no Site" com destaque visual de ação secundária
4. THE Sistema_Calculadora SHALL exibir o botão "Criar Pedido" com destaque visual de ação primária
5. WHEN Usuario_Admin clica em "Salvar Privado", THE Sistema_Calculadora SHALL salvar o Projeto_Portfolio com 'is_public = false'
6. WHEN Usuario_Admin clica em "Salvar e Publicar no Site", THE Sistema_Calculadora SHALL salvar o Projeto_Portfolio com 'is_public = true' e 'published_at' preenchido
7. WHEN Usuario_Admin clica em "Criar Pedido", THE Sistema_Calculadora SHALL salvar o Projeto_Portfolio como privado e navegar para a tela de criação de pedido com dados pré-preenchidos
8. WHEN Sistema_Calculadora salva com sucesso, THE Sistema_Calculadora SHALL exibir notificação toast informando a ação realizada
9. THE Sistema_Calculadora SHALL desabilitar os três botões durante o processo de salvamento
10. WHEN existe um erro ao salvar, THE Sistema_Calculadora SHALL exibir mensagem de erro e reabilitar os botões

### Requirement 4: Migração de Dados Existentes

**User Story:** Como administrador do sistema, quero que projetos existentes não desapareçam da landing page após a implantação da funcionalidade de visibilidade, para que o portfólio público continue acessível durante a transição.

#### Acceptance Criteria

1. WHEN Sistema_Portfolio adiciona o Campo_Visibilidade ao schema, THE Sistema_Portfolio SHALL executar migração que define 'is_public = true' para todos os registros existentes
2. WHEN migração é executada, THE Sistema_Portfolio SHALL definir 'published_at' igual a 'created_at' para registros existentes onde 'is_public = true'
3. THE Sistema_Portfolio SHALL registrar em log o número de projetos migrados
4. WHEN migração falha, THE Sistema_Portfolio SHALL reverter as alterações de schema e registrar erro detalhado

### Requirement 5: Validação e Feedback de Interface

**User Story:** Como administrador interagindo com a calculadora, quero receber feedback visual claro sobre validações e estados de salvamento, para que eu saiba imediatamente se minhas ações foram bem-sucedidas ou se há erros a corrigir.

#### Acceptance Criteria

1. WHEN Usuario_Admin não preenche campos obrigatórios, THE Sistema_Calculadora SHALL exibir mensagens de erro específicas ao lado de cada campo
2. THE Sistema_Calculadora SHALL exibir borda vermelha em campos com erro de validação
3. WHEN Usuario_Admin corrige um campo com erro, THE Sistema_Calculadora SHALL remover a indicação de erro em tempo real
4. WHEN tempo de impressão total é zero, THE Sistema_Calculadora SHALL exibir erro "Informe pelo menos 1 minuto de impressão"
5. WHEN salvamento está em progresso, THE Sistema_Calculadora SHALL exibir indicador de carregamento nos botões desabilitados
6. WHEN salvamento é concluído com sucesso, THE Sistema_Calculadora SHALL exibir toast de sucesso com mensagem específica da ação ("Projeto salvo como privado", "Projeto publicado no site", "Pedido criado com sucesso")
7. WHEN salvamento falha, THE Sistema_Calculadora SHALL exibir toast de erro com mensagem legível para o usuário

### Requirement 6: Edição e Republicação de Projetos

**User Story:** Como administrador, quero editar projetos existentes e alterar sua visibilidade ou republicá-los, para que eu possa atualizar informações e controlar quando projetos aparecem ou desaparecem do site.

#### Acceptance Criteria

1. WHEN Usuario_Admin edita um Projeto_Portfolio público, THE Sistema_Calculadora SHALL exibir os três Botoes_Acao
2. WHEN Usuario_Admin edita um Projeto_Portfolio privado e clica em "Salvar e Publicar no Site", THE Sistema_Calculadora SHALL atualizar 'is_public = true' e definir novo 'published_at'
3. WHEN Usuario_Admin edita um Projeto_Portfolio público e clica em "Salvar Privado", THE Sistema_Calculadora SHALL atualizar 'is_public = false' e manter 'published_at' existente
4. THE Sistema_Calculadora SHALL exibir badge visual indicando se o projeto atual está "Público" ou "Privado" durante edição
5. WHEN Usuario_Admin remove um Projeto_Portfolio público, THE Sistema_Calculadora SHALL remover o projeto do banco e da Landing_Page imediatamente

### Requirement 7: Persistência e Consistência de Dados

**User Story:** Como sistema de gerenciamento, quero garantir que alterações de visibilidade e dados de tempo sejam persistidas corretamente e de forma atômica, para que não haja inconsistências entre interface e banco de dados.

#### Acceptance Criteria

1. WHEN Sistema_Portfolio salva um Projeto_Portfolio, THE Sistema_Portfolio SHALL executar a operação em transação atômica
2. WHEN conversão de horas/minutos para minutos totais falha, THE Sistema_Calculadora SHALL impedir o salvamento e exibir erro
3. WHEN alteração de visibilidade falha, THE Sistema_Portfolio SHALL reverter todas as mudanças da transação
4. THE Sistema_Portfolio SHALL validar que 'is_public' seja booleano antes de persistir
5. THE Sistema_Portfolio SHALL validar que 'published_at' seja timestamp válido ou NULL antes de persistir
6. WHEN 'is_public' é definido como 'true' e 'published_at' é NULL, THE Sistema_Portfolio SHALL definir 'published_at' automaticamente
7. WHEN 'is_public' é definido como 'false', THE Sistema_Portfolio SHALL permitir que 'published_at' permaneça com valor existente (histórico)

### Requirement 8: Melhorias Adicionais de Usabilidade

**User Story:** Como administrador trabalhando com a calculadora diariamente, quero melhorias de usabilidade que tornem o fluxo mais eficiente, para que eu possa cadastrar e gerenciar projetos mais rapidamente.

#### Acceptance Criteria

1. WHEN Usuario_Admin está na tela da calculadora, THE Sistema_Calculadora SHALL exibir tooltip explicativo ao passar mouse sobre os Botoes_Acao
2. THE Sistema_Calculadora SHALL exibir contador de caracteres em campos de texto com limite
3. WHEN Usuario_Admin preenche o campo de nome do projeto, THE Sistema_Calculadora SHALL sugerir categoria automaticamente baseada em projetos similares existentes (opcional)
4. THE Sistema_Calculadora SHALL permitir navegação por teclado (Tab) entre todos os campos na ordem lógica
5. WHEN Usuario_Admin pressiona Enter no último campo de entrada, THE Sistema_Calculadora SHALL focar no botão "Criar Pedido"
6. THE Sistema_Calculadora SHALL preservar dados do formulário se o Usuario_Admin navegar acidentalmente para outra tela e retornar
7. THE Sistema_Calculadora SHALL exibir ícones visuais nos Botoes_Acao para reforçar significado (cadeado para privado, globo para publicar, carrinho para pedido)
8. WHEN Usuario_Admin visualiza lista de projetos do portfólio, THE Sistema_Calculadora SHALL exibir badge visual diferenciando projetos públicos e privados
