# Arquitetura SaaS Multi-Tenant — SOR Web (Gestão de RNCs e Qualidade)

Transformação do sistema SOR em uma plataforma **SaaS Multi-Tenant escalável**, com isolamento estrito de dados por empresa (`tenant_id`), console gerencial de Super Administrador (`/super-admin`) com recurso de *Impersonation*, customização White-Label por cliente, compressão automática de fotos em WebP no navegador e carga inicial do tenant piloto **GPM Serviços** com 10 ocorrências formais realistas.

---

## Decisões Críticas e Alinhamento Confirmado

> [!IMPORTANT]
> As diretrizes abaixo foram confirmadas diretamente com você e regem toda a implementação arquitetural deste plano:

- **Camada de Banco de Dados Híbrida (Supabase + Fallback Local)**: Fornecimento do script SQL completo (DDL + políticas de Row Level Security + Storage Bucket) pronto para o Supabase PostgreSQL, aliado a um repositório híbrido que conecta automaticamente ao Supabase quando as credenciais estão presentes ou opera em armazenamento local multi-tenant isolado para homologação imediata a custo zero.
- **Escopo Focado do Modelo Relacional Multi-Tenant**: Isolamento multi-tenant concentrado nas entidades essenciais do produto: **Tenants (Empresas)**, **Usuários**, **RNCs**, **Treinamentos**, **Histórico de Ações** e **Cadastros Mestres por Empresa** (Clientes/Montadoras, Áreas Fabris/FMDS, Postos de Trabalho e Catálogo de Defeitos).
- **Rota Raiz com Login Global Inteligente por E-mail**: Ao acessar a raiz do sistema, o usuário encontra a **Tela de Login Global SaaS**, que identifica automaticamente a empresa vinculada ao e-mail informado (ou a credencial de Super Admin) e redireciona para o ambiente correspondente (`/:empresa-slug/dashboard` ou `/super-admin`), mantendo também o suporte ao login direto personalizado em `/:empresa-slug/login`.
- **Atalhos Rápidos de Demonstração por Perfil**: A tela de login combina autenticação por e-mail e senha com botões de acesso rápido de 1 clique para testar imediatamente os papéis de **Super Admin do SaaS**, **Admin da Empresa (GPM Serviços)**, **Engenharia/Qualidade** e **Operador Fabril**.

---

## 1. Visão Geral e Conceito Central

- **O Que Entrega**: Uma plataforma B2B pronta para comercialização, onde múltiplas indústrias utilizam a mesma infraestrutura de código com dados 100% isolados, identidade visual própria (logotipo e cor primária aplicada dinamicamente) e administração centralizada pelo proprietário do SaaS.
- **Público-Alvo e Personas**:
  - **Super Administrador do SaaS**: Gerencia empresas clientes (onboarding, limites de usuários/armazenamento, suspensão por inadimplência, métricas globais e suporte via *Impersonation*).
  - **Administrador da Empresa (Tenant Admin)**: Personaliza a marca da sua fábrica (White-Label), gerencia cadastros mestres locais (montadoras, linhas, postos, modos de falha) e administra sua equipe.
  - **Analistas da Qualidade e Operadores**: Registram ocorrências, anexam evidências fotográficas otimizadas em WebP, acompanham tratativas, gerenciam treinamentos e imprimem relatórios padronizados com o timbre da própria empresa.
- **Proposta de Valor**: Operação inicial a custo zero (R$ 0,00/mês no Free Tier do Supabase + Cloudflare Pages/Vercel), reduzindo em ~95% o consumo de armazenamento de imagens via compressão client-side para WebP.

---

## 2. Experiência do Usuário e Design Visual

