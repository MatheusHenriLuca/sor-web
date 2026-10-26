# Plano de Implementação — Revisão Geral do Fluxo RNC, Detalhamento, Rastreabilidade, Metodologia 8D e Plano de Ação

Este plano organiza e detalha todas as alterações solicitadas para o formulário de RNC, telas de Detalhamento da Ocorrência, Rastreabilidade e Contenção, Metodologia 8D e Plano de Ação.

---

## 1. Padronização Global de Nomenclaturas e Campos de Seleção (`SearchableSelect`)

### 1.1. Substituição Global de `"Montadora"` por `"Cliente"` e Remoção de `"FMDS"`
- **Formulário de Abertura/Edição (`Registro8DView.tsx`)**:
  - Alterar o título do Bloco 1 de `"1. Dados Gerais & Montadora"` para **`"1. Dados Gerais & Cliente"`**.
  - Alterar o rótulo do campo `"Cliente (Montadora)"` para **`"Cliente"`**.
  - Alterar o título do Bloco 2 de `"2. Peça, Posto & FMDS (Autopreenchimento ProEPS)"` para **`"2. Informações do posto e produto"`**.
  - Alterar o rótulo `"Área FMDS / Setor Fabril"` para **`"Área / Setor Fabril"`**.
- **Metodologia 8D (`Metodologia8DPanel.tsx`), Detalhamento (`Detalhes8DView.tsx`), Relatório 8D (`DetalhesImpressaoView.tsx` e `export8DPdf.ts`) e demais listagens**:
  - No 1D e cabeçalhos de resumo, substituir `"Montadora:"` por **`"Cliente:"`** e `"Posto / Linha / FMDS:"` por **`"Posto / Linha:"`**.
  - Remover menções a `"FMDS"` e `"Montadora"` nos rótulos visíveis em todas as telas do sistema.

### 1.2. Regra Global para Dropdowns até 5 Opções (`SearchableSelect.tsx`)
- Em `/src/components/SearchableSelect.tsx`, ajustar a renderização do cabeçalho de busca (`"Digite para pesquisar..."` e contador de opções):
  - Quando a lista de opções tiver **até 5 itens (`options.length <= 5`)**, **ocultar o campo de pesquisa** e exibir diretamente as opções para seleção imediata.
  - Exibir a barra de pesquisa apenas quando houver **mais de 5 opções (`options.length > 5`)**.

---

## 2. Formulário de RNC (`Registro8DView.tsx`) e Catálogo de Produtos (`sharepointService.ts` / `types/index.ts`)

### 2.1. Seleção de Componentes vinculados à Peça Final (Bloco 2)
- Em `sharepointService.ts` (`INITIAL_PECAS` e `getComponentesPorProduto`), estruturar os componentes filhos (`nestingLevel: 1`) vinculados aos produtos finais (`nestingLevel: 0`) de cada família/cliente.
- Quando o usuário selecionar `"Peça Final + Componente"` em **Tipo de Peça Rastreada** e escolher um **Produto Final**, o campo **Componente (Item Filho)** exibirá a lista de componentes daquele produto final no seletor (permitindo escolher qual componente específico apresentou defeito, em vez de preencher apenas uma descrição estática).

### 2.2. Atributos da Peça: `"Peça comum"`, `"Co-produto (Espelho)"` e `"Peça de Segurança (FMEA)"` (Bloco 2)
- Alterar o rótulo `"Carry Over"` para **`"Peça comum"`** em todo o sistema.
- Expandir `PecaCatalogo` e `RNCRecord` (`/src/types/index.ts`) com os campos de detalhamento vindos do cadastro do produto:
  - `pecasComuns?: string` — lista/descrição de quais peças compartilham esse componente em comum (exibido quando `Peça comum = Sim`).
  - `pecaEspelho?: string` — código e descrição da peça espelho correspondente ao item selecionado (exibido quando `Co-produto (Espelho) = Sim`).
  - `aspectoSeguranca?: string` — informação sobre qual aspecto/requisito de segurança FMEA se aplica ao item (exibido quando `Peça de Segurança (FMEA) = Sim`).
