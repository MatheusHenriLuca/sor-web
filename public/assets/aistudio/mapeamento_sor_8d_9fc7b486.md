# Mapeamento Arquitetural Completo: SOR - Gestão de 8D (Power Apps)

Este documento descreve detalhadamente a arquitetura, estrutura de dados, regras de negócio, telas, formulários e integração do aplicativo **SOR - Gestão de 8D – cópia** (Power Apps Canvas).

---

## 1. Visão Geral e Inicialização

- **App ID:** `68218236-987e-40ca-97b2-bc68d068eb18`
- **Ambiente:** `Default-79998224-6a43-4048-97e9-4cc9f028deb7`
- **Identificador Universal do 8D (`varid8d`):** 
  Formado pela primeira letra da classificação da RNC seguida do ID da RNC:
  ```powerappsfl
  varid8d = Left(ThisItem.Classificação.Value, 1) & " - " & ThisItem.ID
  // Exemplo: "I - 4520" (Interna) ou "C - 5119" (Cliente)
  ```
- **Perfil de Acesso (`varperfil`):**
  Obtido no `App.OnStart` pela lista `Usuários ocorrências qualidade`:
  ```powerappsfl
  Set(varRE, LookUp('Usuários ocorrências qualidade', nome = User().FullName, RE_Acesso));
  Set(varperfil, LookUp('Usuários ocorrências qualidade', nome = User().FullName, Título)); // "Admin", "Adminqual", "USER"
  ```

---

## 2. Mapa de Fontes de Dados (SharePoint Lists)

| Nome da Lista | Papel no Sistema | Chave de Ligação |
|---|---|---|
| `tratativa_produto_nao_conforme` | Cadastro mestre das RNCs / Ocorrências | `ID` |
| `lista_participantes` | Metadados do 8D, equipe (2D), aprovações e revisões (4D-8D) | `id8d = varid8d` |
| `lista_henkaten` | Pontos de mudança nos 6M (4D) | `id8d = varid8d` |
| `lista_entrevista8d` | Investigação Gemba, entrevistas e simulação (4D) | `id8d = varid8d` |
| `lista_ishikawa` | Causas do diagrama Ishikawa (6M) e 5 Porquês (4D) | `id8d = varid8d` |
| `'Action plan'` | Cabeçalho do Plano de Ação do 8D | `idprograma = varid8d` |
| `'Action plan_acoes'` | Itens de ação corretivas (5D), abrangência/poka-yoke (6D), preventivas (7D) e validação (8D) | `id_programa_acoes = varid8d` |
| `BASE_ATIVOS` | Catálogo de colaboradores/funcionários ativos | `'Nº pess.'`, `'Nº pessoal'`, `email` |
| `Usuários ocorrências qualidade` | Gestão de permissões e perfis de acesso | `nome = User().FullName` |
| `dados_areas_fmds` | Áreas e sub-áreas FMDS | `fmds`, `sub_fmds` |
| `lista_geral_peças_aa3` | Catálogo geral de peças e postos de trabalho | `Material`, `Componente`, `Posto` |
| `lotes_sap_reg`, `etiquetas_vivas`, `rast_cabeceiras` | Dados auxiliares de rastreabilidade | `idrnc = varitemselec.ID` |

---

## 3. Telas e Fluxos do Aplicativo

### Tela 0: Menu inicial (`Menu inicial`)
- **Objetivo:** Ponto de entrada do usuário no módulo de 8D.
- **Elementos Principais:**
  - Banner de boas-vindas: `"Seja bem-vindo(a), " & User().FullName`
  - Indicador do perfil do usuário: `varperfil`
  - Botão `"8D QUAL/ LOG."`: Executa `Navigate(galeria_apprnc)`

---

### Tela 1: Galeria de RNCs para 8D (`galeria_apprnc`)
- **Objetivo:** Lista centralizada de RNCs elegíveis para abertura e tratativa de 8D.
- **Fonte de Dados:** `tratativa_produto_nao_conforme`
- **Filtro Estrito do 8D:**
  ```powerappsfl
  abrir_8d = "Sim" And local_8d = "APP"
  ```
- **Filtros Adicionais em Tela:**
  - Área FMDS (`cb_area.Selected.Value`)
  - Tipo de RNC (`cb_tipornc.Selected.Value`)
  - Cliente (`cb_cliente.Selected.Value`)
  - Setor / Classificação (`cb_setor.Selected.Value`)
  - Busca por ID (`filter_id.Value`)