### Fluxos Principais de Navegação e Roteamento
1. **Login Global Inteligente (`/` ou `/login`)**:
   - O usuário insere seu e-mail e senha (ou aciona um dos botões de acesso rápido de homologação).
   - O motor de autenticação resolve o `tenant_id` e o `papel` do usuário:
     - Se `papel === 'super_admin'`, redireciona para `/super-admin`.
     - Se vinculado a uma empresa ativa (ex.: `gpm-servicos`), injeta o contexto do tenant e redireciona para `/gpm-servicos/dashboard`.
     - Se a empresa estiver com status `suspenso` ou `cancelado`, exibe aviso claro de bloqueio administrativo.
2. **Login Contextualizado por Slug (`/:empresa-slug/login`)**:
   - Consulta os metadados públicos do tenant a partir do slug na URL e renderiza a tela de acesso já com o logotipo, nome da empresa e cor primária da marca.
3. **Console do Super Administrador (`/super-admin`)**:
   - Visão executiva com indicadores globais (Total de Empresas Ativas, Total de Usuários, RNCs Registradas e Consumo Estimado de Storage em MB).
   - Tabela de gestão de empresas com criação de novo tenant + primeiro administrador, edição de limites (`max_usuarios`, `max_storage_mb`), alternância de status (`ativo`, `suspenso`, `cancelado`) e botão **"Acessar como Empresa" (Impersonation)**.
   - Quando em modo *Impersonation*, uma barra superior discreta e de alto contraste informa que o Super Admin está visualizando o ambiente da empresa selecionada, permitindo retornar ao console `/super-admin` com 1 clique.
4. **Ambiente Operacional e Configurações White-Label (`/:empresa-slug/*`)**:
   - Cabeçalho e barra lateral exibem o logotipo e a cor primária (`--brand-primary`) configurados pela empresa, mantendo a navegação limpa e sem poluição visual.
   - Nova área de **Configurações da Empresa & Cadastros Mestres** acessível a administradores da empresa para atualizar logotipo, paleta de cor primária, clientes/montadoras, áreas fabris, postos de trabalho, catálogo de defeitos e usuários internos.

### Identidade Visual, Tipografia e Ergonomia (Padrão SaaS Industrial)
- **Direção Estética**: *Industrial Clean de Alta Densidade*, com superfícies planas de elevação única (`border border-slate-200`, sem cards aninhados com sombras pesadas) e hierarquia visual clara para uso tanto em escritórios quanto em tablets de chão de fábrica.
- **Paleta de Cores & White-Label Dinâmico (60-30-10)**:
  - **60% Canvas Neutro**: Fundo principal `#f8fafc` com containers brancos puros `#ffffff`.
  - **30% Superfícies Estruturais**: Bordas sutis `#e2e8f0` e tipografia secundária `#475569`.
  - **10% Orçamento de Destaque (`--brand-primary`)**: Cor primária dinâmica injetada pelo Tenant ativo (ex.: `#0b5796` ou `#0f766e` para GPM Serviços), acompanhada de cores semânticas fixas para estados operacionais: Verde (`#16a34a` Ativo/Concluído), Âmbar (`#d97706` Em Análise/Alerta) e Vermelho (`#dc2626` Crítico/Suspenso) sempre pareadas com rótulos textuais claros.
- **Tipografia e Disciplina Tabular**:
  - Títulos e Navegação em `Outfit` / `Plus Jakarta Sans`; corpo de alta legibilidade em `Plus Jakarta Sans`.
  - Todos os códigos de RNC, contadores de ocorrências, cotas de armazenamento (MB), datas e quantidades utilizam obrigatoriamente `font-mono tabular-nums` (`JetBrains Mono`) para alinhamento vertical perfeito nas tabelas e KPIs.
- **Completude de Estados**:
  - Todas as listagens (Tenants, RNCs, Treinamentos e Cadastros Mestres) possuem estados populados, empty states orientativos com ação primária imediata, feedback de carregamento e filtragem instantânea em memória.

---

## 3. Decisões de Produto e Trade-Offs Arquiteturais

