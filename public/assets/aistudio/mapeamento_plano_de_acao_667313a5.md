# Mapeamento Arquitetural Completo: SOR - Plano de Ação (Power Apps)

Este documento descreve detalhadamente a arquitetura, estrutura de dados, regras de negócio, telas, formulários e integração do aplicativo **SOR - Plano de ação** (Power Apps Canvas).

---

## 1. Visão Geral e Inicialização

- **App ID:** `bb7b1186-e490-40e2-980e-ba5defd05877`
- **Ambiente:** `Default-79998224-6a43-4048-97e9-4cc9f028deb7`
- **Conceito de Mestre-Detalhe (Master-Detail):**
  - **Mestre (Cabeçalho do Plano):** Armazenado na lista `'Action plan'`, agrupando a contextualização do problema (indicador, programa, área, produto, posto, prioridade e descrição).
  - **Detalhe (Itens de Ação):** Armazenados na lista `'Action plan_acoes'`, onde cada ação tem seu próprio responsável, prazo planejado, acompanhamento, contramedida, status, abrangência e validação.
- **Relacionamento Duplo (Chaves Estrangeiras):**
  1. `id_rel2`: Armazena o ID numérico do cabeçalho `'Action plan'`. Permite listar todas as ações pertencentes àquele plano específico.
  2. `id_programa_acoes`: Armazena a chave textual de referência externa (ex: `varid8d` -> `"I - 4520"` ou `"C - 5119"`). Permite que os outros módulos (como o app do 8D) filtrem todas as ações originadas daquela RNC sem depender do ID interno do plano de ação.
- **Parâmetros de Inicialização via Deep-link (`Param`):**
  ```powerappsfl
  // No App.StartScreen:
  StartScreen = If(
      "sb2" in Lower(User().Email), 'Verificaçao usuário',
      If(Param("appterc") = "Sim", action_plan, 'Página Inicial')
  )
  ```
  Quando o app é invocado a partir do 8D ou outro módulo (`appterc = "Sim"`), ele salta a tela inicial e vai **diretamente para a tela de ação** (`action_plan`), recebendo os parâmetros:
  - `idprograma`: ID de referência externa (ex: `"I - 4520"`).
  - `apporigem`: `"3"` para novo plano de ação ou `"2"` para edição de plano existente.
  - `var8d`: Disciplina do 8D que disparou o plano (`"5D"`, `"6D"` ou `"7D"`).
  - `filtroplanoacao`: `"Não"` (criação de novo plano) ou `"Sim"` (edição de plano existente).
  - `causas5pq`: String com a causa raiz final (5º porquê) de cada hipótese do Ishikawa.
  - `areafmds`, `prioridade`, `produto`, `posto`, `descricao`.

---

## 2. Mapa de Fontes de Dados (SharePoint Lists)

| Nome da Lista | Papel no Sistema | Chave Primária / Relacionamento |
|---|---|---|
| `'Action plan'` | Cabeçalho / Mestre de cada Plano de Ação | `ID` (PK) / `idprograma` (FK externa) |
| `'Action plan_acoes'` | Itens de ação individuais (detalhes) | `ID` (PK) / `id_rel2` (FK cabeçalho) / `id_programa_acoes` (FK externa) |
| `BASE_ATIVOS` | Catálogo de funcionários/colaboradores para escolha de responsáveis | `'Nº pess.'`, `'Nº pessoal'`, `email` |
| `dados_app_tratativa_nc` | Indicadores de programas estratégicos e setores responsáveis | `indicadores`, `sub1`, `sub2`, `setor_responsavel` |
| `lista perfil usuarios` | Controle de perfil de acesso (`Admin`, `Superv`, `Coord`, `User`) | `email = User().Email` |
| `lista_geral_peças_aa3` | Catálogo de produtos/peças e postos de trabalho | `Material`, `Componente`, `Posto`, `FMDS` |
| `postos_ferramentaria` | Postos adicionais específicos da ferramentaria | `Título` |
| `log_itens_excluidos_plano_acao` | Registro de auditoria quando planos ou ações são excluídos | `id_item`, `motivo_exclusao`, `data_exclusao` |

