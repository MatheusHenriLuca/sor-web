# Módulos de Planejamento (Plano de Ação) & Repositório 8D Integrado

Plano estratégico de engenharia para implementação dos módulos de **Planejamento (Plano de Ação corporativo)** e **Repositório de Dossiês 8D**, 100% integrados às bases de dados do SharePoint atuais (`Action plan`, `Action plan_acoes`, `lista_participantes`, `lista_ishikawa`, `lista_henkaten`, `lista_entrevista8d`), com fluxo integrado de 1D a 8D e visão global para a fábrica.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisões confirmadas pelo usuário na etapa de alinhamento interativo (Fase 1):

- **Navegação do Planejamento**: **Menu dedicado** na barra lateral/superior para gestão de todos os planos de ação da fábrica (Kanban corporativo) **E gaveta/painel embutido** nas etapas 5D, 6D, 7D e 8D do fluxo 8D (sem necessidade de abrir abas externas ou perder o contexto).
- **Escopo do Módulo de Repositório**: Central de **Dossiês 8D Concluídos**, planos homologados pela Qualidade e geração/impressão de **Relatórios Técnicos Oficiais** para auditorias IATF 16949 e montadoras.
- **Transição 4D ➔ 5D**: **Botão de 1 clique** na análise de causa raiz (5 Porquês / Ishikawa) que gera automaticamente uma contramedida no 5D já preenchida com a causa raiz (último porquê preenchido da hipótese "NG").
- **Compatibilidade com Bases SharePoint**: Modelo de dados espelhando fielmente os esquemas das listas `'Action plan'` (mestre) e `'Action plan_acoes'` (detalhe) com duplo vínculo relacional (`id_rel2` e `id_programa_acoes`), mantendo suporte total a tenants e usuários locais.

---

### 1. Overview & Core Concept

- **O que faz**: 
  1. **Módulo de Planejamento (Plano de Ação Geral da Fábrica)**: Centraliza todos os planos de ação originados de 8D, Kaizen, Fast Response, Auditorias e Melhorias. Oferece visualização Kanban por status (`Aberto`, `Atrasado`, `Concluído`, `Validado`), filtros multicritério por indicador/programa, prioridade, responsável e setor, e ciclo completo de aprovação pela Qualidade.
  2. **Integração Fluida no Fluxo 8D (1D a 8D)**: As etapas 5D (Ações Corretivas), 6D (Abrangência Yokoten / Poka-Yoke), 7D (Ações Preventivas: FMEA, Trabalho Padronizado, Auditoria Escalonada) e 8D (Validação & Homologação) gerenciam suas ações diretamente na tela da ocorrência através de gaveta embutida com sincronização em tempo real.
  3. **Módulo de Repositório 8D**: Hub corporativo onde líderes e auditores encontram todos os 8D finalizados e homologados, com busca rápida, filtros por montadora/produto, visualização da árvore de investigação completa e exportação de relatórios técnicos padronizados.
- **Público-Alvo**: Engenheiros e Técnicos da Qualidade, Supervisores de Produção, Inspetores, Auditores de Linha e Gestão de Planta.
- **Valor Principal**: Elimina a fragmentação entre sistemas e abas externas do Power Apps (`Launch`), assegura integridade referencial absoluta entre causas raízes e contramedidas, e oferece visão executiva dos planos de ação de toda a fábrica em uma única interface responsiva.

---

### 2. User Experience & Visual Design

#### A. Estrutura de Navegação & Layout
- **Barra Lateral (`AppSidebar`)**: 
  - Novo item **"Planejamento"** (`plano-acao`) no grupo de Acesso Principal com ícone de checklist/cronograma e badge numérico de ações sob responsabilidade do usuário.
  - Novo item **"Repositório 8D"** (`repositorio-8d`) no grupo de Acesso Principal com ícone de arquivo/arquivo-morto para consulta de dossiês homologados.
- **Tela de Planejamento (`PlanoAcaoView`)**:
  - Cabeçalho executivo com KPIs imediatos: Total de Ações, Abertas, Atrasadas (em vermelho), Aguardando Validação e Validadas.
  - Alternador de visão: **Quadro Kanban** (4 colunas com arrastar/mover rápido ou avançar de etapa) vs. **Lista Tabular de Alta Densidade** (com ordenação e busca instantânea).
  - Barra de filtros: Programa/Indicador (`Atendimento ao Cliente`, `Fast Response`, etc.), Prioridade (`Alta`, `Média`, `Baixa`), Minhas Ações vs. Todas as Ações, e busca por texto.
  - Botão de ação primária: `+ Novo Plano de Ação` e `+ Nova Ação`.