- **Coleções Pré-carregadas (`Icon3_3.OnSelect`):**
  - `col2d` (`lista_participantes`): Validação (`validar_8d`), contagem de participantes, revisões.
  - `col4d` (`lista_ishikawa`): Causas marcadas como `"NG"`.
  - `col5d` (`Action plan_acoes`): Totalizador de ações por disciplina:
    - `totalCont3D`: `tipo_acao.Value = "CONTENÇÃO"`
    - `totalsemcontenc`: `tipo_acao.Value <> "CONTENÇÃO"` (Ações 5D)
    - `totalyokoten`: `yokoten.Value = "SIM"` (Abrangência 6D)
    - `totalpokayoke`: `poka_yoke.Value = "SIM"` (Poka-Yoke 6D)
    - `totalContfmea`, `totalConttp`, `totalContauditoria`: Ações preventivas 7D
    - `totalvalidado`: `status = "Validado"` (Validação 8D)
- **Ação ao Selecionar Card (`OnSelect`):**
  - `Set(varitemselec, ThisItem)`
  - `Set(varid8d, Left(ThisItem.Classificação.Value, 1) & " - " & ThisItem.ID)`
  - `Set(vartipo8d, "qualilog")`
  - Preenche coleções de rastreabilidade
  - `Navigate(etapa_1d)`

---

### Tela 2: 1D - Detalhes da Ocorrência (`etapa_1d`)
- **Objetivo:** Exibir a ficha cadastral integral da RNC (espelho da tela de detalhes do app principal).
- **Conteúdo Exibido:**
  - Código, Cliente, Data, Turno, Peça, Quantidade e Defeito.
  - Detalhamento do impacto e descrição interna.
  - Fotos da não-conformidade (`imgok_1`, `imgng_1`, `imgaux_1`).
  - Medidas de contenção iniciais, carryover, disposição do produto e co-produtos.
- **Navegação Lateral:** Componente `menubar_2` permitindo transitar diretamente para qualquer etapa (1D a 8D).

---

### Tela 3: 2D - Equipe e Participantes (`etapa_2d`)
- **Objetivo:** Cadastrar e gerenciar os membros da equipe multidisciplinar do 8D.
- **Formulário:** `Form_participantes`
  - **Fonte de Dados:** `lista_participantes`
  - **Item:** `LookUp(lista_participantes, id8d = varid8d)`
- **Campos:**
  - `participantes_8d`: String com nomes concatenados por vírgula (`Concat(ComboBox1.SelectedItems, Value, ",")`).
  - `id8d`: Chave única do 8D (`varid8d`).
- **Seleção:** `ComboBox1` alimentado por `BASE_ATIVOS` (`col_func`).
- **Galeria de Visualização e Exclusão (`Gallerypart`):**
  - `Items: Split(LookUp(lista_participantes, id8d = varid8d, participantes_8d), ",")`
  - Botão de exclusão por participante que atualiza a lista via `Patch`.

---

### Tela 4: 3D - Rastreabilidade (`etapa_3d`)
- **Status Atual:** Em branco (placeholder de 86 bytes mantido no menu). As coleções de rastreabilidade (`col_listarastreab`, `col_lotes_sap_reg`, `col_etiquetas_vivas`, `col_rast_cabeceiras`) continuam sendo inicializadas na seleção da RNC.

---

### Tela 5: 4D - Análise de Causa Raiz (`etapa_4d`)
Contém quatro grandes etapas investigativas controladas por abas:

1. **Henkaten (Pontos de Mudança - `varhenk`):**
   - **Formulário:** `Formhktn` (`lista_henkaten`)
   - **Campos de Verificação nos 6M:**
     - Máquina: `maqhkt` + `maq_comentarios`
     - Mão de Obra: `mohkt` + `mo_comentarios`
     - Método: `methkt` + `met_comentarios`
     - Material: `mathkt` + `mat_comentarios`
     - Medição: `medhkt` + `med_comentarios`
     - Meio Ambiente: `mambhkt` + `mamb_comentarios`
     - Evidências: `Anexos`
2. **Investigação Gemba & Entrevistas (`varent`):**
   - **Formulário:** `Form_entrev8d` (`lista_entrevista8d`)
   - **Campos:** `gemba`, `rastreabilidade`, `entrevista`, `simulacao`, comentários dos 6M e `Anexos`.