---

## 3. Telas e Estrutura Funcional

### Tela 1: Página Inicial (`Página Inicial`)
- **Objetivo:** Menu principal quando o usuário abre o app de forma independente (sem ser via deep-link de outro app).
- **Cards e Ações:**
  1. **"Novo plano de ação":** Configura variáveis para novo plano (`edicao = "false"`, `varmodeacao = "novaacao"`, `idrel = GUID()`, `planoformode = 1`) e navega para `action_plan`.
  2. **"Lista de ações":** Navega para `'Lista de ações_1'`.
  3. **"Informe de ocorrência":** (Módulo legado de ocorrências - desconsiderado conforme solicitação).
  4. **"Verificar usuário":** (Identificação por RE - desconsiderado conforme solicitação).

---

### Tela 2: Tela Principal de Plano & Ações (`action_plan`)
É a tela central de operação do sistema, dividida em:
1. **Cabeçalho do Plano (`Formactionplan`):**
   - Cria ou visualiza as informações mestres do plano de ação.
   - Botões: `"Editar"` (`Set(edicao, "true"); EditForm(Formactionplan)`), `"Salvar"` (`SubmitForm(Formactionplan)`), `"Excluir"` (solicita motivo e grava no `log_itens_excluidos_plano_acao`).
2. **Galeria de Ações (`Galleryacoes`):**
   - Lista todas as ações do plano atual:
     ```powerappsfl
     Items = Filter('Action plan_acoes', idtxt.Text = id_rel2)
     ```
   - Cada card exibe: Contramedida, Responsável, Data Planejada, Status e botões de Concluir ou Validar ação.
3. **Modal de Nova / Edição de Ação (`telanovaacao`):**
   - Abre o formulário `Formnovaacao` para adicionar uma ação ao plano ou editar uma existente.
4. **Modal de Conclusão da Ação (`telaconcacao`):**
   - Formulário `Formconcacao` para o responsável anexar comprovantes e relatar evidências.
5. **Modal de Validação da Ação (`telavalidaracao`):**
   - Formulário `Formvalidaracao` para a Qualidade validar ou solicitar revisão da ação.

---

### Tela 3: Gestão e Acompanhamento de Ações (`Lista de ações_1`)
- **Objetivo:** Visão analítica e painel operacional de todas as ações da planta.
- **Estrutura:**
  - **Galeria Kanban por Status (`Galeriahorizont` / `Galeriavert`):**
    Colunas dinâmicas alimentadas por `colstatusgaleria`:
    - `"Aberto"`
    - `"Atrasado"` (`data_planejada < Today()`)
    - `"Concluído"` (Aguardando validação da qualidade)
    - `"Validado"` (Homologado)
  - **Filtros do Painel:**
    - Indicador / Programa (`cb_prog.Selected.Value`)
    - Prioridade (`cb_priorid.Selected.Value`)
    - Minhas Ações vs. Todas as Ações (`Radio1.Selected.Value`)
  - **Ações Pendentes de Validação (`Galleryvalidacao`):**
    Lista focada para o time de qualidade/supervisão auditar o que foi concluído.
  - **Minhas Ações (`Galleryacoes_1`):**
    Filtrada por `responsavel_acao = varusernome`.

---

## 4. Schemas Exatos dos Formulários e Listas

### Formulário Mestre: `Formactionplan` (Lista `'Action plan'`)