- **Tela de Repositório (`Repositorio8DView`)**:
  - Grid responsivo de Dossiês 8D Concluídos exibindo Código da RNC (`ID:XX`), Cliente, Veículo, Defeito, Data de Conclusão, Auditor Responsável e Parecer Final.
  - Drawer lateral para leitura rápida da investigação (linha do tempo 1D a 8D, Ishikawa, causas raízes e ações validadas).
  - Botão de Ação: `Imprimir Dossiê 8D Oficial` (utilizando a estilização padronizada já existente no app).
- **Fluxo 8D Unificado (`Detalhes8DView`)**:
  - Barra superior de navegação por disciplinas: `1D`, `2D`, `3D`, `4D`, `5D`, `6D`, `7D`, `8D`.
  - No **4D**: Diagrama de Ishikawa 6M com causas e 5 Porquês; para cada causa classificada como "NG", botão destacado: `Gerar Ação Corretiva no 5D` com badge verde.
  - Nos **5D, 6D e 7D**: Painel integrado exibindo ações vinculadas ao programa (`varid8d`), permitindo adicionar novas ações sem sair da tela.
  - No **8D**: Tabela de homologação com validação individual de cada ação e formulário de parecer técnico final com opções de aprovação ou devolução para revisão com registro de pendências por etapa.

#### B. Paleta de Cores & Tipografia (Alinhada com MH Qualidade)
- **Canvas Neutro (60%)**: Fundo limpo `#f8fafc` com cartões em `#ffffff` e bordas sutis `border-slate-200`.
- **Superfícies Estruturais (30%)**: Barras de ferramentas em `#f1f5f9`, divisores elegantes de 1px e tipografia corporativa em `#0f172a` (títulos) e `#475569` (textos de apoio).
- **Acentos Funcionais (10%)**:
  - Azul Institucional (`#0b5796` / `#0f6cbd`): Ações primárias, abas ativas e seleção de itens.
  - Esmeralda (`#16a34a`): Status Validado / Concluído, hipótese OK.
  - Âmbar (`#d97706`): Em Andamento, Aguardando Validação da Qualidade, hipótese NG.
  - Rosa / Carmesim (`#dc2626`): Atrasado, Reprovado / Solicitação de Revisão.
- **Tipografia**: `Plus Jakarta Sans` para títulos e botões, `tabular-nums` / `font-mono` para códigos de peça, datas e números de identificação (`ID:10`).

---

### 3. Key Product Decisions & Trade-Offs

1. **Gestão de Dados: Mock Local Estruturado com Espelhamento Exato do SharePoint**
   - *Decisão*: Implementar as coleções `'Action plan'`, `'Action plan_acoes'`, `'lista_participantes'`, `'lista_henkaten'`, `'lista_entrevista8d'` e `'lista_ishikawa'` dentro do serviço `sharepointService.ts` com persistência em `localStorage` e tipagem estrita TypeScript.
   - *Por que*: Atende integralmente a diretriz do usuário de "focar na implementação usando já os tipos de bases que já estão hoje no nosso ambiente", garantindo que a aplicação funcione imediatamente no navegador e esteja pronta para sincronização via Microsoft Graph API.
2. **Duplo Link Relacional (`id_rel2` e `id_programa_acoes`)**
   - *Decisão*: Ao cadastrar qualquer ação vinculada a uma RNC (ex: `ID:10`), o sistema preenche simultaneamente o `id_programa_acoes` (chave textual como `I - 10` ou `C - 10`) e o `id_rel2` (ID numérico do cabeçalho `'Action plan'`).
   - *Por que*: Garante compatibilidade bidirecional total com a lógica histórica dos Canvas Apps do Power Apps mapeados.
3. **Automação 4D ➔ 5D sem fricção**
   - *Decisão*: Ao clicar em "Gerar Ação Corretiva" em uma causa NG no 4D, abre-se a gaveta de criação de ação com a causa raiz (último porquê preenchido) já injetada no campo `causa`, o tipo de ação setado como `CORRETIVA` e o vínculo com a ocorrência ativo.
   - *Por que*: Reduz drasticamente o tempo de preenchimento e evita inconsistências textuais entre a investigação e o plano de ação.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MH QUALIDADE (REACT SPA)                        │