3. **Diagrama de Ishikawa / Espinha de Peixe (`varishik`):**
   - **Galerias de Visualização:** 6 galerias dedicadas aos 6Ms (`Gallery_maq`, `Gallery_mo`, `Gallery_met`, `Gallery_mat`, `Gallery_med`, `Gallery_ma`), filtradas por `seisms.Value` e `id8d = varid8d`.
   - **Formulário de Cadastro:** `Form1` (`lista_ishikawa`)
     - `descricao_causa`: Descrição da causa provável
     - `seisms`: Qual M pertence
     - `ocnd`: Ocorrência ou Não-Detecção
     - `okng`: Classificação da hipótese (**OK** = Descartada, **NG** = Causa Provável/Confirmada)
4. **Cinco Porquês (5 Why's - `var5pq`):**
   - **Galeria:** `Gallery_maq_1` (lista somente as causas com `okng.Value = "NG"`).
   - **Formulário:** `Form_5pq` (`lista_ishikawa` vinculado ao item selecionado `varitemselect`).
   - **Campos:** `umpq`, `doispq`, `trespq`, `quatropq`, `cincopq` e `Anexos`.
5. **Ciclo de Revisão do 4D:**
   - Botão/Banner: `"4D Revisado"` (verde) / `"Revisar 4D"` (vermelho).
   - Modal com `Form4_1` (`lista_participantes`): exibe `4D_comentarios_revisao` e grava `4D_revisado = true`.

---

### Tela 6: 5D - Ações Corretivas (`etapa_5d`)
- **Objetivo:** Definir as ações corretivas definitivas para eliminar a causa raiz (5º Porquê).
- **Cabeçalho:** `Formactionplan` (`'Action plan'`), exibindo dados consolidados do programa.
- **Galeria de Ações:** `Galleryacoes` (`'Action plan_acoes'` filtrado por `id_programa_acoes = varid8d`).
- **Integração com o App de Plano de Ação:**
  - **App ID:** `bb7b1186-e490-40e2-980e-ba5defd05877`
  - **Lógica de Concatenação dos 5 Porquês:**
    O botão extrai automaticamente a causa raiz profunda (último porquê preenchido de cada causa NG) e repassa para o Plano de Ação:
    ```powerappsfl
    Set(col5pqs, Concat(ForAll(Gallery_maq_1.AllItems, {
        UltimaColunaPreenchida: If(!IsBlank(cincopq), cincopq,
            If(!IsBlank(quatropq), quatropq,
            If(!IsBlank(trespq), trespq,
            If(!IsBlank(doispq), doispq,
            If(!IsBlank(umpq), umpq)))))}), UltimaColunaPreenchida, " - " & Char(10)));
    ```
  - **Parâmetros no Launch:**
    - `idprograma: varid8d`
    - `apporigem: "3"` (Novo) ou `"2"` (Editar)
    - `var8d: "5D"`
    - `causas5pq: col5pqs`
    - `areafmds`, `produto`, `posto`, `descricao`
- **Ciclo de Revisão do 5D:** `5D_revisado`, `5D_comentarios_revisao`.

---

### Tela 7: 6D - Abrangência & Poka-Yoke (`etapa_6d`)
- **Objetivo:** Estender as soluções para outras linhas/peças semelhantes (Yokoten) e avaliar dispositivos à prova de falha (Poka-Yoke).
- **Formulário de Diretrizes:** `Formyokoten` (`lista_participantes`)
  - `yokoten`: Decisão de abrangência (Sim / Não / Justificativa).
  - `poka_yoke`: Necessidade de dispositivo à prova de erro (Sim / Não).
- **Galeria de Ações de Abrangência:** `Galleryacoes_1` (`'Action plan_acoes'` filtrado por `yokoten.Value = "SIM"`).
- **Integração:** Launch para o App de Plano de Ação com `var8d: "6D"`.
- **Ciclo de Revisão do 6D:** `6D_revisado`, `6D_comentarios_revisao`.

---

### Tela 8: 7D - Ações Preventivas e Lições Aprendidas (`etapa_7d`)
- **Objetivo:** Atualização de documentações sistêmicas para prevenir reincidência.
- **Três Eixos Obrigatórios (`8d_7d`):**
  1. **FMEA** (Análise de Modos de Falha e Efeitos)
  2. **Trabalho Padronizado** (Instruções de trabalho, SOS, folhas de operação)
  3. **Auditoria Escalonada** (LPA / Layered Process Audit)
- **Galeria:** `Galleryacoes_5` (`'Action plan_acoes'` filtrada por `'8d_7d'.Value = "FMEA" Or "Trabalho Padronizado" Or "Auditoria Escalonada"`).
- **Formulário de Cadastro Direto:** `Formnovaacao` (`'Action plan_acoes'`).
- **Integração:** Launch para o App de Plano de Ação com `var8d: "7D"`.
- **Ciclo de Revisão do 7D:** `7D_revisado`, `7D_comentarios_revisao`.

---

### Tela 9: 8D - Validação das Ações & Aprovação Final (`etapa_8d`)
A etapa final de encerramento do ciclo 8D, dividida em dois blocos operacionais:

#### Bloco 1: Validação Individual de Cada Ação (`Formvalidaracao`)
- A qualidade audita cada ação da lista `Galleryacoes_2`:
  - **Aprovar Ação:**
    ```powerappsfl
    UpdateContext({statusvalid: "Validado", statusconcluido: "Sim"});
    SubmitForm(Formvalidaracao);
    ```
  - **Reprovar / Solicitar Revisão da Ação:**
    ```powerappsfl
    UpdateContext({
      statusvalid: If(Galleryacoes_2.Selected.data_planejada < Today(), "Atrasado", "Aberto"),
      status_revisar: "Revisar",
      statusconcluido: "Não",
      statusmsgrevisar: DataCardValue22_2.Text
    });
    SubmitForm(Formvalidaracao);
    ```

#### Bloco 2: Aprovação Final ou Solicitação de Revisão do 8D (`Form4`)
- **Fonte de Dados:** `lista_participantes` (`id8d = varid8d`)
- **Permissão de Acesso:** Apenas perfis `"Admin"` ou `"Adminqual"` podem editar/salvar (`DisplayMode = If(varperfil = "Admin" Or varperfil = "Adminqual", DisplayMode.Edit, DisplayMode.View)`).
- **Campos de Controle de Revisão:**
  - `validar_8d`: Status final da validação do 8D ("Aprovado", "Reprovado", etc.).
  - `comentarios_validacao`: Parecer descritivo da qualidade.
  - `4D_revisado` (bool) & `4D_comentarios_revisao` (texto)
  - `5D_revisado` (bool) & `5D_comentarios_revisao` (texto)
  - `6D_revisado` (bool) & `6D_comentarios_revisao` (texto)
  - `7D_revisado` (bool) & `7D_comentarios_revisao` (texto)
  - `Anexos`: Relatório ou evidências consolidadas.
- **Regra de Negócio de Revisão:**
  Se o auditor da qualidade não aprovar o 8D integralmente, ele preenche os comentários de revisão das etapas com pendência (4D, 5D, 6D ou 7D) e marca `revisado = false`. Nos respectivos módulos, as telas ativam o banner vermelho `"Revisar XD"`, obrigando os responsáveis a ajustar o conteúdo antes de submeter novamente à qualidade no 8D.

---

## 4. Estrutura Recomendada para a API (sor-web-sp)

Para que a aplicação web receba e processe respostas do 8D de forma idêntica e integrada ao SharePoint, a API proxy deverá suportar os seguintes endpoints correspondentes:

1. `GET /api/sp/8d/rncs` -> Retorna as RNCs filtradas por `abrir_8d eq 'Sim' and local_8d eq 'APP'`.
2. `GET /api/sp/8d/:id8d/resumo` -> Retorna o pacote completo do 8D consolidado:
   - Dados cadastrais (`tratativa_produto_nao_conforme`)
   - Metadados e Equipe (`lista_participantes`)
   - Henkaten (`lista_henkaten`)
   - Investigação (`lista_entrevista8d`)
   - Ishikawa & 5 Porquês (`lista_ishikawa`)
   - Plano de Ação e Itens (`Action plan` e `'Action plan_acoes'`)
3. `POST /api/sp/8d/:id8d/participantes` -> Atualização da equipe 2D.
4. `POST /api/sp/8d/:id8d/henkaten` -> Criação/Edição do Henkaten 4D.
5. `POST /api/sp/8d/:id8d/investigacao` -> Criação/Edição de entrevistas e Gemba 4D.
6. `POST /api/sp/8d/:id8d/ishikawa` -> Adição/Edição de causas e 5 Porquês 4D.
7. `PATCH /api/sp/8d/acoes/:acaoId/validar` -> Validação/reprovação de ação individual (8D).
8. `POST /api/sp/8d/:id8d/validacao-final` -> Fechamento final e gravação de pareceres/revisões na `lista_participantes` (8D).