| Nome do Campo | Nome Físico SharePoint | Tipo | Obrigatório | Regra / Default / Observação |
|---|---|---|---|---|
| `indicador_programa_estrategico` | `indicador_programa_estrategico` | Texto | **Sim** | Programa da ação (ex: `"ATENDIMENTO AO CLIENTE"`, `"FAST RESPONSE"`, etc.) |
| `sub1` | `Title` | Texto | Não | Subcategoria 1 |
| `sub2` | `OData__x0073_ub2` | Texto | Não | Subcategoria 2 |
| `posto_` | `posto_` | Texto | Não | Posto de trabalho da ocorrência |
| `produto_` | `produto_` | Texto | Não | Peça / Produto / Componente |
| `setor_` | `setor_` (`setor_abertura`) | Choice | **Sim** | Setor responsável pela abertura (Qualidade, Logística, etc.) |
| `prioridade` | `prioridade` | Choice | **Sim** | `"Alta"`, `"Média"`, `"Baixa"` |
| `descricao_problema_oportunidade` | `descricao_problema_oportunidade` | Texto Multilinha | **Sim** | Descrição clara do desvio ou oportunidade |
| `foto_acao` | `foto_acao` | Imagem | Não | Imagem ilustrativa ou evidência inicial |
| `idprograma` | `idprograma` | Texto | Não | ID de referência externa (ex: `varid8d` -> `"I - 4520"`) |
| `id_rel1` | `id_rel1` | Texto | Não | GUID único do cabeçalho gerado no cliente (`GUID()`) |
| `data_abertura` | `data_abertura` | Data | Não | Data da criação (padrão: `Today()`) |
| `status` | `status` | Texto | Não | `"Aberto"`, `"Concluído"`, etc. (padrão inicial: `"Aberto"`) |
| `responsavel_abertura` | `responsavel_abertura` | Texto | **Sim** | Nome do usuário que abriu o plano (`User().FullName`) |

---

### Formulário Detalhe: `Formnovaacao` (Lista `'Action plan_acoes'`)

| Nome do Campo | Nome Físico SharePoint | Tipo | Obrigatório | Regra de Visibilidade e Comportamento |
|---|---|---|---|---|
| `causa` | `causa` | Texto Multilinha | **Condicional** | Obrigatório se o indicador for `"ATENDIMENTO AO CLIENTE"` (casos de 8D). Traz a causa raiz dos 5 Porquês. |
| `contra_medida` | `contra_medida` | Texto Multilinha | **Sim** | Descrição detalhada da ação a ser executada. |
| `comentarios_observacoes` | `comentarios_observacoes` | Texto Multilinha | Não | Observações adicionais do plano. |
| `data_acompanhamento` | `data_acompanhamento` | Data | **Sim** | Data intermediária para checagem do status. |
| `data_planejada` | `data_planejada` | Data | **Sim** | Prazo final para conclusão da ação. |
| `responsavel_acao` | `responsavel_acao` | Texto | **Sim** | Nome do responsável selecionado a partir de `BASE_ATIVOS`. |
| `email` | `email` | Texto | Não (Auto) | E-mail corporativo do responsável pela ação (preenchido automaticamente). |
| `email_super` | `email_super` | Texto | Não (Auto) | E-mail do supervisor do responsável para notificações. |
| `tipo_acao` | `tipo_acao` | Choice | **Sim** | `"CONTENÇÃO"`, `"CORRETIVA"`, `"PREVENTIVA"`, `"MELHORIA"`. |
| `yokoten` | `yokoten` | Choice | **Condicional** | Visível e obrigatório para Qualidade/Logística (`"Q"`, `"L"`, `"SA"`). Opções: `"SIM"` / `"NÃO"`. |
| `poka_yoke` | `poka_yoke` | Choice | **Condicional** | Visível e obrigatório para Qualidade/Logística. Opções: `"SIM"` / `"NÃO"`. |
| `8d_7d` | `OData__x0038_d_7d` | Choice | **Condicional** | Visível se `Param("var8d") = "7D"`. Opções: `"FMEA"`, `"Trabalho Padronizado"`, `"Auditoria Escalonada"`. |
| `oc_nd` | `oc_nd` | Choice | **Condicional** | Visível para Qualidade/Logística. Opções: `"Ocorrência"`, `"Não Detecção"`. |
| `evidencia_obrigatoria` | `evidencia_obrigatoria` | Choice | **Sim** | `"SIM"` / `"NÃO"`. Define se a conclusão exige fotos/arquivos. |
| `validacao_acao` | `validacao_acao` | Choice | **Sim** | `"SIM"` / `"NÃO"`. Define se a ação precisará ser homologada pela Qualidade. |
| `id_rel2` | `id_rel2` | Texto | Não (Auto) | ID do cabeçalho mestre (`Action plan.ID`). |
| `id_programa_acoes` | `id_programa_acoes` | Texto | Não (Auto) | Código de referência externa (ex: `varid8d`). |
| `status` | `status` | Texto | Não (Auto) | Inicializado como `"Aberto"`. |
| `revisao_data` | `revisao_data` | Texto | Não (Auto) | Contador incremental de prorrogações de prazo. |
| `data_plan_anterior` | `data_plan_anterior` | Data | Não (Auto) | Armazena a data planejada anterior em caso de prorrogação. |