├────────────────────────────────────────────────────────────────────────┤
│  Navegação Global: AppSidebar & Header                                 │
│  ├─ Menu Principal (menu-2)                                            │
│  ├─ Lista de Ocorrências (lista-8d)                                    │
│  ├─ [NOVO] Planejamento / Plano de Ação (plano-acao)                   │
│  │   ├─ Kanban Corporativo (Aberto | Atrasado | Concluído | Validado)   │
│  │   ├─ Lista Tabular com Filtros (Programa, Prioridade, Responsável)  │
│  │   ├─ Modal Criar/Editar Plano & Ação                                │
│  │   └─ Modais de Conclusão (Evidência) e Validação (Auditoria)        │
│  ├─ [NOVO] Repositório 8D (repositorio-8d)                             │
│  │   ├─ Catálogo de Dossiês Homologados com Busca Multicritério        │
│  │   ├─ Visualizador do Dossiê Completo (Timeline 1D-8D)               │
│  │   └─ Exportador & Impressão Técnica Oficial                         │
│  └─ Fluxo 8D Detalhado (detalhes-8d)                                   │
│      ├─ 1D: Contenção & Detalhes da RNC                                │
│      ├─ 2D: Equipe Multidisciplinar (BASE_ATIVOS)                      │
│      ├─ 3D: Rastreabilidade & Bloqueios SAP                            │
│      ├─ 4D: Ishikawa 6M + 5 Porquês + [Botão 1-Clique p/ 5D]           │
│      ├─ 5D: Ações Corretivas (Gaveta de Ações Integrada)               │
│      ├─ 6D: Abrangência (Yokoten) & Poka-Yoke                          │
│      ├─ 7D: Ações Preventivas (FMEA / Trab. Padronizado / Auditoria)   │
│      └─ 8D: Validação das Ações & Aprovação Final do 8D                │
├────────────────────────────────────────────────────────────────────────┤
│                    CAMADA DE DADOS & SERVIÇOS                          │
│  sharepointService.ts (spStore)                                        │
│  ├─ tratativa_produto_nao_conforme (RNCs)                              │
│  ├─ lista_participantes (Equipe, Status 8D, Revisões 4D-7D)            │
│  ├─ lista_ishikawa (Causas 6M, 5 Porquês, OK/NG)                       │
│  ├─ lista_henkaten & lista_entrevista8d (Diagnóstico 4D)               │
│  ├─ Action plan (Mestre de Planos de Ação)                             │
│  ├─ Action plan_acoes (Ações Detalhadas, Prazos, Status, Evidências)  │
│  └─ BASE_ATIVOS (Colaboradores e Responsáveis)                         │
└────────────────────────────────────────────────────────────────────────┘
```

#### Modelo de Dados das Novas Entidades no `sharepointService.ts`:

1. **`ActionPlanHeader` (Espelho da lista `'Action plan'`):**
   - `id`: number
   - `tenant_id`: string
   - `indicador_programa_estrategico`: string (ex: `'ATENDIMENTO AO CLIENTE'`, `'FAST RESPONSE'`, `'KAIZEN'`)
   - `sub1`?: string
   - `sub2`?: string
   - `posto_`?: string
   - `produto_`?: string
   - `setor_`: string
   - `prioridade`: `'Alta'` | `'Média'` | `'Baixa'`
   - `descricao_problema_oportunidade`: string
   - `foto_acao`?: string
   - `idprograma`: string (ex: `'I - 10'`)
   - `id_rel1`: string (GUID)
   - `data_abertura`: string
   - `status`: `'Aberto'` | `'Concluído'` | `'Cancelado'`
   - `responsavel_abertura`: string

2. **`ActionPlanItem` (Espelho da lista `'Action plan_acoes'`):**
   - `id`: number
   - `tenant_id`: string
   - `id_rel2`: number (ID do cabeçalho)
   - `id_programa_acoes`: string (ID do programa / 8D, ex: `'I - 10'`)
   - `causa`: string (preenchida automaticamente via 5 Porquês do 4D)
   - `contra_medida`: string
   - `comentarios_observacoes`?: string
   - `data_acompanhamento`: string
   - `data_planejada`: string
   - `data_plan_anterior`?: string
   - `responsavel_acao`: string (selecionado de `BASE_ATIVOS`)
   - `email`?: string
   - `email_super`?: string
   - `tipo_acao`: `'CONTENÇÃO'` | `'CORRETIVA'` | `'PREVENTIVA'` | `'MELHORIA'`
   - `yokoten`: `'SIM'` | `'NÃO'`
   - `poka_yoke`: `'SIM'` | `'NÃO'`
   - `oData_8d_7d`?: `'FMEA'` | `'Trabalho Padronizado'` | `'Auditoria Escalonada'`
   - `oc_nd`?: `'Ocorrência'` | `'Não Detecção'`
   - `evidencia_obrigatoria`: `'SIM'` | `'NÃO'`
   - `validacao_acao`: `'SIM'` | `'NÃO'`
   - `status`: `'Aberto'` | `'Atrasado'` | `'Concluído'` | `'Validado'`
   - `data_conclusao`?: string
   - `comentarios_evidencia`?: string
   - `anexos_evidencia`?: string[]
   - `comentarios_validacao`?: string
   - `status_revisar`?: string

3. **`EightDMetadata` (Espelho da lista `'lista_participantes'`):**
   - `id`: number
   - `tenant_id`: string
   - `id8d`: string (ex: `'I - 10'`)
   - `participantes_8d`: string (nomes separados por vírgula)
   - `validar_8d`: `'Aprovado'` | `'Reprovado'` | `'Em Andamento'` | `'Pendente'`
   - `comentarios_validacao`?: string
   - `revisado_4d`?: boolean; `comentarios_revisao_4d`?: string
   - `revisado_5d`?: boolean; `comentarios_revisao_5d`?: string
   - `revisado_6d`?: boolean; `comentarios_revisao_6d`?: string
   - `revisado_7d`?: boolean; `comentarios_revisao_7d`?: string

4. **`IshikawaCauseItem` (Espelho da lista `'lista_ishikawa'`):**
   - `id`: number
   - `tenant_id`: string
   - `id8d`: string
   - `descricao_causa`: string
   - `seisms`: `'Máquina'` | `'Mão de Obra'` | `'Método'` | `'Material'` | `'Medição'` | `'Meio Ambiente'`
   - `ocnd`: `'Ocorrência'` | `'Não Detecção'`
   - `okng`: `'OK'` | `'NG'`
   - `umpq`?: string; `doispq`?: string; `trespq`?: string; `quatropq`?: string; `cincopq`?: string

---

### 5. Plano de Implementação em Fases

- **Fase 1: Tipagem & Métodos de Repositório e Planos no `sharepointService.ts`**
  - Criação das interfaces tipadas correspondentes às tabelas SharePoint.
  - Implementação dos métodos de CRUD e filtros no `spStore`: `getActionPlans()`, `getActionItems()`, `saveActionPlan()`, `saveActionItem()`, `concluirActionItem()`, `validarActionItem()`, `getEightDMetadata()`, `saveEightDMetadata()`, `getIshikawaCauses()`, `saveIshikawaCause()`.
  - Dados sementes industriais realistas já vinculados às RNCs piloto.

- **Fase 2: Tela de Planejamento Geral (`PlanoAcaoView.tsx`)**
  - Implementação da visão Kanban com colunas inteligentes (calculando automaticamente atraso com base na `data_planejada`).
  - Implementação da visão em Lista com filtros avançados.
  - Modais para nova ação, conclusão de evidência e validação pela Qualidade.
  - Adição da rota `'plano-acao'` no `App.tsx` e no menu lateral `AppSidebar.tsx`.

- **Fase 3: Mapeamento Completo 1D a 8D em `Detalhes8DView.tsx`**
  - Barra de abas 1D–8D.
  - Sub-tela 4D com Ishikawa 6M interativo, árvore de 5 Porquês e botão de 1 clique para gerar ação corretiva.
  - Sub-telas 5D, 6D e 7D integradas com a gaveta de ações embutida.
  - Sub-tela 8D com aprovação das ações e validação final com feedback técnico.

- **Fase 4: Módulo de Repositório 8D (`Repositorio8DView.tsx`)**
  - Catálogo de ocorrências com 8D aprovado/homologado.
  - Filtros por cliente, produto, ano e visualização rápida do dossiê.
  - Integração com o fluxo de impressão técnica oficial.
  - Adição da rota `'repositorio-8d'` no `App.tsx` e `AppSidebar.tsx`.

- **Fase 5: Verificação, Compilação e Testes de Responsividade**
  - Execução de `compile_applet` e `lint_applet`.
  - Verificação de layout desktop e mobile, garantindo zero quebras visuais e usabilidade em chão de fábrica.