- **Decisão 1: Arquitetura Shared Database, Shared Schema com RLS + Repositório Híbrido**
  - *Abordagem Escolhida*: Todas as tabelas de domínio possuem a coluna obrigatória `tenant_id`. No PostgreSQL (Supabase), políticas de Row Level Security validam `tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'` ou `is_super_admin = true`. No modo local/híbrido, o serviço de dados aplica o mesmo filtro de isolamento por `tenant_id` em todas as leituras e gravações.
  - *Por quê*: Garante segurança em nível de banco de dados em produção e permite testar 100% dos fluxos multi-tenant, criação de novas empresas e *Impersonation* imediatamente no navegador.
- **Decisão 2: Compressão Fotográfica Client-Side para WebP (Full HD 1920x1080, Qualidade 80%)**
  - *Abordagem Escolhida*: Antes de persistir qualquer foto de peça OK, peça NG ou evidência auxiliar, um processador baseado em HTML5 Canvas redimensiona e codifica a imagem em formato WebP, registrando o tamanho final em KB para atualizar o medidor de cota do tenant (`max_storage_mb`).
  - *Por quê*: Reduz fotos de 8–15 MB para ~250 KB, permitindo armazenar até 4.000 fotos dentro de 1 GB gratuito do Supabase Storage e acelerando o envio em redes móveis industriais.
- **Decisão 3: Isolamento de Cadastros Mestres por Empresa**
  - *Abordagem Escolhida*: Em vez de listas fixas no código, os seletores de Clientes/Montadoras, Áreas Fabris, Postos de Trabalho e Catálogo de Defeitos do formulário de RNC passam a ler os cadastros do tenant ativo.
  - *Por quê*: Permite que a `GPM Serviços` ou qualquer nova indústria cliente configure suas próprias linhas, máquinas e clientes sem interferir nas demais empresas da plataforma.

---

## 4. Arquitetura Técnica e Estratégia de Dados