---

### Formulário de Conclusão de Ação: `Formconcacao` (Lista `'Action plan_acoes'`)
- **Quem Preenche:** O responsável pela ação.
- **Campos:**
  - `data_conclusao`: Data em que a contramedida foi implementada.
  - `comentarios_evidencia`: Texto detalhando o que foi feito.
  - `Anexos`: Fotos, relatórios ou PDFs comprovando a execução (obrigatório se `evidencia_obrigatoria = "SIM"`).
  - `status`: Atualizado para `"Concluído"` (ou `"Validado"` se `validacao_acao = "NÃO"`).
- **Gatilho de Notificação:** Executa o fluxo Power Automate `Alertaaçãovalidar.Run(cbnometxt_2.Selected.email, ...)`.

---

### Formulário de Validação de Ação: `Formvalidaracao` (Lista `'Action plan_acoes'`)
- **Quem Preenche:** O time de Qualidade / Auditoria (etapa 8D ou tela de validação).
- **Campos:**
  - `comentarios_validacao`: Parecer técnico do auditor sobre a eficácia da ação.
  - `status`:
    - Se Aprovado: `"Validado"` e `finalizacao = "Sim"`.
    - Se Reprovado: Retorna para `"Aberto"` (ou `"Atrasado"` se prazo estourado), `status_revisar2 = "Revisar"`, `finalizacao = "Não"`.
- **Gatilho de Notificação:** Caso reprovada, executa o fluxo Power Automate `Alertarevisaração.Run(Galleryacoes.Selected.email, ..., statusmsgrevisar)`.

---

## 5. Endpoints Necessários para a API (sor-web-sp)

Com o mapeamento de ambos os aplicativos (8D e Plano de Ação), a API REST corporativa do SharePoint (`/api/sp`) deverá expor os seguintes contratos integrados:

```
# CABEÇALHO DO PLANO DE AÇÃO ('Action plan')
GET    /api/sp/planos?idprograma=:id8d        -> Retorna o plano mestre vinculado a um 8D ou programa
POST   /api/sp/planos                         -> Cria um novo cabeçalho de plano de ação
PATCH  /api/sp/planos/:id                     -> Atualiza dados do cabeçalho
DELETE /api/sp/planos/:id                     -> Exclui plano e registra motivo no log de auditoria

# ITENS DE AÇÃO ('Action plan_acoes')
GET    /api/sp/acoes?idprograma=:id8d         -> Retorna todas as ações de um 8D (para 5D, 6D, 7D e 8D)
GET    /api/sp/acoes?idplano=:idPlano         -> Retorna ações de um plano específico (id_rel2)
POST   /api/sp/acoes                          -> Cria uma nova ação
PATCH  /api/sp/acoes/:id                      -> Edita dados de uma ação existente
POST   /api/sp/acoes/:id/concluir             -> Conclusão pelo responsável (evidência, anexos, data)
POST   /api/sp/acoes/:id/validar              -> Homologação ou solicitação de revisão pela Qualidade
DELETE /api/sp/acoes/:id                      -> Exclui ação e registra motivo no log de auditoria
```