- Ao selecionar a Peça Final ou Componente, preencher automaticamente tanto os indicadores (`Sim`/`Não`) quanto os detalhes (`pecasComuns`, `pecaEspelho`, `aspectoSeguranca`) a partir da lista cadastrada de produtos (`master_pecas_produtos`), mantendo os campos editáveis no formulário caso o usuário altere manualmente para `"Sim"`.

### 2.3. Ajustes do Bloco 3 — Evidências & Classificação da Falha
- **Remoção do badge `"Modo de Falha"`**: Remover a tag/pílula `"Modo de Falha"` exibida ao lado do título `"Classificação do Defeito (Modo de Falha)"`.
- **Independência entre os campos de Detalhamento**: Desvincular o campo `"Detalhamento da ocorrência (cliente)"` (`detalhamentoOcorrencia`, do Bloco 1) do campo `"Detalhamento Técnico da Não Conformidade"` (`descricaoProblema`, do Bloco 3), garantindo que o texto digitado no Bloco 1 não sobrescreva nem duplique o detalhamento técnico do Bloco 3.
- **Correção das opções de `"Detecção no Processo?"` (`possivelDetectar`)**: Corrigir a formatação das opções em `Registro8DView.tsx` e `tenantService.ts` para eliminar a duplicação `"Sim (Sim (Falha de Inspeção...))"` e `"Não (Não (Defeito Latente...))"`, exibindo o texto limpo e sem repetição.

---

## 3. Tela de Detalhamento da Ocorrência (`Detalhes8DView.tsx`)

### 3.1. Alinhamento com o Formulário de RNC e Layout de Fotos
- Atualizar todos os títulos, rótulos e a sequência de informações na aba **Relatório Detalhado** para refletir fielmente os blocos do formulário de RNC:
  - Bloco 1: `"Cliente"`, dados de abertura, turno, severidade e detalhamento da ocorrência (cliente).
  - Bloco 2: `"Informações do posto e produto"`, `"Área / Setor Fabril"`, Peça Final, Componente e os **Atributos da Peça** (`Peça comum` + quais peças têm em comum, `Co-produto (Espelho)` + peça espelho, `Peça de Segurança (FMEA)` + aspecto de segurança).
  - Bloco 3: Manter as fotos padrão **OK** e **NG** lado a lado e a foto de **Detalhamento Adicional / Auxiliar** logo abaixo, ao lado da seção de **Operadores Treinados**.

### 3.2. Substituição do Formulário de Lotes por Resumo de Rastreabilidade
- **Remover** o `"Formulário de Rastreabilidade e Verificação de Lotes (3D)"` da tela de Detalhamento da Ocorrência (pois o lançamento de lotes é feito exclusivamente na tela de **Rastreabilidade e Contenção**).
- No lugar do formulário de inserção, exibir as informações de **Rastreabilidade Inicial** preenchidas na abertura da RNC (`Tipo de Documento`, `Código do Documento` ou `Data Inicial / Data Final`) acompanhadas da tabela de consulta dos lotes já apontados.

### 3.3. Alerta da Qualidade / Disposição (Imagem 6)
- Na visualização **Alerta Qualidade / Disposição**, remover o indicador duplicado `"Quantidade Afetada: X Peça(s)"` do canto superior direito do cabeçalho do card, mantendo apenas o campo `"Quantidade de Peças"` na grade principal logo abaixo.

---

## 4. Tela de Rastreabilidade e Contenção (`RastreabilidadeView.tsx` e `Detalhes8DView.tsx`)

- No seletor superior de modos da ocorrência (`Detalhes8DView.tsx`), alterar o rótulo do botão `"Rastrear SAP"` para **`"Rastreabilidade e Contenção"`**.
- Em `/src/views/RastreabilidadeView.tsx`:
  - Alterar o título da tela para **`"Rastreabilidade e Contenção"`**.
  - Padronizar a barra de cabeçalho superior para seguir exatamente o mesmo layout executivo da tela de Detalhamento da Ocorrência (com botão Voltar, código da RNC, status, responsável e a barra de alternância entre `Relatório Detalhado`, `Alerta Qualidade / Disposição`, `Metodologia 8D (1D - 8D)` e `Rastreabilidade e Contenção`).