### Diagrama de Arquitetura e Hierarquia de Componentes

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        ROTEADOR MULTI-TENANT & AUTH GUARD                        │
│   • / ou /login          ──► Login Global SaaS (Descoberta de Tenant por E-mail) │
│   • /super-admin         ──► Console Super Admin (Gestão Global + Impersonation) │
│   • /:empresa-slug/login ──► Login White-Label Contextualizado da Empresa        │
│   • /:empresa-slug/*     ──► Workspace da Empresa (Injeção CSS --brand-primary)  │
└───────────────────┬──────────────────────────────────────────┬───────────────────┘
                    │                                          │
                    ▼                                          ▼
┌───────────────────────────────────────┐  ┌───────────────────────────────────────┐
│        CONSOLE SUPER ADMIN            │  │       WORKSPACE DO TENANT ATIVO       │
│ • KPIs Globais (Tenants, RNCs, Disco) │  │ • Banner de Impersonation (se ativo)  │
│ • CRUD de Empresas & Limites de Uso   │  │ • Dashboard, Galeria & Registro RNC   │
│ • Ativação / Suspensão Instantânea    │  │ • Matriz de Treinamentos & Histórico  │
│ • Chaveamento Impersonate (1 clique)  │  │ • Configurações White-Label & Mestres │
└───────────────────┬───────────────────┘  └───────────────────┬───────────────────┘
                    │                                          │
                    └───────────────────┬──────────────────────┘
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                CONTEXTO GLOBAL MULTI-TENANT & COMPRESSOR DE MÍDIA                │
│   • TenantContext: tenantAtivo, usuarioAutenticado, isImpersonating, temaCSS     │
│   • WebP Image Compressor: Canvas 1920x1080 (q=0.80) + Cálculo de Quota em MB    │
└───────────────────────────────────────┬──────────────────────────────────────────┘
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│              CAMADA DE DADOS HÍBRIDA (SUPABASE CLIENT + LOCAL FALLBACK)          │
│   • Conector Supabase (PostgreSQL + Auth + Storage /tenants/{tenant_id}/...)     │
│   • Store Local Multi-Tenant Particionado por tenant_id (Seed: GPM Serviços)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados e Entidades Principais
1. **`tenants`**: `id` (UUID), `nome`, `slug` (único), `cnpj_contato`, `status` (`ativo` | `suspenso` | `cancelado`), `customizacao` (`logo_url`, `cor_primaria`, `nome_exibicao`), `limites` (`max_usuarios`, `max_storage_mb`, `storage_usado_mb`), `created_at`.
2. **`users`**: `id` (UUID), `tenant_id` (FK opcional para `super_admin`), `email` (único), `senha`, `nome`, `cargo`, `setor`, `re_acesso`, `papel` (`super_admin` | `admin_empresa` | `qualidade` | `operador`), `ativo`.
3. **`rncs`**: Registro de ocorrências vinculado a `tenant_id`, preservando compatibilidade com os fluxos de abertura, análise, contenção, evidências fotográficas (`foto_peca_ok`, `foto_peca_ng`, `foto_auxiliar`), status e impressão.
4. **`treinamentos` & `historico_acoes`**: Registros de eficácia, lições/treinamentos de operadores e log de auditoria vinculados a `tenant_id` e `rnc_id`.
5. **Cadastros Mestres por Tenant (`clientes_montadoras`, `areas_fabris`, `postos_trabalho`, `cat_defeitos`)**: Coleções isoladas por `tenant_id` que alimentam dinamicamente os filtros e formulários da empresa logada.

### Mapeamento de Interações e Estados
- **Descoberta de Empresa no Login Global**: Ao submeter `email` e `senha`, o autenticador localiza o registro em `users`. Se for `super_admin`, navega para `/super-admin` e sincroniza `window.history.pushState`. Se pertencer a um tenant, verifica se `tenant.status === 'ativo'`; caso positivo, carrega o tema White-Label do tenant e navega para `/:slug/dashboard`.
- **Ciclo de Impersonation do Super Admin**: Ao clicar em *"Acessar como Empresa"* na linha de um tenant no painel `/super-admin`, o sistema preserva a sessão do Super Admin em `impersonatorUser`, define `activeTenant` para a empresa escolhida, navega para `/:slug/dashboard` e exibe uma barra fixa no topo permitindo encerrar a visualização e voltar imediatamente ao `/super-admin`.
- **Onboarding de Nova Empresa**: Quando o Super Admin cadastra uma nova empresa no modal de criação, o sistema cria o registro do tenant, cria o usuário `admin_empresa` inicial, inicializa o conjunto padrão de cadastros mestres para aquela empresa e disponibiliza imediatamente o acesso via `/:novo-slug/login`.
- **Upload com Compressão WebP e Controle de Cota**: Ao selecionar uma foto no formulário de RNC ou um logotipo nas configurações White-Label, o utilitário converte a imagem em WebP, verifica se o tamanho somado respeita `limites.max_storage_mb` do tenant, atualiza `storage_usado_mb` e persiste a imagem no bucket/store isolado da empresa.
- **Carga Piloto Inicial (`GPM Serviços`)**: Na primeira inicialização, o banco/store é populado automaticamente com o tenant piloto **GPM Serviços** (`slug: gpm-servicos`), seus cadastros mestres industriais, usuários de todos os perfis e as **10 ocorrências formais realistas** especificadas no seu plano:
  1. *Trinca no ponto de solda robotizada* (Item de Segurança - FMEA Crítico)
  2. *Rebarba excessiva em flange estampada* (Linha de Montagem)
  3. *Empolamento e contaminação em pintura superficial* (Acabamento)
  4. *Desvio dimensional em furação de fixação* (Usinagem/Conformação)
  5. *Falta de torque em parafuso estrutural M10* (Segurança do Produto)
  6. *Arranhão severo em superfície classe A visível* (Inspeção Final)
  7. *Inversão de chicote elétrico de comando* (Montagem Elétrica)
  8. *Porosidade interna detectada em teste de estanqueidade* (Fundição)
  9. *Deformação por impacto em transporte interno* (Logística/Kitting)
  10. *Etiqueta de rastreabilidade com código ilegível* (Expedição/Rastreabilidade)