---

## 5. Metodologia 8D (`Metodologia8DPanel.tsx`) e Integração com Plano de Ação (`PlanoAcaoView.tsx`)

### 5.1. Regras e Layout da Etapa 2D (Equipe Multifuncional)
- **Mínimo de 3 participantes**: Alterar a regra de conclusão da etapa **2D** (`isEtapaConcluida('2D')`) para exigir **no mínimo 3 integrantes** na equipe multifuncional (`participantesList.length >= 3`) antes de liberar o avanço para o **3D**.
- **Correção visual da barra de busca do 2D**: Ajustar o posicionamento do ícone de lupa no campo `"Buscar colaborador ativo por nome, RE ou departamento..."` para que o ícone fique perfeitamente alinhado à esquerda sem sobrepor o texto digitado ou o placeholder.

### 5.2. Navegação de Retorno entre 8D (`3D`, `5D`, `6D`, `7D`, `8D`) e Plano de Ação
- Ao clicar em **"Ver no Plano de Ação"** (ou **"Abrir Plano de Ação"**) dentro de qualquer etapa do 8D (`3D`, `5D`, `6D`, `7D` ou `8D`), enviar no contexto de navegação a origem `{ planHeaderId, fromScreen: 'detalhes-8d', rncId: rnc.id, returnEtapa8D: activeEtapa }`.
- Em `PlanoAcaoView.tsx`, ao clicar no botão **"Voltar"** dentro da visualização detalhada do plano, verificar se o usuário veio da tela do 8D (`fromScreen === 'detalhes-8d'`) e, nesse caso, **retornar diretamente para a tela do 8D na mesma etapa em que estava**, em vez de levá-lo para o Kanban geral de Planos de Ação.

### 5.3. Obrigatoriedade Completa de Gemba e Henkaten na Etapa 4D
- **Gemba Investigation (`isGembaDone`)**: Tornar **todos os 4 campos** (`O que foi observado no Gemba?`, `Entrevista com Operadores / Liderança`, `Teste / Simulação do Defeito` e `Análise de Rastreabilidade / Histórico`) obrigatórios para considerar o Gemba concluído, liberar a sub-aba **Henkaten (6M)** e permitir salvar/concluir o 4D.
- **Henkaten 6M (`isHenkatenDone`)**: Exigir que todos os 6 fatores (`Mão de Obra`, `Máquina`, `Material`, `Método`, `Meio Ambiente`, `Medida`) estejam avaliados e, para qualquer item marcado como `"Sim"`, que a descrição da mudança também esteja preenchida e salva, antes de liberar a sub-aba **Ishikawa + 5 Porquês** e antes de considerar a etapa **4D** concluída.

### 5.4. Ampliação do Pop-up `"Nova Ação Vinculada ao Plano"` (`3D`, `5D`, `6D`, `7D`)
- Aumentar a largura do modal **"Nova Ação Vinculada ao Plano"** de `max-w-lg` para **`max-w-2xl`** com espaçamento interno otimizado, garantindo que os seletores de Causa Raiz (5D), Descrição da Ação, Responsável, Prazo e Eixo 7D fiquem amplos e sem truncamento visual.

### 5.5. Etapa 8D — Fluxo de Aprovação Final e Solicitação de Revisão com Assinatura Digital
- Reformular o painel de decisão final do **8D** (exclusivo para Admin Qualidade) para que, ao **Aprovar** ou **Solicitar Revisão**:
  - Exiba claramente os **dados do aprovador logado** (Nome completo, Cargo/Perfil `"Admin Qualidade"`, Matrícula/RE) e o **registro de data e hora da assinatura digital**.
  - Disponibilize o **campo de comentário/parecer final da Qualidade** (`parecerAprovacao8D`) tanto para aprovação quanto para revisão.
  - Apresente os botões claros de confirmação (**"Confirmar Aprovação Final 8D"** e **"Solicitar Revisão"**), gravando o parecer, o responsável e o carimbo de data/hora exato na assinatura digital do relatório 8D.
