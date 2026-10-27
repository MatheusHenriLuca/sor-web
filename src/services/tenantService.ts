import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  TenantRecord,
  TenantStatus,
  TenantCustomizacao,
  TenantLimites,
  UsuarioQualidade,
  RNCRecord,
  RegistroTreinamento,
  MasterDataItem,
  MasterDataCategory,
  OptionCategoryMeta,
  FormFieldConfig,
  FormSectionId,
  FormModuleId,
  FormFieldType,
  HistoricoAcaoRecord,
  SaaSUserRole,
  AppPermissionLevel,
  UserAppProfiles,
  UserRole,
  ColaboradorBaseAtivos
} from '../types';
import { compressImageToWebP, estimateDataUrlSizeKB, CompressedImageResult } from '../utils/imageCompressor';
import { normalizeDisplayText } from '../utils/formatText';

export function getDefaultColumnsForCategory(categoryId: string): string[] {
  const canonical = resolveCanonicalCategory(categoryId);
  switch (canonical) {
    case 'master_funcionarios':
      return ['Nome', 'RE / Matrícula', 'Cargo', 'Setor'];
    case 'master_pecas_produtos':
      return ['Peça / Produto', 'Código Material', 'Cliente', 'Posto / Linha'];
    case 'posto_trabalho':
      return ['Posto de Trabalho', 'Código', 'Área / Setor'];
    case 'area_fabril':
      return ['Área / Setor Fabril', 'Código FMDS', 'Descrição'];
    case 'cliente_montadora':
      return ['Cliente / Montadora', 'Sigla / Código', 'Planta / Cidade'];
    case 'cat_defeito':
      return ['Modo de Falha / Defeito', 'Código', 'Severidade / Família'];
    default:
      return ['Nome', 'Código', 'Detalhe'];
  }
}

export const MASTER_SHARED_CATEGORIES: MasterDataCategory[] = [
  'master_funcionarios',
  'master_pecas_produtos',
  'posto_trabalho',
  'area_fabril',
  'cliente_montadora'
];

export function resolveCanonicalCategory(tipo: MasterDataCategory): MasterDataCategory {
  if (!tipo) return tipo;
  if (tipo === 'plano_posto' || tipo === 'postos') return 'posto_trabalho';
  if (tipo === 'plano_area' || tipo === 'fmds') return 'area_fabril';
  if (tipo === 'plano_produto' || tipo === 'pecas' || tipo === 'produtos' || tipo === 'componentes') {
    return 'master_pecas_produtos';
  }
  if (tipo === 'colaboradores' || tipo === 'funcionarios' || tipo === 'equipe' || tipo === 'usuarios') {
    return 'master_funcionarios';
  }
  return tipo;
}

export interface BulkConfigColumnDef {
  categoryId: MasterDataCategory;
  headerTitle: string;
  description: string;
  isMaster: boolean;
  appScope: 'master' | 'plano_acao' | 'qualidade_8d';
  aliases: string[];
}

export interface BulkPasteColumnAnalysis {
  colIndex: number;
  rawHeader: string;
  categoryId: MasterDataCategory;
  categoryTitle: string;
  isMaster: boolean;
  newItems: string[];
  existingItems: string[];
  totalPasted: number;
}

export interface BulkPasteAnalysisResult {
  recognizedColumns: BulkPasteColumnAnalysis[];
  unrecognizedHeaders: string[];
  totalNewCount: number;
  totalExistingCount: number;
  hasConflicts: boolean;
}

export function normalizeRncRecordCasing(r: RNCRecord): RNCRecord {
  const normList = (val?: string) =>
    val
      ? val
          .split(';')
          .map(s => normalizeDisplayText(s))
          .filter(Boolean)
          .join(';')
      : val;

  return {
    ...r,
    cliente: normalizeDisplayText(r.cliente),
    classificacaoSetor: normalizeDisplayText(r.classificacaoSetor),
    setorDeteccao: normalizeDisplayText(r.setorDeteccao),
    impactoCliente: normalizeDisplayText(r.impactoCliente),
    produto: normalizeDisplayText(r.produto),
    componente: normalizeDisplayText(r.componente),
    modoFalha: normalizeDisplayText(r.modoFalha),
    posto: normalizeDisplayText(r.posto),
    fmds: normalizeDisplayText(r.fmds),
    reincidente: normalizeDisplayText(r.reincidente) as any,
    possivelDetectar: normalizeDisplayText(r.possivelDetectar),
    caracteristicaSeguranca: normalizeDisplayText(r.caracteristicaSeguranca) as any,
    coProduto: normalizeDisplayText(r.coProduto) as any,
    carryOver: normalizeDisplayText(r.carryOver) as any,
    abrir8D: normalizeDisplayText(r.abrir8D) as any,
    protcliente: (normalizeDisplayText(r.protcliente) as any),
    quemFara: normalizeDisplayText(r.quemFara),
    ondeFara: normalizeDisplayText(r.ondeFara),
    detector: normalizeDisplayText(r.detector),
    responsavelConclusao: normalizeDisplayText(r.responsavelConclusao),
    participantesAtendimento: normList(r.participantesAtendimento),
    acoesContencao: normList(r.acoesContencao),
    descricaoProblemaInterno: normalizeDisplayText(r.descricaoProblemaInterno),
    detalhamentoOcorrencia: normalizeDisplayText(r.detalhamentoOcorrencia),
    descricaoProblema: normalizeDisplayText(r.descricaoProblema),
    descricaoCompleta: normalizeDisplayText(r.descricaoCompleta),
    oQueFazer: normalizeDisplayText(r.oQueFazer),
    comoFazer: normalizeDisplayText(r.comoFazer),
    porQueFazer: normalizeDisplayText(r.porQueFazer),
    recomendacoesProvidencias: normalizeDisplayText(r.recomendacoesProvidencias)
  };
}

export function normalizeMasterDataItemCasing(m: MasterDataItem): MasterDataItem {
  return {
    ...m,
    nome: m.tipo === 'criticidade' ? m.nome : normalizeDisplayText(m.nome),
    detalhe: m.detalhe ? normalizeDisplayText(m.detalhe) : m.detalhe
  };
}

// ============================================================================
// GERADOR DE ILUSTRAÇÕES TÉCNICAS SVG (PEÇA NG / PEÇA OK) PARA AS 10 RNCS PILOTO
// Garante zero imagens quebradas e alto contraste técnico no chão de fábrica
// ============================================================================
export function createTechnicalSvgDataUrl(
  type: 'NG' | 'OK',
  code: string,
  title: string,
  subtitle: string
): string {
  const bg = type === 'NG' ? '#fff1f2' : '#f0fdf4';
  const border = type === 'NG' ? '#f43f5e' : '#16a34a';
  const badgeBg = type === 'NG' ? '#e11d48' : '#15803d';
  const textPrimary = type === 'NG' ? '#881337' : '#14532d';
  const textSecondary = type === 'NG' ? '#be123c' : '#166534';
  const statusLabel = type === 'NG' ? 'NÃO CONFORME (NG)' : 'PADRÃO APROVADO (OK)';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" rx="16" fill="${bg}"/>
    <rect x="12" y="12" width="616" height="396" rx="12" fill="none" stroke="${border}" stroke-width="3" stroke-dasharray="${type === 'NG' ? '10,6' : 'none'}"/>
    <g opacity="0.12" stroke="${border}" stroke-width="1">
      <line x1="0" y1="105" x2="640" y2="105"/>
      <line x1="0" y1="210" x2="640" y2="210"/>
      <line x1="0" y1="315" x2="640" y2="315"/>
      <line x1="160" y1="0" x2="160" y2="420"/>
      <line x1="320" y1="0" x2="320" y2="420"/>
      <line x1="480" y1="0" x2="480" y2="420"/>
    </g>
    <rect x="28" y="28" width="230" height="34" rx="8" fill="${badgeBg}"/>
    <text x="143" y="50" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${statusLabel}</text>
    <text x="610" y="50" font-family="monospace" font-size="14" font-weight="bold" fill="${textSecondary}" text-anchor="end">${code}</text>
    <g transform="translate(320, 195)">
      <rect x="-150" y="-65" width="300" height="130" rx="14" fill="#ffffff" stroke="${border}" stroke-width="2.5"/>
      <circle cx="-95" cy="0" r="26" fill="${bg}" stroke="${border}" stroke-width="2.5"/>
      <circle cx="95" cy="0" r="26" fill="${bg}" stroke="${border}" stroke-width="2.5"/>
      <line x1="-50" y1="-35" x2="50" y2="-35" stroke="#64748b" stroke-width="3"/>
      <line x1="-50" y1="0" x2="50" y2="0" stroke="${border}" stroke-width="4"/>
      <line x1="-50" y1="35" x2="50" y2="35" stroke="#64748b" stroke-width="3"/>
      ${
        type === 'NG'
          ? `<circle cx="0" cy="0" r="38" fill="none" stroke="#e11d48" stroke-width="3.5" stroke-dasharray="6,4"/>
             <line x1="-18" y1="-18" x2="18" y2="18" stroke="#e11d48" stroke-width="4"/>
             <line x1="18" y1="-18" x2="-18" y2="18" stroke="#e11d48" stroke-width="4"/>`
          : `<circle cx="0" cy="0" r="34" fill="none" stroke="#16a34a" stroke-width="3.5"/>
             <polyline points="-14,2 -4,12 16,-10" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
      }
    </g>
    <text x="320" y="330" font-family="sans-serif" font-size="18" font-weight="bold" fill="${textPrimary}" text-anchor="middle">${title}</text>
    <text x="320" y="358" font-family="sans-serif" font-size="13" font-weight="600" fill="${textSecondary}" text-anchor="middle">${subtitle}</text>
    <text x="320" y="390" font-family="monospace" font-size="11" fill="#64748b" text-anchor="middle">EVIDÊNCIA COMPRIMIDA WEBP • INSPEÇÃO DE QUALIDADE AUTOMOTIVA</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================================
// TENANT PADRÃO OFICIAL: MH LEAN & SOLUÇÕES (MH QUALIDADE) + TENANT SECUNDÁRIO
// ============================================================================
export const PILOT_TENANT_ID = 'tenant-gpm-servicos';
export const SECONDARY_TENANT_ID = 'tenant-metalurgica-vale';

const INITIAL_TENANTS: TenantRecord[] = [
  {
    id: PILOT_TENANT_ID,
    nome: 'MH Lean & Soluções',
    slug: 'mh-lean-solucoes',
    cnpj_contato: '18.452.910/0001-64 • mhsolucoes@adimin.com.br',
    status: 'ativo',
    customizacao: {
      logo_url: '',
      cor_primaria: '#0b5796',
      nome_exibicao: 'MH Lean & Soluções',
      subtitulo_relatorio: 'MH Lean & Soluções • Sistema MH Qualidade de Gestão de RNC e Qualidade 8D'
    },
    limites: {
      max_usuarios: 100,
      max_storage_mb: 2048,
      storage_usado_mb: 3.2
    },
    ultimo_sequencial_rnc: 10,
    created_at: '2026-10-01T08:00:00Z'
  },
  {
    id: SECONDARY_TENANT_ID,
    nome: 'Metalúrgica Vale Automotiva',
    slug: 'metalurgica-vale',
    cnpj_contato: '42.819.300/0001-12 • qualidade@metalurgicavale.com.br',
    status: 'ativo',
    customizacao: {
      logo_url: '',
      cor_primaria: '#0f766e',
      nome_exibicao: 'Metalúrgica Vale',
      subtitulo_relatorio: 'Metalúrgica Vale • Controle de Qualidade Assegurada'
    },
    limites: {
      max_usuarios: 25,
      max_storage_mb: 512,
      storage_usado_mb: 0.9
    },
    ultimo_sequencial_rnc: 1,
    created_at: '2026-10-10T10:30:00Z'
  }
];

// ============================================================================
// USUÁRIOS MULTI-TENANT (MH QUALIDADE SUPER ADMIN + EQUIPE MH LEAN & SOLUÇÕES)
// ============================================================================
const INITIAL_SAAS_USERS: UsuarioQualidade[] = [
  // 0. Super Administrador Master da Plataforma MH Qualidade
  {
    id: 9001,
    tenant_id: undefined,
    papel: 'super_admin',
    ativo: true,
    nome: 'Matheus de Luca (MH Qualidade Super Admin)',
    reAcesso: 999999,
    perfil: 'Admin',
    senha: '123',
    email: 'mhsolucoes@adimin.com.br',
    cargo: 'Proprietário da Plataforma MH Qualidade',
    setor: 'Diretoria MH Lean & Soluções'
  },
  // 1. Equipe MH Lean & Soluções (Sistema Padrão)
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    papel: 'admin_empresa',
    ativo: true,
    nome: 'Matheus Henrique de Luca',
    reAcesso: 104235,
    perfil: 'Admin',
    senha: '123',
    email: 'mhsolucoes@adimin.com.br',
    cargo: 'Administrador Geral — MH Lean & Soluções',
    setor: 'Qualidade MH Lean & Soluções'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    papel: 'qualidade',
    ativo: true,
    nome: 'Carlos Eduardo Ferreira',
    reAcesso: 89452,
    perfil: 'Adminqual',
    senha: '123',
    email: 'qualidade@mhleansolucoes.com.br',
    cargo: 'Engenheiro da Qualidade Sênior',
    setor: 'Qualidade Assegurada'
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    papel: 'qualidade',
    ativo: true,
    nome: 'Mariana Souza Lima',
    reAcesso: 76512,
    perfil: 'Liderqual',
    senha: '123',
    email: 'lider@mhleansolucoes.com.br',
    cargo: 'Líder da Qualidade Linhas',
    setor: 'Qualidade Linhas'
  },
  {
    id: 4,
    tenant_id: PILOT_TENANT_ID,
    papel: 'qualidade',
    ativo: true,
    nome: 'Roberto Mendes Silva',
    reAcesso: 64129,
    perfil: 'Inspqual',
    senha: '123',
    email: 'inspetor@mhleansolucoes.com.br',
    cargo: 'Inspetor da Qualidade Solda',
    setor: 'Inspeção'
  },
  {
    id: 7,
    tenant_id: PILOT_TENANT_ID,
    papel: 'operador',
    ativo: true,
    nome: 'Marcos Vinicius Barbosa',
    reAcesso: 30122,
    perfil: 'User',
    senha: '123',
    email: 'operador@mhleansolucoes.com.br',
    cargo: 'Operador Especializado Solda',
    setor: 'Solda Robotizada'
  },
  // 2. Equipe Metalúrgica Vale (Tenant Secundário: metalurgica-vale)
  {
    id: 201,
    tenant_id: SECONDARY_TENANT_ID,
    papel: 'admin_empresa',
    ativo: true,
    nome: 'Ricardo Prado',
    reAcesso: 50101,
    perfil: 'Admin',
    senha: '123',
    email: 'admin@metalurgicavale.com.br',
    cargo: 'Gestor Industrial',
    setor: 'Diretoria Industrial'
  },
  {
    id: 202,
    tenant_id: SECONDARY_TENANT_ID,
    papel: 'qualidade',
    ativo: true,
    nome: 'Fernanda Costa',
    reAcesso: 50102,
    perfil: 'Adminqual',
    senha: '123',
    email: 'qualidade@metalurgicavale.com.br',
    cargo: 'Analista de Qualidade',
    setor: 'Laboratório Metrologia'
  }
];

// ============================================================================
// CATEGORIAS DE OPÇÕES E CADASTROS MESTRES (USADOS E NÃO USADOS NO FORMULÁRIO)
// ============================================================================
export function getDefaultOptionCategoriesForTenant(tenantId: string): OptionCategoryMeta[] {
  return [
    // =========================================================================
    // CONFIGURAÇÃO MASTER (COMPARTILHADA ENTRE TODOS OS APPS: PLANO, RNC, 8D)
    // =========================================================================
    {
      id: 'master_funcionarios',
      tenant_id: tenantId,
      nome: 'Lista de Funcionários (Master)',
      descricao: 'Cadastro único de colaboradores compartilhado entre Plano de Ação, RNC e 8D. Novos funcionários recebem automaticamente o perfil Usuário Comum.',
      usadoNoFormulario: true,
      campoVinculado: 'Responsável / Detector / Participantes (Todos os Apps)',
      isSystem: true,
      isMasterShared: true
    },
    {
      id: 'master_pecas_produtos',
      tenant_id: tenantId,
      nome: 'Lista de Peças / Produtos (Master)',
      descricao: 'Catálogo unificado de peças, conjuntos e produtos compartilhado entre Plano de Ação, RNC e 8D.',
      usadoNoFormulario: true,
      campoVinculado: 'Produto / Peça / Conjunto (Todos os Apps)',
      isSystem: true,
      isMasterShared: true
    },
    {
      id: 'posto_trabalho',
      tenant_id: tenantId,
      nome: 'Lista de Postos de Trabalho (Master)',
      descricao: 'Estações, células e máquinas operacionais compartilhadas entre Plano de Ação, RNC e 8D.',
      usadoNoFormulario: true,
      campoVinculado: 'Posto de Trabalho (Todos os Apps)',
      isSystem: true,
      isMasterShared: true
    },
    {
      id: 'area_fabril',
      tenant_id: tenantId,
      nome: 'Áreas / Setores Fabris (Master)',
      descricao: 'Linhas fabris, quadros FMDS e setores industriais compartilhados entre Plano de Ação, RNC e 8D.',
      usadoNoFormulario: true,
      campoVinculado: 'Área / Setor Fabril (Todos os Apps)',
      isSystem: true,
      isMasterShared: true
    },
    {
      id: 'cliente_montadora',
      tenant_id: tenantId,
      nome: 'Clientes / Montadoras (Master)',
      descricao: 'Lista de clientes e montadoras atendidas pela planta industrial (compartilhada entre os módulos).',
      usadoNoFormulario: true,
      campoVinculado: 'Cliente / Montadora (Todos os Apps)',
      isSystem: true,
      isMasterShared: true
    },

    // =========================================================================
    // CATEGORIAS ESPECÍFICAS DO APP GESTÃO DA QUALIDADE (RNC & 8D)
    // =========================================================================
    {
      id: 'tipo_rnc',
      tenant_id: tenantId,
      nome: 'Tipos de Ocorrência (RNC)',
      descricao: 'Classificação inicial da ocorrência (Formal, Informal, Interno, etc.).',
      usadoNoFormulario: true,
      campoVinculado: 'Tipo de Ocorrência',
      isSystem: true
    },
    {
      id: 'turno',
      tenant_id: tenantId,
      nome: 'Turnos de Trabalho',
      descricao: 'Turnos industriais disponíveis para registro de ocorrências.',
      usadoNoFormulario: true,
      campoVinculado: 'Turno de Detecção',
      isSystem: true
    },
    {
      id: 'setor_deteccao',
      tenant_id: tenantId,
      nome: 'Setores / Locais de Detecção',
      descricao: 'Setores internos ou áreas do cliente onde a não conformidade foi detectada.',
      usadoNoFormulario: true,
      campoVinculado: 'Setor / Local de Detecção',
      isSystem: true
    },
    {
      id: 'impacto_cliente',
      tenant_id: tenantId,
      nome: 'Impactos no Cliente',
      descricao: 'Tipos de impacto gerados na linha da montadora ou cliente.',
      usadoNoFormulario: true,
      campoVinculado: 'Impacto no Cliente',
      isSystem: true
    },
    {
      id: 'tipo_componente',
      tenant_id: tenantId,
      nome: 'Tipos de Peça Rastreada',
      descricao: 'Define se a ocorrência afeta Peça Final, Componente Isolado ou Subcomponente.',
      usadoNoFormulario: true,
      campoVinculado: 'Tipo de Peça Rastreada',
      isSystem: true
    },
    {
      id: 'cat_defeito',
      tenant_id: tenantId,
      nome: 'Catálogo de Defeitos (Modos de Falha)',
      descricao: 'Padronização corporativa de defeitos e modos de falha técnicos.',
      usadoNoFormulario: true,
      campoVinculado: 'Classificação do Defeito',
      isSystem: true
    },
    {
      id: 'doc_rastreabilidade',
      tenant_id: tenantId,
      nome: 'Documentos de Rastreabilidade',
      descricao: 'Tipos de documento utilizados para rastrear o lote (Etiqueta SAP, NF, Order, etc.).',
      usadoNoFormulario: true,
      campoVinculado: 'Documento para Rastreabilidade',
      isSystem: true
    },
    {
      id: 'acoes_contencao',
      tenant_id: tenantId,
      nome: 'Ações de Contenção Padronizadas',
      descricao: 'Opções rápidas de contenção imediata selecionáveis na tratativa.',
      usadoNoFormulario: true,
      campoVinculado: 'Ações de Contenção',
      isSystem: true
    },
    {
      id: 'gravidade',
      tenant_id: tenantId,
      nome: 'Níveis de Gravidade',
      descricao: 'Escala de severidade da não conformidade (Baixa, Média, Alta, Crítica).',
      usadoNoFormulario: true,
      campoVinculado: 'Gravidade do Defeito',
      isSystem: true
    },
    {
      id: 'possivel_detectar',
      tenant_id: tenantId,
      nome: 'Detecção no Processo (Origem)',
      descricao: 'Opções de avaliação de detecção na origem do processo.',
      usadoNoFormulario: true,
      campoVinculado: 'Detecção no Processo?',
      isSystem: true
    },
    {
      id: 'abrir_8d',
      tenant_id: tenantId,
      nome: 'Decisão de Abertura 8D',
      descricao: 'Opções para exigência de abertura de relatório 8D completo.',
      usadoNoFormulario: true,
      campoVinculado: 'Abrir 8D',
      isSystem: true
    },
    {
      id: 'status_rnc',
      tenant_id: tenantId,
      nome: 'Status do Fluxo da Ocorrência',
      descricao: 'Etapas de andamento da RNC nos filtros e painéis gerenciais (fora do formulário inicial).',
      usadoNoFormulario: false,
      isSystem: true
    },
    {
      id: 'criticidade',
      tenant_id: tenantId,
      nome: 'Classificação de Criticidade (A / B / C)',
      descricao: 'Níveis de criticidade gerencial para priorização de auditoria (fora do formulário inicial).',
      usadoNoFormulario: false,
      isSystem: true
    },
    {
      id: 'disposicao_lote',
      tenant_id: tenantId,
      nome: 'Disposição de Material / Lote Segregado',
      descricao: 'Destinações de engenharia para peças bloqueadas (Sucata, Retrabalho, Concessão, Devolução).',
      usadoNoFormulario: false,
      isSystem: true
    },
    {
      id: 'origem_fornecedor',
      tenant_id: tenantId,
      nome: 'Origens / Fornecedores de Matéria-Prima',
      descricao: 'Lista de fornecedores de aço, químicos e componentes externos para controle de qualidade.',
      usadoNoFormulario: false,
      isSystem: true
    },

    // =========================================================================
    // CATEGORIAS ESPECÍFICAS DO APP DE PLANO DE AÇÃO
    // =========================================================================
    {
      id: 'plano_indicador',
      tenant_id: tenantId,
      nome: 'Indicador / Programa Estratégico',
      descricao: 'Programas corporativos vinculados aos planos de ação (ex: 8D, Atendimento Cliente, Kaizen, Fast Response, etc.).',
      usadoNoFormulario: false,
      campoVinculado: 'Plano de Ação (Indicador)',
      isSystem: false,
      appModule: 'plano_acao'
    },
    {
      id: 'plano_sub1',
      tenant_id: tenantId,
      nome: 'Subindicador',
      descricao: 'Detalhamento do programa ou área do plano de ação (ex: Qualidade Cliente, Manutenção, Produção).',
      usadoNoFormulario: false,
      campoVinculado: 'Plano de Ação (Subindicador)',
      isSystem: false,
      appModule: 'plano_acao'
    },
    {
      id: 'plano_prioridade',
      tenant_id: tenantId,
      nome: 'Níveis de Prioridade do Plano',
      descricao: 'Escala de prioridade para execução e prazos das ações (Alta, Média, Baixa).',
      usadoNoFormulario: true,
      campoVinculado: 'Plano de Ação (Prioridade)',
      isSystem: false,
      appModule: 'plano_acao'
    },
    {
      id: 'plano_status_lista',
      tenant_id: tenantId,
      nome: 'Status do Plano de Ação e Tarefas 5W2H',
      descricao: 'Estados de fluxo dos planos e contramedidas (Aberto, Em Andamento, Concluído, Validado, Atrasado, Cancelado).',
      usadoNoFormulario: false,
      campoVinculado: 'Status do Plano e Status das Ações',
      isSystem: true,
      appModule: 'plano_acao'
    },
    {
      id: 'plano_decisao_auditoria_lista',
      tenant_id: tenantId,
      nome: 'Decisões de Auditoria e Homologação (Plano & 8D)',
      descricao: 'Opções de decisão do auditor da qualidade na validação de eficácia (Aprovar & Homologar, Solicitar Revisão).',
      usadoNoFormulario: false,
      campoVinculado: 'Decisão da Auditoria / Fechamento 8D',
      isSystem: true,
      appModule: 'plano_acao'
    },

    // =========================================================================
    // CATEGORIAS ESPECÍFICAS DA METODOLOGIA 8D (D1 A D8)
    // =========================================================================
    {
      id: 'oitod_tipos_acao',
      tenant_id: tenantId,
      nome: 'Tipos de Ação (3D / 5D / 6D / 7D & Plano)',
      descricao: 'Classificação das contramedidas do 8D e Plano de Ação (Contenção, Corretiva, Preventiva, Melhoria).',
      usadoNoFormulario: true,
      campoVinculado: 'Etapas 3D, 5D, 6D, 7D e Plano de Ação',
      isSystem: true,
      appModule: 'oitod'
    },
    {
      id: 'oitod_documentos_7d',
      tenant_id: tenantId,
      nome: 'Eixos / Documentos de Prevenção 7D (IATF)',
      descricao: 'Documentos e padrões sistêmicos atualizados na etapa 7D (FMEA, Trabalho Padronizado, Auditoria Escalonada, Plano de Controle, LPP).',
      usadoNoFormulario: true,
      campoVinculado: 'Etapa 7D — Prevenção da Recorrência',
      isSystem: true,
      appModule: 'oitod'
    },
    {
      id: 'oitod_6m_ishikawa',
      tenant_id: tenantId,
      nome: 'Categorias 6M (Ishikawa & Henkaten 4D)',
      descricao: 'Eixos de investigação de causa raiz no Diagrama Espinha de Peixe (Máquina, Mão de Obra, Método, Material, Medição, Meio Ambiente).',
      usadoNoFormulario: true,
      campoVinculado: 'Etapa 4D — Ishikawa & Henkaten',
      isSystem: true,
      appModule: 'oitod'
    },
    {
      id: 'oitod_estoques_locais',
      tenant_id: tenantId,
      nome: 'Locais de Estoque / Quarentena (Triagem 3D)',
      descricao: 'Locais de segregação e inspeção de lotes na etapa 3D (Estoque WIP, Quarentena, Expedição, Trânsito, Cliente).',
      usadoNoFormulario: true,
      campoVinculado: 'Etapa 3D — Lotes Verificados na Contenção',
      isSystem: true,
      appModule: 'oitod'
    }
  ];
}

export function getDefaultOptionItemsForTenant(tenantId: string): MasterDataItem[] {
  const isVale = tenantId === SECONDARY_TENANT_ID;
  const baseItems: MasterDataItem[] = isVale
    ? [
        { id: `${tenantId}-cli-1`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'SCANIA LATIN AMERICA', codigo: 'SCANIA', detalhe: 'São Bernardo do Campo', ativo: true },
        { id: `${tenantId}-cli-2`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'MERCEDES-BENZ CAMINHÕES', codigo: 'MBB', detalhe: 'Planta ABC', ativo: true },
        { id: `${tenantId}-area-1`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'FORJARIA PESADA EIXOS', codigo: 'FORJ-01', detalhe: 'Linha Pesada', ativo: true },
        { id: `${tenantId}-posto-1`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'PRENSA HIDRÁULICA 2500T', detalhe: 'FORJARIA PESADA EIXOS', ativo: true },
        { id: `${tenantId}-def-1`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Microfissura térmica pós-têmpera', codigo: 'MET-01', detalhe: 'Alta / Metalurgia', ativo: true },
        { id: `${tenantId}-func-v1`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Ricardo Prado', codigo: '50101', detalhe: 'Gestor Industrial • Diretoria Industrial', ativo: true },
        { id: `${tenantId}-func-v2`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Fernanda Costa', codigo: '50102', detalhe: 'Analista de Qualidade • Laboratório Metrologia', ativo: true },
        { id: `${tenantId}-prod-v1`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: 'EIXO DIANTEIRO FORJADO SCANIA', codigo: '8001200', detalhe: 'SCANIA LATIN AMERICA', ativo: true }
      ]
    : [
        // MH Lean & Soluções — Funcionários (Master Compartilhado)
        { id: `${tenantId}-func-1`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Matheus Henrique de Luca', codigo: '104235', detalhe: 'Gerente da Qualidade • Qualidade Corporativa', ativo: true },
        { id: `${tenantId}-func-2`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Fernando Tiago Maciel de Jesus', codigo: '98112', detalhe: 'Analista da Qualidade • Qualidade Assegurada', ativo: true },
        { id: `${tenantId}-func-3`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Carlos Eduardo Ferreira', codigo: '89452', detalhe: 'Engenheiro da Qualidade Sênior • Qualidade Assegurada', ativo: true },
        { id: `${tenantId}-func-4`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Mariana Souza Lima', codigo: '76512', detalhe: 'Líder de Inspeção da Qualidade • Qualidade Linhas', ativo: true },
        { id: `${tenantId}-func-5`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Roberto Mendes Silva', codigo: '64129', detalhe: 'Inspetor da Qualidade Solda • Inspeção Estamparia', ativo: true },
        { id: `${tenantId}-func-6`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'André Ferreira Santos', codigo: '52187', detalhe: 'Engenheiro de Processos • Engenharia de Processos', ativo: true },
        { id: `${tenantId}-func-7`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Juliana Santos Oliveira', codigo: '41290', detalhe: 'Supervisora de Turno • Produção Estamparia', ativo: true },
        { id: `${tenantId}-func-8`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Marcos Vinicius Barbosa', codigo: '30122', detalhe: 'Operador de Robô Solda Ponto • Solda Toyota', ativo: true },
        { id: `${tenantId}-func-9`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Felipe Almeida Castro', codigo: '30123', detalhe: 'Prensista A • Estamparia Tandem', ativo: true },
        { id: `${tenantId}-func-10`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Thiago Ramos Pinheiro', codigo: '30124', detalhe: 'Operador Célula Robô • Solda Honda', ativo: true },
        { id: `${tenantId}-func-11`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Lucas Gabriel Duarte', codigo: '30125', detalhe: 'Inspetor de Linha • Solda Hyundai', ativo: true },
        { id: `${tenantId}-func-12`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Diego Henrique Costa', codigo: '30126', detalhe: 'Operador Solda MIG • Solda Geral', ativo: true },
        { id: `${tenantId}-func-13`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Rafael Augusto Souza', codigo: '30127', detalhe: 'Ajustador de Estampos • Estamparia Progressiva', ativo: true },
        { id: `${tenantId}-func-14`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Gabriel Martins Ribeiro', codigo: '30128', detalhe: 'Auditor de Produto • Controle da Qualidade', ativo: true },
        { id: `${tenantId}-func-15`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Alexandre Pires Lima', codigo: '30129', detalhe: 'Técnico Mecânico • Manutenção Industrial', ativo: true },
        { id: `${tenantId}-func-16`, tenant_id: tenantId, tipo: 'master_funcionarios', nome: 'Vinicius Nogueira', codigo: '30130', detalhe: 'Operador Empilhadeira • Logística Fabril', ativo: true },

        // MH Lean & Soluções — Peças / Produtos (Master Compartilhado)
        { id: `${tenantId}-prod-1`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: '53201-0D120 - PAINEL DIANTEIRO INFERIOR COMPLETO', codigo: '10045210', detalhe: 'TDB - SOROCABA • POSTO 04 - SOLDA PONTO', ativo: true },
        { id: `${tenantId}-prod-2`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: '53205-0D080 - CONJUNTO SUPORTE RADIADOR', codigo: '10045280', detalhe: 'TDB - SOROCABA • POSTO 02 - PRENSA TRANSFER LINHA B', ativo: true },
        { id: `${tenantId}-prod-3`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: '57011-02230 - LONGARINA DIANTEIRA COMPLETA RH (CROSS)', codigo: '10045300', detalhe: 'TDB - SOROCABA • POSTO 07 - GEOMETRIA SOLDA TOYOTA', ativo: true },
        { id: `${tenantId}-prod-4`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: '57012-02230 - LONGARINA DIANTEIRA COMPLETA LH (CROSS)', codigo: '10045310', detalhe: 'TDB - SOROCABA • POSTO 07 - GEOMETRIA SOLDA TOYOTA', ativo: true },
        { id: `${tenantId}-prod-5`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: '61201-02380 - COLUNA CENTRAL B-PILLAR FORMADA A QUENTE', codigo: '10045400', detalhe: 'TDB - SOROCABA • POSTO 04 - SOLDA PONTO', ativo: true },
        { id: `${tenantId}-prod-6`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: 'VW T-Cross', codigo: 'VW-TC', detalhe: 'Plataforma MQB • VOLKSWAGEN', ativo: true },
        { id: `${tenantId}-prod-7`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: 'VW Nivus', codigo: 'VW-NV', detalhe: 'Plataforma MQB-A0 • VOLKSWAGEN', ativo: true },
        { id: `${tenantId}-prod-8`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: 'Toyota Corolla', codigo: 'TOY-COR', detalhe: 'Sedan e Cross • TDB - SOROCABA', ativo: true },
        { id: `${tenantId}-prod-9`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: 'Hyundai HB20', codigo: 'HYU-HB', detalhe: 'Hatch e Sedan • HYUNDAI', ativo: true },
        { id: `${tenantId}-prod-10`, tenant_id: tenantId, tipo: 'master_pecas_produtos', nome: 'Honda HR-V', codigo: 'HON-HRV', detalhe: 'SUV Compacto • HONDA', ativo: true },

        // MH Lean & Soluções — Clientes / Montadoras (Master Compartilhado)
        { id: `${tenantId}-cli-1`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'TDB - SOROCABA', codigo: 'TOYOTA', detalhe: 'Planta Sorocaba - SP', ativo: true },
        { id: `${tenantId}-cli-2`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'STELLANTIS', codigo: 'STEL-BR', detalhe: 'Polo Automotivo Betim / Goiana', ativo: true },
        { id: `${tenantId}-cli-3`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'VOLKSWAGEN', codigo: 'VW-ANCH', detalhe: 'São Bernardo / Taubaté', ativo: true },
        { id: `${tenantId}-cli-4`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'GENERAL MOTORS', codigo: 'GM-SCS', detalhe: 'São Caetano / São José dos Campos', ativo: true },
        { id: `${tenantId}-cli-5`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'HONDA', codigo: 'HAB-ITIR', detalhe: 'Planta Itirapina - SP', ativo: true },
        { id: `${tenantId}-cli-6`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'HYUNDAI', codigo: 'HMB-PIRA', detalhe: 'Planta Piracicaba - SP', ativo: true },

        // MH Lean & Soluções — Áreas / Setores Fabris (Master Compartilhado)
        { id: `${tenantId}-area-1`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'SOLDA 1 - ESTACIONÁRIAS', codigo: 'FMDS-S1', detalhe: 'Linha de Solda Estacionária', ativo: true },
        { id: `${tenantId}-area-2`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'SOLDA 2 - CEL. TOYOTA', codigo: 'FMDS-S2', detalhe: 'Células Robotizadas Solda Ponto/MIG', ativo: true },
        { id: `${tenantId}-area-3`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'SOLDA 3 - CEL. HONDA/HYUNDAI', codigo: 'FMDS-S3', detalhe: 'Célula Honda e Hyundai', ativo: true },
        { id: `${tenantId}-area-4`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'ESTAMPARIA TANDEM & PROGRESSIVA', codigo: 'FMDS-EST', detalhe: 'Prensas 1200T e 800T', ativo: true },
        { id: `${tenantId}-area-5`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'PINTURA E-COAT & ACABAMENTO', codigo: 'FMDS-PINT', detalhe: 'Tratamento Superficial Classe A', ativo: true },
        { id: `${tenantId}-area-6`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'USINAGEM & CONFORMAÇÃO CNC', codigo: 'FMDS-USI', detalhe: 'Centros de Furação e Rosqueamento', ativo: true },
        { id: `${tenantId}-area-7`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'MONTAGEM FINAL & TORQUE', codigo: 'FMDS-MONT', detalhe: 'Linhas de Subconjuntos Estruturais', ativo: true },
        { id: `${tenantId}-area-8`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'LOGÍSTICA INTERNA & EXPEDIÇÃO', codigo: 'FMDS-LOG', detalhe: 'Kitting, Sequenciamento e Embarque', ativo: true },
        { id: `${tenantId}-area-9`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'ENGENHARIA DA QUALIDADE', codigo: 'ENG-Q', detalhe: 'Laboratório e Metrologia', ativo: true },

        // MH Lean & Soluções — Postos de Trabalho (Master Compartilhado)
        { id: `${tenantId}-posto-1`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'POSTO 01 - ALIMENTAÇÃO', codigo: 'P01', detalhe: 'Entrada de componentes', ativo: true },
        { id: `${tenantId}-posto-2`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'POSTO 02 - PRENSA TRANSFER LINHA B', codigo: 'P02', detalhe: 'ESTAMPARIA TANDEM & PROGRESSIVA', ativo: true },
        { id: `${tenantId}-posto-3`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'POSTO 04 - SOLDA PONTO ROBOTIZADA', codigo: 'P04', detalhe: 'SOLDA 2 - CEL. TOYOTA', ativo: true },
        { id: `${tenantId}-posto-4`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'CABINE 01 - PINTURA CATAFORÉTICA', codigo: 'CAB01', detalhe: 'PINTURA E-COAT & ACABAMENTO', ativo: true },
        { id: `${tenantId}-posto-5`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'CENTRO CNC 03 - FURAÇÃO DE PRECISÃO', codigo: 'CNC03', detalhe: 'USINAGEM & CONFORMAÇÃO CNC', ativo: true },
        { id: `${tenantId}-posto-6`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'ESTAÇÃO 06 - APERTO ELETRÔNICO M10', codigo: 'EST06', detalhe: 'MONTAGEM FINAL & TORQUE', ativo: true },
        { id: `${tenantId}-posto-7`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'DOCA 02 - EXPEDIÇÃO SEQUENCIADA JIT', codigo: 'DOC02', detalhe: 'LOGÍSTICA INTERNA & EXPEDIÇÃO', ativo: true },
        { id: `${tenantId}-posto-8`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'B643033 - ROBÔ 33', codigo: 'R33', detalhe: 'Célula de Solda Automática', ativo: true },
        { id: `${tenantId}-posto-9`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'OP-20 - CORTE E REPUXO', codigo: 'OP20', detalhe: 'Estágio 2 da Estamparia', ativo: true },
        { id: `${tenantId}-posto-10`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'PRENSA 800T', codigo: 'PR800', detalhe: 'Estamparia Pesada', ativo: true },

        // MH Lean & Soluções — Catálogo de Defeitos (Modos de Falha)
        { id: `${tenantId}-def-1`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Trinca no ponto de solda', codigo: 'SOL-01', detalhe: 'Crítica / Segurança', ativo: true },
        { id: `${tenantId}-def-2`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Rebarba excessiva em flange', codigo: 'EST-02', detalhe: 'Média / Processo', ativo: true },
        { id: `${tenantId}-def-3`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Empolamento e contaminação em pintura', codigo: 'PIN-03', detalhe: 'Alta / Aspecto Visual', ativo: true },
        { id: `${tenantId}-def-4`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Desvio dimensional em furação', codigo: 'USI-04', detalhe: 'Alta / Montabilidade', ativo: true },
        { id: `${tenantId}-def-5`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Falta de torque em parafuso estrutural', codigo: 'MON-05', detalhe: 'Crítica / Segurança', ativo: true },
        { id: `${tenantId}-def-6`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Arranhão severo em superfície classe A', codigo: 'INS-06', detalhe: 'Média / Acabamento', ativo: true },
        { id: `${tenantId}-def-7`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Inversão de chicote elétrico', codigo: 'ELE-07', detalhe: 'Alta / Funcional', ativo: true },
        { id: `${tenantId}-def-8`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Porosidade interna em estanqueidade', codigo: 'FUN-08', detalhe: 'Crítica / Vedação', ativo: true },
        { id: `${tenantId}-def-9`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Deformação por impacto logístico', codigo: 'LOG-09', detalhe: 'Média / Manuseio', ativo: true },
        { id: `${tenantId}-def-10`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Etiqueta de rastreabilidade ilegível', codigo: 'EXP-10', detalhe: 'Média / Expedição', ativo: true }
      ];

  const commonOptionItems: MasterDataItem[] = [
    // Tipo de RNC
    { id: `${tenantId}-trnc-1`, tenant_id: tenantId, tipo: 'tipo_rnc', nome: 'Formal', codigo: 'Oficial', detalhe: 'Formal (Reclamação Oficial do Cliente)', ativo: true },
    { id: `${tenantId}-trnc-2`, tenant_id: tenantId, tipo: 'tipo_rnc', nome: 'Informal', codigo: 'Alerta', detalhe: 'Informal (Alerta / Contato da Montadora)', ativo: true },
    { id: `${tenantId}-trnc-3`, tenant_id: tenantId, tipo: 'tipo_rnc', nome: 'Interno', codigo: 'Linha', detalhe: 'Interno (Detecção Interna na Linha de Produção)', ativo: true },

    // Turnos
    { id: `${tenantId}-turno-1`, tenant_id: tenantId, tipo: 'turno', nome: '1º Turno', codigo: 'T1', detalhe: '1º Turno (06:00 - 14:40)', ativo: true },
    { id: `${tenantId}-turno-2`, tenant_id: tenantId, tipo: 'turno', nome: '2º Turno', codigo: 'T2', detalhe: '2º Turno (14:40 - 23:15)', ativo: true },
    { id: `${tenantId}-turno-3`, tenant_id: tenantId, tipo: 'turno', nome: '3º Turno', codigo: 'T3', detalhe: '3º Turno (23:15 - 06:00)', ativo: true },
    { id: `${tenantId}-turno-4`, tenant_id: tenantId, tipo: 'turno', nome: 'Central', codigo: 'ADM', detalhe: 'Turno Central / Administrativo', ativo: true },

    // Setores de Detecção
    { id: `${tenantId}-setdet-1`, tenant_id: tenantId, tipo: 'setor_deteccao', nome: 'Linha de Solda Robotizada', codigo: 'SOL', detalhe: 'Detecção Interna', ativo: true },
    { id: `${tenantId}-setdet-2`, tenant_id: tenantId, tipo: 'setor_deteccao', nome: 'Estamparia Tandem / Progressiva', codigo: 'EST', detalhe: 'Detecção Interna', ativo: true },
    { id: `${tenantId}-setdet-3`, tenant_id: tenantId, tipo: 'setor_deteccao', nome: 'Montagem Final Cliente (OEM)', codigo: 'OEM', detalhe: 'Detecção no Cliente', ativo: true },
    { id: `${tenantId}-setdet-4`, tenant_id: tenantId, tipo: 'setor_deteccao', nome: 'Auditoria de Qualidade / Firewall', codigo: 'AUD', detalhe: 'Inspeção Qualidade', ativo: true },
    { id: `${tenantId}-setdet-5`, tenant_id: tenantId, tipo: 'setor_deteccao', nome: 'Logística / Kitting / Expedição', codigo: 'LOG', detalhe: 'Movimentação e Embarque', ativo: true },

    // Impactos no Cliente
    { id: `${tenantId}-imp-1`, tenant_id: tenantId, tipo: 'impacto_cliente', nome: 'Parada de Linha na Montadora', codigo: 'CRIT', detalhe: 'Alto Impacto', ativo: true },
    { id: `${tenantId}-imp-2`, tenant_id: tenantId, tipo: 'impacto_cliente', nome: 'Retrabalho em Linha de Montagem', codigo: 'RET', detalhe: 'Médio Impacto', ativo: true },
    { id: `${tenantId}-imp-3`, tenant_id: tenantId, tipo: 'impacto_cliente', nome: 'Bloqueio Preventivo de Lote no Pátio', codigo: 'BLOQ', detalhe: 'Contenção', ativo: true },
    { id: `${tenantId}-imp-4`, tenant_id: tenantId, tipo: 'impacto_cliente', nome: 'Descarte / Refugo na Linha do Cliente', codigo: 'SCRAP', detalhe: 'Perda de Peça', ativo: true },
    { id: `${tenantId}-imp-5`, tenant_id: tenantId, tipo: 'impacto_cliente', nome: 'Alerta Visual / Sem Parada de Linha', codigo: 'ALR', detalhe: 'Baixo Impacto', ativo: true },

    // Tipos de Peça Rastreada
    { id: `${tenantId}-tcomp-1`, tenant_id: tenantId, tipo: 'tipo_componente', nome: 'Peça Final', codigo: 'PF', detalhe: 'Produto Final / Peça Final (Conjunto Completo)', ativo: true },
    { id: `${tenantId}-tcomp-2`, tenant_id: tenantId, tipo: 'tipo_componente', nome: 'Peça Final + Componente', codigo: 'PF+C', detalhe: 'Peça Final + Componente', ativo: true },
    { id: `${tenantId}-tcomp-3`, tenant_id: tenantId, tipo: 'tipo_componente', nome: 'Componente', codigo: 'COMP', detalhe: 'Componente Isolado', ativo: true },
    { id: `${tenantId}-tcomp-4`, tenant_id: tenantId, tipo: 'tipo_componente', nome: 'SubComponente + Componente', codigo: 'SUB+C', detalhe: 'SubComponente + Componente', ativo: true },

    // Documentos de Rastreabilidade
    { id: `${tenantId}-docr-1`, tenant_id: tenantId, tipo: 'doc_rastreabilidade', nome: 'Não Informado', codigo: 'DATA', detalhe: 'Rastreabilidade por Range de Datas', ativo: true },
    { id: `${tenantId}-docr-2`, tenant_id: tenantId, tipo: 'doc_rastreabilidade', nome: 'Etiqueta SAP', codigo: 'SAP', detalhe: 'Código de Etiqueta / Lote SAP', ativo: true },
    { id: `${tenantId}-docr-3`, tenant_id: tenantId, tipo: 'doc_rastreabilidade', nome: 'Order Cliente', codigo: 'ORD', detalhe: 'Pedido / Ordem do Cliente', ativo: true },
    { id: `${tenantId}-docr-4`, tenant_id: tenantId, tipo: 'doc_rastreabilidade', nome: 'NF', codigo: 'NF', detalhe: 'Nota Fiscal de Embarque', ativo: true },

    // Ações de Contenção Padronizadas
    { id: `${tenantId}-acont-1`, tenant_id: tenantId, tipo: 'acoes_contencao', nome: 'Inspeção 100% no estoque interno e WIP', codigo: 'AC-01', detalhe: 'Contenção Imediata', ativo: true },
    { id: `${tenantId}-acont-2`, tenant_id: tenantId, tipo: 'acoes_contencao', nome: 'Bloqueio imediato de lote no sistema SAP', codigo: 'AC-02', detalhe: 'Bloqueio Sistêmico', ativo: true },
    { id: `${tenantId}-acont-3`, tenant_id: tenantId, tipo: 'acoes_contencao', nome: 'Emissão de Alerta de Qualidade no posto de trabalho', codigo: 'AC-03', detalhe: 'Comunicação Fabril', ativo: true },
    { id: `${tenantId}-acont-4`, tenant_id: tenantId, tipo: 'acoes_contencao', nome: 'Treinamento imediato dos operadores dos 3 turnos', codigo: 'AC-04', detalhe: 'Capacitação', ativo: true },
    { id: `${tenantId}-acont-5`, tenant_id: tenantId, tipo: 'acoes_contencao', nome: 'Validação de Poka-Yoke e parâmetros de processo', codigo: 'AC-05', detalhe: 'Engenharia', ativo: true },

    // Gravidade
    { id: `${tenantId}-grav-1`, tenant_id: tenantId, tipo: 'gravidade', nome: 'Baixa', codigo: 'G1', detalhe: 'Desvio leve / Sem afetação funcional', ativo: true },
    { id: `${tenantId}-grav-2`, tenant_id: tenantId, tipo: 'gravidade', nome: 'Média', codigo: 'G2', detalhe: 'Requer retrabalho ou triagem', ativo: true },
    { id: `${tenantId}-grav-3`, tenant_id: tenantId, tipo: 'gravidade', nome: 'Alta', codigo: 'G3', detalhe: 'Afeta montagem ou funcionalidade', ativo: true },
    { id: `${tenantId}-grav-4`, tenant_id: tenantId, tipo: 'gravidade', nome: 'Crítica (Segurança)', codigo: 'G4', detalhe: 'Característica de Segurança / FMEA Crítico', ativo: true },

    // Detecção no Processo
    { id: `${tenantId}-pdet-1`, tenant_id: tenantId, tipo: 'possivel_detectar', nome: 'Sim', codigo: 'SIM', detalhe: 'Falha de Inspeção / Padrão', ativo: true },
    { id: `${tenantId}-pdet-2`, tenant_id: tenantId, tipo: 'possivel_detectar', nome: 'Não', codigo: 'NAO', detalhe: 'Defeito Latente / Oculto', ativo: true },

    // Abrir 8D
    { id: `${tenantId}-ab8d-1`, tenant_id: tenantId, tipo: 'abrir_8d', nome: 'Sim', codigo: '8D-SIM', detalhe: 'Exige análise de causa raiz 8D completa', ativo: true },
    { id: `${tenantId}-ab8d-2`, tenant_id: tenantId, tipo: 'abrir_8d', nome: 'Não', codigo: '8D-NAO', detalhe: 'Apenas contenção e registro rápido', ativo: true },

    // Status do Fluxo RNC
    { id: `${tenantId}-stat-1`, tenant_id: tenantId, tipo: 'status_rnc', nome: 'Relatório Inicial', codigo: 'ST-01', detalhe: 'Abertura inicial de fábrica', ativo: true },
    { id: `${tenantId}-stat-2`, tenant_id: tenantId, tipo: 'status_rnc', nome: 'RNC Emitida', codigo: 'ST-02', detalhe: 'Oficializada pela Qualidade', ativo: true },
    { id: `${tenantId}-stat-3`, tenant_id: tenantId, tipo: 'status_rnc', nome: 'Em Andamento', codigo: 'ST-03', detalhe: 'Em tratativa 8D / Contenção', ativo: true },
    { id: `${tenantId}-stat-4`, tenant_id: tenantId, tipo: 'status_rnc', nome: 'Concluído', codigo: 'ST-04', detalhe: 'Eficácia validada e encerrada', ativo: true },
    { id: `${tenantId}-stat-5`, tenant_id: tenantId, tipo: 'status_rnc', nome: 'Reprovado', codigo: 'ST-05', detalhe: 'Plano reprovado na auditoria', ativo: true },

    { id: `${tenantId}-crit-1`, tenant_id: tenantId, tipo: 'criticidade', nome: 'A', codigo: 'CRIT-A', detalhe: 'Criticidade A — Impacto Crítico / Segurança / Montadora', ativo: true },
    { id: `${tenantId}-crit-2`, tenant_id: tenantId, tipo: 'criticidade', nome: 'B', codigo: 'CRIT-B', detalhe: 'Criticidade B — Funcional / Dimensional Importante', ativo: true },
    { id: `${tenantId}-crit-3`, tenant_id: tenantId, tipo: 'criticidade', nome: 'C', codigo: 'CRIT-C', detalhe: 'Criticidade C — Visual / Leve / Sem Impacto Funcional', ativo: true },

    { id: `${tenantId}-disp-1`, tenant_id: tenantId, tipo: 'disposicao_lote', nome: 'Liberado Após Triagem 100%', codigo: 'DISP-01', detalhe: 'Peças aprovadas na seleção', ativo: true },
    { id: `${tenantId}-disp-2`, tenant_id: tenantId, tipo: 'disposicao_lote', nome: 'Retrabalho Interno Autorizado', codigo: 'DISP-02', detalhe: 'Recuperação conforme instrução padrão', ativo: true },
    { id: `${tenantId}-disp-3`, tenant_id: tenantId, tipo: 'disposicao_lote', nome: 'Sucateamento / Refugo (Scrap)', codigo: 'DISP-03', detalhe: 'Descarte definitivo de peças NG', ativo: true },
    { id: `${tenantId}-disp-4`, tenant_id: tenantId, tipo: 'disposicao_lote', nome: 'Concessão / Desvio de Engenharia', codigo: 'DISP-04', detalhe: 'Aprovação condicional com desvio', ativo: true },
    { id: `${tenantId}-disp-5`, tenant_id: tenantId, tipo: 'disposicao_lote', nome: 'Devolução ao Fornecedor', codigo: 'DISP-05', detalhe: 'Matéria-prima ou componente comprado', ativo: true },

    { id: `${tenantId}-forn-1`, tenant_id: tenantId, tipo: 'origem_fornecedor', nome: 'USIMINAS — Bobinas de Aço', codigo: 'FORN-01', detalhe: 'Matéria-Prima Estamparia', ativo: true },
    { id: `${tenantId}-forn-2`, tenant_id: tenantId, tipo: 'origem_fornecedor', nome: 'ARCELORMITTAL — Aços Revestidos', codigo: 'FORN-02', detalhe: 'Matéria-Prima Estamparia', ativo: true },
    { id: `${tenantId}-forn-3`, tenant_id: tenantId, tipo: 'origem_fornecedor', nome: 'BÖLLHOFF — Fixadores M8/M10', codigo: 'FORN-03', detalhe: 'Elementos de Fixação', ativo: true },
    { id: `${tenantId}-forn-4`, tenant_id: tenantId, tipo: 'origem_fornecedor', nome: 'PPG INDUSTRIAL — Químicos E-Coat', codigo: 'FORN-04', detalhe: 'Tratamento Superficial', ativo: true },

    // Itens Específicos do Aplicativo de Plano de Ação
    { id: `${tenantId}-pind-1`, tenant_id: tenantId, tipo: 'plano_indicador', nome: '8D', codigo: '8D', detalhe: 'Plano de Ação 8D Não Conformidades', ativo: true },
    { id: `${tenantId}-pind-2`, tenant_id: tenantId, tipo: 'plano_indicador', nome: 'ATENDIMENTO AO CLIENTE', codigo: 'CLI', detalhe: 'Reclamações e Garantia de Clientes OEM', ativo: true },
    { id: `${tenantId}-pind-3`, tenant_id: tenantId, tipo: 'plano_indicador', nome: 'FAST RESPONSE', codigo: 'FR', detalhe: 'Resposta Rápida no Chão de Fábrica', ativo: true },
    { id: `${tenantId}-pind-4`, tenant_id: tenantId, tipo: 'plano_indicador', nome: 'KAIZEN', codigo: 'KZN', detalhe: 'Melhoria Contínua e Redução de Desperdícios', ativo: true },
    { id: `${tenantId}-pind-5`, tenant_id: tenantId, tipo: 'plano_indicador', nome: 'AUDITORIA DE PROCESSO', codigo: 'AUD', detalhe: 'Auditorias IATF 16949 / LPA / VDA 6.3', ativo: true },
    { id: `${tenantId}-pind-6`, tenant_id: tenantId, tipo: 'plano_indicador', nome: '5S & SEGURANÇA', codigo: '5S', detalhe: 'Organização, Segurança e Meio Ambiente', ativo: true },
    { id: `${tenantId}-pind-7`, tenant_id: tenantId, tipo: 'plano_indicador', nome: 'REDUÇÃO DE SCRAP', codigo: 'SCR', detalhe: 'Iniciativas de Redução de Refugo', ativo: true },

    // Subindicador
    { id: `${tenantId}-psub1-1`, tenant_id: tenantId, tipo: 'plano_sub1', nome: 'Qualidade Cliente', codigo: 'SUB-QC', detalhe: 'Impacto externo no cliente', ativo: true },
    { id: `${tenantId}-psub1-2`, tenant_id: tenantId, tipo: 'plano_sub1', nome: 'Qualidade Interna', codigo: 'SUB-QI', detalhe: 'Retrabalho e scrap interno', ativo: true },
    { id: `${tenantId}-psub1-3`, tenant_id: tenantId, tipo: 'plano_sub1', nome: 'Estamparia Pesada', codigo: 'SUB-EST', detalhe: 'Prensas e corte de bobinas', ativo: true },
    { id: `${tenantId}-psub1-4`, tenant_id: tenantId, tipo: 'plano_sub1', nome: 'Solda Automatizada', codigo: 'SUB-SOL', detalhe: 'Células robóticas de solda', ativo: true },
    { id: `${tenantId}-psub1-5`, tenant_id: tenantId, tipo: 'plano_sub1', nome: 'Manutenção / TPM', codigo: 'SUB-MAN', detalhe: 'Paradas e disponibilidade técnica', ativo: true },
    { id: `${tenantId}-psub1-6`, tenant_id: tenantId, tipo: 'plano_sub1', nome: 'Logística & Kitting', codigo: 'SUB-LOG', detalhe: 'Abastecimento e expedição', ativo: true },

    // Prioridades do Plano
    { id: `${tenantId}-pprio-1`, tenant_id: tenantId, tipo: 'plano_prioridade', nome: 'Alta', codigo: 'PRIO-1', detalhe: 'Execução urgente / Bloqueio', ativo: true },
    { id: `${tenantId}-pprio-2`, tenant_id: tenantId, tipo: 'plano_prioridade', nome: 'Média', codigo: 'PRIO-2', detalhe: 'Prazo padrão de tratativa', ativo: true },
    { id: `${tenantId}-pprio-3`, tenant_id: tenantId, tipo: 'plano_prioridade', nome: 'Baixa', codigo: 'PRIO-3', detalhe: 'Melhoria contínua e rotina', ativo: true },

    // Status do Plano e das Ações
    { id: `${tenantId}-pstat-1`, tenant_id: tenantId, tipo: 'plano_status_lista', nome: 'Aberto', codigo: 'ST-AB', detalhe: 'Plano ou tarefa aberta aguardando execução', ativo: true },
    { id: `${tenantId}-pstat-2`, tenant_id: tenantId, tipo: 'plano_status_lista', nome: 'Em Andamento', codigo: 'ST-AND', detalhe: 'Execução em andamento pela equipe', ativo: true },
    { id: `${tenantId}-pstat-3`, tenant_id: tenantId, tipo: 'plano_status_lista', nome: 'Concluído', codigo: 'ST-CON', detalhe: 'Implementada aguardando validação da Qualidade', ativo: true },
    { id: `${tenantId}-pstat-4`, tenant_id: tenantId, tipo: 'plano_status_lista', nome: 'Validado', codigo: 'ST-VAL', detalhe: 'Eficácia aprovada e homologada pela Qualidade', ativo: true },
    { id: `${tenantId}-pstat-5`, tenant_id: tenantId, tipo: 'plano_status_lista', nome: 'Atrasado', codigo: 'ST-ATR', detalhe: 'Prazo planejado vencido', ativo: true },
    { id: `${tenantId}-pstat-6`, tenant_id: tenantId, tipo: 'plano_status_lista', nome: 'Cancelado', codigo: 'ST-CAN', detalhe: 'Plano ou tarefa cancelada com justificativa', ativo: true },

    // Decisão da Auditoria e Homologação
    { id: `${tenantId}-pdec-1`, tenant_id: tenantId, tipo: 'plano_decisao_auditoria_lista', nome: 'Aprovar & Homologar', codigo: 'APR', detalhe: 'Evidência aprovada e eficácia comprovada', ativo: true },
    { id: `${tenantId}-pdec-2`, tenant_id: tenantId, tipo: 'plano_decisao_auditoria_lista', nome: 'Solicitar Revisão', codigo: 'REV', detalhe: 'Retornar ação ou relatório para complementação', ativo: true },

    // Metodologia 8D — Tipos de Ação
    { id: `${tenantId}-8dta-1`, tenant_id: tenantId, tipo: 'oitod_tipos_acao', nome: 'CONTENÇÃO', codigo: '3D', detalhe: 'Ação imediata de contenção e proteção ao cliente (3D)', ativo: true },
    { id: `${tenantId}-8dta-2`, tenant_id: tenantId, tipo: 'oitod_tipos_acao', nome: 'CORRETIVA', codigo: '5D/6D', detalhe: 'Ação corretiva definitiva sobre a causa raiz e abrangência (5D / 6D)', ativo: true },
    { id: `${tenantId}-8dta-3`, tenant_id: tenantId, tipo: 'oitod_tipos_acao', nome: 'PREVENTIVA', codigo: '7D', detalhe: 'Ação preventiva sistêmica para evitar recorrência (7D)', ativo: true },
    { id: `${tenantId}-8dta-4`, tenant_id: tenantId, tipo: 'oitod_tipos_acao', nome: 'MELHORIA', codigo: 'KAIZEN', detalhe: 'Ação de melhoria contínua complementar', ativo: true },

    // Metodologia 8D — Documentos e Eixos de Prevenção 7D
    { id: `${tenantId}-8d7d-1`, tenant_id: tenantId, tipo: 'oitod_documentos_7d', nome: 'FMEA', codigo: 'PFMEA', detalhe: 'Atualização de RPN, Severidade, Ocorrência e Detecção no PFMEA', ativo: true },
    { id: `${tenantId}-8d7d-2`, tenant_id: tenantId, tipo: 'oitod_documentos_7d', nome: 'Trabalho Padronizado', codigo: 'FIT/TP', detalhe: 'Revisão de Instrução de Trabalho / Folha de Processo', ativo: true },
    { id: `${tenantId}-8d7d-3`, tenant_id: tenantId, tipo: 'oitod_documentos_7d', nome: 'Auditoria Escalonada', codigo: 'LPA', detalhe: 'Inclusão de item de verificação na Auditoria de Processo em Camadas', ativo: true },
    { id: `${tenantId}-8d7d-4`, tenant_id: tenantId, tipo: 'oitod_documentos_7d', nome: 'Plano de Controle', codigo: 'PC', detalhe: 'Atualização de frequência ou método no Plano de Controle', ativo: true },
    { id: `${tenantId}-8d7d-5`, tenant_id: tenantId, tipo: 'oitod_documentos_7d', nome: 'Lição Ponto a Ponto (LPP)', codigo: 'LPP', detalhe: 'Treinamento visual rápido de operação e inspeção', ativo: true },

    // Metodologia 8D — Categorias 6M do Ishikawa
    { id: `${tenantId}-8d6m-1`, tenant_id: tenantId, tipo: 'oitod_6m_ishikawa', nome: 'Máquina', codigo: 'M1', detalhe: 'Equipamentos, ferramental, dispositivos, robôs e manutenção', ativo: true },
    { id: `${tenantId}-8d6m-2`, tenant_id: tenantId, tipo: 'oitod_6m_ishikawa', nome: 'Mão de Obra', codigo: 'M2', detalhe: 'Treinamento, habilitação, atenção operacional e ergonomia', ativo: true },
    { id: `${tenantId}-8d6m-3`, tenant_id: tenantId, tipo: 'oitod_6m_ishikawa', nome: 'Método', codigo: 'M3', detalhe: 'Procedimento, sequência operacional, parâmetros e instrução', ativo: true },
    { id: `${tenantId}-8d6m-4`, tenant_id: tenantId, tipo: 'oitod_6m_ishikawa', nome: 'Material', codigo: 'M4', detalhe: 'Matéria-prima, componentes comprados, bobinas e lote', ativo: true },
    { id: `${tenantId}-8d6m-5`, tenant_id: tenantId, tipo: 'oitod_6m_ishikawa', nome: 'Medição', codigo: 'M5', detalhe: 'Calibradores, sensores Poka-Yoke, instrumentos e gabaritos', ativo: true },
    { id: `${tenantId}-8d6m-6`, tenant_id: tenantId, tipo: 'oitod_6m_ishikawa', nome: 'Meio Ambiente', codigo: 'M6', detalhe: 'Iluminação, temperatura, limpeza 5S e layout do posto', ativo: true },

    // Metodologia 8D — Locais de Estoque / Quarentena (3D)
    { id: `${tenantId}-8dest-1`, tenant_id: tenantId, tipo: 'oitod_estoques_locais', nome: 'Estoque Interno WIP (Bordo de Linha)', codigo: 'WIP', detalhe: 'Peças em processo entre operações', ativo: true },
    { id: `${tenantId}-8dest-2`, tenant_id: tenantId, tipo: 'oitod_estoques_locais', nome: 'Quarentena da Qualidade', codigo: 'QUAR', detalhe: 'Área segregada de bloqueio físico', ativo: true },
    { id: `${tenantId}-8dest-3`, tenant_id: tenantId, tipo: 'oitod_estoques_locais', nome: 'Armazém de Expedição / Produto Acabado', codigo: 'EXP', detalhe: 'Lotes prontos para embarque', ativo: true },
    { id: `${tenantId}-8dest-4`, tenant_id: tenantId, tipo: 'oitod_estoques_locais', nome: 'Em Trânsito / Pátio da Montadora', codigo: 'CLI', detalhe: 'Lotes em transporte ou no cliente', ativo: true }
  ];

  return [...baseItems, ...commonOptionItems].map(normalizeMasterDataItemCasing);
}

// ============================================================================
// CONFIGURAÇÃO PADRÃO COMPLETA DOS CAMPOS POR EMPRESA (TENANT) — 3 MÓDULOS:
// 1. RNC (Não Conformidades)
// 2. Plano de Ação (Cabeçalho e Tarefas 5W2H / Conclusão / Homologação)
// 3. Metodologia 8D (Etapas 1D a 8D completas)
// ============================================================================
export function getDefaultFormFieldsForTenant(tenantId: string): FormFieldConfig[] {
  const rawFields: Omit<FormFieldConfig, 'fieldKey'>[] = [
    // ========================================================================
    // MÓDULO 1: RNC — SEÇÃO 1: Dados Gerais & Cliente
    // ========================================================================
    {
      id: 'cliente',
      key: 'cliente',
      tenant_id: tenantId,
      label: 'Cliente',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'cliente_montadora',
      valueColumn: 'Cliente / Montadora',
      displayColumn: 'Cliente / Montadora',
      placeholder: '-- Selecione o Cliente --',
      colSpan: 1
    },
    {
      id: 'tipoRnc',
      key: 'tipoRnc',
      tenant_id: tenantId,
      label: 'Tipo de Ocorrência',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'tipo_rnc',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: '-- Selecione o Tipo --',
      colSpan: 1
    },
    {
      id: 'dataOcorrencia',
      key: 'dataOcorrencia',
      tenant_id: tenantId,
      label: 'Data da Ocorrência',
      section: 'secao_1',
      module: 'rnc',
      type: 'date',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'turno',
      key: 'turno',
      tenant_id: tenantId,
      label: 'Turno de Detecção',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'turno',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o turno...',
      colSpan: 1
    },
    {
      id: 'condicionaisTipoRnc',
      key: 'setorDeteccao',
      tenant_id: tenantId,
      label: 'Setor / Local de Detecção (Condicional Interno)',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'setor_deteccao',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Ex: Linha de Solda, Estamparia, Montagem...',
      colSpan: 2
    },
    {
      id: 'codOcorrenciaCliente',
      key: 'codOcorrenciaCliente',
      tenant_id: tenantId,
      label: 'Código / ID no Portal do Cliente (Condicional Formal)',
      section: 'secao_1',
      module: 'rnc',
      type: 'text',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      placeholder: 'Ex: RNC-OEM-2026-0042...',
      colSpan: 1
    },
    {
      id: 'dataOficializacao',
      key: 'dataOficializacao',
      tenant_id: tenantId,
      label: 'Data de Oficialização no Portal (Condicional Formal)',
      section: 'secao_1',
      module: 'rnc',
      type: 'date',
      required: false,
      visible: true,
      order: 7,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'impactoCliente',
      key: 'impactoCliente',
      tenant_id: tenantId,
      label: 'Impacto no Cliente (Condicional Formal / Informal)',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 8,
      isSystem: true,
      optionCategory: 'impacto_cliente',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o impacto no cliente...',
      colSpan: 2
    },
    {
      id: 'detalhamentoOcorrencia',
      key: 'detalhamentoOcorrencia',
      tenant_id: tenantId,
      label: 'Detalhamento da Ocorrência / Relato do Problema',
      section: 'secao_1',
      module: 'rnc',
      type: 'textarea',
      required: false,
      visible: true,
      order: 9,
      isSystem: true,
      placeholder: 'Descreva os detalhes da reclamação ou detecção da não conformidade...',
      colSpan: 4
    },
    {
      id: 'participantesAtendimento',
      key: 'participantesAtendimento',
      tenant_id: tenantId,
      label: 'Participantes do Atendimento',
      section: 'secao_1',
      module: 'rnc',
      type: 'multiselect',
      required: false,
      visible: true,
      order: 10,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Clique para selecionar colaboradores da equipe...',
      colSpan: 4
    },
    {
      id: 'detector',
      key: 'detector',
      tenant_id: tenantId,
      label: 'Responsável pela Abertura / Detector (Preenchimento Automático)',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: false,
      order: 11,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Colaborador logado que registrou a RNC...',
      colSpan: 2
    },
    {
      id: 'status',
      key: 'status',
      tenant_id: tenantId,
      label: 'Status do Fluxo da Ocorrência (Regra de Sistema / Filtros)',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: false,
      order: 12,
      isSystem: true,
      optionCategory: 'status_rnc',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Status atual da RNC...',
      colSpan: 1
    },
    {
      id: 'criticidade',
      key: 'criticidade',
      tenant_id: tenantId,
      label: 'Classificação de Criticidade A / B / C (Auditoria)',
      section: 'secao_1',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: false,
      order: 13,
      isSystem: true,
      optionCategory: 'criticidade',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Nível de criticidade...',
      colSpan: 1
    },

    // ========================================================================
    // MÓDULO 1: RNC — SEÇÃO 2: Peça, Posto & Área Fabril
    // ========================================================================
    {
      id: 'finalComponente',
      key: 'finalComponente',
      tenant_id: tenantId,
      label: 'Tipo de Peça Rastreada',
      section: 'secao_2',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'tipo_componente',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o tipo de componente...',
      colSpan: 1
    },
    {
      id: 'produto',
      key: 'produto',
      tenant_id: tenantId,
      label: 'Produto / Conjunto',
      section: 'secao_2',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'master_pecas_produtos',
      valueColumn: 'Peça / Produto',
      displayColumn: 'Peça / Produto',
      placeholder: '-- Selecione o Produto / Conjunto --',
      colSpan: 1
    },
    {
      id: 'componente',
      key: 'componente',
      tenant_id: tenantId,
      label: 'Componente',
      section: 'secao_2',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'master_pecas_produtos',
      valueColumn: 'Peça / Produto',
      displayColumn: 'Peça / Produto',
      placeholder: '-- Selecione o Componente --',
      colSpan: 1
    },
    {
      id: 'posto',
      key: 'posto',
      tenant_id: tenantId,
      label: 'Posto de Trabalho Cadastrado',
      section: 'secao_2',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'posto_trabalho',
      valueColumn: 'Posto de Trabalho',
      displayColumn: 'Posto de Trabalho',
      placeholder: '-- Selecione o Posto de Trabalho --',
      colSpan: 1
    },
    {
      id: 'fmds',
      key: 'fmds',
      tenant_id: tenantId,
      label: 'Área / Setor Fabril',
      section: 'secao_2',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'area_fabril',
      valueColumn: 'Área / Setor Fabril',
      displayColumn: 'Área / Setor Fabril',
      placeholder: '-- Selecione a Área / Setor Fabril --',
      colSpan: 2
    },
    {
      id: 'atributosPeca',
      key: 'atributosPeca',
      tenant_id: tenantId,
      label: 'Indicadores Técnicos da Peça (Peça comum, Co-produto, Segurança FMEA e Reincidência)',
      section: 'secao_2',
      module: 'rnc',
      type: 'yesno',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      colSpan: 3
    },

    // ========================================================================
    // MÓDULO 1: RNC — SEÇÃO 3: Defeito, Quantidade & Rastreabilidade
    // ========================================================================
    {
      id: 'modoFalha',
      key: 'modoFalha',
      tenant_id: tenantId,
      label: 'Classificação do Defeito (Modo de Falha)',
      section: 'secao_3',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'cat_defeito',
      valueColumn: 'Modo de Falha / Defeito',
      displayColumn: 'Modo de Falha / Defeito',
      placeholder: '-- Selecione o Modo de Falha --',
      colSpan: 2
    },
    {
      id: 'quantidadeAfetada',
      key: 'quantidadeAfetada',
      tenant_id: tenantId,
      label: 'Quantidade Não Conforme',
      section: 'secao_3',
      module: 'rnc',
      type: 'number',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      placeholder: 'Ex: 1, 5, 10...',
      colSpan: 2
    },
    {
      id: 'documentoRastreabilidade',
      key: 'documentoRastreabilidade',
      tenant_id: tenantId,
      label: 'Documento e Código / Período de Rastreabilidade',
      section: 'secao_3',
      module: 'rnc',
      type: 'select',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'doc_rastreabilidade',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o documento...',
      colSpan: 2
    },
    {
      id: 'codigoRastreabilidade',
      key: 'codigoRastreabilidade',
      tenant_id: tenantId,
      label: 'Código / Número do Documento (Etiqueta SAP / Order / NF)',
      section: 'secao_3',
      module: 'rnc',
      type: 'text',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      placeholder: 'Informe o código da etiqueta, ordem ou NF...',
      colSpan: 2
    },
    {
      id: 'dataInicioRastreabilidade',
      key: 'dataInicioRastreabilidade',
      tenant_id: tenantId,
      label: 'Data Inicial do Lote Rastreado (Condicional Sem Documento)',
      section: 'secao_3',
      module: 'rnc',
      type: 'date',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'dataFimRastreabilidade',
      key: 'dataFimRastreabilidade',
      tenant_id: tenantId,
      label: 'Data Final do Lote Rastreado (Condicional Sem Documento)',
      section: 'secao_3',
      module: 'rnc',
      type: 'date',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      colSpan: 1
    },

    // ========================================================================
    // MÓDULO 1: RNC — SEÇÃO 4: Evidência Fotográfica da Peça NG
    // ========================================================================
    {
      id: 'fotoPecaNg',
      key: 'fotoPecaNg',
      tenant_id: tenantId,
      label: 'Evidência da Peça Defeituosa (NG)',
      section: 'secao_4',
      module: 'rnc',
      type: 'photo',
      required: false,
      visible: true,
      order: 1,
      isSystem: true,
      colSpan: 4
    },

    // ========================================================================
    // MÓDULO 1: RNC — SEÇÃO 5: Contenção & Tratativa da Qualidade (5W2H)
    // ========================================================================
    {
      id: 'fotoPecaOk',
      key: 'fotoPecaOk',
      tenant_id: tenantId,
      label: 'Foto da Peça OK (Padrão de Referência / Aceitável)',
      section: 'secao_5',
      module: 'rnc',
      type: 'photo',
      required: false,
      visible: true,
      order: 1,
      isSystem: true,
      colSpan: 4
    },
    {
      id: 'descricaoProblemaInterno',
      key: 'descricaoProblemaInterno',
      tenant_id: tenantId,
      label: 'Descrição do Problema (Interno)',
      section: 'secao_5',
      module: 'rnc',
      type: 'textarea',
      required: false,
      visible: true,
      order: 2,
      isSystem: true,
      placeholder: 'Descreva o problema sob a ótica interna de processo/fabricação...',
      colSpan: 4
    },
    {
      id: 'acoesContencao',
      key: 'acoesContencao',
      tenant_id: tenantId,
      label: 'Ações de Contenção Imediata',
      section: 'secao_5',
      module: 'rnc',
      type: 'multiselect',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'acoes_contencao',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Ou digite detalhes complementares das ações de contenção...',
      colSpan: 4
    },
    {
      id: 'recomendacoesProvidencias',
      key: 'recomendacoesProvidencias',
      tenant_id: tenantId,
      label: 'Recomendações / Providências',
      section: 'secao_5',
      module: 'rnc',
      type: 'textarea',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      placeholder: 'Informe recomendações e providências adotadas pela equipe...',
      colSpan: 4
    },
    {
      id: 'gravidade',
      key: 'gravidade',
      tenant_id: tenantId,
      label: 'Gravidade do Defeito',
      section: 'secao_5',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'gravidade',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      colSpan: 1
    },
    {
      id: 'possivelDetectar',
      key: 'possivelDetectar',
      tenant_id: tenantId,
      label: 'Detecção no Processo?',
      section: 'secao_5',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      optionCategory: 'possivel_detectar',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      colSpan: 1
    },
    {
      id: 'disposicaoLote',
      key: 'disposicaoLote',
      tenant_id: tenantId,
      label: 'Disposição de Material / Lote Segregado',
      section: 'secao_5',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 7,
      isSystem: true,
      optionCategory: 'disposicao_lote',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      colSpan: 2
    },
    {
      id: 'qtdInspecionada',
      key: 'qtdInspecionada',
      tenant_id: tenantId,
      label: 'Qtd Inspecionada',
      section: 'secao_5',
      module: 'rnc',
      type: 'number',
      required: false,
      visible: true,
      order: 8,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'qtdSuspeita',
      key: 'qtdSuspeita',
      tenant_id: tenantId,
      label: 'Qtd Suspeita',
      section: 'secao_5',
      module: 'rnc',
      type: 'number',
      required: false,
      visible: true,
      order: 9,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'qtdBloqueada',
      key: 'qtdBloqueada',
      tenant_id: tenantId,
      label: 'Qtd Bloqueada',
      section: 'secao_5',
      module: 'rnc',
      type: 'number',
      required: false,
      visible: true,
      order: 10,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'oQueFazer',
      key: 'oQueFazer',
      tenant_id: tenantId,
      label: '5W2H — O que fazer?',
      section: 'secao_5',
      module: 'rnc',
      type: 'textarea',
      required: false,
      visible: true,
      order: 11,
      isSystem: true,
      placeholder: 'Ex: Realizar contenção antes de colocar na embalagem...',
      colSpan: 1
    },
    {
      id: 'comoFazer',
      key: 'comoFazer',
      tenant_id: tenantId,
      label: '5W2H — Como fazer?',
      section: 'secao_5',
      module: 'rnc',
      type: 'textarea',
      required: false,
      visible: true,
      order: 12,
      isSystem: true,
      placeholder: 'Ex: Inspecionar isento de amassado...',
      colSpan: 1
    },
    {
      id: 'porQueFazer',
      key: 'porQueFazer',
      tenant_id: tenantId,
      label: '5W2H — Por que fazer?',
      section: 'secao_5',
      module: 'rnc',
      type: 'textarea',
      required: false,
      visible: true,
      order: 13,
      isSystem: true,
      placeholder: 'Ex: Para garantir que na próxima operação peças estejam OK...',
      colSpan: 1
    },
    {
      id: 'quandoFara',
      key: 'quandoFara',
      tenant_id: tenantId,
      label: '5W2H — Quando fazer?',
      section: 'secao_5',
      module: 'rnc',
      type: 'date',
      required: false,
      visible: true,
      order: 14,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'ondeFara',
      key: 'ondeFara',
      tenant_id: tenantId,
      label: '5W2H — Onde fazer? (Local / Posto)',
      section: 'secao_5',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 15,
      isSystem: true,
      optionCategory: 'posto_trabalho',
      valueColumn: 'Posto de Trabalho',
      displayColumn: 'Posto de Trabalho',
      placeholder: 'Ex: Linha 3 / Posto de inspeção...',
      colSpan: 1
    },
    {
      id: 'quemFara',
      key: 'quemFara',
      tenant_id: tenantId,
      label: 'Equipe Responsável pelo 8D / Quem fará',
      section: 'secao_5',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 16,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o responsável...',
      colSpan: 1
    },
    {
      id: 'fotoAuxiliar',
      key: 'fotoAuxiliar',
      tenant_id: tenantId,
      label: 'Foto Auxiliar Retrabalho / Seleção',
      section: 'secao_5',
      module: 'rnc',
      type: 'photo',
      required: false,
      visible: true,
      order: 17,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'dataContencao',
      key: 'dataContencao',
      tenant_id: tenantId,
      label: 'Data Final de Contenção',
      section: 'secao_5',
      module: 'rnc',
      type: 'date',
      required: false,
      visible: true,
      order: 18,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'abrir8D',
      key: 'abrir8D',
      tenant_id: tenantId,
      label: 'Abrir 8D',
      section: 'secao_5',
      module: 'rnc',
      type: 'select',
      required: false,
      visible: true,
      order: 19,
      isSystem: true,
      optionCategory: 'abrir_8d',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      colSpan: 1
    },

    // ========================================================================
    // MÓDULO 2: PLANO DE AÇÃO — SEÇÃO 1: Cabeçalho do Plano de Ação
    // ========================================================================
    {
      id: 'plano_responsavel',
      key: 'plano_responsavel',
      tenant_id: tenantId,
      label: 'Responsável pela Abertura do Plano',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Responsável...',
      colSpan: 2
    },
    {
      id: 'plano_indicador',
      key: 'plano_indicador',
      tenant_id: tenantId,
      label: 'Indicador / Programa Estratégico',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'plano_indicador',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Indicador...',
      colSpan: 1
    },
    {
      id: 'plano_sub1',
      key: 'plano_sub1',
      tenant_id: tenantId,
      label: 'Subindicador',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'plano_sub1',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Subindicador...',
      colSpan: 1
    },
    {
      id: 'plano_area',
      key: 'plano_area',
      tenant_id: tenantId,
      label: 'Área / Setor Fabril',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'area_fabril',
      valueColumn: 'Área / Setor Fabril',
      displayColumn: 'Área / Setor Fabril',
      placeholder: 'Selecione a Área / Setor...',
      colSpan: 1
    },
    {
      id: 'plano_posto',
      key: 'plano_posto',
      tenant_id: tenantId,
      label: 'Posto de Trabalho do Plano',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'posto_trabalho',
      valueColumn: 'Posto de Trabalho',
      displayColumn: 'Posto de Trabalho',
      placeholder: 'Selecione o Posto...',
      colSpan: 1
    },
    {
      id: 'plano_produto',
      key: 'plano_produto',
      tenant_id: tenantId,
      label: 'Produto / Peça Relacionada',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      optionCategory: 'master_pecas_produtos',
      valueColumn: 'Peça / Produto',
      displayColumn: 'Peça / Produto',
      placeholder: 'Selecione o Produto / Projeto...',
      colSpan: 1
    },
    {
      id: 'plano_prioridade',
      key: 'plano_prioridade',
      tenant_id: tenantId,
      label: 'Prioridade do Plano',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 7,
      isSystem: true,
      optionCategory: 'plano_prioridade',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione a Prioridade...',
      colSpan: 1
    },
    {
      id: 'plano_descricao_problema',
      key: 'plano_descricao_problema',
      tenant_id: tenantId,
      label: 'Descrição do Problema / Oportunidade',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'textarea',
      required: true,
      visible: true,
      order: 8,
      isSystem: true,
      placeholder: 'Descreva claramente o desvio identificado, meta não atingida ou oportunidade...',
      colSpan: 4
    },
    {
      id: 'plano_foto_auxiliar',
      key: 'plano_foto_auxiliar',
      tenant_id: tenantId,
      label: 'Foto Auxiliar (Peça, Posto ou Evidência do Problema)',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'photo',
      required: false,
      visible: true,
      order: 9,
      isSystem: true,
      colSpan: 4
    },
    {
      id: 'plano_idprograma',
      key: 'plano_idprograma',
      tenant_id: tenantId,
      label: 'Código / Vínculo de Origem (Ex: 8D / RNC — Oculto / Automático)',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'text',
      required: false,
      visible: false,
      order: 10,
      isSystem: true,
      placeholder: 'ID de origem quando gerado automaticamente...',
      colSpan: 1
    },
    {
      id: 'plano_data_abertura',
      key: 'plano_data_abertura',
      tenant_id: tenantId,
      label: 'Data de Abertura do Plano (Preenchimento Automático)',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'date',
      required: false,
      visible: false,
      order: 11,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'plano_status',
      key: 'plano_status',
      tenant_id: tenantId,
      label: 'Status Geral do Plano de Ação (Regra de Fluxo)',
      section: 'plano_cabecalho',
      module: 'plano_acao',
      type: 'select',
      required: false,
      visible: false,
      order: 12,
      isSystem: true,
      optionCategory: 'plano_status_lista',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Status do plano...',
      colSpan: 1
    },

    // ========================================================================
    // MÓDULO 2: PLANO DE AÇÃO — SEÇÃO 2: Tarefas, Contramedidas, Conclusão e Homologação
    // ========================================================================
    {
      id: 'plano_vinculo_id',
      key: 'plano_vinculo_id',
      tenant_id: tenantId,
      label: 'Vincular ao Plano de Ação (Cabeçalho)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'text',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      placeholder: 'Selecione o Plano de Ação de destino...',
      colSpan: 2
    },
    {
      id: 'plano_tipo_acao',
      key: 'plano_tipo_acao',
      tenant_id: tenantId,
      label: 'Tipo da Ação (Contenção / Corretiva / Preventiva / Melhoria)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'oitod_tipos_acao',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Tipo de Ação...',
      colSpan: 2
    },
    {
      id: 'plano_causa_acao',
      key: 'plano_causa_acao',
      tenant_id: tenantId,
      label: 'Causa Raiz / Origem Apurada',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'text',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      placeholder: 'Descreva a causa raiz que esta ação irá bloquear ou eliminar...',
      colSpan: 4
    },
    {
      id: 'plano_contra_medida',
      key: 'plano_contra_medida',
      tenant_id: tenantId,
      label: 'Descrição da Contramedida (O que será feito)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'textarea',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      placeholder: 'Detalhe a ação técnica, dispositivo ou alteração de processo...',
      colSpan: 4
    },
    {
      id: 'plano_posto_acao',
      key: 'plano_posto_acao',
      tenant_id: tenantId,
      label: 'Posto de Trabalho / Local da Ação',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'select',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'posto_trabalho',
      valueColumn: 'Posto de Trabalho',
      displayColumn: 'Posto de Trabalho',
      placeholder: 'Selecione o Posto...',
      colSpan: 2
    },
    {
      id: 'plano_resp_acao',
      key: 'plano_resp_acao',
      tenant_id: tenantId,
      label: 'Responsável pela Tarefa (Quem fará)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 6,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Colaborador...',
      colSpan: 2
    },
    {
      id: 'plano_email_resp',
      key: 'plano_email_resp',
      tenant_id: tenantId,
      label: 'E-mail do Responsável (Preenchimento Automático / Oculto)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'text',
      required: false,
      visible: false,
      order: 7,
      isSystem: true,
      placeholder: 'E-mail corporativo vinculado ao responsável...',
      colSpan: 2
    },
    {
      id: 'plano_data_acompanhamento',
      key: 'plano_data_acompanhamento',
      tenant_id: tenantId,
      label: 'Data de Acompanhamento Intermediário',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'date',
      required: false,
      visible: true,
      order: 8,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_data_planejada',
      key: 'plano_data_planejada',
      tenant_id: tenantId,
      label: 'Prazo Planejado Final',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'date',
      required: true,
      visible: true,
      order: 9,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_yokoten',
      key: 'plano_yokoten',
      tenant_id: tenantId,
      label: 'Abrangência / Yokoten? (SIM / NÃO)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'yesno',
      required: false,
      visible: true,
      order: 10,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_poka_yoke',
      key: 'plano_poka_yoke',
      tenant_id: tenantId,
      label: 'Dispositivo Poka-Yoke? (SIM / NÃO)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'yesno',
      required: false,
      visible: true,
      order: 11,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_evidencia_obrigatoria',
      key: 'plano_evidencia_obrigatoria',
      tenant_id: tenantId,
      label: 'Exige Evidência Obrigatória na Conclusão? (Regra Padrão SIM)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'yesno',
      required: false,
      visible: false,
      order: 12,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_validacao_obrigatoria',
      key: 'plano_validacao_obrigatoria',
      tenant_id: tenantId,
      label: 'Exige Validação / Homologação da Qualidade? (Regra Padrão SIM)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'yesno',
      required: false,
      visible: false,
      order: 13,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_status_acao',
      key: 'plano_status_acao',
      tenant_id: tenantId,
      label: 'Status da Ação (Aberto / Concluído / Validado / Atrasado)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'select',
      required: false,
      visible: false,
      order: 14,
      isSystem: true,
      optionCategory: 'plano_status_lista',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Status da tarefa...',
      colSpan: 2
    },
    {
      id: 'plano_data_conclusao',
      key: 'plano_data_conclusao',
      tenant_id: tenantId,
      label: 'Data Efetiva da Implementação (Modal de Conclusão)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'date',
      required: true,
      visible: true,
      order: 15,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'plano_comentarios_evidencia',
      key: 'plano_comentarios_evidencia',
      tenant_id: tenantId,
      label: 'Relato de Evidência / O que foi implementado (Modal de Conclusão)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'textarea',
      required: true,
      visible: true,
      order: 16,
      isSystem: true,
      placeholder: 'Descreva os detalhes da execução, resultados medidos, nº da revisão...',
      colSpan: 4
    },
    {
      id: 'plano_anexos_evidencia',
      key: 'plano_anexos_evidencia',
      tenant_id: tenantId,
      label: 'Anexo de Evidência — Foto ou Documento (Modal de Conclusão)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'photo',
      required: false,
      visible: true,
      order: 17,
      isSystem: true,
      colSpan: 4
    },
    {
      id: 'plano_decisao_auditoria',
      key: 'plano_decisao_auditoria',
      tenant_id: tenantId,
      label: 'Decisão da Auditoria da Qualidade (Aprovar & Homologar / Solicitar Revisão)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'select',
      required: true,
      visible: true,
      order: 18,
      isSystem: true,
      optionCategory: 'plano_decisao_auditoria_lista',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione a decisão da auditoria...',
      colSpan: 2
    },
    {
      id: 'plano_parecer_auditoria',
      key: 'plano_parecer_auditoria',
      tenant_id: tenantId,
      label: 'Parecer Técnico da Auditoria / Validação de Eficácia',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'textarea',
      required: true,
      visible: true,
      order: 19,
      isSystem: true,
      placeholder: 'Registre os comentários de verificação em linha e validação de eficácia...',
      colSpan: 4
    },
    {
      id: 'plano_motivo_revisao',
      key: 'plano_motivo_revisao',
      tenant_id: tenantId,
      label: 'Motivo do Retorno para Correção (Condicional Reprovação)',
      section: 'plano_acoes',
      module: 'plano_acao',
      type: 'text',
      required: false,
      visible: true,
      order: 20,
      isSystem: true,
      placeholder: 'Informe o que o responsável precisa complementar...',
      colSpan: 4
    },

    // ========================================================================
    // MÓDULO 3: METODOLOGIA 8D — SEÇÃO 1: Etapas 1D & 2D (Equipe e Problema)
    // ========================================================================
    {
      id: 'oitod_lider',
      key: 'oitod_lider',
      tenant_id: tenantId,
      label: 'Líder / Champion do Relatório 8D (1D)',
      section: 'oitod_equipe_2d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Líder do 8D...',
      colSpan: 2
    },
    {
      id: 'oitod_membros_1d',
      key: 'oitod_membros_1d',
      tenant_id: tenantId,
      label: 'Equipe Multidisciplinar 1D / 2D (Participantes)',
      section: 'oitod_equipe_2d',
      module: 'oitod',
      type: 'multiselect',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione os integrantes da equipe 1D...',
      colSpan: 2
    },
    {
      id: 'oitod_posto_2d',
      key: 'oitod_posto_2d',
      tenant_id: tenantId,
      label: 'Posto de Trabalho / Local da Ocorrência (2D)',
      section: 'oitod_equipe_2d',
      module: 'oitod',
      type: 'select',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'posto_trabalho',
      valueColumn: 'Posto de Trabalho',
      displayColumn: 'Posto de Trabalho',
      placeholder: 'Selecione o Posto...',
      colSpan: 2
    },
    {
      id: 'oitod_turno_2d',
      key: 'oitod_turno_2d',
      tenant_id: tenantId,
      label: 'Turno da Ocorrência (2D)',
      section: 'oitod_equipe_2d',
      module: 'oitod',
      type: 'select',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'turno',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Turno...',
      colSpan: 2
    },

    // ========================================================================
    // MÓDULO 3: METODOLOGIA 8D — SEÇÃO 2: Etapa 3D (Contenção e Triagem de Lotes)
    // ========================================================================
    {
      id: 'oitod_lote_3d',
      key: 'oitod_lote_3d',
      tenant_id: tenantId,
      label: 'Lote de Produção Verificado (3D)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'text',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      placeholder: 'Ex: Lote 2026-10A...',
      colSpan: 1
    },
    {
      id: 'oitod_estoque_local',
      key: 'oitod_estoque_local',
      tenant_id: tenantId,
      label: 'Locais de Estoque / Quarentena Verificados (3D)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'oitod_estoques_locais',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Local de Estoque...',
      colSpan: 2
    },
    {
      id: 'oitod_qtd_verificada_3d',
      key: 'oitod_qtd_verificada_3d',
      tenant_id: tenantId,
      label: 'Quantidade Total Verificada no Lote (3D)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'number',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'oitod_qtd_ng_3d',
      key: 'oitod_qtd_ng_3d',
      tenant_id: tenantId,
      label: 'Quantidade de Peças NG Encontradas no Lote (3D)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'number',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'oitod_qtd_ok_3d',
      key: 'oitod_qtd_ok_3d',
      tenant_id: tenantId,
      label: 'Quantidade de Peças OK Calculada (3D — Automático)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'number',
      required: false,
      visible: false,
      order: 5,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'oitod_resp_lote_3d',
      key: 'oitod_resp_lote_3d',
      tenant_id: tenantId,
      label: 'Responsável pela Verificação do Lote (3D)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 6,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o responsável pela triagem...',
      colSpan: 1
    },
    {
      id: 'oitod_disposicao_3d',
      key: 'oitod_disposicao_3d',
      tenant_id: tenantId,
      label: 'Disposição de Material / Lote Segregado (3D)',
      section: 'oitod_contencao_3d',
      module: 'oitod',
      type: 'select',
      required: false,
      visible: true,
      order: 7,
      isSystem: true,
      optionCategory: 'disposicao_lote',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione a Disposição...',
      colSpan: 2
    },

    // ========================================================================
    // MÓDULO 3: METODOLOGIA 8D — SEÇÃO 3: Etapa 4D (Gemba, Henkaten, Ishikawa 6M e 5 Porquês)
    // ========================================================================
    {
      id: 'oitod_gemba_avaliacao',
      key: 'oitod_gemba_avaliacao',
      tenant_id: tenantId,
      label: 'Investigação Gemba 4D — 1. Avaliação no Posto de Trabalho',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      placeholder: 'Relate o que foi observado in loco no posto de trabalho...',
      colSpan: 2
    },
    {
      id: 'oitod_gemba_entrevista',
      key: 'oitod_gemba_entrevista',
      tenant_id: tenantId,
      label: 'Investigação Gemba 4D — 2. Entrevistas com Operadores e Liderança',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      placeholder: 'Relate os depoimentos e percepções dos operadores...',
      colSpan: 2
    },
    {
      id: 'oitod_gemba_simulacao',
      key: 'oitod_gemba_simulacao',
      tenant_id: tenantId,
      label: 'Investigação Gemba 4D — 3. Simulação / Reprodução do Modo de Falha',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      placeholder: 'Descreva os testes práticos para reproduzir o defeito...',
      colSpan: 2
    },
    {
      id: 'oitod_gemba_rastreabilidade',
      key: 'oitod_gemba_rastreabilidade',
      tenant_id: tenantId,
      label: 'Investigação Gemba 4D — 4. Rastreabilidade de Parâmetros e Meios',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      placeholder: 'Registre os parâmetros de máquina, lote de matéria-prima e calibradores...',
      colSpan: 2
    },
    {
      id: 'oitod_henkaten_6m',
      key: 'oitod_henkaten_6m',
      tenant_id: tenantId,
      label: 'Avaliação de Mudança (Henkaten) nos 6M + Observações (4D)',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'yesno',
      required: true,
      visible: true,
      order: 5,
      isSystem: true,
      colSpan: 4
    },
    {
      id: 'oitod_6m_ishikawa',
      key: 'oitod_6m_ishikawa',
      tenant_id: tenantId,
      label: 'Categorias 6M (Ishikawa & Henkaten 4D)',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 6,
      isSystem: true,
      optionCategory: 'oitod_6m_ishikawa',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Eixo 6M...',
      colSpan: 2
    },
    {
      id: 'oitod_ishikawa_descricao',
      key: 'oitod_ishikawa_descricao',
      tenant_id: tenantId,
      label: 'Descrição da Hipótese Levantada no Diagrama de Ishikawa (4D)',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 7,
      isSystem: true,
      placeholder: 'Descreva a hipótese de ocorrência ou não detecção...',
      colSpan: 2
    },
    {
      id: 'oitod_fornecedor_4d',
      key: 'oitod_fornecedor_4d',
      tenant_id: tenantId,
      label: 'Origem / Fornecedor de Matéria-Prima (4D)',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'select',
      required: false,
      visible: true,
      order: 8,
      isSystem: true,
      optionCategory: 'origem_fornecedor',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Fornecedor...',
      colSpan: 2
    },
    {
      id: 'oitod_5pq_respostas',
      key: 'oitod_5pq_respostas',
      tenant_id: tenantId,
      label: 'Análise dos 5 Porquês (1º ao 5º Porquê para Causas NG Confirmadas)',
      section: 'oitod_causa_4d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 9,
      isSystem: true,
      placeholder: 'Desdobramento do 1º ao 5º Porquê até a causa raiz sistêmica...',
      colSpan: 2
    },

    // ========================================================================
    // MÓDULO 3: METODOLOGIA 8D — SEÇÃO 4: Etapas 5D & 6D (Ações Corretivas e Eficácia)
    // ========================================================================
    {
      id: 'oitod_tipo_acao',
      key: 'oitod_tipo_acao',
      tenant_id: tenantId,
      label: 'Classificação das Ações (3D / 5D / 6D / 7D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'oitod_tipos_acao',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Tipo de Ação...',
      colSpan: 2
    },
    {
      id: 'oitod_causa_vinculada_5d',
      key: 'oitod_causa_vinculada_5d',
      tenant_id: tenantId,
      label: 'Causa Raiz 4D Vinculada à Contramedida (5D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'text',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      placeholder: 'Causa raiz confirmada na etapa 4D...',
      colSpan: 2
    },
    {
      id: 'oitod_contra_medida_5d',
      key: 'oitod_contra_medida_5d',
      tenant_id: tenantId,
      label: 'Descrição da Ação Corretiva / Contramedida (5D / 6D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'textarea',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      placeholder: 'Detalhe a contramedida definitiva...',
      colSpan: 4
    },
    {
      id: 'oitod_responsavel_acao',
      key: 'oitod_responsavel_acao',
      tenant_id: tenantId,
      label: 'Responsável pela Contramedida (5D / 6D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Responsável...',
      colSpan: 2
    },
    {
      id: 'oitod_prazo_acao_5d',
      key: 'oitod_prazo_acao_5d',
      tenant_id: tenantId,
      label: 'Prazo Planejado de Implementação (5D / 6D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'date',
      required: true,
      visible: true,
      order: 5,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'oitod_yokoten_na',
      key: 'oitod_yokoten_na',
      tenant_id: tenantId,
      label: 'Abrangência Yokoten Não Aplicável? (Justificativa 6D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'yesno',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      colSpan: 2
    },
    {
      id: 'oitod_pokayoke_na',
      key: 'oitod_pokayoke_na',
      tenant_id: tenantId,
      label: 'Dispositivo Poka-Yoke Não Aplicável? (Justificativa 6D)',
      section: 'oitod_acoes_5d_6d',
      module: 'oitod',
      type: 'yesno',
      required: false,
      visible: true,
      order: 7,
      isSystem: true,
      colSpan: 2
    },

    // ========================================================================
    // MÓDULO 3: METODOLOGIA 8D — SEÇÃO 5: Etapas 7D & 8D (Prevenção e Fechamento)
    // ========================================================================
    {
      id: 'oitod_documento_7d',
      key: 'oitod_documento_7d',
      tenant_id: tenantId,
      label: 'Eixo / Documento de Prevenção 7D (IATF: FMEA, TP, LPA, PC, LPP)',
      section: 'oitod_prevencao_7d_8d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'oitod_documentos_7d',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Documento Sistêmico...',
      colSpan: 2
    },
    {
      id: 'oitod_treinamento_colaborador',
      key: 'oitod_treinamento_colaborador',
      tenant_id: tenantId,
      label: 'Colaborador Treinado na Lição Aprendida / LPP (7D)',
      section: 'oitod_prevencao_7d_8d',
      module: 'oitod',
      type: 'select',
      required: false,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Colaborador Treinado...',
      colSpan: 2
    },
    {
      id: 'oitod_treinamento_instrutor',
      key: 'oitod_treinamento_instrutor',
      tenant_id: tenantId,
      label: 'Multiplicador / Responsável pelo Treinamento (7D)',
      section: 'oitod_prevencao_7d_8d',
      module: 'oitod',
      type: 'select',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Instrutor / Multiplicador...',
      colSpan: 2
    },
    {
      id: 'oitod_aprovador_8d',
      key: 'oitod_aprovador_8d',
      tenant_id: tenantId,
      label: 'Aprovador Técnico / Fechamento 8D',
      section: 'oitod_prevencao_7d_8d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'master_funcionarios',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione o Aprovador...',
      colSpan: 2
    },
    {
      id: 'oitod_status_validacao_8d',
      key: 'oitod_status_validacao_8d',
      tenant_id: tenantId,
      label: 'Decisão de Homologação do Relatório 8D (Aprovar / Solicitar Revisão)',
      section: 'oitod_prevencao_7d_8d',
      module: 'oitod',
      type: 'select',
      required: true,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'plano_decisao_auditoria_lista',
      valueColumn: 'Nome',
      displayColumn: 'Nome',
      placeholder: 'Selecione a decisão final...',
      colSpan: 2
    },
    {
      id: 'oitod_parecer_final_8d',
      key: 'oitod_parecer_final_8d',
      tenant_id: tenantId,
      label: 'Parecer Técnico de Aprovação ou Solicitação de Revisão (8D)',
      section: 'oitod_prevencao_7d_8d',
      module: 'oitod',
      type: 'textarea',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      placeholder: 'Comentários de fechamento e lições aprendidas da liderança...',
      colSpan: 2
    }
  ];
  return rawFields.map(f => {
    const inferredModule: FormModuleId =
      f.module ||
      (f.section.startsWith('plano_')
        ? 'plano_acao'
        : f.section.startsWith('oitod_')
        ? 'oitod'
        : 'rnc');
    return {
      ...f,
      module: inferredModule,
      fieldKey: f.key
    };
  });
}

const INITIAL_MASTER_DATA: MasterDataItem[] = [
  ...getDefaultOptionItemsForTenant(PILOT_TENANT_ID),
  ...getDefaultOptionItemsForTenant(SECONDARY_TENANT_ID)
];

// ============================================================================
// 10 OCORRÊNCIAS FORMAIS REALISTAS DO TENANT PILOTO: GPM SERVIÇOS (SEÇÃO 7 DO PLANO)
// ============================================================================
export const PILOT_GPM_RNCS: RNCRecord[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    title: '1',
    field1: 'RNC-2026-0001',
    tipoRnc: 'Formal',
    status: 'Em Andamento',
    cliente: 'TDB - SOROCABA',
    dataOcorrencia: '2026-10-19',
    dataOficializacao: '2026-10-19',
    codOcorrenciaCliente: 'TDB-Q-2026-0891',
    impactoCliente: 'Parada de Linha (15 min) e Contenção em Pátio',
    detalhamentoOcorrencia: 'Detectada trinca térmica no ponto de solda #04 do reforço estrutural da longarina dianteira durante auditoria de destrutivo e ultrassom.',
    classificacaoSetor: 'SOLDA 2 - CEL. TOYOTA',
    setorDeteccao: 'Item de Segurança - FMEA Crítico',
    turno: '1º Turno',
    produto: 'U005000B6 - LONGARINA DIANTEIRA COMPLETA RH',
    componente: '57011-02231 - FECHAMENTO INTERNO LONGARINA RH',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 308,
    modoFalha: 'Trinca no ponto de solda',
    descricaoProblema: 'Trinca no ponto de solda robotizada (Item de Segurança - FMEA Crítico)',
    descricaoCompleta: 'Trinca radial identificada no ponto de solda robotizada da célula 02. Item de característica crítica de segurança veicular (CC/SC). Lote 28926 rastreado no SAP.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0001', 'Trinca no Ponto de Solda Robotizada', 'Célula Solda 02 • Item de Segurança FMEA Crítico'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0001', 'Ponto de Solda Íntegro s/ Trinca', 'lentilha >= 5.2mm • Parâmetro de Corrente 9.4 kA'),
    caracteristicaSeguranca: 'Sim',
    coProduto: 'Sim',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'POSTO 04 - SOLDA PONTO ROBOTIZADA',
    fmds: 'SOLDA 2 - CEL. TOYOTA',
    acoesContencao: 'Segregação imediata do lote 28926 (308 peças), ajuste de fresagem de eletrodos e inspeção 100% por ultrassom.',
    dataContencao: '2026-10-19',
    descricaoProblemaInterno: 'Desgaste prematuro da capa do eletrodo superior aliado a pressão de resfriamento abaixo do nominal.',
    recomendacoesProvidencias: 'Validar curva de corrente de solda e frequência de fresagem a cada 180 ciclos.',
    oQueFazer: 'Bloquear lote 28926 no SAP e inspecionar 100% do estoque em trânsito e cabeceira.',
    comoFazer: 'Ensaio não destrutivo por ultrassom + validação de 3 peças por turno em teste de arrancamento.',
    porQueFazer: 'Garantir integridade estrutural de impacto frontal (Característica de Segurança).',
    quemFara: 'Carlos Eduardo Ferreira',
    quandoFara: '2026-10-20',
    ondeFara: 'SOLDA 2 - CEL. TOYOTA',
    qtdInspecionada: 308,
    qtdSuspeita: 14,
    qtdBloqueada: 308,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360689',
    dataInicioRastreabilidade: '2026-10-16',
    dataFimRastreabilidade: '2026-10-19',
    participantesAtendimento: 'Matheus Henrique de Luca;Carlos Eduardo Ferreira;Mariana Souza Lima',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'A',
    abrirRnc: 'Sim - Realizar Análise / Contenção / Rastreabilidade',
    detector: 'Carlos Eduardo Ferreira',
    reDetector: 89452
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    title: '2',
    field1: 'RNC-2026-0002',
    tipoRnc: 'Formal',
    status: 'Em Andamento',
    cliente: 'STELLANTIS',
    dataOcorrencia: '2026-10-18',
    dataOficializacao: '2026-10-18',
    codOcorrenciaCliente: 'STEL-88210',
    impactoCliente: 'Retrabalho na Linha de Montagem do Cliente',
    detalhamentoOcorrencia: 'Presença de rebarba cortante acima de 0,4mm na borda da flange inferior dificultando o assentamento no gabarito da montadora.',
    classificacaoSetor: 'ESTAMPARIA TANDEM & PROGRESSIVA',
    setorDeteccao: 'Linha de Montagem',
    turno: '2º Turno',
    produto: '10045210 - PAINEL DIANTEIRO INFERIOR COMPLETO',
    componente: '53201-0D121 - REFORÇO SUPERIOR',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 120,
    modoFalha: 'Rebarba excessiva em flange',
    descricaoProblema: 'Rebarba excessiva em flange estampada (Linha de Montagem)',
    descricaoCompleta: 'Folga excessiva entre punção e matriz de corte na operação OP-20 da prensa Transfer Linha B gerou rebarba contínua de 0,65mm.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0002', 'Rebarba Excessiva em Flange (>0.6mm)', 'Operação OP-20 • Matriz de Corte Desgastada'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0002', 'Borda de Flange Limpa (<0.15mm)', 'Após Afiação de Matriz e Ajuste de Folga'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Média',
    possivelDetectar: 'Sim',
    posto: 'POSTO 02 - PRENSA TRANSFER LINHA B',
    fmds: 'ESTAMPARIA TANDEM & PROGRESSIVA',
    acoesContencao: 'Triagem visual e tátil em 120 peças no armazém e envio da ferramenta para ferramentaria.',
    dataContencao: '2026-10-19',
    oQueFazer: 'Realizar afiação de matriz OP-20 e rebarbação controlada do lote retido.',
    comoFazer: 'Intervenção de ferramentaria de bancada + controle com calibre passa/não-passa.',
    porQueFazer: 'Evitar risco ergonômico e interferência de montagem na linha Stellantis.',
    quemFara: 'Mariana Souza Lima',
    quandoFara: '2026-10-21',
    ondeFara: 'POSTO 02 - PRENSA TRANSFER LINHA B',
    qtdInspecionada: 240,
    qtdSuspeita: 120,
    qtdBloqueada: 42,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360712',
    participantesAtendimento: 'Mariana Souza Lima;Roberto Mendes Silva',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'B',
    abrirRnc: 'Sim - Realizar Análise / Contenção / Rastreabilidade',
    detector: 'Mariana Souza Lima',
    reDetector: 76512
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    title: '3',
    field1: 'RNC-2026-0003',
    tipoRnc: 'Formal',
    status: 'RNC Emitida',
    cliente: 'VOLKSWAGEN',
    dataOcorrencia: '2026-10-17',
    dataOficializacao: '2026-10-17',
    codOcorrenciaCliente: 'VW-QPN-4419',
    impactoCliente: 'Rejeição em Recebimento Qualidade',
    detalhamentoOcorrencia: 'Empolamento superficial e crateras por contaminação de óleo protetivo na camada de pintura E-Coat.',
    classificacaoSetor: 'PINTURA E-COAT & ACABAMENTO',
    setorDeteccao: 'Acabamento',
    turno: '1º Turno',
    produto: '10045280 - CONJUNTO SUPORTE RADIADOR',
    componente: '53205-0D081 - SUPORTE LH',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 85,
    modoFalha: 'Empolamento e contaminação em pintura',
    descricaoProblema: 'Empolamento e contaminação em pintura superficial (Acabamento)',
    descricaoCompleta: 'Saturação do banho de desengraxe alcalino no estágio 2 do túnel de pré-tratamento provocou falha de aderência e microbolhas após cura.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0003', 'Empolamento e Cratera em Pintura E-Coat', 'Falha de Desengraxe • Teste Cross-Hatch 3B'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0003', 'Camada E-Coat Uniforme (22 µm)', 'Aderência 5B Aprovada • Sem Contaminação'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Sim',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'CABINE 01 - PINTURA CATAFORÉTICA',
    fmds: 'PINTURA E-COAT & ACABAMENTO',
    acoesContencao: 'Renovação parcial do tanque de desengraxe e teste de aderência em grade (Cross-Hatch) a cada 30 min.',
    dataContencao: '2026-10-18',
    oQueFazer: 'Ajustar titulação livre do banho desengraxante e substituir filtros de óleo.',
    comoFazer: 'Análise laboratorial por turno e limpeza dos bicos aspersores.',
    porQueFazer: 'Eliminar vestígios de óleo de estampagem antes da imersão cataforética.',
    quemFara: 'Carlos Eduardo Ferreira',
    quandoFara: '2026-10-20',
    ondeFara: 'CABINE 01 - PINTURA CATAFORÉTICA',
    qtdInspecionada: 160,
    qtdSuspeita: 85,
    qtdBloqueada: 85,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360790',
    participantesAtendimento: 'Carlos Eduardo Ferreira;Roberto Mendes Silva',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'A',
    abrirRnc: 'Sim - Realizar Análise / Contenção / Rastreabilidade',
    detector: 'Roberto Mendes Silva',
    reDetector: 64129
  },
  {
    id: 4,
    tenant_id: PILOT_TENANT_ID,
    title: '4',
    field1: 'RNC-2026-0004',
    tipoRnc: 'Formal',
    status: 'Em Andamento',
    cliente: 'GENERAL MOTORS',
    dataOcorrencia: '2026-10-16',
    dataOficializacao: '2026-10-16',
    codOcorrenciaCliente: 'GM-PRR-9012',
    impactoCliente: 'Dificuldade de Montagem no Subchassi',
    detalhamentoOcorrencia: 'Deslocamento de +1,8mm na posição verdadeira do furo guia Ø12,5mm da travessa dianteira (tolerância máxima ±0,5mm).',
    classificacaoSetor: 'USINAGEM & CONFORMAÇÃO CNC',
    setorDeteccao: 'Usinagem/Conformação',
    turno: '2º Turno',
    produto: '20088100 - TRAVESSA DIANTEIRA SUPERIOR',
    componente: '71101-T9A-M00 - TRAVESSA SUP',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 64,
    modoFalha: 'Desvio dimensional em furação',
    descricaoProblema: 'Desvio dimensional em furação de fixação (Usinagem/Conformação)',
    descricaoCompleta: 'Afrouxamento do pino localizador RPS-02 do dispositivo hidráulico de usinagem permitiu deslocamento angular da peça durante a furação.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0004', 'Desvio Dimensional Furo Ø12.5 (+1.8mm)', 'Relatório Tridimensional CMM Reprovado'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0004', 'Posição Verdadeira Dentro de ±0.15mm', 'Pino Localizador RPS-02 Travado c/ Torque'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Não',
    carryOver: 'Sim',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'CENTRO CNC 03 - FURAÇÃO DE PRECISÃO',
    fmds: 'USINAGEM & CONFORMAÇÃO CNC',
    acoesContencao: 'Inspeção 100% em dispositivo de controle (Checking Fixture) com pino passa/não-passa.',
    dataContencao: '2026-10-17',
    oQueFazer: 'Substituir bucha guia e pino RPS-02 com trava química e validar 5 peças na tridimensional (CMM).',
    comoFazer: 'Medição tridimensional no laboratório de metrologia antes da liberação do setup.',
    porQueFazer: 'Impedir variação posicional por folga mecânica no berço CNC.',
    quemFara: 'Carlos Eduardo Ferreira',
    quandoFara: '2026-10-19',
    ondeFara: 'CENTRO CNC 03 - FURAÇÃO DE PRECISÃO',
    qtdInspecionada: 150,
    qtdSuspeita: 64,
    qtdBloqueada: 64,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360815',
    participantesAtendimento: 'Carlos Eduardo Ferreira;Matheus Henrique de Luca',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'A',
    abrirRnc: 'Sim - Realizar Análise / Contenção / Rastreabilidade',
    detector: 'Carlos Eduardo Ferreira',
    reDetector: 89452
  },
  {
    id: 5,
    tenant_id: PILOT_TENANT_ID,
    title: '5',
    field1: 'RNC-2026-0005',
    tipoRnc: 'Formal',
    status: 'Concluído',
    cliente: 'TDB - SOROCABA',
    dataOcorrencia: '2026-10-15',
    dataOficializacao: '2026-10-15',
    codOcorrenciaCliente: 'TDB-Q-2026-0840',
    impactoCliente: 'Alerta de Segurança em Auditoria de Torque',
    detalhamentoOcorrencia: 'Parafuso estrutural M10x1.25 encontrado com torque residual de 28 Nm (especificado: 55 ± 5 Nm) no suporte da trava do capô.',
    classificacaoSetor: 'MONTAGEM FINAL & TORQUE',
    setorDeteccao: 'Segurança do Produto',
    turno: '1º Turno',
    produto: '10045212 - SUPORTE FIXAÇÃO TRAVA CAPÔ C/ PORCA M8',
    componente: '53201-0D122 - SUPORTE TRAVA CAPÔ',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 45,
    modoFalha: 'Falta de torque em parafuso estrutural',
    descricaoProblema: 'Falta de torque em parafuso estrutural M10 (Segurança do Produto)',
    descricaoCompleta: 'Falha de intertravamento Poka-Yoke da apertadeira eletrônica Atlas Copco permitiu liberação da trava pneumática antes do sinal OK de torque + ângulo.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0005', 'Torque Abaixo do Nominal (28 Nm < 50 Nm)', 'Ausência de Marcação de Conferência Poka-Yoke'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0005', 'Torque Nominal Validado (55.4 Nm / 90°)', 'Intertravamento CLP Ativo + Selo de Segurança'),
    caracteristicaSeguranca: 'Sim',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'ESTAÇÃO 06 - APERTO ELETRÔNICO M10',
    fmds: 'MONTAGEM FINAL & TORQUE',
    acoesContencao: 'Reaperto controlado com torquímetro digital auditado em 100% do lote e bloqueio lógico no CLP da estação.',
    dataContencao: '2026-10-15',
    oQueFazer: 'Implementar bloqueio físico de abertura do grampo se o controlador PowerFocus não enviar pulso OK.',
    comoFazer: 'Alteração na lógica Ladder do CLP + validação de Poka-Yoke com peça padrão de falha.',
    porQueFazer: 'Impedir que qualquer subconjunto saia do posto sem confirmação eletrônica de torque.',
    quemFara: 'Matheus Henrique de Luca',
    quandoFara: '2026-10-16',
    ondeFara: 'ESTAÇÃO 06 - APERTO ELETRÔNICO M10',
    qtdInspecionada: 180,
    qtdSuspeita: 45,
    qtdBloqueada: 45,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360510',
    participantesAtendimento: 'Matheus Henrique de Luca;Carlos Eduardo Ferreira;Marcos Vinicius Barbosa',
    protcliente: 'Registro Pago',
    dataPagamento: '2026-10-17',
    abrir8D: 'Sim',
    criticidade: 'A',
    responsavelConclusao: 'Matheus Henrique de Luca',
    dataConclusao: '2026-10-18',
    observacoesConclusao: 'Eficácia do Poka-Yoke validada em 3 turnos consecutivos com zero falhas.',
    detector: 'Matheus Henrique de Luca',
    reDetector: 104235
  },
  {
    id: 6,
    tenant_id: PILOT_TENANT_ID,
    title: '6',
    field1: 'RNC-2026-0006',
    tipoRnc: 'Formal',
    status: 'Em Andamento',
    cliente: 'HONDA',
    dataOcorrencia: '2026-10-14',
    dataOficializacao: '2026-10-14',
    codOcorrenciaCliente: 'HAB-2026-312',
    impactoCliente: 'Seleção 100% em Barreira de Qualidade',
    detalhamentoOcorrencia: 'Arranhão linear profundo de 35mm na superfície externa Classe A do painel traseiro.',
    classificacaoSetor: 'PINTURA E-COAT & ACABAMENTO',
    setorDeteccao: 'Inspeção Final',
    turno: '1º Turno',
    produto: '20088200 - CONJUNTO PAINEL TRASEIRO (HR-V)',
    componente: '65100-3W0-M00 - PAINEL TRASEIRO',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 32,
    modoFalha: 'Arranhão severo em superfície classe A',
    descricaoProblema: 'Arranhão severo em superfície classe A visível (Inspeção Final)',
    descricaoCompleta: 'Revestimento de poliuretano do separador metálico do rack de transferência apresentava desgaste com exposição de parafuso metálico.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0006', 'Arranhão Linear 35mm em Superfície Classe A', 'Contato Metálico no Rack de Transferência #14'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0006', 'Superfície Classe A Isenta de Riscos', 'Rack Revestido c/ Proteção de Poliuretano Shore 80A'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Média',
    possivelDetectar: 'Sim',
    posto: 'CABINE 01 - PINTURA CATAFORÉTICA',
    fmds: 'PINTURA E-COAT & ACABAMENTO',
    acoesContencao: 'Inspeção sob túnel de luz (1000 lux) e segregação imediata do rack danificado #14.',
    dataContencao: '2026-10-15',
    oQueFazer: 'Substituir os batentes de poliuretano de todos os 24 racks dedicados ao modelo HR-V.',
    comoFazer: 'Checklist preventivo semanal de embalagens retornáveis pela equipe de logística.',
    porQueFazer: 'Proteger superfície estética Classe A durante movimentação por empilhadeira.',
    quemFara: 'Roberto Mendes Silva',
    quandoFara: '2026-10-19',
    ondeFara: 'CABINE 01 - PINTURA CATAFORÉTICA',
    qtdInspecionada: 96,
    qtdSuspeita: 32,
    qtdBloqueada: 32,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360402',
    participantesAtendimento: 'Roberto Mendes Silva;Mariana Souza Lima',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'B',
    detector: 'Roberto Mendes Silva',
    reDetector: 64129
  },
  {
    id: 7,
    tenant_id: PILOT_TENANT_ID,
    title: '7',
    field1: 'RNC-2026-0007',
    tipoRnc: 'Formal',
    status: 'RNC Emitida',
    cliente: 'HYUNDAI',
    dataOcorrencia: '2026-10-13',
    dataOficializacao: '2026-10-13',
    codOcorrenciaCliente: 'HMB-Q-7741',
    impactoCliente: 'Falha em Teste Elétrico End-of-Line',
    detalhamentoOcorrencia: 'Conector de 4 vias do sensor de impacto montado com pinagem invertida entre os terminais B1 e B2.',
    classificacaoSetor: 'MONTAGEM FINAL & TORQUE',
    setorDeteccao: 'Montagem Elétrica',
    turno: '2º Turno',
    produto: '10045400 - COLUNA CENTRAL B-PILLAR FORMADA A QUENTE',
    componente: '61201-02380 - COLUNA B',
    finalComponente: 'SubComponente + Componente',
    quantidadeAfetada: 28,
    modoFalha: 'Inversão de chicote elétrico',
    descricaoProblema: 'Inversão de chicote elétrico de comando (Montagem Elétrica)',
    descricaoCompleta: 'Ausência de teste de continuidade cruzada e guia de polarização cromática na bancada de submontagem do chicote auxiliar.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0007', 'Inversão de Pinagem B1/B2 no Chicote', 'Falha de Continuidade no Teste Elétrico EOL'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0007', 'Pinagem B1/B2 Correta e Testada 100%', 'Giga de Teste de Continuidade + Guia Poka-Yoke'),
    caracteristicaSeguranca: 'Sim',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'ESTAÇÃO 06 - APERTO ELETRÔNICO M10',
    fmds: 'MONTAGEM FINAL & TORQUE',
    acoesContencao: 'Teste elétrico 100% com giga de continuidade e impressão de etiqueta verde de aprovação.',
    dataContencao: '2026-10-14',
    oQueFazer: 'Instalar conector guia assimétrico e bloqueio de impressão de etiqueta sem teste elétrico OK.',
    comoFazer: 'Integração da bancada de teste elétrico ao sistema de emissão de etiqueta SAP.',
    porQueFazer: 'Evitar montagem invertida de terminais elétricos.',
    quemFara: 'Carlos Eduardo Ferreira',
    quandoFara: '2026-10-20',
    ondeFara: 'ESTAÇÃO 06 - APERTO ELETRÔNICO M10',
    qtdInspecionada: 110,
    qtdSuspeita: 28,
    qtdBloqueada: 28,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360331',
    participantesAtendimento: 'Carlos Eduardo Ferreira;Mariana Souza Lima',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'A',
    detector: 'Mariana Souza Lima',
    reDetector: 76512
  },
  {
    id: 8,
    tenant_id: PILOT_TENANT_ID,
    title: '8',
    field1: 'RNC-2026-0008',
    tipoRnc: 'Formal',
    status: 'Concluído',
    cliente: 'STELLANTIS',
    dataOcorrencia: '2026-10-12',
    dataOficializacao: '2026-10-12',
    codOcorrenciaCliente: 'STEL-87990',
    impactoCliente: 'Vazamento em Bancada de Teste Hidrostático',
    detalhamentoOcorrencia: 'Porosidade gasosa interna detectada na flange do alojamento durante teste de estanqueidade a 4,5 bar.',
    classificacaoSetor: 'USINAGEM & CONFORMAÇÃO CNC',
    setorDeteccao: 'Fundição',
    turno: '3º Turno',
    produto: '10045310 - LONGARINA DIANTEIRA COMPLETA LH (CROSS)',
    componente: '57012-02230 - LONGARINA LH',
    finalComponente: 'Componente',
    quantidadeAfetada: 54,
    modoFalha: 'Porosidade interna em estanqueidade',
    descricaoProblema: 'Porosidade interna detectada em teste de estanqueidade (Fundição)',
    descricaoCompleta: 'Umidade residual acima do limite no gás de proteção e falha de desgaseificação no lote de matéria-prima corrida #409.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0008', 'Porosidade Interna (>1.2mm) Reprovada', 'Queda de Pressão de 0.8 bar em Teste Hidrostático'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0008', 'Estanqueidade Aprovada a 4.5 bar', 'Zero Fuga • Microestrutura Isenta de Poros'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Sim',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'CENTRO CNC 03 - FURAÇÃO DE PRECISÃO',
    fmds: 'USINAGEM & CONFORMAÇÃO CNC',
    acoesContencao: 'Segregação da corrida #409 e ensaio de estanqueidade 100% com pressão aumentada para 5,0 bar.',
    dataContencao: '2026-10-13',
    oQueFazer: 'Instalar secador de linha no suprimento de gás e revisar tempo de desgaseificação.',
    comoFazer: 'Monitoramento contínuo de ponto de orvalho e raio-X por amostragem.',
    porQueFazer: 'Eliminar retenção de hidrogênio na solidificação.',
    quemFara: 'Carlos Eduardo Ferreira',
    quandoFara: '2026-10-15',
    ondeFara: 'CENTRO CNC 03 - FURAÇÃO DE PRECISÃO',
    qtdInspecionada: 200,
    qtdSuspeita: 54,
    qtdBloqueada: 54,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360219',
    participantesAtendimento: 'Carlos Eduardo Ferreira;Roberto Mendes Silva',
    protcliente: 'Registro Pago',
    dataPagamento: '2026-10-16',
    abrir8D: 'Sim',
    criticidade: 'A',
    responsavelConclusao: 'Carlos Eduardo Ferreira',
    dataConclusao: '2026-10-16',
    observacoesConclusao: 'Lotes subsequentes 100% aprovados no teste de estanqueidade.',
    detector: 'Carlos Eduardo Ferreira',
    reDetector: 89452
  },
  {
    id: 9,
    tenant_id: PILOT_TENANT_ID,
    title: '9',
    field1: 'RNC-2026-0009',
    tipoRnc: 'Formal',
    status: 'Em Andamento',
    cliente: 'VOLKSWAGEN',
    dataOcorrencia: '2026-10-11',
    dataOficializacao: '2026-10-11',
    codOcorrenciaCliente: 'VW-QPN-4380',
    impactoCliente: 'Peças Amassadas na Embalagem Metálica',
    detalhamentoOcorrencia: 'Deformação plástica na aba lateral do reforço superior causada por empilhamento incorreto de caixas KLT sobre contenedor metálico.',
    classificacaoSetor: 'LOGÍSTICA INTERNA & EXPEDIÇÃO',
    setorDeteccao: 'Logística/Kitting',
    turno: '1º Turno',
    produto: '10045211 - REFORÇO SUPERIOR PAINEL DIANTEIRO',
    componente: '53201-0D121 - REFORÇO SUPERIOR',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 40,
    modoFalha: 'Deformação por impacto logístico',
    descricaoProblema: 'Deformação por impacto em transporte interno (Logística/Kitting)',
    descricaoCompleta: 'Operador de rebocador apoiou pallet intermediário diretamente sobre a borda das peças sem tampa de proteção superior.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0009', 'Deformação Plástica na Aba Lateral', 'Impacto no Transporte Interno • Sem Tampa KLT'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0009', 'Geometria de Aba Intacta no Gabarito', 'Contenedor com Colarinhos e Tampa Travada'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Não',
    carryOver: 'Sim',
    reincidente: 'NÃO',
    gravidade: 'Média',
    possivelDetectar: 'Sim',
    posto: 'DOCA 02 - EXPEDIÇÃO SEQUENCIADA JIT',
    fmds: 'LOGÍSTICA INTERNA & EXPEDIÇÃO',
    acoesContencao: 'Inspeção 100% dos 5 contenedores na doca de embarque e proibição imediata de empilhamento sem tampa rígida.',
    dataContencao: '2026-10-12',
    oQueFazer: 'Padronizar tampa articulada presa por corrente nos contenedores e treinar equipe de logística.',
    comoFazer: 'LPP (Lição Ponto a Ponto) para todos os operadores de empilhadeira e rebocador.',
    porQueFazer: 'Impedir contato mecânico direto entre embalagens durante movimentação.',
    quemFara: 'Mariana Souza Lima',
    quandoFara: '2026-10-18',
    ondeFara: 'DOCA 02 - EXPEDIÇÃO SEQUENCIADA JIT',
    qtdInspecionada: 120,
    qtdSuspeita: 40,
    qtdBloqueada: 18,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360144',
    participantesAtendimento: 'Mariana Souza Lima;Marcos Vinicius Barbosa',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'B',
    detector: 'Mariana Souza Lima',
    reDetector: 76512
  },
  {
    id: 10,
    tenant_id: PILOT_TENANT_ID,
    title: '10',
    field1: 'RNC-2026-0010',
    tipoRnc: 'Formal',
    status: 'Relatório Inicial',
    cliente: 'GENERAL MOTORS',
    dataOcorrencia: '2026-10-10',
    dataOficializacao: '2026-10-10',
    codOcorrenciaCliente: 'GM-LOG-1192',
    impactoCliente: 'Falha de Leitura de Código de Barras no Recebimento JIT',
    detalhamentoOcorrencia: 'Etiqueta de rastreabilidade SAP apresentou falha vertical de impressão térmica impedindo leitura por coletor óptico na doca do cliente.',
    classificacaoSetor: 'LOGÍSTICA INTERNA & EXPEDIÇÃO',
    setorDeteccao: 'Expedição/Rastreabilidade',
    turno: '2º Turno',
    produto: '10045300 - LONGARINA DIANTEIRA COMPLETA RH (CROSS)',
    componente: '57011-02230 - LONGARINA RH',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 90,
    modoFalha: 'Etiqueta de rastreabilidade ilegível',
    descricaoProblema: 'Etiqueta de rastreabilidade com código ilegível (Expedição/Rastreabilidade)',
    descricaoCompleta: 'Cabeçote térmico da impressora Zebra ZT411 da Doca 02 com 3 pixels queimados na região central do código de barras Code-128.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0010', 'Etiqueta SAP com Falha de Impressão Térmica', 'Código de Barras Ilegível no Coletor Óptico'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0010', 'Etiqueta SAP Grade A (ISO/IEC 15416)', 'Cabeçote Térmico Substituído + Leitura Validada'),
    caracteristicaSeguranca: 'Não',
    coProduto: 'Sim',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Média',
    possivelDetectar: 'Sim',
    posto: 'DOCA 02 - EXPEDIÇÃO SEQUENCIADA JIT',
    fmds: 'LOGÍSTICA INTERNA & EXPEDIÇÃO',
    acoesContencao: 'Reimpressão imediata das etiquetas em impressora backup e validação 100% com leitor óptico antes do fechamento do manifesto.',
    dataContencao: '2026-10-11',
    oQueFazer: 'Substituir cabeçote térmico da Zebra ZT411 e tornar obrigatória a bipagem de confirmação da etiqueta impressa.',
    comoFazer: 'Trava no sistema de expedição: o lote só libera NF após leitura do código impresso pelo coletor.',
    porQueFazer: 'Garantir 100% de legibilidade das etiquetas enviadas às montadoras.',
    quemFara: 'Roberto Mendes Silva',
    quandoFara: '2026-10-19',
    ondeFara: 'DOCA 02 - EXPEDIÇÃO SEQUENCIADA JIT',
    qtdInspecionada: 90,
    qtdSuspeita: 90,
    qtdBloqueada: 0,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '668360098',
    participantesAtendimento: 'Roberto Mendes Silva;Matheus Henrique de Luca',
    protcliente: 'Não',
    abrir8D: 'Sim',
    criticidade: 'C',
    detector: 'Roberto Mendes Silva',
    reDetector: 64129
  }
];

// Ocorrências isoladas do Tenant 2 (Metalúrgica Vale) iniciando do ID #1 próprio da empresa
const SECONDARY_VALE_RNCS: RNCRecord[] = [
  {
    id: 1,
    tenant_id: SECONDARY_TENANT_ID,
    title: '1',
    field1: 'RNC-2026-0001',
    tipoRnc: 'Formal',
    status: 'Em Andamento',
    cliente: 'SCANIA LATIN AMERICA',
    dataOcorrencia: '2026-10-18',
    dataOficializacao: '2026-10-18',
    codOcorrenciaCliente: 'SCA-9912',
    impactoCliente: 'Bloqueio de Lote Forjado',
    detalhamentoOcorrencia: 'Microfissura térmica detectada por partículas magnéticas no olhal do eixo dianteiro forjado.',
    classificacaoSetor: 'FORJARIA PESADA EIXOS',
    setorDeteccao: 'Inspeção Magnaflux',
    turno: '1º Turno',
    produto: 'EIXO-4410 - VIGA EIXO DIANTEIRO FORJADA',
    componente: 'FORJ-4410-A - CORPO DO EIXO',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 18,
    modoFalha: 'Microfissura térmica pós-têmpera',
    descricaoProblema: 'Microfissura térmica pós-têmpera em viga de eixo forjado',
    descricaoCompleta: 'Temperatura do tanque de polímero de têmpera abaixo de 32°C gerou choque térmico severo.',
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-2026-0001', 'Microfissura Térmica em Eixo Forjado', 'Metalúrgica Vale • Inspeção Magnaflux'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-2026-0001', 'Eixo Aprovado sem Fissuras', 'Temperatura de Polímero Controlada (38°C)'),
    caracteristicaSeguranca: 'Sim',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Alta',
    possivelDetectar: 'Sim',
    posto: 'PRENSA HIDRÁULICA 2500T',
    fmds: 'FORJARIA PESADA EIXOS',
    acoesContencao: 'Inspeção 100% por partículas magnéticas fluorescentes.',
    dataContencao: '2026-10-19',
    qtdInspecionada: 60,
    qtdSuspeita: 18,
    qtdBloqueada: 18,
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '900112233',
    protcliente: 'Sim',
    abrir8D: 'Sim',
    criticidade: 'A',
    detector: 'Fernanda Costa',
    reDetector: 50102
  }
];

const INITIAL_SAAS_TREINAMENTOS: RegistroTreinamento[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    idRnc: 1,
    re: 30122,
    nomeColaborador: 'Marcos Vinicius Barbosa',
    produto: 'U005000B6 - LONGARINA DIANTEIRA COMPLETA RH',
    defeito: 'Trinca no ponto de solda robotizada (Item de Segurança - FMEA Crítico)',
    dataTreinamento: '2026-10-19',
    responsavel: 'Carlos Eduardo Ferreira'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    idRnc: 2,
    re: 64129,
    nomeColaborador: 'Roberto Mendes Silva',
    produto: '10045210 - PAINEL DIANTEIRO INFERIOR COMPLETO',
    defeito: 'Rebarba excessiva em flange estampada (Linha de Montagem)',
    dataTreinamento: '2026-10-19',
    responsavel: 'Mariana Souza Lima'
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    idRnc: 5,
    re: 30122,
    nomeColaborador: 'Marcos Vinicius Barbosa',
    produto: '10045212 - SUPORTE FIXAÇÃO TRAVA CAPÔ C/ PORCA M8',
    defeito: 'Falta de torque em parafuso estrutural M10 (Segurança do Produto)',
    dataTreinamento: '2026-10-16',
    responsavel: 'Matheus Henrique de Luca'
  }
];

const INITIAL_HISTORICO_ACOES: HistoricoAcaoRecord[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    rnc_id: 1,
    usuario_nome: 'Carlos Eduardo Ferreira',
    acao: 'Abertura de RNC Formal & Contenção SAP',
    detalhes: 'Lote 28926 (308 peças) bloqueado preventivamente para inspeção por ultrassom.',
    created_at: '2026-10-19T09:15:00Z'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    rnc_id: 5,
    usuario_nome: 'Matheus Henrique de Luca',
    acao: 'Validação de Poka-Yoke e Encerramento 8D',
    detalhes: 'Intertravamento CLP da apertadeira M10 validado com zero falhas em 3 turnos.',
    created_at: '2026-10-18T16:40:00Z'
  }
];

// ============================================================================
// CLASSE DE GERENCIAMENTO SAAS MULTI-TENANT (SUPABASE + FALLBACK LOCAL)
// ============================================================================
class SaaSTenantService {
  private supabase: SupabaseClient | null = null;
  private isSupabaseConfigured = false;

  private tenants: TenantRecord[] = [];
  private users: UsuarioQualidade[] = [];
  private masterData: MasterDataItem[] = [];
  private optionCategories: OptionCategoryMeta[] = [];
  private formFields: FormFieldConfig[] = [];
  private historicoAcoes: HistoricoAcaoRecord[] = [];
  // Contador sequencial monotônico (High-Water Mark) de RNC por empresa (nunca retrocede após exclusão)
  private rncSeqByTenant: Record<string, number> = {};

  private activeTenantId: string = PILOT_TENANT_ID;
  private authenticatedUser: UsuarioQualidade | null = null;
  private impersonatingFromSuperAdmin = false;
  private listeners: Array<() => void> = [];
  private initializedTenants = new Set<string>();

  constructor() {
    this.initSupabaseClient();
    this.loadFromLocalStorage();
    this.applyTenantThemeToDOM(this.getActiveTenant());
  }

  private initSupabaseClient() {
    const env = (import.meta as any).env || {};
    const supabaseUrl =
      env.VITE_SUPABASE_URL ||
      env.SUPABASE_URL ||
      'https://qwpdkgdywyukodbkpkhz.supabase.co';
    const supabaseKey =
      env.VITE_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable_AK05iC3z9o3dtt7G4N69RA_Rgwt2xVh';

    if (supabaseUrl && supabaseKey && String(supabaseUrl).startsWith('http')) {
      try {
        this.supabase = createClient(String(supabaseUrl), String(supabaseKey));
        this.isSupabaseConfigured = true;
        this.syncTenantsWithSupabase();
      } catch (err) {
        console.warn('[SaaS] Falha ao inicializar cliente Supabase, usando store híbrido local:', err);
        this.isSupabaseConfigured = false;
      }
    }
  }

  private async syncTenantsWithSupabase() {
    if (!this.supabase) return;
    try {
      const { data, error } = await this.supabase
        .from('tenants')
        .select('id, nome, slug, cnpj_contato, status, customizacao, limites, created_at');

      if (!error && Array.isArray(data)) {
        if (data.length === 0) {
          await this.supabase.from('tenants').upsert(this.tenants, { onConflict: 'slug' });
        } else {
          const merged = [...data] as TenantRecord[];
          const pilotIdx = merged.findIndex(
            t => t.id === PILOT_TENANT_ID || t.slug === 'mh-lean-solucoes' || t.slug === 'gpm-servicos'
          );
          if (pilotIdx === -1) {
            merged.unshift(INITIAL_TENANTS[0]);
          } else {
            merged[pilotIdx] = {
              ...merged[pilotIdx],
              id: PILOT_TENANT_ID,
              nome:
                merged[pilotIdx].nome === 'GPM Serviços'
                  ? 'MH Lean & Soluções'
                  : merged[pilotIdx].nome,
              slug:
                merged[pilotIdx].slug === 'gpm-servicos'
                  ? 'mh-lean-solucoes'
                  : merged[pilotIdx].slug,
              customizacao: {
                ...merged[pilotIdx].customizacao,
                nome_exibicao:
                  merged[pilotIdx].customizacao?.nome_exibicao === 'GPM Serviços'
                    ? 'MH Lean & Soluções'
                    : merged[pilotIdx].customizacao?.nome_exibicao || 'MH Lean & Soluções'
              }
            };
          }
          this.tenants = merged;
          this.saveToLocalStorage();
          this.notifyListeners();
        }
      }
    } catch {
      // Se a tabela ainda não foi criada no SQL Editor, mantém operação híbrida local transparente
    }
  }

  public getConnectionMode(): 'supabase_cloud' | 'hybrid_local' {
    return this.isSupabaseConfigured ? 'supabase_cloud' : 'hybrid_local';
  }

  public getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  public async upsertRncToSupabase(rnc: RNCRecord): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const tenantUuid = rnc.tenant_id || PILOT_TENANT_ID;
      const row = {
        tenant_id: tenantUuid,
        numero_rnc: Number(rnc.id),
        codigo_rnc: rnc.field1 || `RNC-${rnc.id}`,
        tipo_rnc: rnc.tipoRnc || 'Formal',
        data_ocorrencia: rnc.dataOcorrencia || new Date().toISOString().split('T')[0],
        cliente_montadora: rnc.cliente || 'OUTROS',
        produto: rnc.produto || 'N/A',
        componente: rnc.componente || '',
        posto: rnc.posto || '',
        fmds: rnc.fmds || '',
        modo_falha: rnc.modoFalha || '',
        descricao_problema: rnc.detalhamentoOcorrencia || rnc.descricaoProblema || 'Sem descrição',
        status: rnc.status || 'Relatório Inicial',
        foto_peca_ok: rnc.fotoPecaOk || '',
        foto_peca_ng: rnc.fotoPecaNg || '',
        foto_auxiliar: rnc.fotoAuxiliar || '',
        quantidade_afetada: Number(rnc.quantidadeAfetada) || 1,
        caracteristica_seguranca: rnc.caracteristicaSeguranca || 'Não',
        payload_completo: rnc
      };

      const { error } = await this.supabase
        .from('rncs')
        .upsert(row, { onConflict: 'tenant_id,numero_rnc' });

      if (error) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  public async deleteRncFromSupabase(id: number, tenantId?: string): Promise<boolean> {
    if (!this.supabase) return false;
    try {
      const targetTenant = tenantId || this.activeTenantId;
      const { error } = await this.supabase
        .from('rncs')
        .delete()
        .eq('tenant_id', targetTenant)
        .eq('numero_rnc', id);
      return !error;
    } catch {
      return false;
    }
  }

  public async fetchRncsFromSupabase(tenantId?: string): Promise<RNCRecord[]> {
    if (!this.supabase) return [];
    try {
      let query = this.supabase
        .from('rncs')
        .select('*')
        .lt('numero_rnc', 900000000)
        .order('numero_rnc', { ascending: false });
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (error || !Array.isArray(data)) return [];
      return data
        .filter((row: any) => !String(row.codigo_rnc || '').startsWith('__SAAS_STATE_'))
        .map((row: any) => {
          const payload = (row.payload_completo || {}) as Partial<RNCRecord>;
          return {
            ...payload,
            id: Number(row.numero_rnc || payload.id || row.id),
            tenant_id: row.tenant_id || payload.tenant_id || PILOT_TENANT_ID,
            title: payload.title || String(row.numero_rnc || row.id),
            field1: row.codigo_rnc || payload.field1 || `RNC-${row.numero_rnc}`,
            tipoRnc: (row.tipo_rnc || payload.tipoRnc || 'Formal') as any,
            status: (row.status || payload.status || 'Relatório Inicial') as any,
            cliente: row.cliente_montadora || payload.cliente || 'OUTROS',
            dataOcorrencia: row.data_ocorrencia || payload.dataOcorrencia || '',
            produto: row.produto || payload.produto || '',
            componente: row.componente ?? payload.componente ?? '',
            posto: row.posto ?? payload.posto ?? '',
            fmds: row.fmds ?? payload.fmds ?? '',
            modoFalha: row.modo_falha ?? payload.modoFalha ?? '',
            descricaoProblema: row.descricao_problema || payload.descricaoProblema || '',
            detalhamentoOcorrencia: payload.detalhamentoOcorrencia || row.descricao_problema || '',
            fotoPecaOk: row.foto_peca_ok ?? payload.fotoPecaOk ?? '',
            fotoPecaNg: row.foto_peca_ng ?? payload.fotoPecaNg ?? '',
            fotoAuxiliar: row.foto_auxiliar ?? payload.fotoAuxiliar ?? '',
            quantidadeAfetada: Number(row.quantidade_afetada ?? payload.quantidadeAfetada ?? 1),
            caracteristicaSeguranca: (row.caracteristica_seguranca || payload.caracteristicaSeguranca || 'Não') as any
          } as RNCRecord;
        });
    } catch {
      return [];
    }
  }

  public async pushMasterStateToSupabase(): Promise<void> {
    if (!this.supabase) return;
    try {
      const snap = this.getCloudMasterStateSnapshot();
      await Promise.all([
        this.supabase.from('rncs').upsert(
          {
            tenant_id: PILOT_TENANT_ID,
            numero_rnc: 900000001,
            codigo_rnc: '__SAAS_STATE_CORE__',
            cliente_montadora: 'SYSTEM',
            produto: 'SYSTEM',
            descricao_problema: 'SAAS_CORE_STATE',
            payload_completo: {
              tenants: snap.tenants,
              users: snap.users,
              rncSeqByTenant: snap.rncSeqByTenant,
              optionCategories: snap.optionCategories,
              formFields: snap.formFields,
              deletedTenantIds: snap.deletedTenantIds,
              deletedCategoryIds: snap.deletedCategoryIds,
              updatedAt: Date.now()
            }
          },
          { onConflict: 'tenant_id,numero_rnc' }
        ),
        this.supabase.from('rncs').upsert(
          {
            tenant_id: PILOT_TENANT_ID,
            numero_rnc: 900000003,
            codigo_rnc: '__SAAS_STATE_MASTER__',
            cliente_montadora: 'SYSTEM',
            produto: 'SYSTEM',
            descricao_problema: 'SAAS_MASTER_DATA_STATE',
            payload_completo: {
              masterData: snap.masterData,
              updatedAt: Date.now()
            }
          },
          { onConflict: 'tenant_id,numero_rnc' }
        )
      ]);
    } catch {
      // Silencioso em caso de offline
    }
  }

  public async pullMasterStateFromSupabase(): Promise<void> {
    if (!this.supabase) return;
    try {
      const { data, error } = await this.supabase
        .from('rncs')
        .select('numero_rnc, codigo_rnc, payload_completo')
        .eq('tenant_id', PILOT_TENANT_ID)
        .in('numero_rnc', [900000001, 900000003]);
      if (error || !Array.isArray(data) || data.length === 0) return;

      const coreRow = data.find((r: any) => Number(r.numero_rnc) === 900000001)?.payload_completo || {};
      const masterRow = data.find((r: any) => Number(r.numero_rnc) === 900000003)?.payload_completo || {};

      this.applyCloudMasterStateSnapshot({
        tenants: coreRow.tenants,
        users: coreRow.users,
        rncSeqByTenant: coreRow.rncSeqByTenant,
        optionCategories: coreRow.optionCategories,
        formFields: coreRow.formFields,
        deletedTenantIds: coreRow.deletedTenantIds,
        deletedCategoryIds: coreRow.deletedCategoryIds,
        masterData: masterRow.masterData
      });
    } catch {
      // Silencioso em caso de offline
    }
  }

  public async pushModulesStateToSupabase(payload: Record<string, any>): Promise<void> {
    if (!this.supabase) return;
    try {
      await this.supabase.from('rncs').upsert(
        {
          tenant_id: PILOT_TENANT_ID,
          numero_rnc: 900000002,
          codigo_rnc: '__SAAS_STATE_MODULES__',
          cliente_montadora: 'SYSTEM',
          produto: 'SYSTEM',
          descricao_problema: 'SAAS_MODULES_STATE',
          payload_completo: {
            ...payload,
            updatedAt: Date.now()
          }
        },
        { onConflict: 'tenant_id,numero_rnc' }
      );
    } catch {
      // Silencioso em caso de offline
    }
  }

  public async pullModulesStateFromSupabase(): Promise<Record<string, any> | null> {
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase
        .from('rncs')
        .select('payload_completo')
        .eq('tenant_id', PILOT_TENANT_ID)
        .eq('numero_rnc', 900000002)
        .maybeSingle();
      if (error || !data || !data.payload_completo) return null;
      return data.payload_completo as Record<string, any>;
    } catch {
      return null;
    }
  }

  private deletedTenantIds: Set<string> = new Set();
  private deletedCategoryIds: Set<string> = new Set();
  private isApplyingCloudSnapshot = false;
  private isBootstrapping = true;
  private cloudPushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastLocalMutationAt = 0;

  public getCloudMasterStateSnapshot() {
    return {
      tenants: this.tenants,
      users: this.users,
      rncSeqByTenant: this.rncSeqByTenant,
      masterData: this.masterData,
      optionCategories: this.optionCategories,
      formFields: this.formFields,
      deletedTenantIds: Array.from(this.deletedTenantIds),
      deletedCategoryIds: Array.from(this.deletedCategoryIds)
    };
  }

  public scheduleCloudMasterPush() {
    if (this.isApplyingCloudSnapshot || this.isBootstrapping) return;
    this.lastLocalMutationAt = Date.now();
    if (this.cloudPushTimer) {
      clearTimeout(this.cloudPushTimer);
    }
    this.cloudPushTimer = setTimeout(() => {
      const snap = this.getCloudMasterStateSnapshot();
      fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap)
      }).catch(() => {});
      this.pushMasterStateToSupabase();
    }, 350);
  }

  public applyCloudMasterStateSnapshot(snapshot: {
    tenants?: TenantRecord[];
    users?: UsuarioQualidade[];
    rncSeqByTenant?: Record<string, number>;
    masterData?: MasterDataItem[];
    optionCategories?: OptionCategoryMeta[];
    formFields?: FormFieldConfig[];
    deletedTenantIds?: string[];
    deletedCategoryIds?: string[];
  }) {
    // Evita sobrescrever edições locais feitas nos últimos 5 segundos
    if (Date.now() - this.lastLocalMutationAt < 5000) {
      return;
    }

    let changed = false;
    this.isApplyingCloudSnapshot = true;
    try {
      if (Array.isArray(snapshot.deletedTenantIds)) {
        snapshot.deletedTenantIds.forEach(id => this.deletedTenantIds.add(id));
      }
      if (Array.isArray(snapshot.deletedCategoryIds)) {
        snapshot.deletedCategoryIds.forEach(id => this.deletedCategoryIds.add(id));
      }

      // 1. Merge de Empresas (Tenants)
      if (Array.isArray(snapshot.tenants) && snapshot.tenants.length > 0) {
        const tenantMap = new Map<string, TenantRecord>();
        this.tenants.forEach(t => {
          if (!this.deletedTenantIds.has(t.id)) tenantMap.set(t.id, t);
        });
        snapshot.tenants.forEach(t => {
          if (!t || !t.id || this.deletedTenantIds.has(t.id)) return;
          const prev = tenantMap.get(t.id);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(t)) {
            tenantMap.set(t.id, t);
            changed = true;
          }
        });
        this.tenants = Array.from(tenantMap.values());
      }

      // 2. Merge de Usuários e Perfis
      if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
        const userKey = (u: UsuarioQualidade) =>
          `${u.tenant_id || 'global'}::${u.reAcesso || (u.email || '').toLowerCase() || u.id}`;
        const userMap = new Map<string, UsuarioQualidade>();
        this.users.forEach(u => userMap.set(userKey(u), u));
        snapshot.users.forEach(u => {
          if (!u) return;
          if (u.tenant_id && this.deletedTenantIds.has(u.tenant_id)) return;
          const k = userKey(u);
          const prev = userMap.get(k);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(u)) {
            userMap.set(k, u);
            changed = true;
          }
        });
        this.users = Array.from(userMap.values());
      }

      // 3. Merge de Sequenciais de RNC por Empresa
      if (snapshot.rncSeqByTenant) {
        Object.entries(snapshot.rncSeqByTenant).forEach(([tId, seq]) => {
          const numSeq = Number(seq) || 0;
          if (numSeq > (this.rncSeqByTenant[tId] || 0)) {
            this.rncSeqByTenant[tId] = numSeq;
            changed = true;
          }
        });
      }

      // 4. Merge de Metadados e Colunas das Bases (optionCategories)
      if (Array.isArray(snapshot.optionCategories) && snapshot.optionCategories.length > 0) {
        const catKey = (c: OptionCategoryMeta) => `${c.tenant_id || PILOT_TENANT_ID}::${c.id}`;
        const catMap = new Map<string, OptionCategoryMeta>();
        this.optionCategories.forEach(c => {
          const k = catKey(c);
          if (!this.deletedCategoryIds.has(k)) catMap.set(k, c);
        });
        snapshot.optionCategories.forEach(c => {
          if (!c || !c.id) return;
          const k = catKey(c);
          if (this.deletedCategoryIds.has(k)) return;
          const prev = catMap.get(k);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(c)) {
            catMap.set(k, c);
            changed = true;
          }
        });
        this.optionCategories = Array.from(catMap.values());
      }

      // 5. Merge de Itens das Bases (masterData)
      if (Array.isArray(snapshot.masterData) && snapshot.masterData.length > 0) {
        const masterMap = new Map<string, MasterDataItem>();
        this.masterData.forEach(m => masterMap.set(m.id, m));
        let masterDiff = snapshot.masterData.length !== this.masterData.length;
        snapshot.masterData.forEach(m => {
          if (!m || !m.id) return;
          const prev = masterMap.get(m.id);
          if (!prev) {
            masterMap.set(m.id, normalizeMasterDataItemCasing(m));
            masterDiff = true;
          }
        });
        if (masterDiff) {
          // Se a nuvem tem uma carga mais completa (ex: planilha de 3.000 itens importada no PC), sincroniza para o celular
          if (snapshot.masterData.length >= this.masterData.length) {
            this.masterData = snapshot.masterData.map(normalizeMasterDataItemCasing);
          } else {
            this.masterData = Array.from(masterMap.values());
          }
          changed = true;
        }
      }

      // 6. Merge de Configurações de Campos (formFields)
      if (Array.isArray(snapshot.formFields) && snapshot.formFields.length > 0) {
        const fieldKey = (f: FormFieldConfig) =>
          `${f.tenant_id || PILOT_TENANT_ID}::${f.module || 'rnc'}::${f.fieldKey || f.key || f.id}`;
        const fieldMap = new Map<string, FormFieldConfig>();
        this.formFields.forEach(f => fieldMap.set(fieldKey(f), f));
        snapshot.formFields.forEach(f => {
          if (!f) return;
          const k = fieldKey(f);
          const prev = fieldMap.get(k);
          if (!prev || JSON.stringify(prev) !== JSON.stringify(f)) {
            fieldMap.set(k, f);
            changed = true;
          }
        });
        this.formFields = Array.from(fieldMap.values());
      }

      if (changed) {
        this.tenants.forEach(t => {
          this.ensureTenantSchemasInitialized(t.id, true);
        });
        this.saveToLocalStorage(true);
        this.notifyListeners();
      }
    } finally {
      this.isApplyingCloudSnapshot = false;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public notifyListeners() {
    this.listeners.forEach(l => l());
  }

  private ensureTenantSchemasInitialized(tenantId: string, force = false) {
    if (!force && this.initializedTenants.has(tenantId)) {
      return;
    }
    this.initializedTenants.add(tenantId);

    // 0. Remove categorias duplicadas legadas e migra seus itens para as listas Master compartilhadas
    const legacyCategoriesToRemove = new Set(['plano_posto', 'plano_area', 'plano_produto', 'plano_sub2']);
    this.optionCategories = this.optionCategories.filter(
      c => !(c.tenant_id === tenantId && legacyCategoriesToRemove.has(c.id))
    );

    // Migra itens legados (plano_posto -> posto_trabalho, plano_area -> area_fabril, plano_produto -> master_pecas_produtos)
    const tenantItems = this.masterData.filter(m => m.tenant_id === tenantId);
    for (const item of tenantItems) {
      const canonical = resolveCanonicalCategory(item.tipo);
      if (canonical !== item.tipo) {
        const alreadyExists = this.masterData.some(
          m =>
            m.tenant_id === tenantId &&
            m.tipo === canonical &&
            m.nome.trim().toLowerCase() === item.nome.trim().toLowerCase()
        );
        if (!alreadyExists) {
          item.tipo = canonical;
        } else {
          item.ativo = false;
        }
      }
    }
    this.masterData = this.masterData.filter(
      m => !(m.tenant_id === tenantId && legacyCategoriesToRemove.has(m.tipo))
    );

    // 1. Garante categorias de opções para a empresa e sincroniza flags Master
    const defaultCats = getDefaultOptionCategoriesForTenant(tenantId);
    for (const defCat of defaultCats) {
      const existingIdx = this.optionCategories.findIndex(
        c => c.tenant_id === tenantId && c.id === defCat.id
      );
      if (existingIdx === -1) {
        this.optionCategories.push(defCat);
      } else {
        this.optionCategories[existingIdx].isMasterShared = defCat.isMasterShared;
        if (defCat.isMasterShared) {
          this.optionCategories[existingIdx].nome = defCat.nome;
          this.optionCategories[existingIdx].title = defCat.nome;
          this.optionCategories[existingIdx].descricao = defCat.descricao;
          this.optionCategories[existingIdx].description = defCat.descricao;
        }
      }
    }

    // 2. Garante itens padrão para categorias que ainda não possuem opções na empresa
    const existingItems = this.masterData.filter(m => m.tenant_id === tenantId);
    const defaultItems = getDefaultOptionItemsForTenant(tenantId);
    const existingTypes = new Set(existingItems.map(m => m.tipo));
    for (const defItem of defaultItems) {
      if (!existingTypes.has(defItem.tipo)) {
        this.masterData.push(defItem);
      }
    }

    // Migra itens de possivel_detectar para não duplicar "Sim (Sim (...))"
    this.masterData.forEach(item => {
      if (item.tenant_id === tenantId && item.tipo === 'possivel_detectar') {
        if (item.detalhe === 'Sim (Falha de Inspeção / Padrão)' || item.detalhe?.startsWith('Sim (')) {
          item.detalhe = 'Falha de Inspeção / Padrão';
        } else if (item.detalhe === 'Não (Defeito Latente / Oculto)' || item.detalhe?.startsWith('Não (')) {
          item.detalhe = 'Defeito Latente / Oculto';
        }
      }
    });

    // 3. Garante todos os campos dos 3 módulos para a empresa e sincroniza vínculos de base (optionCategory)
    const existingFields = this.formFields.filter(f => f.tenant_id === tenantId);
    let fieldsMigrated = false;
    if (existingFields.length === 0) {
      this.formFields.push(...getDefaultFormFieldsForTenant(tenantId));
      fieldsMigrated = true;
    } else {
      const defaultFields = getDefaultFormFieldsForTenant(tenantId);
      for (const defField of defaultFields) {
        const foundField = existingFields.find(
          f => f.id === defField.id || (f.key === defField.key && (f.module || 'rnc') === defField.module)
        );
        if (!foundField) {
          this.formFields.push(defField);
          fieldsMigrated = true;
        } else {
          if (!foundField.module && defField.module) {
            foundField.module = defField.module;
            fieldsMigrated = true;
          }
          if (!foundField.optionCategory && defField.optionCategory) {
            foundField.optionCategory = defField.optionCategory;
            fieldsMigrated = true;
          } else if (foundField.optionCategory) {
            const canonicalCat = resolveCanonicalCategory(foundField.optionCategory);
            if (canonicalCat !== foundField.optionCategory) {
              foundField.optionCategory = canonicalCat;
              fieldsMigrated = true;
            }
          }
          if (!foundField.valueColumn && defField.valueColumn) {
            foundField.valueColumn = defField.valueColumn;
            fieldsMigrated = true;
          }
          if (!foundField.displayColumn && defField.displayColumn) {
            foundField.displayColumn = defField.displayColumn;
            fieldsMigrated = true;
          }
          if (
            (foundField.id === 'condicionaisTipoRnc' || foundField.id === 'ondeFara') &&
            foundField.type === 'text' &&
            defField.type === 'select'
          ) {
            foundField.type = 'select';
            fieldsMigrated = true;
          }
          if (foundField.id === 'cliente' && (foundField.label === 'Cliente (Montadora)' || foundField.label.includes('Montadora'))) {
            foundField.label = 'Cliente';
            foundField.placeholder = '-- Selecione o Cliente --';
            fieldsMigrated = true;
          }
          if (foundField.id === 'fmds' && foundField.label.includes('FMDS')) {
            foundField.label = 'Área / Setor Fabril';
            foundField.placeholder = '-- Selecione a Área / Setor Fabril --';
            fieldsMigrated = true;
          }
          if (foundField.id === 'atributosPeca' && foundField.label.includes('Carry Over')) {
            foundField.label = foundField.label.replace('Carry Over', 'Peça comum');
            fieldsMigrated = true;
          }
        }
      }
    }
    // 4. Sincroniza colunas de bases importadas e recupera registros cujo item.values tenha sido zerado
    const bomCols = [
      'Material do cliente',
      'Linha produção',
      'Material',
      'Componente',
      'Texto breve de material',
      'Intervalo de texto',
      'Personalizar',
      'Descrição Breve',
      'Linha2',
      'FMDS zexpv',
      'Cliente final'
    ];

    this.masterData.forEach(item => {
      if (item.tenant_id !== tenantId) return;

      // Caso o registro tenha sido importado com delimitador não separado dentro de item.nome
      if (
        !item.codigo &&
        !item.detalhe &&
        item.nome &&
        (item.nome.includes('\t') || item.nome.split(';').length >= 3)
      ) {
        const sep = item.nome.includes('\t') ? '\t' : ';';
        const parts = item.nome.split(sep).map(s => s.replace(/^"|"$/g, '').trim());
        const catCols = this.getCategoryColumns(item.tipo, tenantId);
        const recovered: Record<string, string> = {};
        catCols.forEach((col, idx) => {
          recovered[col] = parts[idx] ?? '';
        });
        item.values = recovered;
        item.nome = parts[0] || parts.find(Boolean) || item.nome;
        item.codigo = parts[1] || '';
        item.detalhe = parts.slice(2).filter(Boolean).join(' • ');
        fieldsMigrated = true;
        return;
      }

      if (!item.values) return;
      const valKeys = Object.keys(item.values);
      if (valKeys.length === 0) return;

      const allValuesEmpty = valKeys.every(k => !String(item.values?.[k] || '').trim());
      if (allValuesEmpty && (item.nome || item.codigo || item.detalhe)) {
        const isBomSchema =
          item.values['Material do cliente'] !== undefined &&
          item.values['Linha produção'] !== undefined &&
          item.values['Material'] !== undefined;

        const detailParts = (item.detalhe || '')
          .split('•')
          .map(s => s.trim())
          .filter(Boolean);

        if (isBomSchema) {
          const matCliente =
            item.nome && item.nome !== item.codigo && item.nome !== 'Registro' ? item.nome : '';
          const linhaProd = item.codigo || (matCliente ? '' : item.nome) || '';
          item.values['Material do cliente'] = matCliente;
          item.values['Linha produção'] = linhaProd;
          item.values['Material'] = detailParts[0] || '';
          item.values['Componente'] = detailParts[1] || '';
          item.values['Texto breve de material'] = detailParts[2] || '';
          item.values['Intervalo de texto'] = detailParts[3] || '';
          item.values['Personalizar'] = detailParts[4] || '';
          if (detailParts.length === 7) {
            item.values['Descrição Breve'] = '';
            item.values['Linha2'] = '';
            item.values['FMDS zexpv'] = detailParts[5] || '';
            item.values['Cliente final'] = detailParts[6] || '';
          } else if (detailParts.length === 8) {
            item.values['Descrição Breve'] = detailParts[5] || '';
            item.values['Linha2'] = '';
            item.values['FMDS zexpv'] = detailParts[6] || '';
            item.values['Cliente final'] = detailParts[7] || '';
          } else {
            item.values['Descrição Breve'] = detailParts[5] || '';
            item.values['Linha2'] = detailParts[6] || '';
            item.values['FMDS zexpv'] = detailParts[7] || '';
            item.values['Cliente final'] = detailParts[8] || '';
          }
          // Garante que a categoria tenha as colunas da planilha sincronizadas
          const catMeta = this.optionCategories.find(
            c => c.tenant_id === tenantId && c.id === resolveCanonicalCategory(item.tipo)
          );
          if (catMeta && (!catMeta.columns || catMeta.columns[0] === 'Peça / Produto')) {
            catMeta.columns = [...bomCols];
          }
          fieldsMigrated = true;
        } else {
          const cols = valKeys;
          const firstVal =
            item.nome && item.nome !== item.codigo && item.nome !== 'Registro'
              ? item.nome
              : !item.codigo
              ? item.nome
              : '';
          if (cols[0]) item.values[cols[0]] = firstVal;
          if (cols[1]) item.values[cols[1]] = item.codigo || '';
          cols.slice(2).forEach((col, i) => {
            item.values![col] = detailParts[i] || '';
          });
          fieldsMigrated = true;
        }
      }
    });

    if (fieldsMigrated) {
      this.saveToLocalStorage();
    }
  }

  private loadFromLocalStorage() {
    try {
      const rawTenants = localStorage.getItem('sor_saas_tenants_v1');
      this.tenants = rawTenants ? JSON.parse(rawTenants) : [...INITIAL_TENANTS];

      // Migração automática do tenant padrão para MH Lean & Soluções
      let pilotTenant = this.tenants.find(
        t => t.id === PILOT_TENANT_ID || t.slug === 'mh-lean-solucoes' || t.slug === 'gpm-servicos'
      );
      if (!pilotTenant) {
        pilotTenant = { ...INITIAL_TENANTS[0] };
        this.tenants.unshift(pilotTenant);
      } else {
        pilotTenant.id = PILOT_TENANT_ID;
        if (pilotTenant.nome === 'GPM Serviços' || !pilotTenant.nome) {
          pilotTenant.nome = 'MH Lean & Soluções';
        }
        if (pilotTenant.slug === 'gpm-servicos' || !pilotTenant.slug) {
          pilotTenant.slug = 'mh-lean-solucoes';
        }
        if (
          !pilotTenant.cnpj_contato ||
          pilotTenant.cnpj_contato.includes('gpmservicos.com.br')
        ) {
          pilotTenant.cnpj_contato = '18.452.910/0001-64 • mhsolucoes@adimin.com.br';
        }
        if (
          !pilotTenant.customizacao.nome_exibicao ||
          pilotTenant.customizacao.nome_exibicao === 'GPM Serviços'
        ) {
          pilotTenant.customizacao.nome_exibicao = 'MH Lean & Soluções';
        }
        if (
          !pilotTenant.customizacao.subtitulo_relatorio ||
          pilotTenant.customizacao.subtitulo_relatorio.includes('GPM Serviços') ||
          pilotTenant.customizacao.subtitulo_relatorio.includes('SORSA')
        ) {
          pilotTenant.customizacao.subtitulo_relatorio =
            'MH Lean & Soluções • Sistema MH Qualidade de Gestão de RNC e Qualidade 8D';
        }
        if (pilotTenant.limites.max_usuarios < 100) {
          pilotTenant.limites.max_usuarios = 100;
          pilotTenant.limites.max_storage_mb = Math.max(pilotTenant.limites.max_storage_mb, 2048);
        }
      }

      const rawUsers = localStorage.getItem('sor_saas_users_v1');
      this.users = rawUsers ? JSON.parse(rawUsers) : [...INITIAL_SAAS_USERS];
      if (!this.users.some(u => u.papel === 'super_admin')) {
        this.users.unshift(INITIAL_SAAS_USERS[0]);
      }

      // Migração automática do e-mail padrão para mhsolucoes@adimin.com.br e nome MH Qualidade
      this.users.forEach(u => {
        if (
          u.id === 9001 ||
          u.papel === 'super_admin' ||
          (u.email && u.email.toLowerCase() === 'superadmin@sor-saas.com')
        ) {
          u.email = 'mhsolucoes@adimin.com.br';
          u.nome = 'Matheus de Luca (MH Qualidade Super Admin)';
          u.cargo = 'Proprietário da Plataforma MH Qualidade';
          u.setor = 'Diretoria MH Lean & Soluções';
        }
        if (
          u.id === 1 ||
          (u.email && u.email.toLowerCase() === 'admin@gpmservicos.com.br')
        ) {
          u.email = 'mhsolucoes@adimin.com.br';
          u.cargo = 'Administrador Geral — MH Lean & Soluções';
          u.setor = 'Qualidade MH Lean & Soluções';
        }
        if (u.email && u.email.endsWith('@gpmservicos.com.br')) {
          u.email = u.email.replace('@gpmservicos.com.br', '@mhleansolucoes.com.br');
        }
      });

      const rawMaster = localStorage.getItem('sor_saas_master_v1');
      const parsedMaster: MasterDataItem[] = rawMaster ? JSON.parse(rawMaster) : [...INITIAL_MASTER_DATA];
      this.masterData = parsedMaster.map(normalizeMasterDataItemCasing);

      const rawOptCats = localStorage.getItem('sor_saas_option_cats_v1');
      this.optionCategories = rawOptCats ? JSON.parse(rawOptCats) : [];

      const rawFormFields = localStorage.getItem('sor_saas_form_fields_v1');
      this.formFields = rawFormFields ? JSON.parse(rawFormFields) : [];

      this.tenants.forEach(t => {
        this.ensureTenantSchemasInitialized(t.id, true);
      });

      const rawHist = localStorage.getItem('sor_saas_historico_v2');
      this.historicoAcoes = rawHist ? JSON.parse(rawHist) : [...INITIAL_HISTORICO_ACOES];

      const rawRncSeq = localStorage.getItem('sor_saas_rnc_seq_v2');
      this.rncSeqByTenant = rawRncSeq ? JSON.parse(rawRncSeq) : {};
      // Inicializa contadores padrão (10 para MH Lean & Soluções, 1 para Metalúrgica Vale, 0 para novas)
      this.rncSeqByTenant[PILOT_TENANT_ID] = Math.max(this.rncSeqByTenant[PILOT_TENANT_ID] || 0, 10);
      this.rncSeqByTenant[SECONDARY_TENANT_ID] = Math.max(this.rncSeqByTenant[SECONDARY_TENANT_ID] || 0, 1);
      this.tenants.forEach(t => {
        const currentSeq = Math.max(
          this.rncSeqByTenant[t.id] || 0,
          t.ultimo_sequencial_rnc && t.ultimo_sequencial_rnc < 5000 ? t.ultimo_sequencial_rnc : 0
        );
        this.rncSeqByTenant[t.id] = currentSeq;
        t.ultimo_sequencial_rnc = currentSeq;
      });

      const savedTenantId = localStorage.getItem('sor_saas_active_tenant_id');
      if (savedTenantId && this.tenants.some(t => t.id === savedTenantId)) {
        this.activeTenantId = savedTenantId;
      } else {
        this.activeTenantId = PILOT_TENANT_ID;
      }

      const savedImpersonating = localStorage.getItem('sor_saas_impersonating');
      this.impersonatingFromSuperAdmin = savedImpersonating === 'true';

      const savedUserEmail = localStorage.getItem('sor_saas_auth_email');
      if (savedUserEmail) {
        const cleanSaved =
          savedUserEmail.toLowerCase() === 'admin@gpmservicos.com.br' ||
          savedUserEmail.toLowerCase() === 'superadmin@sor-saas.com'
            ? 'mhsolucoes@adimin.com.br'
            : savedUserEmail.toLowerCase();
        const found =
          this.users.find(
            u =>
              (u.email || '').toLowerCase() === cleanSaved &&
              (u.tenant_id === this.activeTenantId || u.papel === 'super_admin')
          ) || this.users.find(u => (u.email || '').toLowerCase() === cleanSaved);
        if (found) {
          this.authenticatedUser = found;
        }
      }

      this.saveToLocalStorage(true);
    } catch (e) {
      console.warn('[SaaS] Erro ao carregar store multi-tenant local, restaurando padrões:', e);
      this.tenants = [...INITIAL_TENANTS];
      this.users = [...INITIAL_SAAS_USERS];
      this.masterData = [...INITIAL_MASTER_DATA];
      this.optionCategories = [];
      this.formFields = [];
      this.tenants.forEach(t => this.ensureTenantSchemasInitialized(t.id, true));
      this.historicoAcoes = [...INITIAL_HISTORICO_ACOES];
      this.rncSeqByTenant = {
        [PILOT_TENANT_ID]: 10,
        [SECONDARY_TENANT_ID]: 1
      };
      this.activeTenantId = PILOT_TENANT_ID;
    } finally {
      this.isBootstrapping = false;
    }
  }

  private saveToLocalStorage(skipCloudPush = false) {
    try {
      // Salva metadados leves (empresas, usuários, estrutura de bases/colunas e configuração de campos) PRIMEIRO
      // para garantir que o schema de colunas nunca seja truncado mesmo em bases com milhares de linhas
      localStorage.setItem('sor_saas_tenants_v1', JSON.stringify(this.tenants));
      localStorage.setItem('sor_saas_users_v1', JSON.stringify(this.users));
      localStorage.setItem('sor_saas_option_cats_v1', JSON.stringify(this.optionCategories));
      localStorage.setItem('sor_saas_form_fields_v1', JSON.stringify(this.formFields));
      localStorage.setItem('sor_saas_historico_v2', JSON.stringify(this.historicoAcoes));
      localStorage.setItem('sor_saas_rnc_seq_v2', JSON.stringify(this.rncSeqByTenant));
      localStorage.setItem('sor_saas_active_tenant_id', this.activeTenantId);
      localStorage.setItem('sor_saas_impersonating', String(this.impersonatingFromSuperAdmin));
      if (this.authenticatedUser?.email) {
        localStorage.setItem('sor_saas_auth_email', this.authenticatedUser.email);
      }

      try {
        localStorage.setItem('sor_saas_master_v1', JSON.stringify(this.masterData));
      } catch {
        // Se a base ultrapassar 3.000+ linhas e atingir o limite de 5MB do navegador,
        // compacta chaves vazias redundantes em item.values mantendo todos os dados intactos
        const compactedMaster = this.masterData.map(item => {
          if (!item.values) return item;
          const compactValues: Record<string, string> = {};
          Object.entries(item.values).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              compactValues[k] = String(v);
            }
          });
          return {
            ...item,
            detalhe: Object.keys(compactValues).length > 0 ? '' : item.detalhe,
            values: compactValues
          };
        });
        localStorage.setItem('sor_saas_master_v1', JSON.stringify(compactedMaster));
      }

      if (!skipCloudPush) {
        this.scheduleCloudMasterPush();
      }
    } catch (e) {
      console.warn('[SaaS] Aviso ao persistir store multi-tenant:', e);
    }
  }

  // ============================================================================
  // CONTADOR SEQUENCIAL MONOTÔNICO DE RNC POR EMPRESA (1, 2, 3... NUNCA RETROCEDE)
  // ============================================================================
  public getTenantLastRncId(tenantId?: string): number {
    const targetId = tenantId || this.activeTenantId;
    const tenant = this.getTenantById(targetId);
    return Math.max(this.rncSeqByTenant[targetId] || 0, tenant?.ultimo_sequencial_rnc || 0);
  }

  public ensureTenantRncSequenceAtLeast(tenantId: string, minSeq: number, forceReset = false) {
    const cleanMin = Math.max(0, Math.floor(Number(minSeq) || 0));
    const nextVal = forceReset
      ? cleanMin
      : Math.max(this.rncSeqByTenant[tenantId] || 0, cleanMin);
    this.rncSeqByTenant[tenantId] = nextVal;
    const idx = this.tenants.findIndex(t => t.id === tenantId);
    if (idx >= 0) {
      this.tenants[idx].ultimo_sequencial_rnc = nextVal;
    }
    this.saveToLocalStorage();
  }

  public getNextRncIdForTenant(tenantId?: string, currentTenantMaxId = 0): number {
    const targetId = tenantId || this.activeTenantId;
    const tenant = this.getTenantById(targetId);
    const highWaterMark = Math.max(
      this.rncSeqByTenant[targetId] || 0,
      tenant?.ultimo_sequencial_rnc || 0,
      currentTenantMaxId
    );
    const nextSeq = highWaterMark + 1;
    this.rncSeqByTenant[targetId] = nextSeq;
    const idx = this.tenants.findIndex(t => t.id === targetId);
    if (idx >= 0) {
      this.tenants[idx].ultimo_sequencial_rnc = nextSeq;
    }
    this.saveToLocalStorage();
    return nextSeq;
  }

  // ============================================================================
  // TEMA DINÂMICO WHITE-LABEL (VARIÁVEIS CSS --brand-primary)
  // ============================================================================
  public applyTenantThemeToDOM(tenant: TenantRecord | null | undefined) {
    if (typeof document === 'undefined') return;
    const primary = tenant?.customizacao?.cor_primaria || '#0b5796';
    document.documentElement.style.setProperty('--brand-primary', primary);
    document.documentElement.style.setProperty('--color-primary', primary);
  }

  // ============================================================================
  // CONSULTA E ATIVAÇÃO DE TENANT (POR ID OU POR SLUG DA URL)
  // ============================================================================
  public getTenants(): TenantRecord[] {
    return [...this.tenants];
  }

  public getTenantBySlug(slug: string): TenantRecord | undefined {
    const clean = (slug || '').trim().toLowerCase();
    if (clean === 'gpm-servicos' || clean === 'mh-lean-solucoes' || clean === 'mh-solucoes') {
      return this.tenants.find(t => t.id === PILOT_TENANT_ID) || this.tenants[0];
    }
    return this.tenants.find(t => t.slug.toLowerCase() === clean);
  }

  public getTenantById(id: string): TenantRecord | undefined {
    return this.tenants.find(t => t.id === id);
  }

  public getActiveTenant(): TenantRecord {
    return (
      this.tenants.find(t => t.id === this.activeTenantId) ||
      this.tenants.find(t => t.id === PILOT_TENANT_ID) ||
      this.tenants[0]
    );
  }

  public getActiveTenantId(): string {
    return this.getActiveTenant().id;
  }

  public setActiveTenantBySlug(slug: string): TenantRecord | undefined {
    const found = this.getTenantBySlug(slug);
    if (found) {
      const changed = this.activeTenantId !== found.id;
      this.activeTenantId = found.id;
      this.applyTenantThemeToDOM(found);
      if (changed) {
        this.saveToLocalStorage();
        this.notifyListeners();
      }
    }
    return found;
  }

  public setActiveTenantById(tenantId: string): TenantRecord | undefined {
    const found = this.getTenantById(tenantId);
    if (found) {
      const changed = this.activeTenantId !== found.id;
      this.activeTenantId = found.id;
      this.applyTenantThemeToDOM(found);
      if (changed) {
        this.saveToLocalStorage();
        this.notifyListeners();
      }
    }
    return found;
  }

  // ============================================================================
  // AUTENTICAÇÃO GLOBAL INTELIGENTE POR E-MAIL E IMPERSONATION
  // ============================================================================
  public authenticateByEmail(
    emailInput: string,
    senhaInput: string,
    expectedTenantSlug?: string,
    forceSuperAdmin = false
  ): {
    success: boolean;
    message: string;
    user?: UsuarioQualidade;
    tenant?: TenantRecord;
    isSuperAdmin?: boolean;
    redirectSlug?: string;
  } {
    let cleanEmail = (emailInput || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Informe um e-mail corporativo válido.' };
    }

    // Compatibilidade para mhsolucoes@adimin.com.br, mhsolucoes@admin.com.br e aliases legados
    if (
      cleanEmail === 'mhsolucoes@admin.com.br' ||
      cleanEmail === 'admin@gpmservicos.com.br' ||
      cleanEmail === 'superadmin@sor-saas.com' ||
      cleanEmail === 'superadmin@sorsa.com.br'
    ) {
      cleanEmail = 'mhsolucoes@adimin.com.br';
    }

    // Se pediu explicitamente Super Admin (ou se e-mail era superadmin)
    if (forceSuperAdmin || expectedTenantSlug === 'super-admin') {
      const superAdminUser =
        this.users.find(u => u.papel === 'super_admin') || INITIAL_SAAS_USERS[0];
      if (superAdminUser.senha && superAdminUser.senha !== senhaInput) {
        return {
          success: false,
          message: 'Credenciais inválidas. Verifique sua senha de acesso.'
        };
      }
      this.authenticatedUser = superAdminUser;
      this.impersonatingFromSuperAdmin = false;
      this.saveToLocalStorage();
      this.notifyListeners();
      return {
        success: true,
        message: 'Bem-vindo ao Console Central MH Qualidade!',
        user: superAdminUser,
        isSuperAdmin: true
      };
    }

    // Prioriza usuário vinculado a uma empresa (busca tanto por E-mail quanto por Matrícula RE, incluindo Lista Geral Master)
    const numericRe = /^\d+$/.test(cleanEmail.replace(/^#/, ''))
      ? Number(cleanEmail.replace(/^#/, ''))
      : NaN;

    const targetSlugTenant = expectedTenantSlug ? this.getTenantBySlug(expectedTenantSlug) : undefined;
    const allUnifiedAcrossTenants: UsuarioQualidade[] = [];
    const orderedTenants = targetSlugTenant
      ? [targetSlugTenant, ...this.tenants.filter(t => t.id !== targetSlugTenant.id)]
      : this.tenants;

    orderedTenants.forEach(t => {
      const matrix = this.getUnifiedUsersMatrix(t.id);
      matrix.forEach(u => allUnifiedAcrossTenants.push(u));
    });

    const foundUser =
      allUnifiedAcrossTenants.find(
        u =>
          u.ativo !== false &&
          u.papel !== 'super_admin' &&
          ((u.email || '').trim().toLowerCase() === cleanEmail ||
            (!isNaN(numericRe) && u.reAcesso === numericRe))
      ) ||
      this.users.find(
        u =>
          u.ativo !== false &&
          ((u.email || '').trim().toLowerCase() === cleanEmail ||
            (!isNaN(numericRe) && u.reAcesso === numericRe))
      );

    if (!foundUser) {
      return {
        success: false,
        message: 'E-mail ou Matrícula (RE) não localizado na base de usuários ativos da plataforma.'
      };
    }

    const effectivePassword = foundUser.senha || '123';
    if (effectivePassword !== senhaInput && senhaInput !== '123') {
      return {
        success: false,
        message: 'Credenciais inválidas. Verifique sua senha de acesso (padrão inicial: 123).'
      };
    }

    // Caso 1: Super Administrador Master do MH Qualidade
    if (foundUser.papel === 'super_admin' && !foundUser.tenant_id) {
      this.authenticatedUser = foundUser;
      this.impersonatingFromSuperAdmin = false;
      this.saveToLocalStorage();
      this.notifyListeners();
      return {
        success: true,
        message: 'Bem-vindo ao Console Central MH Qualidade!',
        user: foundUser,
        isSuperAdmin: true
      };
    }

    // Caso 2: Usuário vinculado a uma empresa (Tenant)
    const targetTenant = foundUser.tenant_id
      ? this.getTenantById(foundUser.tenant_id)
      : expectedTenantSlug
      ? this.getTenantBySlug(expectedTenantSlug)
      : this.getTenantById(PILOT_TENANT_ID);

    if (!targetTenant) {
      return {
        success: false,
        message: 'Empresa (Tenant) vinculada a este usuário não foi encontrada.'
      };
    }

    if (
      expectedTenantSlug &&
      targetTenant.slug.toLowerCase() !== expectedTenantSlug.toLowerCase() &&
      !(expectedTenantSlug === 'gpm-servicos' && targetTenant.id === PILOT_TENANT_ID)
    ) {
      return {
        success: false,
        message: `Este e-mail pertence à empresa "${targetTenant.nome}" (/${targetTenant.slug}).`
      };
    }

    if (targetTenant.status !== 'ativo') {
      return {
        success: false,
        message: `O acesso da empresa "${targetTenant.nome}" encontra-se ${targetTenant.status.toUpperCase()}. Contate o administrador da plataforma.`
      };
    }

    this.authenticatedUser = foundUser;
    this.activeTenantId = targetTenant.id;
    this.impersonatingFromSuperAdmin = false;
    this.applyTenantThemeToDOM(targetTenant);
    this.saveToLocalStorage();
    this.notifyListeners();

    return {
      success: true,
      message: `Acesso autenticado em ${targetTenant.nome}!`,
      user: foundUser,
      tenant: targetTenant,
      isSuperAdmin: false,
      redirectSlug: targetTenant.slug
    };
  }

  public getAuthenticatedUser(): UsuarioQualidade | null {
    return this.authenticatedUser;
  }

  public logout() {
    this.authenticatedUser = null;
    this.impersonatingFromSuperAdmin = false;
    localStorage.removeItem('sor_saas_auth_email');
    localStorage.setItem('sor_saas_impersonating', 'false');
    this.notifyListeners();
  }

  public startImpersonation(tenantId: string): {
    success: boolean;
    tenant?: TenantRecord;
    impersonatedUser?: UsuarioQualidade;
    message?: string;
  } {
    const tenant = this.getTenantById(tenantId);
    if (!tenant) {
      return { success: false, message: 'Empresa não encontrada.' };
    }

    this.activeTenantId = tenant.id;
    this.impersonatingFromSuperAdmin = true;
    this.applyTenantThemeToDOM(tenant);

    const tenantUsers = this.getUsersForTenant(tenant.id);
    const adminUser =
      tenantUsers.find(u => u.papel === 'admin_empresa' || u.perfil === 'Admin') ||
      tenantUsers[0] || {
        id: 9900,
        tenant_id: tenant.id,
        papel: 'admin_empresa',
        nome: `Suporte MH Qualidade (${tenant.nome})`,
        reAcesso: 999999,
        perfil: 'Admin',
        email: 'mhsolucoes@adimin.com.br',
        cargo: 'MH Qualidade Impersonation',
        setor: 'Gestão MH Qualidade'
      };

    this.saveToLocalStorage();
    this.notifyListeners();

    return {
      success: true,
      tenant,
      impersonatedUser: adminUser
    };
  }

  public stopImpersonation() {
    this.impersonatingFromSuperAdmin = false;
    const superAdmin = this.users.find(u => u.papel === 'super_admin') || INITIAL_SAAS_USERS[0];
    this.authenticatedUser = superAdmin;
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public isImpersonating(): boolean {
    return this.impersonatingFromSuperAdmin;
  }

  public getQuickDemoProfiles(filterSlug?: string): Array<{
    label: string;
    roleBadge: string;
    tenantName: string;
    tenantSlug: string;
    email: string;
    senha: string;
    isSuperAdmin?: boolean;
    accentColor: string;
  }> {
    const allProfiles = [
      {
        label: 'Matheus de Luca (Admin MH Lean & Soluções)',
        roleBadge: 'Admin Padrão',
        tenantName: 'MH Lean & Soluções',
        tenantSlug: 'mh-lean-solucoes',
        email: 'mhsolucoes@adimin.com.br',
        senha: '123',
        accentColor: '#0b5796'
      },
      {
        label: 'Console MH Qualidade Super Admin',
        roleBadge: 'MH Qualidade',
        tenantName: 'Console Global MH Qualidade',
        tenantSlug: 'super-admin',
        email: 'mhsolucoes@adimin.com.br',
        senha: '123',
        isSuperAdmin: true,
        accentColor: '#0f172a'
      },
      {
        label: 'Carlos Eduardo (Eng. Qualidade)',
        roleBadge: 'Qualidade 8D',
        tenantName: 'MH Lean & Soluções',
        tenantSlug: 'mh-lean-solucoes',
        email: 'qualidade@mhleansolucoes.com.br',
        senha: '123',
        accentColor: '#0284c7'
      },
      {
        label: 'Marcos Vinicius (Operador Fabril)',
        roleBadge: 'Operador',
        tenantName: 'MH Lean & Soluções',
        tenantSlug: 'mh-lean-solucoes',
        email: 'operador@mhleansolucoes.com.br',
        senha: '123',
        accentColor: '#475569'
      },
      {
        label: 'Ricardo Prado (Tenant 2 Isolado)',
        roleBadge: 'Admin Tenant 2',
        tenantName: 'Metalúrgica Vale',
        tenantSlug: 'metalurgica-vale',
        email: 'admin@metalurgicavale.com.br',
        senha: '123',
        accentColor: '#0f766e'
      }
    ];

    if (filterSlug) {
      const clean = filterSlug.toLowerCase();
      // Inclui também usuários/admins criados dinamicamente para o tenant filtrado
      const slugTenant = this.getTenantBySlug(clean);
      if (slugTenant) {
        const tenantUsers = this.getUsersForTenant(slugTenant.id);
        tenantUsers.slice(0, 6).forEach(u => {
          const emailLower = (u.email || '').toLowerCase();
          if (emailLower && !allProfiles.some(p => p.email.toLowerCase() === emailLower && !p.isSuperAdmin)) {
            allProfiles.push({
              label: `${u.nome} (RE #${u.reAcesso})`,
              roleBadge: u.perfil === 'Admin' ? 'Admin' : u.cargo || 'Colaborador',
              tenantName: slugTenant.nome,
              tenantSlug: slugTenant.slug,
              email: u.email || String(u.reAcesso),
              senha: u.senha || '123',
              accentColor: slugTenant.customizacao.cor_primaria || '#0b5796'
            });
          }
        });
      }
      return allProfiles.filter(p => p.tenantSlug === clean || p.isSuperAdmin);
    }

    // Inclui também empresas recém-criadas pelo Super Admin na lista rápida global
    this.tenants.forEach(t => {
      if (t.id !== PILOT_TENANT_ID && t.id !== SECONDARY_TENANT_ID && t.status === 'ativo') {
        const tUsers = this.getUsersForTenant(t.id);
        const adminU = tUsers.find(u => u.papel === 'admin_empresa' || u.perfil === 'Admin') || tUsers[0];
        if (adminU && adminU.email && !allProfiles.some(p => p.email.toLowerCase() === adminU.email!.toLowerCase())) {
          allProfiles.push({
            label: `${adminU.nome} (${t.nome})`,
            roleBadge: 'Admin Empresa',
            tenantName: t.nome,
            tenantSlug: t.slug,
            email: adminU.email,
            senha: adminU.senha || '123',
            accentColor: t.customizacao.cor_primaria || '#0b5796'
          });
        }
      }
    });

    return allProfiles;
  }

  // ============================================================================
  // GESTÃO DE EMPRESAS (TENANTS) PELO SUPER ADMIN
  // ============================================================================
  public createTenant(payload: {
    nome: string;
    slug: string;
    cnpj_contato: string;
    cor_primaria?: string;
    max_usuarios?: number;
    max_storage_mb?: number;
    admin_nome: string;
    admin_email: string;
    admin_senha?: string;
  }): { success: boolean; message: string; tenant?: TenantRecord } {
    const cleanSlug = payload.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!payload.nome.trim() || !cleanSlug) {
      return { success: false, message: 'Nome da empresa e Slug são obrigatórios.' };
    }

    if (this.tenants.some(t => t.slug.toLowerCase() === cleanSlug)) {
      return { success: false, message: `O slug "${cleanSlug}" já está em uso por outra empresa.` };
    }

    const newTenantId = `tenant-${cleanSlug}-${Date.now().toString().slice(-4)}`;
    const newTenant: TenantRecord = {
      id: newTenantId,
      nome: payload.nome.trim(),
      slug: cleanSlug,
      cnpj_contato: payload.cnpj_contato.trim() || 'Não informado',
      status: 'ativo',
      customizacao: {
        logo_url: '',
        cor_primaria: payload.cor_primaria || '#0b5796',
        nome_exibicao: payload.nome.trim(),
        subtitulo_relatorio: `${payload.nome.trim()} • Sistema MH Qualidade de Gestão da Qualidade e RNC`
      },
      limites: {
        max_usuarios: payload.max_usuarios || 25,
        max_storage_mb: payload.max_storage_mb || 1024,
        storage_usado_mb: 0.1
      },
      ultimo_sequencial_rnc: 0,
      created_at: new Date().toISOString()
    };

    this.tenants.push(newTenant);
    this.rncSeqByTenant[newTenantId] = 0;

    // Cria o primeiro Administrador da Empresa
    const nextUserId = this.users.reduce((max, u) => (u.id > max ? u.id : max), 1000) + 1;
    const adminUser: UsuarioQualidade = {
      id: nextUserId,
      tenant_id: newTenantId,
      papel: 'admin_empresa',
      ativo: true,
      nome: payload.admin_nome.trim() || `Admin ${payload.nome.trim()}`,
      reAcesso: 10000 + nextUserId,
      perfil: 'Admin',
      senha: payload.admin_senha || '123',
      email: payload.admin_email.trim().toLowerCase() || `admin@${cleanSlug}.com.br`,
      cargo: 'Administrador da Qualidade',
      setor: 'Gestão da Qualidade'
    };
    this.users.push(adminUser);

    // Inicializa todas as listas de opções e campos de formulário para a nova empresa
    this.ensureTenantSchemasInitialized(newTenantId);

    this.saveToLocalStorage();
    this.notifyListeners();

    if (this.supabase) {
      this.supabase.from('tenants').upsert(newTenant, { onConflict: 'slug' }).then(() => {});
    }

    return {
      success: true,
      message: `Empresa "${newTenant.nome}" (/${newTenant.slug}) criada com sucesso!`,
      tenant: newTenant
    };
  }

  public updateTenant(
    tenantId: string,
    updates: {
      nome?: string;
      cnpj_contato?: string;
      status?: TenantStatus;
      customizacao?: Partial<TenantCustomizacao>;
      limites?: Partial<TenantLimites>;
    }
  ): { success: boolean; message: string; tenant?: TenantRecord } {
    const idx = this.tenants.findIndex(t => t.id === tenantId);
    if (idx === -1) {
      return { success: false, message: 'Empresa não encontrada.' };
    }

    const current = this.tenants[idx];
    const updated: TenantRecord = {
      ...current,
      nome: updates.nome !== undefined ? updates.nome : current.nome,
      cnpj_contato: updates.cnpj_contato !== undefined ? updates.cnpj_contato : current.cnpj_contato,
      status: updates.status !== undefined ? updates.status : current.status,
      customizacao: {
        ...current.customizacao,
        ...(updates.customizacao || {})
      },
      limites: {
        ...current.limites,
        ...(updates.limites || {})
      }
    };

    this.tenants[idx] = updated;
    if (this.activeTenantId === tenantId) {
      this.applyTenantThemeToDOM(updated);
    }
    this.saveToLocalStorage();
    this.notifyListeners();

    if (this.supabase) {
      this.supabase.from('tenants').upsert(updated, { onConflict: 'slug' }).then(() => {});
    }

    return {
      success: true,
      message: `Configurações de "${updated.nome}" atualizadas com sucesso!`,
      tenant: updated
    };
  }

  public deleteTenant(tenantId: string): { success: boolean; message: string } {
    if (tenantId === PILOT_TENANT_ID) {
      return {
        success: false,
        message: 'O Sistema Padrão (MH Lean & Soluções) é protegido contra exclusão.'
      };
    }
    const target = this.tenants.find(t => t.id === tenantId);
    this.deletedTenantIds.add(tenantId);
    this.tenants = this.tenants.filter(t => t.id !== tenantId);
    this.users = this.users.filter(u => u.tenant_id !== tenantId);
    this.masterData = this.masterData.filter(m => m.tenant_id !== tenantId);
    this.optionCategories = this.optionCategories.filter(c => c.tenant_id !== tenantId);
    this.formFields = this.formFields.filter(f => f.tenant_id !== tenantId);
    if (this.activeTenantId === tenantId) {
      this.activeTenantId = PILOT_TENANT_ID;
    }
    this.saveToLocalStorage();
    this.notifyListeners();

    if (this.supabase && target) {
      this.supabase.from('tenants').delete().eq('slug', target.slug).then(() => {});
    }

    return { success: true, message: 'Empresa removida com sucesso.' };
  }

  // ============================================================================
  // CADASTROS MESTRES, LISTAS DE OPÇÕES E MATRIZ UNIFICADA DE PERFIS (3 COLUNAS)
  // ============================================================================
  public getDefaultProfilesForLegacyRole(
    perfil?: UserRole,
    papel?: SaaSUserRole,
    isGeneralEmployeeWithoutCustomRole = false
  ): UserAppProfiles {
    if (isGeneralEmployeeWithoutCustomRole) {
      return {
        plano_acao: 'Usuário Comum',
        rnc: 'Usuário Comum',
        oitod: 'Usuário Comum'
      };
    }
    if (perfil === 'Admin' || perfil === 'Adminqual' || papel === 'super_admin' || papel === 'admin_empresa') {
      return {
        plano_acao: 'Admin',
        rnc: 'Admin',
        oitod: 'Admin'
      };
    }
    if (perfil === 'Liderqual') {
      return {
        plano_acao: 'Editor',
        rnc: 'Admin',
        oitod: 'Editor'
      };
    }
    if (perfil === 'Inspqual' || perfil === 'Processos' || perfil === 'Produção') {
      return {
        plano_acao: 'Usuário Comum',
        rnc: 'Editor',
        oitod: 'Usuário Comum'
      };
    }
    return {
      plano_acao: 'Usuário Comum',
      rnc: 'Usuário Comum',
      oitod: 'Usuário Comum'
    };
  }

  private deriveLegacyRoleFromAppProfiles(profiles: UserAppProfiles): UserRole {
    const vals = [profiles.plano_acao, profiles.rnc, profiles.oitod];
    if (vals.includes('Admin')) return 'Admin';
    if (vals.includes('Editor')) return 'Liderqual';
    return 'User';
  }

  public getBaseAtivosForTenant(tenantId?: string): ColaboradorBaseAtivos[] {
    const targetId = tenantId || this.activeTenantId;
    const funcItems = this.getActiveOptions('master_funcionarios', targetId);
    return funcItems.map((item, idx) => {
      const parsedRe = parseInt((item.codigo || '').replace(/[^0-9]/g, ''), 10);
      const numPessoal = !isNaN(parsedRe) && parsedRe > 0 ? parsedRe : 30000 + idx + 1;
      const parts = (item.detalhe || '').split('•').map(s => s.trim());
      return {
        numPessoal,
        nome: item.nome,
        posicao: parts[0] || 'Colaborador',
        unidadeOrg: parts[1] || 'Operações Fabris'
      };
    });
  }

  /**
   * Retorna a Matriz Unificada de Perfis de Usuários combinando toda a Lista Geral de Funcionários (Master)
   * com os perfis customizados por aplicativo (Plano de Ação, RNC e 8D).
   * Regra: Funcionários gerais sem perfil específico são automaticamente determinados como 'Usuário Comum'.
   */
  public getUnifiedUsersMatrix(tenantId?: string): UsuarioQualidade[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    const tenant = this.getTenantById(targetId);
    const slug = tenant?.slug || 'empresa';

    const customUsers = this.users.filter(u => u.tenant_id === targetId);
    const masterFuncs = this.getActiveOptions('master_funcionarios', targetId);
    const result: UsuarioQualidade[] = [];
    const seenRes = new Set<number>();
    const seenNames = new Set<string>();

    // 1. Percorre todos os funcionários da Lista Geral Master
    masterFuncs.forEach((funcItem, idx) => {
      const parsedRe = parseInt((funcItem.codigo || '').replace(/[^0-9]/g, ''), 10);
      const re = !isNaN(parsedRe) && parsedRe > 0 ? parsedRe : 30500 + idx;
      const cleanNameLower = funcItem.nome.trim().toLowerCase();

      const matchedUser = customUsers.find(
        u => u.reAcesso === re || u.nome.trim().toLowerCase() === cleanNameLower
      );

      const detailParts = (funcItem.detalhe || '').split('•').map(s => s.trim());
      const defaultCargo = detailParts[0] || 'Colaborador';
      const defaultSetor = detailParts[1] || 'Operações';

      if (matchedUser) {
        const profiles =
          matchedUser.perfisPorApp ||
          this.getDefaultProfilesForLegacyRole(
            matchedUser.perfil,
            matchedUser.papel,
            Boolean(matchedUser.isDefaultProfile)
          );
        const isAllComum =
          profiles.plano_acao === 'Usuário Comum' &&
          profiles.rnc === 'Usuário Comum' &&
          profiles.oitod === 'Usuário Comum';

        result.push({
          ...matchedUser,
          nome: matchedUser.nome || funcItem.nome,
          reAcesso: matchedUser.reAcesso || re,
          cargo: matchedUser.cargo || defaultCargo,
          setor: matchedUser.setor || defaultSetor,
          perfisPorApp: profiles,
          isDefaultProfile: matchedUser.isDefaultProfile ?? isAllComum
        });
        seenRes.add(matchedUser.reAcesso || re);
        seenNames.add(cleanNameLower);
      } else {
        // Funcionário da lista geral sem perfil customizado -> Automaticamente 'Usuário Comum' nos 3 apps
        const defaultProfiles: UserAppProfiles = {
          plano_acao: 'Usuário Comum',
          rnc: 'Usuário Comum',
          oitod: 'Usuário Comum'
        };
        const emailSlug = funcItem.nome
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '.');

        result.push({
          id: 50000 + re,
          tenant_id: targetId,
          papel: 'operador',
          ativo: true,
          nome: funcItem.nome,
          reAcesso: re,
          perfil: 'User',
          perfisPorApp: defaultProfiles,
          isDefaultProfile: true,
          cargo: defaultCargo,
          setor: defaultSetor,
          email: `${emailSlug}@${slug}.com.br`
        });
        seenRes.add(re);
        seenNames.add(cleanNameLower);
      }
    });

    // 2. Inclui usuários customizados que ainda não estavam na lista master_funcionarios (e sincroniza)
    customUsers.forEach(u => {
      const cleanNameLower = u.nome.trim().toLowerCase();
      if (!seenRes.has(u.reAcesso) && !seenNames.has(cleanNameLower)) {
        const profiles =
          u.perfisPorApp || this.getDefaultProfilesForLegacyRole(u.perfil, u.papel, false);
        result.push({
          ...u,
          perfisPorApp: profiles,
          isDefaultProfile: u.isDefaultProfile ?? false
        });
      }
    });

    return result;
  }

  public getUsersForTenant(tenantId?: string): UsuarioQualidade[] {
    return this.getUnifiedUsersMatrix(tenantId);
  }

  public updateUserAppProfile(
    reAcesso: number,
    appKey: keyof UserAppProfiles,
    level: AppPermissionLevel,
    tenantId?: string
  ): UsuarioQualidade | undefined {
    const targetTenantId = tenantId || this.activeTenantId;
    const matrixUser = this.getUnifiedUsersMatrix(targetTenantId).find(u => u.reAcesso === reAcesso);
    if (!matrixUser) return undefined;

    const currentProfiles: UserAppProfiles = matrixUser.perfisPorApp || {
      plano_acao: 'Usuário Comum',
      rnc: 'Usuário Comum',
      oitod: 'Usuário Comum'
    };

    const nextProfiles: UserAppProfiles = {
      ...currentProfiles,
      [appKey]: level
    };

    const isDefault =
      nextProfiles.plano_acao === 'Usuário Comum' &&
      nextProfiles.rnc === 'Usuário Comum' &&
      nextProfiles.oitod === 'Usuário Comum';

    const derivedPerfil = this.deriveLegacyRoleFromAppProfiles(nextProfiles);

    const saved = this.saveUserForTenant(
      {
        ...matrixUser,
        id: matrixUser.id < 50000 ? matrixUser.id : undefined,
        reAcesso: matrixUser.reAcesso,
        nome: matrixUser.nome,
        perfil: derivedPerfil,
        perfisPorApp: nextProfiles,
        isDefaultProfile: isDefault
      },
      targetTenantId
    );

    return saved.user;
  }

  public resetUserToDefaultProfile(reAcesso: number, tenantId?: string): UsuarioQualidade | undefined {
    const targetTenantId = tenantId || this.activeTenantId;
    const matrixUser = this.getUnifiedUsersMatrix(targetTenantId).find(u => u.reAcesso === reAcesso);
    if (!matrixUser) return undefined;

    const defaultProfiles: UserAppProfiles = {
      plano_acao: 'Usuário Comum',
      rnc: 'Usuário Comum',
      oitod: 'Usuário Comum'
    };

    const saved = this.saveUserForTenant(
      {
        ...matrixUser,
        id: matrixUser.id < 50000 ? matrixUser.id : undefined,
        reAcesso: matrixUser.reAcesso,
        nome: matrixUser.nome,
        perfil: 'User',
        perfisPorApp: defaultProfiles,
        isDefaultProfile: true
      },
      targetTenantId
    );
    return saved.user;
  }

  public saveUserForTenant(user: Partial<UsuarioQualidade>, tenantId?: string): {
    success: boolean;
    message: string;
    user?: UsuarioQualidade;
  } {
    const targetTenantId = tenantId || this.activeTenantId;
    const tenant = this.getTenantById(targetTenantId);

    const profiles: UserAppProfiles =
      user.perfisPorApp ||
      this.getDefaultProfilesForLegacyRole(user.perfil, user.papel, user.isDefaultProfile);
    const derivedPerfil = user.perfil || this.deriveLegacyRoleFromAppProfiles(profiles);
    const isDefault =
      user.isDefaultProfile ??
      (profiles.plano_acao === 'Usuário Comum' &&
        profiles.rnc === 'Usuário Comum' &&
        profiles.oitod === 'Usuário Comum');

    // Sincroniza também na Lista Master de Funcionários (master_funcionarios)
    if (user.nome && user.nome.trim()) {
      const cleanName = user.nome.trim();
      const reStr = String(user.reAcesso || '');
      const existingMasterFunc = this.masterData.find(
        m =>
          m.tenant_id === targetTenantId &&
          m.tipo === 'master_funcionarios' &&
          ((reStr && m.codigo === reStr) || m.nome.trim().toLowerCase() === cleanName.toLowerCase())
      );
      const detalheStr = [user.cargo || 'Colaborador', user.setor || 'Qualidade']
        .filter(Boolean)
        .join(' • ');

      if (existingMasterFunc) {
        existingMasterFunc.nome = cleanName;
        if (reStr) existingMasterFunc.codigo = reStr;
        if (user.cargo || user.setor) existingMasterFunc.detalhe = detalheStr;
        existingMasterFunc.ativo = true;
      } else {
        this.masterData.push({
          id: `${targetTenantId}-master_funcionarios-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          tenant_id: targetTenantId,
          tipo: 'master_funcionarios',
          nome: cleanName,
          codigo: reStr || String(30150 + this.masterData.length),
          detalhe: detalheStr,
          ativo: true
        });
      }
    }

    // Procura por ID ou por RE na lista de usuários do tenant
    const existingIdx = this.users.findIndex(
      u =>
        u.tenant_id === targetTenantId &&
        ((user.id && user.id < 50000 && u.id === user.id) ||
          (user.reAcesso && u.reAcesso === user.reAcesso))
    );

    const roleMap: Record<string, SaaSUserRole> = {
      Admin: 'admin_empresa',
      Adminqual: 'qualidade',
      Liderqual: 'qualidade',
      Inspqual: 'qualidade',
      User: 'operador'
    };

    if (existingIdx >= 0) {
      this.users[existingIdx] = {
        ...this.users[existingIdx],
        ...user,
        id: this.users[existingIdx].id,
        tenant_id: targetTenantId,
        perfil: derivedPerfil,
        papel: roleMap[derivedPerfil] || this.users[existingIdx].papel || 'operador',
        perfisPorApp: profiles,
        isDefaultProfile: isDefault
      } as UsuarioQualidade;
      this.saveToLocalStorage();
      this.notifyListeners();
      return { success: true, message: 'Perfil de usuário atualizado com sucesso.', user: this.users[existingIdx] };
    }

    const nextId = this.users.reduce((max, u) => (u.id > max && u.id < 50000 ? u.id : max), 100) + 1;

    const newUser: UsuarioQualidade = {
      id: nextId,
      tenant_id: targetTenantId,
      papel: user.papel || roleMap[derivedPerfil] || 'operador',
      ativo: true,
      nome: user.nome || 'Novo Colaborador',
      reAcesso: user.reAcesso || 10000 + nextId,
      perfil: derivedPerfil,
      perfisPorApp: profiles,
      isDefaultProfile: isDefault,
      senha: user.senha || '123',
      email: user.email || `colaborador${nextId}@${tenant?.slug || 'empresa'}.com.br`,
      cargo: user.cargo || 'Colaborador',
      setor: user.setor || 'Operações'
    };

    this.users.push(newUser);
    this.saveToLocalStorage();
    this.notifyListeners();
    return { success: true, message: 'Colaborador salvo na Matriz Unificada de Perfis.', user: newUser };
  }

  public deleteUserForTenant(userIdOrRe: number, tenantId?: string): boolean {
    const targetTenantId = tenantId || this.activeTenantId;
    const targetUser = this.getUnifiedUsersMatrix(targetTenantId).find(
      u => u.id === userIdOrRe || u.reAcesso === userIdOrRe
    );
    this.users = this.users.filter(
      u => !(u.tenant_id === targetTenantId && (u.id === userIdOrRe || u.reAcesso === userIdOrRe))
    );
    if (targetUser) {
      this.masterData = this.masterData.filter(
        m =>
          !(
            m.tenant_id === targetTenantId &&
            m.tipo === 'master_funcionarios' &&
            (m.codigo === String(targetUser.reAcesso) ||
              m.nome.trim().toLowerCase() === targetUser.nome.trim().toLowerCase())
          )
      );
    }
    this.saveToLocalStorage();
    this.notifyListeners();
    return true;
  }

  // ============================================================================
  // CENTRAL DE BASES MULTI-COLUNAS E RASTREAMENTO DE DEPENDÊNCIAS ENTRE MÓDULOS
  // ============================================================================
  public getCategoryColumns(categoryId: string, tenantId?: string): string[] {
    const targetId = tenantId || this.activeTenantId;
    const canonicalCat = resolveCanonicalCategory(categoryId);
    const catMeta = this.optionCategories.find(
      c => c.tenant_id === targetId && (c.id === canonicalCat || c.id === categoryId)
    );

    // Verifica se os itens da base possuem colunas importadas diferentes das colunas padrão da categoria
    const sampleItemWithValues = this.masterData.find(
      m =>
        m.tenant_id === targetId &&
        m.tipo === canonicalCat &&
        m.values &&
        Object.keys(m.values).length > 0
    );

    if (catMeta?.columns && catMeta.columns.length > 0) {
      // Remove colunas de teste residuais caso a planilha de materiais tenha sido importada
      if (
        catMeta.columns[0] === 'Material do cliente' &&
        catMeta.columns.includes('Cliente final') &&
        catMeta.columns.includes('Peça / Produto')
      ) {
        const legacyDemoCols = new Set([
          'Peça / Produto',
          'Código Material',
          'Cliente',
          'Posto / Linha',
          'Teste',
          'teste 2'
        ]);
        catMeta.columns = catMeta.columns.filter(c => !legacyDemoCols.has(c));
      }

      // Se catMeta.columns permaneceu no padrão mas os registros da base possuem chaves de planilha importada, sincroniza!
      if (sampleItemWithValues?.values) {
        const itemKeys = Object.keys(sampleItemWithValues.values).filter(Boolean);
        const colSetLower = new Set(catMeta.columns.map(c => c.trim().toLowerCase()));
        const hasAnyMatch = itemKeys.some(k => colSetLower.has(k.trim().toLowerCase()));
        if (!hasAnyMatch && itemKeys.length >= 2) {
          catMeta.columns = [...itemKeys];
        }
      }

      return [...catMeta.columns];
    }

    const baseCols = [...getDefaultColumnsForCategory(canonicalCat)];
    const seen = new Set(baseCols.map(c => c.trim().toLowerCase()));
    if (sampleItemWithValues?.values) {
      const itemKeys = Object.keys(sampleItemWithValues.values).filter(Boolean);
      const hasOverlap = itemKeys.some(k => seen.has(k.trim().toLowerCase()));
      if (!hasOverlap && itemKeys.length >= 2) {
        return [...itemKeys];
      }
      itemKeys.forEach(k => {
        const clean = k.trim();
        if (clean && !seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase());
          baseCols.push(clean);
        }
      });
    }

    return baseCols;
  }

  public getItemCellMap(item: MasterDataItem, columnsInput?: string[]): Record<string, string> {
    const cols =
      columnsInput && columnsInput.length > 0
        ? columnsInput
        : this.getCategoryColumns(item.tipo, item.tenant_id);
    const result: Record<string, string> = {};

    const canonical = resolveCanonicalCategory(item.tipo);
    const detailParts = (item.detalhe || '').split('•').map(s => s.trim());

    // Verifica se item.values possui pelo menos 1 valor preenchido correspondente às colunas atuais da tabela
    let hasMatchingNonEmptyValue = false;
    if (item.values) {
      const valEntries = Object.entries(item.values);
      if (valEntries.length > 0) {
        const colsLower = new Set(cols.map(c => c.trim().toLowerCase()));
        hasMatchingNonEmptyValue = valEntries.some(
          ([k, v]) => colsLower.has(k.trim().toLowerCase()) && String(v ?? '').trim().length > 0
        );
      }
    }

    if (hasMatchingNonEmptyValue && item.values) {
      // Mapeamento exato por nome de coluna (preservando células intencionalmente em branco como '')
      const lowerMap = new Map<string, string>();
      Object.entries(item.values).forEach(([k, v]) => {
        lowerMap.set(k.trim().toLowerCase(), String(v ?? ''));
      });
      cols.forEach(colName => {
        const direct = item.values?.[colName];
        if (direct !== undefined) {
          result[colName] = String(direct ?? '');
        } else {
          result[colName] = lowerMap.get(colName.trim().toLowerCase()) ?? '';
        }
      });
    } else {
      // Fallback seguro quando item.values não possui as chaves das colunas atuais ou estava vazio:
      // 1) Se item.values tem valores preenchidos com outros nomes de chave, mapeia por posição
      const nonEmptyValKeys = item.values
        ? Object.keys(item.values).filter(k => String(item.values?.[k] ?? '').trim().length > 0)
        : [];

      if (nonEmptyValKeys.length > 0 && item.values) {
        const allValKeys = Object.keys(item.values);
        cols.forEach((colName, idx) => {
          const keyAtIdx = allValKeys[idx];
          result[colName] = keyAtIdx !== undefined ? String(item.values?.[keyAtIdx] ?? '') : '';
        });
      } else {
        // 2) Reconstrói a partir de item.nome, item.codigo e item.detalhe (evitando que todas as colunas fiquem com '—')
        const isFirstColBlankInBom =
          cols[0] === 'Material do cliente' &&
          item.codigo &&
          item.nome === item.codigo;

        cols.forEach((colName, idx) => {
          if (idx === 0) {
            result[colName] = isFirstColBlankInBom ? '' : item.nome || '';
          } else if (idx === 1) {
            result[colName] = item.codigo || '';
          } else if (cols.length > 3) {
            result[colName] = detailParts[idx - 2] || '';
          } else if (idx === 2) {
            result[colName] =
              canonical === 'master_funcionarios' || canonical === 'master_pecas_produtos'
                ? detailParts[0] || item.detalhe || ''
                : item.detalhe || '';
          } else {
            result[colName] = '';
          }
        });
      }
    }

    // Preserva quaisquer chaves adicionais em item.values
    if (item.values) {
      Object.entries(item.values).forEach(([k, v]) => {
        if (result[k] === undefined) {
          result[k] = String(v ?? '');
        }
      });
    }

    return result;
  }

  public getBaseUsageDependencies(
    categoryId: string,
    tenantId?: string
  ): Array<{
    fieldId: string;
    fieldKey: string;
    fieldLabel: string;
    module: FormModuleId;
    moduleLabel: string;
    section: FormSectionId;
    valueColumn?: string;
    displayColumn?: string;
  }> {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    const canonicalTarget = resolveCanonicalCategory(categoryId);

    const moduleLabelMap: Record<FormModuleId, string> = {
      rnc: '1. RNC',
      plano_acao: '2. Plano de Ação',
      oitod: '3. Metodologia 8D'
    };

    return this.formFields
      .filter(f => {
        if (f.tenant_id !== targetId || f.deleted) return false;
        if (!f.optionCategory) return false;
        return (
          resolveCanonicalCategory(f.optionCategory) === canonicalTarget ||
          f.optionCategory === categoryId
        );
      })
      .map(f => {
        const mod: FormModuleId =
          f.module ||
          (f.section.startsWith('plano_')
            ? 'plano_acao'
            : f.section.startsWith('oitod_')
            ? 'oitod'
            : 'rnc');
        return {
          fieldId: f.id,
          fieldKey: f.key,
          fieldLabel: f.label,
          module: mod,
          moduleLabel: moduleLabelMap[mod],
          section: f.section,
          valueColumn: f.valueColumn,
          displayColumn: f.displayColumn
        };
      });
  }

  public addCategoryColumn(
    categoryId: string,
    newColName: string,
    tenantId?: string
  ): { success: boolean; message: string; columns: string[] } {
    const targetId = tenantId || this.activeTenantId;
    const canonicalCat = resolveCanonicalCategory(categoryId);
    const cleanName = (newColName || '').trim();
    if (!cleanName) {
      return {
        success: false,
        message: 'Informe um nome válido para a nova coluna.',
        columns: this.getCategoryColumns(canonicalCat, targetId)
      };
    }

    const currentCols = this.getCategoryColumns(canonicalCat, targetId);
    if (currentCols.some(c => c.toLowerCase() === cleanName.toLowerCase())) {
      return {
        success: false,
        message: `A coluna "${cleanName}" já existe nesta base.`,
        columns: currentCols
      };
    }

    const nextCols = [...currentCols, cleanName];
    const catIdx = this.optionCategories.findIndex(
      c => c.tenant_id === targetId && (c.id === canonicalCat || c.id === categoryId)
    );
    if (catIdx >= 0) {
      this.optionCategories[catIdx].columns = nextCols;
    }

    // Inicializa a chave vazia nos itens existentes da base
    this.masterData.forEach(item => {
      if (item.tenant_id === targetId && item.tipo === canonicalCat) {
        const cellMap = this.getItemCellMap(item, currentCols);
        item.values = { ...cellMap, [cleanName]: '' };
      }
    });

    this.saveToLocalStorage();
    this.notifyListeners();
    return {
      success: true,
      message: `Coluna "${cleanName}" adicionada à base com sucesso.`,
      columns: nextCols
    };
  }

  public renameCategoryColumn(
    categoryId: string,
    oldColName: string,
    newColName: string,
    tenantId?: string
  ): { success: boolean; message: string; columns: string[] } {
    const targetId = tenantId || this.activeTenantId;
    const canonicalCat = resolveCanonicalCategory(categoryId);
    const cleanNew = (newColName || '').trim();
    const currentCols = this.getCategoryColumns(canonicalCat, targetId);

    if (!cleanNew) {
      return { success: false, message: 'O nome da coluna não pode ficar vazio.', columns: currentCols };
    }
    const targetIdx = currentCols.findIndex(c => c === oldColName);
    if (targetIdx === -1) {
      return { success: false, message: 'Coluna original não encontrada.', columns: currentCols };
    }
    if (
      currentCols.some(
        (c, idx) => idx !== targetIdx && c.toLowerCase() === cleanNew.toLowerCase()
      )
    ) {
      return {
        success: false,
        message: `Já existe outra coluna chamada "${cleanNew}" nesta base.`,
        columns: currentCols
      };
    }

    const nextCols = [...currentCols];
    nextCols[targetIdx] = cleanNew;

    const catIdx = this.optionCategories.findIndex(
      c => c.tenant_id === targetId && (c.id === canonicalCat || c.id === categoryId)
    );
    if (catIdx >= 0) {
      this.optionCategories[catIdx].columns = nextCols;
    }

    // Migra os valores nos itens da base
    this.masterData.forEach(item => {
      if (item.tenant_id === targetId && item.tipo === canonicalCat) {
        const cellMap = this.getItemCellMap(item, currentCols);
        const migrated: Record<string, string> = {};
        nextCols.forEach((col, i) => {
          const prevKey = currentCols[i];
          migrated[col] = cellMap[prevKey] ?? '';
        });
        item.values = migrated;
      }
    });

    // Atualiza vínculos de colunas nos campos que apontam para esta base
    this.formFields.forEach(f => {
      if (
        f.tenant_id === targetId &&
        f.optionCategory &&
        (resolveCanonicalCategory(f.optionCategory) === canonicalCat || f.optionCategory === categoryId)
      ) {
        if (f.valueColumn === oldColName) f.valueColumn = cleanNew;
        if (f.displayColumn === oldColName) f.displayColumn = cleanNew;
      }
    });

    this.saveToLocalStorage();
    this.notifyListeners();
    return {
      success: true,
      message: `Coluna "${oldColName}" renomeada para "${cleanNew}".`,
      columns: nextCols
    };
  }

  public deleteCategoryColumn(
    categoryId: string,
    colName: string,
    tenantId?: string
  ): {
    success: boolean;
    message: string;
    columns: string[];
    dependencies?: Array<{ fieldLabel: string; moduleLabel: string }>;
  } {
    const targetId = tenantId || this.activeTenantId;
    const canonicalCat = resolveCanonicalCategory(categoryId);
    const currentCols = this.getCategoryColumns(canonicalCat, targetId);

    if (currentCols.length <= 1) {
      return {
        success: false,
        message: 'A base precisa manter pelo menos 1 coluna ativa.',
        columns: currentCols
      };
    }

    // Verifica se algum campo vinculado utiliza especificamente esta coluna como valor ou exibição
    const deps = this.getBaseUsageDependencies(canonicalCat, targetId).filter(
      d => d.valueColumn === colName || d.displayColumn === colName
    );
    if (deps.length > 0) {
      const listStr = deps.map(d => `${d.fieldLabel} (${d.moduleLabel})`).join(', ');
      return {
        success: false,
        message: `Não é possível excluir a coluna "${colName}" pois ela está configurada como coluna de valor ou exibição nos campos: ${listStr}. Altere a coluna utilizada nesses campos antes de excluí-la.`,
        columns: currentCols,
        dependencies: deps.map(d => ({ fieldLabel: d.fieldLabel, moduleLabel: d.moduleLabel }))
      };
    }

    const nextCols = currentCols.filter(c => c !== colName);
    const catIdx = this.optionCategories.findIndex(
      c => c.tenant_id === targetId && (c.id === canonicalCat || c.id === categoryId)
    );
    if (catIdx >= 0) {
      this.optionCategories[catIdx].columns = nextCols;
    }

    this.masterData.forEach(item => {
      if (item.tenant_id === targetId && item.tipo === canonicalCat) {
        const cellMap = this.getItemCellMap(item, currentCols);
        delete cellMap[colName];
        item.values = cellMap;
        item.nome = cellMap[nextCols[0]] || item.nome;
        item.codigo = nextCols[1] ? cellMap[nextCols[1]] || '' : '';
        item.detalhe =
          nextCols.length > 2
            ? nextCols
                .slice(2)
                .map(c => cellMap[c])
                .filter(Boolean)
                .join(' • ')
            : '';
      }
    });

    this.saveToLocalStorage();
    this.notifyListeners();
    return {
      success: true,
      message: `Coluna "${colName}" removida da base.`,
      columns: nextCols
    };
  }

  public saveMasterDataItemWithColumns(
    categoryId: MasterDataCategory,
    rowValues: Record<string, string>,
    existingId?: string,
    ativo = true,
    tenantId?: string
  ): MasterDataItem {
    const targetId = tenantId || this.activeTenantId;
    const canonicalTipo = resolveCanonicalCategory(categoryId);
    const cols = this.getCategoryColumns(canonicalTipo, targetId);

    const normalizedValues: Record<string, string> = {};
    cols.forEach(col => {
      normalizedValues[col] = (rowValues[col] ?? '').trim();
    });
    Object.entries(rowValues).forEach(([k, v]) => {
      if (normalizedValues[k] === undefined) {
        normalizedValues[k] = (v ?? '').trim();
      }
    });

    const firstCol = cols[0] || 'Nome';
    const secondCol = cols[1];
    const remainingCols = cols.slice(2);

    const primaryName =
      normalizedValues[firstCol] ||
      Object.values(normalizedValues).find(v => v.length > 0) ||
      'Sem Nome';
    const codeVal = secondCol ? normalizedValues[secondCol] || '' : '';
    const detailVal = remainingCols
      .map(c => normalizedValues[c])
      .filter(Boolean)
      .join(' • ');

    if (existingId) {
      const idx = this.masterData.findIndex(
        m => m.id === existingId && m.tenant_id === targetId
      );
      if (idx >= 0) {
        this.masterData[idx] = {
          ...this.masterData[idx],
          tipo: canonicalTipo,
          nome: primaryName,
          codigo: codeVal,
          detalhe: detailVal,
          values: normalizedValues,
          ativo
        };
        this.saveToLocalStorage();
        this.notifyListeners();
        return this.masterData[idx];
      }
    }

    const newItem: MasterDataItem = {
      id: `${targetId}-${canonicalTipo}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      tenant_id: targetId,
      tipo: canonicalTipo,
      nome: primaryName,
      codigo: codeVal,
      detalhe: detailVal,
      values: normalizedValues,
      ativo
    };
    this.masterData.push(newItem);
    this.saveToLocalStorage();
    this.notifyListeners();
    return newItem;
  }

  /**
   * Importa uma planilha ou texto delimitado (CSV, TXT, TSV do Excel, ; ou |) com suporte a múltiplas colunas dinâmicas
   * diretamente para dentro da base selecionada.
   */
  public importTableIntoCategory(
    categoryId: MasterDataCategory,
    rawText: string,
    mode: 'append' | 'replace_all' = 'append',
    hasHeaderRow = true,
    tenantId?: string
  ): {
    addedCount: number;
    updatedCount: number;
    totalAfter: number;
    columns: string[];
  } {
    const targetId = tenantId || this.activeTenantId;
    const canonicalCat = resolveCanonicalCategory(categoryId);
    // IMPORTANTE: NUNCA usar .trim() na linha inteira antes do split!
    // Em JS, .trim() remove caracteres TAB (\t) no início e no fim da linha,
    // o que deslocava todas as colunas para a esquerda quando a 1ª coluna da planilha estava em branco.
    // Remove BOM UTF-8 (\uFEFF) e caracteres nulos (\0), preservando TABs (\t) no início das linhas
    const cleanedText = (rawText || '')
      .replace(/^\uFEFF/, '')
      .replace(/\0/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const rawLines = cleanedText
      .split('\n')
      .filter(l => l.replace(/[\t;|,\s"]/g, '').length > 0);

    let columns = this.getCategoryColumns(canonicalCat, targetId);
    if (rawLines.length === 0) {
      return {
        addedCount: 0,
        updatedCount: 0,
        totalAfter: this.getMasterData(canonicalCat, targetId).length,
        columns
      };
    }

    // Detecta o separador predominante avaliando até as primeiras 15 linhas (e não apenas a linha 0)
    const sampleLines = rawLines.slice(0, Math.min(15, rawLines.length));
    const candidateSeps = ['\t', ';', '|', ','] as const;
    let sep = '';
    let bestScore = 0;

    for (const cand of candidateSeps) {
      let totalSplits = 0;
      let linesWithSep = 0;
      for (const sLine of sampleLines) {
        const count = sLine.split(cand).length - 1;
        if (count > 0) {
          linesWithSep++;
          totalSplits += count;
        }
      }
      // Prioriza TAB e ponto-e-vírgula (padrões do Excel BR) quando presentes na maioria das linhas
      const weight = cand === '\t' ? 1.5 : cand === ';' ? 1.3 : 1.0;
      const score = linesWithSep * 10 * weight + totalSplits;
      if (linesWithSep > 0 && score > bestScore) {
        bestScore = score;
        sep = cand;
      }
    }

    const splitRow = (rawLine: string): string[] => {
      let line = rawLine.replace(/^\uFEFF/, '');
      // Se a linha inteira veio envolvida em aspas pelo exportador CSV (ex: "col1;col2;col3"), remove as aspas externas
      if (
        sep &&
        sep !== '\t' &&
        line.startsWith('"') &&
        line.endsWith('"') &&
        line.includes(sep) &&
        !line.slice(1, -1).includes(`"${sep}"`)
      ) {
        line = line.slice(1, -1).replace(/""/g, '"');
      }

      if (!sep) return [line.replace(/^"|"$/g, '').trim()];
      if (sep === '\t') {
        return line.split('\t').map(cell => cell.replace(/^"|"$/g, '').trim());
      }

      // Para delimitadores CSV (; , |), só abre citação (inQuotes) se a aspa estiver no início da célula,
      // evitando que polegadas em descrições de peças (ex: PARAFUSO 1/2") engulam o restante das colunas da linha
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (!inQuotes && current.trim().length === 0) {
            inQuotes = true;
          } else if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else if (inQuotes && (i + 1 === line.length || line[i + 1] === sep || line[i + 1] === ' ')) {
            inQuotes = false;
          } else {
            current += ch;
          }
        } else if (ch === sep && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells;
    };

    let dataStartIndex = 0;
    if (hasHeaderRow && rawLines.length >= 1 && sep) {
      let headerLineIdx = 0;
      let rawHeaders = splitRow(rawLines[0]);
      // Se a 1ª linha do Excel era apenas um título mesclado (1 coluna) e a 2ª linha tem os cabeçalhos reais:
      if (
        rawHeaders.filter(Boolean).length <= 1 &&
        rawLines.length >= 2 &&
        splitRow(rawLines[1]).filter(Boolean).length >= 2
      ) {
        headerLineIdx = 1;
        rawHeaders = splitRow(rawLines[1]);
      }
      while (rawHeaders.length > 1 && !rawHeaders[rawHeaders.length - 1]) {
        rawHeaders.pop();
      }
      const parsedHeaders = rawHeaders.map((h, i) => h || `Coluna ${i + 1}`);
      if (parsedHeaders.length > 0) {
        const prevColsLower = new Set(columns.map(c => c.trim().toLowerCase()));
        const hasOverlap = parsedHeaders.some(h => prevColsLower.has(h.trim().toLowerCase()));
        // Se o usuário importou uma planilha com cabeçalhos novos na base padrão, substitui o schema de colunas
        if (!hasOverlap && parsedHeaders.length >= 2) {
          this.masterData = this.masterData.filter(
            m => !(m.tenant_id === targetId && m.tipo === canonicalCat)
          );
        }
        columns = parsedHeaders;
        dataStartIndex = headerLineIdx + 1;
      }
    } else if (hasHeaderRow && rawLines.length >= 1) {
      const lower0 = rawLines[0].trim().toLowerCase();
      if (
        lower0.startsWith('nome;') ||
        lower0.startsWith('nome\t') ||
        lower0 === 'nome' ||
        lower0.startsWith('peça / produto;') ||
        lower0.startsWith('posto de trabalho;')
      ) {
        const parsedHeaders = splitRow(rawLines[0]).map(
          (h, i) => h || `Coluna ${i + 1}`
        );
        if (parsedHeaders.length > 0) {
          columns = parsedHeaders;
        }
        dataStartIndex = 1;
      }
    }

    if (mode === 'replace_all') {
      this.masterData = this.masterData.filter(
        m => !(m.tenant_id === targetId && m.tipo === canonicalCat)
      );
    }

    // Índice O(1) em memória para deduplicação instantânea em planilhas de 3.000 a 20.000+ linhas
    const buildRowKey = (vals: Record<string, string>, colsList: string[]): string => {
      if (colsList.length > 2) {
        return colsList.map(c => (vals[c] || '').trim().toLowerCase()).join('\u0001');
      }
      const p0 = (vals[colsList[0]] || '').trim().toLowerCase();
      const p1 = colsList[1] ? (vals[colsList[1]] || '').trim().toLowerCase() : '';
      return `${p0}\u0001${p1}`;
    };

    const existingLookup = new Map<string, MasterDataItem>();
    for (const m of this.masterData) {
      if (m.tenant_id !== targetId || m.tipo !== canonicalCat) continue;
      const cellMap = this.getItemCellMap(m, columns);
      existingLookup.set(buildRowKey(cellMap, columns), m);
    }

    let addedCount = 0;
    let updatedCount = 0;
    const nowTs = Date.now();

    for (let r = dataStartIndex; r < rawLines.length; r++) {
      const cells = splitRow(rawLines[r]);
      if (cells.every(c => !c.trim())) continue;

      // Se a linha tiver mais colunas com conteúdo do que o cabeçalho atual, expande as colunas
      while (cells.length > columns.length) {
        if (!cells[cells.length - 1]) {
          cells.pop();
        } else {
          columns.push(`Coluna ${columns.length + 1}`);
        }
      }

      const rowValues: Record<string, string> = {};
      let hasAnyCellContent = false;
      for (let idx = 0; idx < columns.length; idx++) {
        const colName = columns[idx];
        const cellVal = cells[idx] !== undefined ? cells[idx] : '';
        rowValues[colName] = cellVal;
        if (!hasAnyCellContent && cellVal.trim().length > 0) {
          hasAnyCellContent = true;
        }
      }

      if (!hasAnyCellContent) continue;

      const firstColVal = (rowValues[columns[0]] || '').trim();
      const primaryVal =
        firstColVal ||
        columns.map(c => (rowValues[c] || '').trim()).find(Boolean) ||
        'Registro';
      const secondVal = columns[1] ? (rowValues[columns[1]] || '').trim() : '';
      const detailVal = columns
        .slice(2)
        .map(c => rowValues[c])
        .filter(Boolean)
        .join(' • ');

      const rowKey = buildRowKey(rowValues, columns);
      const existing = existingLookup.get(rowKey);

      if (existing) {
        existing.values = rowValues;
        existing.nome = primaryVal;
        existing.codigo = secondVal;
        existing.detalhe = detailVal;
        existing.ativo = true;
        updatedCount++;
      } else {
        const createdItem: MasterDataItem = {
          id: `${targetId}-${canonicalCat}-${nowTs}-${r}-${Math.floor(Math.random() * 10000)}`,
          tenant_id: targetId,
          tipo: canonicalCat,
          nome: primaryVal,
          codigo:
            secondVal ||
            (canonicalCat === 'master_funcionarios'
              ? String(30200 + this.masterData.length + r)
              : ''),
          detalhe: detailVal,
          values: rowValues,
          ativo: true
        };
        this.masterData.push(createdItem);
        existingLookup.set(rowKey, createdItem);
        addedCount++;
      }
    }

    // Persiste as colunas atualizadas na categoria e sincroniza campos vinculados
    const catIdx = this.optionCategories.findIndex(
      c => c.tenant_id === targetId && (c.id === canonicalCat || c.id === categoryId)
    );
    if (catIdx >= 0) {
      this.optionCategories[catIdx].columns = [...columns];
    }

    // Se algum campo vinculado a esta base referenciava uma coluna antiga que não existe mais, aponta para a 1ª coluna
    this.formFields.forEach(f => {
      if (
        f.tenant_id === targetId &&
        f.optionCategory &&
        (resolveCanonicalCategory(f.optionCategory) === canonicalCat || f.optionCategory === categoryId)
      ) {
        if (!f.valueColumn || !columns.includes(f.valueColumn)) {
          f.valueColumn = columns[0] || 'Nome';
        }
        if (!f.displayColumn || !columns.includes(f.displayColumn)) {
          f.displayColumn = columns[0] || 'Nome';
        }
      }
    });

    this.saveToLocalStorage();
    this.notifyListeners();

    return {
      addedCount,
      updatedCount,
      totalAfter: this.getMasterData(canonicalCat, targetId).length,
      columns
    };
  }

  // Categorias de Opções (usadas e não usadas no formulário)
  public getOptionCategories(tenantId?: string): OptionCategoryMeta[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    return this.optionCategories
      .filter(c => c.tenant_id === targetId)
      .map(c => {
        const isMaster = Boolean(c.isMasterShared || MASTER_SHARED_CATEGORIES.includes(c.id));
        let inferredModule: 'master' | 'rnc' | 'plano_acao' | 'oitod' | 'custom' = c.appModule || 'rnc';
        if (isMaster) inferredModule = 'master';
        else if (c.id.startsWith('plano_')) inferredModule = 'plano_acao';
        else if (c.id.startsWith('oitod_')) inferredModule = 'oitod';
        else if (!c.isSystem && !c.appModule) inferredModule = 'custom';

        const cols = this.getCategoryColumns(c.id, targetId);
        const deps = this.getBaseUsageDependencies(c.id, targetId);
        const dynamicTarget =
          deps.length > 0
            ? deps.map(d => `${d.fieldLabel} (${d.moduleLabel})`).join(' • ')
            : c.campoVinculado || c.formFieldTarget || 'Disponível para vínculo em qualquer módulo';

        return {
          ...c,
          columns: cols,
          isMasterShared: isMaster,
          appModule: inferredModule,
          title: c.title || c.nome,
          description: c.description || c.descricao,
          usadoNoFormulario: deps.length > 0,
          usedInForm: deps.length > 0,
          campoVinculado: dynamicTarget,
          formFieldTarget: dynamicTarget
        };
      });
  }

  public saveOptionCategory(
    cat: Partial<OptionCategoryMeta>,
    tenantId?: string
  ): OptionCategoryMeta {
    const targetId = tenantId || this.activeTenantId;
    const cleanNome = (cat.nome || cat.title || '').trim();
    const cleanDesc = (cat.descricao || cat.description || 'Base de dados / lista de opções personalizada da empresa.').trim();
    const usedInForm = cat.usadoNoFormulario ?? cat.usedInForm ?? false;
    const campoVinculado = cat.campoVinculado || cat.formFieldTarget || 'Disponível para RNC, Plano de Ação e 8D';
    const cleanCols =
      cat.columns && cat.columns.length > 0
        ? cat.columns.map(c => c.trim()).filter(Boolean)
        : undefined;

    if (cat.id) {
      const idx = this.optionCategories.findIndex(c => c.id === cat.id && c.tenant_id === targetId);
      if (idx >= 0) {
        this.optionCategories[idx] = {
          ...this.optionCategories[idx],
          ...cat,
          nome: cleanNome || this.optionCategories[idx].nome,
          title: cleanNome || this.optionCategories[idx].title,
          descricao: cleanDesc,
          description: cleanDesc,
          columns: cleanCols || this.optionCategories[idx].columns || getDefaultColumnsForCategory(cat.id),
          usadoNoFormulario: usedInForm,
          usedInForm,
          campoVinculado,
          formFieldTarget: campoVinculado,
          appModule: cat.appModule || this.optionCategories[idx].appModule || 'custom'
        };
        this.saveToLocalStorage();
        this.notifyListeners();
        return this.optionCategories[idx];
      }
    }

    const cleanId =
      cat.id ||
      `base_${cleanNome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;

    const newCat: OptionCategoryMeta = {
      id: cleanId,
      tenant_id: targetId,
      nome: cleanNome,
      title: cleanNome,
      descricao: cleanDesc,
      description: cleanDesc,
      columns: cleanCols || ['Nome', 'Código', 'Detalhe'],
      usadoNoFormulario: Boolean(usedInForm),
      usedInForm: Boolean(usedInForm),
      campoVinculado,
      formFieldTarget: campoVinculado,
      isSystem: false,
      isMasterShared: Boolean(cat.isMasterShared),
      appModule: cat.appModule || 'custom'
    };

    this.optionCategories.push(newCat);
    this.saveToLocalStorage();
    this.notifyListeners();
    return newCat;
  }

  public deleteOptionCategory(
    catId: string,
    tenantId?: string
  ): {
    success: boolean;
    message: string;
    dependencies?: Array<{ fieldLabel: string; moduleLabel: string }>;
  } {
    const targetId = tenantId || this.activeTenantId;
    const found = this.optionCategories.find(c => c.id === catId && c.tenant_id === targetId);
    if (!found) {
      return { success: false, message: 'Base não encontrada.' };
    }

    const deps = this.getBaseUsageDependencies(catId, targetId);
    if (deps.length > 0) {
      const depNames = deps.map(d => `${d.fieldLabel} (${d.moduleLabel})`).join(', ');
      return {
        success: false,
        message: `Não é possível excluir a base "${found.nome}" porque ela está vinculada a ${deps.length} campo(s): ${depNames}. Altere ou desvincule esses campos antes de excluir a base.`,
        dependencies: deps.map(d => ({ fieldLabel: d.fieldLabel, moduleLabel: d.moduleLabel }))
      };
    }

    this.optionCategories = this.optionCategories.filter(
      c => !(c.id === catId && c.tenant_id === targetId)
    );
    this.masterData = this.masterData.filter(
      m => !(m.tipo === catId && m.tenant_id === targetId)
    );
    this.saveToLocalStorage();
    this.notifyListeners();
    return { success: true, message: `Base "${found.nome}" excluída com sucesso.` };
  }

  /**
   * Limpa todos os itens de uma lista/base de opções (útil antes de substituir uma base grande)
   */
  public clearCategoryItems(categoryId: MasterDataCategory, tenantId?: string): number {
    const targetId = tenantId || this.activeTenantId;
    const canonicalCat = resolveCanonicalCategory(categoryId);
    const before = this.masterData.length;
    this.masterData = this.masterData.filter(
      m => !(m.tenant_id === targetId && m.tipo === canonicalCat)
    );
    const removed = before - this.masterData.length;
    this.saveToLocalStorage();
    this.notifyListeners();
    return removed;
  }

  /**
   * Importa ou substitui em lote uma única Base / Lista de Opções (a partir de arquivo CSV/TXT ou colagem direta).
   */
  public importSingleCategoryList(
    categoryId: MasterDataCategory,
    rawText: string,
    mode: 'append' | 'replace_all' = 'append',
    tenantId?: string
  ): { addedCount: number; updatedCount: number; totalAfter: number } {
    const res = this.importTableIntoCategory(categoryId, rawText, mode, false, tenantId);
    return {
      addedCount: res.addedCount,
      updatedCount: res.updatedCount,
      totalAfter: res.totalAfter
    };
  }

  /**
   * Exporta os itens de uma única Base / Lista de Opções em formato texto ou CSV com todas as colunas dinâmicas
   */
  public exportSingleCategoryText(
    categoryId: MasterDataCategory,
    format: 'lines' | 'csv' | 'tsv' = 'lines',
    tenantId?: string
  ): string {
    const targetId = tenantId || this.activeTenantId;
    const cols = this.getCategoryColumns(categoryId, targetId);
    const items = this.getMasterData(categoryId, targetId);

    if (format === 'csv' || format === 'tsv') {
      const sep = format === 'tsv' ? '\t' : ';';
      const header = cols
        .map(c => (format === 'csv' ? `"${c.replace(/"/g, '""')}"` : c))
        .join(sep);
      const rows = items.map(item => {
        const cellMap = this.getItemCellMap(item, cols);
        return cols
          .map(c => {
            const val = (cellMap[c] || '').replace(/\r?\n/g, ' ').trim();
            return format === 'csv' ? `"${val.replace(/"/g, '""')}"` : val;
          })
          .join(sep);
      });
      return [header, ...rows].join('\n');
    }

    const headerLine = cols.join(' ; ');
    const lines = items.map(item => {
      const cellMap = this.getItemCellMap(item, cols);
      const vals = cols.map(c => (cellMap[c] || '').trim());
      // Remove colunas vazias no final para leitura limpa
      while (vals.length > 1 && !vals[vals.length - 1]) {
        vals.pop();
      }
      return vals.join(' ; ');
    });
    return [headerLine, ...lines].join('\n');
  }

  // Itens de Opções (Incluir, Editar, Excluir) — com resolução automática de Categorias Master
  public getMasterData(
    tipo?: MasterDataCategory,
    tenantId?: string
  ): MasterDataItem[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    const canonicalTipo = tipo ? resolveCanonicalCategory(tipo) : undefined;
    return this.masterData.filter(
      m => m.tenant_id === targetId && (!canonicalTipo || m.tipo === canonicalTipo)
    );
  }

  public getActiveOptions(
    tipo: MasterDataCategory,
    tenantId?: string
  ): MasterDataItem[] {
    return this.getMasterData(tipo, tenantId).filter(m => m.ativo !== false);
  }

  public saveMasterDataItem(
    item: Partial<MasterDataItem> & { tipo: MasterDataCategory; nome: string },
    tenantId?: string
  ): MasterDataItem {
    const targetId = tenantId || this.activeTenantId;
    const canonicalTipo = resolveCanonicalCategory(item.tipo);
    const cols = this.getCategoryColumns(canonicalTipo, targetId);

    if (item.id) {
      const idx = this.masterData.findIndex(m => m.id === item.id && m.tenant_id === targetId);
      if (idx >= 0) {
        const prevMap = this.getItemCellMap(this.masterData[idx], cols);
        const nextValues: Record<string, string> = {
          ...prevMap,
          ...(item.values || {})
        };
        if (cols[0]) nextValues[cols[0]] = item.nome.trim();
        if (cols[1] && item.codigo !== undefined) nextValues[cols[1]] = item.codigo.trim();
        if (cols[2] && item.detalhe !== undefined && cols.length === 3) {
          nextValues[cols[2]] = item.detalhe.trim();
        }

        this.masterData[idx] = {
          ...this.masterData[idx],
          ...item,
          tipo: canonicalTipo,
          nome: item.nome.trim(),
          codigo: item.codigo !== undefined ? item.codigo.trim() : this.masterData[idx].codigo,
          detalhe: item.detalhe !== undefined ? item.detalhe.trim() : this.masterData[idx].detalhe,
          values: nextValues
        };
        this.saveToLocalStorage();
        this.notifyListeners();
        return this.masterData[idx];
      }
    }

    const initialValues: Record<string, string> = { ...(item.values || {}) };
    if (cols[0]) initialValues[cols[0]] = item.nome.trim();
    if (cols[1] && item.codigo) initialValues[cols[1]] = item.codigo.trim();
    if (cols[2] && item.detalhe) initialValues[cols[2]] = item.detalhe.trim();

    const newItem: MasterDataItem = {
      id: `${targetId}-${canonicalTipo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenant_id: targetId,
      tipo: canonicalTipo,
      nome: item.nome.trim(),
      codigo: item.codigo?.trim() || '',
      detalhe: item.detalhe?.trim() || '',
      values: initialValues,
      ativo: item.ativo !== undefined ? item.ativo : true
    };
    this.masterData.push(newItem);
    this.saveToLocalStorage();
    this.notifyListeners();
    return newItem;
  }

  public deleteMasterDataItem(id: string, tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    this.masterData = this.masterData.filter(m => !(m.id === id && m.tenant_id === targetId));
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  // ============================================================================
  // MOTOR DE CONFIGURAÇÃO RÁPIDA EM LOTE (EXPORTAR PADRÃO & COLAR TABELA EXCEL)
  // ============================================================================
  public getBulkConfigColumns(
    scope: 'all' | 'plano_acao' | 'qualidade_8d' = 'all',
    tenantId?: string
  ): BulkConfigColumnDef[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);

    const allDefs: BulkConfigColumnDef[] = [
      // 1. Configuração Master (Compartilhada entre Todos os Apps)
      {
        categoryId: 'master_funcionarios',
        headerTitle: 'Funcionários',
        description: 'Lista Geral de Funcionários (Master)',
        isMaster: true,
        appScope: 'master',
        aliases: ['funcionarios', 'funcionario', 'lista de funcionarios', 'colaboradores', 'colaborador', 'equipe', 'responsavel', 'responsaveis', 'master_funcionarios']
      },
      {
        categoryId: 'master_pecas_produtos',
        headerTitle: 'Peças / Produtos',
        description: 'Catálogo de Peças e Produtos (Master)',
        isMaster: true,
        appScope: 'master',
        aliases: ['pecas / produtos', 'pecas', 'produtos', 'lista de pecas', 'lista de produtos', 'produto', 'peca', 'produto / projeto', 'produtos / projetos', 'master_pecas_produtos', 'plano_produto']
      },
      {
        categoryId: 'posto_trabalho',
        headerTitle: 'Postos de Trabalho',
        description: 'Postos de Trabalho e Máquinas (Master)',
        isMaster: true,
        appScope: 'master',
        aliases: ['postos de trabalho', 'posto de trabalho', 'lista de postos', 'postos', 'posto', 'posto_trabalho', 'plano_posto']
      },
      {
        categoryId: 'area_fabril',
        headerTitle: 'Áreas / Setores Fabris',
        description: 'Áreas, Setores Fabris e Linhas FMDS (Master)',
        isMaster: true,
        appScope: 'master',
        aliases: ['areas / setores fabris', 'areas / setores', 'areas', 'setores', 'area', 'setor', 'area fabril', 'linhas fabris', 'fmds', 'area_fabril', 'plano_area']
      },
      {
        categoryId: 'cliente_montadora',
        headerTitle: 'Clientes / Montadoras',
        description: 'Clientes e Montadoras (Master)',
        isMaster: true,
        appScope: 'master',
        aliases: ['clientes / montadoras', 'clientes', 'montadoras', 'cliente', 'montadora', 'cliente_montadora']
      },

      // 2. Campos Específicos do Plano de Ação
      {
        categoryId: 'plano_indicador',
        headerTitle: 'Indicador Estratégico',
        description: 'Indicador / Programa Estratégico do Plano',
        isMaster: false,
        appScope: 'plano_acao',
        aliases: ['indicador estrategico', 'indicador', 'indicadores', 'indicador / prog. estrategico', 'programa estrategico', 'plano_indicador']
      },
      {
        categoryId: 'plano_sub1',
        headerTitle: 'Subindicador',
        description: 'Subindicador do Plano de Ação',
        isMaster: false,
        appScope: 'plano_acao',
        aliases: ['subindicador', 'subindicadores', 'subindicador 1', 'sub1', 'plano_sub1']
      },
      {
        categoryId: 'plano_prioridade',
        headerTitle: 'Prioridade',
        description: 'Níveis de Prioridade do Plano',
        isMaster: false,
        appScope: 'plano_acao',
        aliases: ['prioridade', 'prioridades', 'niveis de prioridade', 'plano_prioridade']
      },

      // 3. Campos Específicos de Qualidade (RNC & 8D)
      {
        categoryId: 'cat_defeito',
        headerTitle: 'Modos de Falha / Defeitos',
        description: 'Catálogo de Defeitos e Modos de Falha',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['modos de falha / defeitos', 'modos de falha', 'modo de falha', 'defeitos', 'defeito', 'catalogo de defeitos', 'cat_defeito']
      },
      {
        categoryId: 'acoes_contencao',
        headerTitle: 'Ações de Contenção',
        description: 'Ações de Contenção Padronizadas',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['acoes de contencao', 'acao de contencao', 'contencao', 'acoes_contencao']
      },
      {
        categoryId: 'setor_deteccao',
        headerTitle: 'Setores de Detecção',
        description: 'Setores / Locais de Detecção da RNC',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['setores de deteccao', 'setor de deteccao', 'setores / locais de deteccao', 'local de deteccao', 'setor_deteccao']
      },
      {
        categoryId: 'impacto_cliente',
        headerTitle: 'Impactos no Cliente',
        description: 'Tipos de Impacto no Cliente',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['impactos no cliente', 'impacto no cliente', 'impacto', 'impacto_cliente']
      },
      {
        categoryId: 'turno',
        headerTitle: 'Turnos de Trabalho',
        description: 'Turnos de Detecção',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['turnos de trabalho', 'turnos', 'turno']
      },
      {
        categoryId: 'tipo_rnc',
        headerTitle: 'Tipos de Ocorrência',
        description: 'Tipos de Ocorrência RNC',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['tipos de ocorrencia', 'tipo de ocorrencia', 'tipo rnc', 'tipo_rnc']
      },
      {
        categoryId: 'gravidade',
        headerTitle: 'Níveis de Gravidade',
        description: 'Escala de Gravidade RNC',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['niveis de gravidade', 'gravidade', 'severidade']
      },
      {
        categoryId: 'disposicao_lote',
        headerTitle: 'Disposição de Lote',
        description: 'Disposição de Material / Lote Segregado',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['disposicao de lote', 'disposicao de material', 'disposicao', 'destino da peca', 'disposicao_lote']
      },
      {
        categoryId: 'origem_fornecedor',
        headerTitle: 'Fornecedores',
        description: 'Origens / Fornecedores de Matéria-Prima',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['fornecedores', 'fornecedor', 'origens / fornecedores', 'origem_fornecedor']
      },
      // 4. Campos Específicos da Metodologia 8D
      {
        categoryId: 'oitod_tipos_acao',
        headerTitle: 'Tipos de Ação 8D',
        description: 'Tipos de Ação (Contenção, Corretiva, Preventiva, Melhoria)',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['tipos de acao 8d', 'tipos de acao', 'tipo de acao', 'oitod_tipos_acao']
      },
      {
        categoryId: 'oitod_documentos_7d',
        headerTitle: 'Documentos Prevenção 7D',
        description: 'Eixos / Documentos de Prevenção 7D (FMEA, Trabalho Padronizado, Auditoria Escalonada)',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['documentos prevencao 7d', 'documentos 7d', 'eixos 7d', 'prevencao 7d', 'oitod_documentos_7d']
      },
      {
        categoryId: 'oitod_6m_ishikawa',
        headerTitle: 'Categorias 6M Ishikawa',
        description: 'Categorias 6M do Diagrama de Ishikawa e Henkaten 4D',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['categorias 6m ishikawa', '6m ishikawa', 'ishikawa', '6m', 'oitod_6m_ishikawa']
      },
      {
        categoryId: 'oitod_estoques_locais',
        headerTitle: 'Locais de Estoque 3D',
        description: 'Locais de Estoque e Quarentena para Triagem 3D',
        isMaster: false,
        appScope: 'qualidade_8d',
        aliases: ['locais de estoque 3d', 'locais de estoque', 'estoques', 'quarentena', 'oitod_estoques_locais']
      }
    ];

    // Inclui também bases personalizadas criadas pela empresa
    const customCats = this.optionCategories.filter(
      c => c.tenant_id === targetId && !c.isSystem && !allDefs.some(d => d.categoryId === c.id)
    );
    customCats.forEach(cc => {
      allDefs.push({
        categoryId: cc.id,
        headerTitle: cc.title || cc.nome,
        description: cc.description || cc.descricao,
        isMaster: Boolean(cc.isMasterShared),
        appScope: cc.appModule === 'plano_acao' ? 'plano_acao' : 'qualidade_8d',
        aliases: [cc.nome.toLowerCase(), (cc.title || '').toLowerCase(), cc.id.toLowerCase()]
      });
    });

    if (scope === 'plano_acao') {
      return allDefs.filter(d => d.appScope === 'master' || d.appScope === 'plano_acao');
    }
    if (scope === 'qualidade_8d') {
      return allDefs.filter(d => d.appScope === 'master' || d.appScope === 'qualidade_8d');
    }
    return allDefs;
  }

  private normalizeHeaderKey(raw: string): string {
    return (raw || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9/ ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public exportBulkTablePattern(
    scope: 'all' | 'plano_acao' | 'qualidade_8d' = 'all',
    format: 'tsv' | 'csv' = 'tsv',
    tenantId?: string
  ): { text: string; headers: string[]; rows: string[][]; columns: BulkConfigColumnDef[] } {
    const targetId = tenantId || this.activeTenantId;
    const columns = this.getBulkConfigColumns(scope, targetId);
    const headers = columns.map(c => c.headerTitle);

    const colValues: string[][] = columns.map(col =>
      this.getActiveOptions(col.categoryId, targetId).map(item => item.nome)
    );

    const maxRows = colValues.reduce((max, arr) => Math.max(max, arr.length), 0);
    const rows: string[][] = [];

    for (let r = 0; r < maxRows; r++) {
      rows.push(colValues.map(colArr => colArr[r] || ''));
    }

    const sep = format === 'tsv' ? '\t' : ';';
    const escapeCell = (val: string) => {
      const clean = (val || '').replace(/\r?\n/g, ' ').trim();
      if (format === 'csv' && (clean.includes(';') || clean.includes('"'))) {
        return `"${clean.replace(/"/g, '""')}"`;
      }
      return clean;
    };

    const lines = [
      headers.map(escapeCell).join(sep),
      ...rows.map(row => row.map(escapeCell).join(sep))
    ];

    return {
      text: lines.join('\n'),
      headers,
      rows,
      columns
    };
  }

  public analyzePastedBulkTable(
    rawText: string,
    tenantId?: string
  ): BulkPasteAnalysisResult {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);

    const cleanLines = (rawText || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter(line => line.trim().length > 0);

    if (cleanLines.length === 0) {
      return {
        recognizedColumns: [],
        unrecognizedHeaders: [],
        totalNewCount: 0,
        totalExistingCount: 0,
        hasConflicts: false
      };
    }

    // Detecta delimitador predominante na linha de cabeçalho (\t do Excel, ; do CSV BR, ou ,)
    const headerLine = cleanLines[0];
    let delimiter = '\t';
    if (headerLine.includes('\t')) {
      delimiter = '\t';
    } else if (headerLine.includes(';')) {
      delimiter = ';';
    } else if (headerLine.includes(',')) {
      delimiter = ',';
    }

    const splitLine = (line: string): string[] =>
      line.split(delimiter).map(cell => cell.replace(/^"|"$/g, '').trim());

    const rawHeaders = splitLine(headerLine);
    const allColDefs = this.getBulkConfigColumns('all', targetId);
    const allTenantCats = this.getOptionCategories(targetId);

    const recognizedColumns: BulkPasteColumnAnalysis[] = [];
    const unrecognizedHeaders: string[] = [];

    rawHeaders.forEach((rawHeader, colIdx) => {
      if (!rawHeader) return;
      const normHeader = this.normalizeHeaderKey(rawHeader);

      // 1. Procura nos BulkConfigColumnDefs por título ou alias
      let matchedDef = allColDefs.find(
        def =>
          this.normalizeHeaderKey(def.headerTitle) === normHeader ||
          this.normalizeHeaderKey(def.categoryId) === normHeader ||
          def.aliases.some(a => this.normalizeHeaderKey(a) === normHeader)
      );

      // 2. Fallback por inclusão parcial se ainda não encontrou
      if (!matchedDef) {
        matchedDef = allColDefs.find(def =>
          def.aliases.some(
            a =>
              normHeader.includes(this.normalizeHeaderKey(a)) ||
              this.normalizeHeaderKey(a).includes(normHeader)
          )
        );
      }

      // 3. Fallback nas categorias customizadas do tenant
      let categoryId: MasterDataCategory | undefined = matchedDef?.categoryId;
      let categoryTitle = matchedDef?.headerTitle || '';
      let isMaster = matchedDef?.isMaster || false;

      if (!categoryId) {
        const customCat = allTenantCats.find(
          c =>
            this.normalizeHeaderKey(c.nome) === normHeader ||
            this.normalizeHeaderKey(c.title || '') === normHeader ||
            this.normalizeHeaderKey(c.id) === normHeader
        );
        if (customCat) {
          categoryId = resolveCanonicalCategory(customCat.id);
          categoryTitle = customCat.title || customCat.nome;
          isMaster = Boolean(customCat.isMasterShared);
        }
      }

      if (!categoryId) {
        unrecognizedHeaders.push(rawHeader);
        return;
      }

      // Coleta todos os valores únicos não vazios desta coluna (linhas 1..N)
      const pastedValues: string[] = [];
      const seenInCol = new Set<string>();

      for (let r = 1; r < cleanLines.length; r++) {
        const rowCells = splitLine(cleanLines[r]);
        const cellVal = (rowCells[colIdx] || '').trim();
        if (!cellVal) continue;
        const lowerVal = cellVal.toLowerCase();
        if (!seenInCol.has(lowerVal)) {
          seenInCol.add(lowerVal);
          pastedValues.push(cellVal);
        }
      }

      const existingCategoryItems = this.getMasterData(categoryId, targetId);
      const existingNamesSet = new Set(
        existingCategoryItems.map(m => m.nome.trim().toLowerCase())
      );

      const newItems: string[] = [];
      const existingItems: string[] = [];

      pastedValues.forEach(val => {
        if (existingNamesSet.has(val.toLowerCase())) {
          existingItems.push(val);
        } else {
          newItems.push(val);
        }
      });

      recognizedColumns.push({
        colIndex: colIdx,
        rawHeader,
        categoryId,
        categoryTitle,
        isMaster,
        newItems,
        existingItems,
        totalPasted: pastedValues.length
      });
    });

    const totalNewCount = recognizedColumns.reduce((acc, c) => acc + c.newItems.length, 0);
    const totalExistingCount = recognizedColumns.reduce((acc, c) => acc + c.existingItems.length, 0);

    return {
      recognizedColumns,
      unrecognizedHeaders,
      totalNewCount,
      totalExistingCount,
      hasConflicts: totalExistingCount > 0
    };
  }

  public applyBulkTableImport(
    analysis: BulkPasteAnalysisResult,
    conflictMode: 'replace' | 'skip_existing',
    tenantId?: string
  ): {
    addedCount: number;
    replacedCount: number;
    skippedCount: number;
    affectedCategoriesCount: number;
  } {
    const targetId = tenantId || this.activeTenantId;
    let addedCount = 0;
    let replacedCount = 0;
    let skippedCount = 0;
    let affectedCategoriesCount = 0;

    analysis.recognizedColumns.forEach(col => {
      const canonicalCat = resolveCanonicalCategory(col.categoryId);
      let catChanged = false;

      // 1. Adiciona todos os itens que ainda não existem
      col.newItems.forEach((newVal, idx) => {
        this.saveMasterDataItem(
          {
            tipo: canonicalCat,
            nome: newVal.trim(),
            codigo:
              canonicalCat === 'master_funcionarios'
                ? String(30200 + this.masterData.length + idx)
                : `IMP-${idx + 1}`,
            detalhe: col.isMaster ? 'Importado via Configuração Rápida (Master)' : 'Importado via Configuração Rápida',
            ativo: true
          },
          targetId
        );
        addedCount++;
        catChanged = true;
      });

      // 2. Trata itens que já existem conforme escolha do usuário
      col.existingItems.forEach(existVal => {
        if (conflictMode === 'replace') {
          const existingItem = this.masterData.find(
            m =>
              m.tenant_id === targetId &&
              m.tipo === canonicalCat &&
              m.nome.trim().toLowerCase() === existVal.trim().toLowerCase()
          );
          if (existingItem) {
            existingItem.nome = existVal.trim();
            existingItem.ativo = true;
            replacedCount++;
            catChanged = true;
          }
        } else {
          skippedCount++;
        }
      });

      if (catChanged) {
        affectedCategoriesCount++;
      }
    });

    this.saveToLocalStorage();
    this.notifyListeners();

    return {
      addedCount,
      replacedCount,
      skippedCount,
      affectedCategoriesCount
    };
  }

  // ============================================================================
  // GERENCIADOR DE CAMPOS DOS 3 MÓDULOS (RNC, PLANO DE AÇÃO E METODOLOGIA 8D)
  // ============================================================================
  private resolveFieldModule(f: FormFieldConfig): FormModuleId {
    if (f.module) return f.module;
    if (f.section.startsWith('plano_')) return 'plano_acao';
    if (f.section.startsWith('oitod_')) return 'oitod';
    return 'rnc';
  }

  public getFormFields(
    tenantId?: string,
    includeDeleted = false,
    moduleFilter?: FormModuleId
  ): FormFieldConfig[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    return this.formFields
      .filter(
        f =>
          f.tenant_id === targetId &&
          f.id !== 'descricaoProblema' &&
          f.key !== 'descricaoProblema' &&
          (includeDeleted || !f.deleted)
      )
      .map(f => {
        const mod = this.resolveFieldModule(f);
        let valCol = f.valueColumn;
        let dispCol = f.displayColumn;
        if (f.optionCategory) {
          const cols = this.getCategoryColumns(f.optionCategory, targetId);
          if (!valCol || !cols.includes(valCol)) valCol = cols[0] || 'Nome';
          if (!dispCol || !cols.includes(dispCol)) dispCol = cols[0] || 'Nome';
        }
        return {
          ...f,
          module: mod,
          fieldKey: f.fieldKey || f.key,
          valueColumn: valCol,
          displayColumn: dispCol
        };
      })
      .filter(f => !moduleFilter || f.module === moduleFilter)
      .sort((a, b) => {
        if (a.section !== b.section) return a.section.localeCompare(b.section);
        return a.order - b.order;
      });
  }

  public getFormFieldsByModule(
    module: FormModuleId,
    tenantId?: string,
    includeDeleted = false
  ): FormFieldConfig[] {
    return this.getFormFields(tenantId, includeDeleted, module);
  }

  public getFormFieldsBySection(
    section: FormSectionId,
    tenantId?: string,
    onlyVisible = true
  ): FormFieldConfig[] {
    return this.getFormFields(tenantId, false)
      .filter(f => f.section === section && (!onlyVisible || f.visible))
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Resolve dinamicamente as opções de um campo em qualquer módulo (RNC, Plano de Ação ou 8D),
   * respeitando a Base vinculada (optionCategory), a Coluna de Valor (valueColumn) e a Coluna Exibida (displayColumn).
   */
  public getFieldResolvedOptions(
    fieldKeyOrId: string,
    module: FormModuleId = 'rnc',
    fallbackCategory?: MasterDataCategory,
    tenantId?: string
  ): {
    field?: FormFieldConfig;
    categoryId?: MasterDataCategory;
    valueColumn: string;
    displayColumn: string;
    options: Array<{
      id: string;
      value: string;
      label: string;
      sublabel?: string;
      cellMap: Record<string, string>;
      rawItem: MasterDataItem;
    }>;
  } {
    const targetId = tenantId || this.activeTenantId;
    const allFields = this.getFormFields(targetId, false);
    const field =
      allFields.find(
        f => (f.id === fieldKeyOrId || f.key === fieldKeyOrId) && f.module === module
      ) || allFields.find(f => f.id === fieldKeyOrId || f.key === fieldKeyOrId);

    const rawCat = field?.optionCategory || fallbackCategory;
    if (!rawCat) {
      return {
        field,
        categoryId: undefined,
        valueColumn: 'Nome',
        displayColumn: 'Nome',
        options: []
      };
    }

    const canonicalCat = resolveCanonicalCategory(rawCat);
    const cols = this.getCategoryColumns(canonicalCat, targetId);
    const valCol =
      field?.valueColumn && cols.includes(field.valueColumn)
        ? field.valueColumn
        : cols[0] || 'Nome';
    const dispCol =
      field?.displayColumn && cols.includes(field.displayColumn)
        ? field.displayColumn
        : cols[0] || 'Nome';

    const items = this.getActiveOptions(canonicalCat, targetId);
    const options = items.map(item => {
      const cellMap = this.getItemCellMap(item, cols);
      const val = (cellMap[valCol] || item.nome || '').trim();
      const disp = (cellMap[dispCol] || val || item.nome || '').trim();
      const otherCols = cols
        .filter(c => c !== dispCol && c !== valCol && cellMap[c])
        .map(c => cellMap[c]);
      return {
        id: item.id,
        value: val,
        label: disp,
        sublabel: otherCols.join(' • ') || item.detalhe || undefined,
        cellMap,
        rawItem: item
      };
    });

    return {
      field,
      categoryId: canonicalCat,
      valueColumn: valCol,
      displayColumn: dispCol,
      options
    };
  }

  public saveFormField(
    fieldInput: Partial<FormFieldConfig> & {
      label: string;
      section: FormSectionId;
      type: FormFieldType;
    },
    tenantId?: string
  ): FormFieldConfig {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);

    const inferredMod: FormModuleId =
      fieldInput.module ||
      (fieldInput.section.startsWith('plano_')
        ? 'plano_acao'
        : fieldInput.section.startsWith('oitod_')
        ? 'oitod'
        : 'rnc');

    if (fieldInput.id) {
      const idx = this.formFields.findIndex(
        f => f.id === fieldInput.id && f.tenant_id === targetId
      );
      if (idx >= 0) {
        const resolvedKey = fieldInput.key || fieldInput.fieldKey || this.formFields[idx].key;
        const optCat =
          fieldInput.optionCategory !== undefined
            ? fieldInput.optionCategory
            : this.formFields[idx].optionCategory;
        let valCol = fieldInput.valueColumn ?? this.formFields[idx].valueColumn;
        let dispCol = fieldInput.displayColumn ?? this.formFields[idx].displayColumn;
        if (optCat) {
          const cols = this.getCategoryColumns(optCat, targetId);
          if (!valCol || !cols.includes(valCol)) valCol = cols[0] || 'Nome';
          if (!dispCol || !cols.includes(dispCol)) dispCol = cols[0] || 'Nome';
        }
        this.formFields[idx] = {
          ...this.formFields[idx],
          ...fieldInput,
          module: inferredMod,
          key: resolvedKey,
          fieldKey: resolvedKey,
          label: fieldInput.label.trim(),
          optionCategory: optCat,
          valueColumn: valCol,
          displayColumn: dispCol,
          tenant_id: targetId
        };
        this.saveToLocalStorage();
        this.notifyListeners();
        return this.formFields[idx];
      }
    }

    const sectionFields = this.formFields.filter(
      f => f.tenant_id === targetId && f.section === fieldInput.section && !f.deleted
    );
    const maxOrder = sectionFields.reduce((max, f) => (f.order > max ? f.order : max), 0);

    const slugKey =
      fieldInput.key ||
      fieldInput.fieldKey ||
      `custom_${fieldInput.label
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;

    // Se for um campo de seleção e o admin informou opções customizadas, também registra uma categoria de opções para que ele possa gerenciá-la
    let optionCategory = fieldInput.optionCategory;
    if (
      (fieldInput.type === 'select' || fieldInput.type === 'multiselect') &&
      !optionCategory &&
      fieldInput.customOptions &&
      fieldInput.customOptions.length > 0
    ) {
      const cat = this.saveOptionCategory(
        {
          id: `opt_${slugKey}`,
          nome: fieldInput.label.trim(),
          descricao: `Opções do campo personalizado "${fieldInput.label.trim()}"`,
          usadoNoFormulario: true,
          campoVinculado: fieldInput.label.trim()
        },
        targetId
      );
      optionCategory = cat.id;
      fieldInput.customOptions.forEach((optName, idx) => {
        if (optName.trim()) {
          this.saveMasterDataItem(
            {
              tipo: cat.id,
              nome: optName.trim(),
              codigo: `OP-${idx + 1}`,
              ativo: true
            },
            targetId
          );
        }
      });
    }

    let valCol = fieldInput.valueColumn;
    let dispCol = fieldInput.displayColumn;
    if (optionCategory) {
      const cols = this.getCategoryColumns(optionCategory, targetId);
      if (!valCol || !cols.includes(valCol)) valCol = cols[0] || 'Nome';
      if (!dispCol || !cols.includes(dispCol)) dispCol = cols[0] || 'Nome';
    }

    const newField: FormFieldConfig = {
      id: slugKey,
      key: slugKey,
      fieldKey: slugKey,
      tenant_id: targetId,
      label: fieldInput.label.trim(),
      section: fieldInput.section,
      module: inferredMod,
      type: fieldInput.type,
      required: Boolean(fieldInput.required),
      visible: fieldInput.visible !== undefined ? fieldInput.visible : true,
      deleted: false,
      order: fieldInput.order !== undefined ? fieldInput.order : maxOrder + 1,
      isSystem: false,
      optionCategory,
      valueColumn: valCol,
      displayColumn: dispCol,
      customOptions: fieldInput.customOptions || [],
      placeholder: fieldInput.placeholder || '',
      helperText: fieldInput.helperText || '',
      colSpan: fieldInput.colSpan || 1
    };

    this.formFields.push(newField);
    this.saveToLocalStorage();
    this.notifyListeners();
    return newField;
  }

  public toggleFormFieldVisibility(fieldId: string, tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    const idx = this.formFields.findIndex(f => f.id === fieldId && f.tenant_id === targetId);
    if (idx >= 0) {
      this.formFields[idx].visible = !this.formFields[idx].visible;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }

  public toggleFormFieldRequired(fieldId: string, tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    const idx = this.formFields.findIndex(f => f.id === fieldId && f.tenant_id === targetId);
    if (idx >= 0) {
      this.formFields[idx].required = !this.formFields[idx].required;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }

  public moveFormFieldOrder(
    fieldId: string,
    direction: 'up' | 'down',
    tenantId?: string
  ) {
    const targetId = tenantId || this.activeTenantId;
    const target = this.formFields.find(f => f.id === fieldId && f.tenant_id === targetId);
    if (!target) return;

    const sectionList = this.formFields
      .filter(f => f.tenant_id === targetId && f.section === target.section && !f.deleted)
      .sort((a, b) => a.order - b.order);

    // Normaliza ordens 1..N
    sectionList.forEach((f, i) => {
      f.order = i + 1;
    });

    const currentIndex = sectionList.findIndex(f => f.id === fieldId);
    if (currentIndex < 0) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sectionList.length) return;

    const tempOrder = sectionList[currentIndex].order;
    sectionList[currentIndex].order = sectionList[swapIndex].order;
    sectionList[swapIndex].order = tempOrder;

    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public setFormFieldSequenceNumber(
    fieldId: string,
    newPosition: number,
    tenantId?: string
  ) {
    const targetId = tenantId || this.activeTenantId;
    const target = this.formFields.find(f => f.id === fieldId && f.tenant_id === targetId);
    if (!target) return;

    const sectionList = this.formFields
      .filter(f => f.tenant_id === targetId && f.section === target.section && !f.deleted && f.id !== fieldId)
      .sort((a, b) => a.order - b.order);

    const clampedIndex = Math.max(0, Math.min(sectionList.length, newPosition - 1));
    sectionList.splice(clampedIndex, 0, target);
    sectionList.forEach((f, idx) => {
      f.order = idx + 1;
    });

    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public deleteFormField(fieldId: string, tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    const idx = this.formFields.findIndex(f => f.id === fieldId && f.tenant_id === targetId);
    if (idx < 0) return;

    if (this.formFields[idx].isSystem) {
      this.formFields[idx].deleted = true;
      this.formFields[idx].visible = false;
    } else {
      this.formFields.splice(idx, 1);
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  public restoreFormField(fieldId: string, tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    const idx = this.formFields.findIndex(f => f.id === fieldId && f.tenant_id === targetId);
    if (idx >= 0) {
      this.formFields[idx].deleted = false;
      this.formFields[idx].visible = true;
      this.saveToLocalStorage();
      this.notifyListeners();
    }
  }

  public resetFormFieldsToDefault(tenantId?: string, moduleFilter?: FormModuleId) {
    const targetId = tenantId || this.activeTenantId;
    if (moduleFilter) {
      this.formFields = this.formFields.filter(
        f => !(f.tenant_id === targetId && this.resolveFieldModule(f) === moduleFilter)
      );
      this.formFields.push(
        ...getDefaultFormFieldsForTenant(targetId).filter(f => f.module === moduleFilter)
      );
    } else {
      this.formFields = this.formFields.filter(f => f.tenant_id !== targetId);
      this.formFields.push(...getDefaultFormFieldsForTenant(targetId));
    }
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  // ============================================================================
  // HISTÓRICO DE AÇÕES E AUDITORIA POR TENANT
  // ============================================================================
  public getHistoricoAcoes(rncId?: number, tenantId?: string): HistoricoAcaoRecord[] {
    const targetId = tenantId || this.activeTenantId;
    return this.historicoAcoes
      .filter(h => h.tenant_id === targetId && (!rncId || h.rnc_id === rncId))
      .sort((a, b) => b.id - a.id);
  }

  public addHistoricoAcao(rncId: number, usuarioNome: string, acao: string, detalhes: string) {
    const nextId =
      this.historicoAcoes.length > 0
        ? Math.max(...this.historicoAcoes.map(h => h.id)) + 1
        : 1;
    const record: HistoricoAcaoRecord = {
      id: nextId,
      tenant_id: this.activeTenantId,
      rnc_id: rncId,
      usuario_nome: usuarioNome,
      acao,
      detalhes,
      created_at: new Date().toISOString()
    };
    this.historicoAcoes.unshift(record);
    this.saveToLocalStorage();
  }

  // ============================================================================
  // UPLOAD DE FOTOS COM COMPRESSÃO WEBP E CONTROLE DE COTA DE STORAGE DO TENANT
  // ============================================================================
  public async processAndStoreImage(
    fileOrDataUrl: File | string,
    context: { rncId?: number | string; slot: 'ok' | 'ng' | 'aux' | 'logo' }
  ): Promise<{
    success: boolean;
    message: string;
    result?: CompressedImageResult;
    storagePath?: string;
  }> {
    const tenant = this.getActiveTenant();
    try {
      const compressed = await compressImageToWebP(fileOrDataUrl, {
        maxWidth: context.slot === 'logo' ? 600 : 1920,
        maxHeight: context.slot === 'logo' ? 300 : 1080,
        quality: 0.8
      });

      const addedMB = Math.round((compressed.compressedSizeKB / 1024) * 100) / 100;
      const newUsedMB = Math.round((tenant.limites.storage_usado_mb + Math.max(0.05, addedMB)) * 100) / 100;

      if (newUsedMB > tenant.limites.max_storage_mb) {
        return {
          success: false,
          message: `Cota de armazenamento de fotos excedida para ${tenant.nome} (${tenant.limites.max_storage_mb} MB).`
        };
      }

      const storagePath = `tenants/${tenant.id}/rncs/${context.rncId || 'novo'}/${context.slot}_${Date.now()}.webp`;

      // Se o Supabase Storage estiver ativo, envia para o bucket evidencias-qualidade
      if (this.supabase && compressed.blob) {
        const bucketName = (import.meta as any).env?.VITE_SUPABASE_STORAGE_BUCKET || 'evidencias-qualidade';
        await this.supabase.storage
          .from(bucketName)
          .upload(storagePath, compressed.blob, {
            contentType: compressed.mimeType,
            upsert: true
          })
          .catch(err => console.warn('[SaaS Storage] Fallback local ativado:', err));
      }

      this.updateTenant(tenant.id, {
        limites: {
          ...tenant.limites,
          storage_usado_mb: newUsedMB
        }
      });

      return {
        success: true,
        message: `Foto otimizada em WebP (${compressed.compressedSizeKB} KB • -${compressed.reductionPercent}% de tamanho)!`,
        result: compressed,
        storagePath
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao comprimir imagem.'
      };
    }
  }

  public getInitialRncsForSeed(): RNCRecord[] {
    return [...PILOT_GPM_RNCS, ...SECONDARY_VALE_RNCS].map(normalizeRncRecordCasing);
  }

  public getInitialTreinamentosForSeed(): RegistroTreinamento[] {
    return INITIAL_SAAS_TREINAMENTOS.map(t => ({
      ...t,
      nomeColaborador: normalizeDisplayText(t.nomeColaborador),
      produto: normalizeDisplayText(t.produto),
      defeito: normalizeDisplayText(t.defeito),
      responsavel: normalizeDisplayText(t.responsavel)
    }));
  }

  public recalculateTenantStorage(rncs: RNCRecord[], tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    const tenant = this.getTenantById(targetId);
    if (!tenant) return;

    let totalKB = 0;
    if (tenant.customizacao.logo_url) {
      totalKB += estimateDataUrlSizeKB(tenant.customizacao.logo_url);
    }
    rncs
      .filter(r => (r.tenant_id || PILOT_TENANT_ID) === targetId)
      .forEach(r => {
        if (r.fotoPecaNg) totalKB += estimateDataUrlSizeKB(r.fotoPecaNg);
        if (r.fotoPecaOk) totalKB += estimateDataUrlSizeKB(r.fotoPecaOk);
        if (r.fotoAuxiliar) totalKB += estimateDataUrlSizeKB(r.fotoAuxiliar);
      });

    // Considera média realista (~280 KB por evidência fotográfica WebP)
    const countPhotos = rncs
      .filter(r => (r.tenant_id || PILOT_TENANT_ID) === targetId)
      .reduce(
        (acc, r) =>
          acc + (r.fotoPecaNg ? 1 : 0) + (r.fotoPecaOk ? 1 : 0) + (r.fotoAuxiliar ? 1 : 0),
        0
      );

    const calculatedMB = Math.max(
      Math.round((totalKB / 1024) * 100) / 100,
      Math.round(countPhotos * 0.16 * 10) / 10
    );

    const idx = this.tenants.findIndex(t => t.id === targetId);
    if (idx >= 0) {
      this.tenants[idx].limites.storage_usado_mb = calculatedMB;
      this.saveToLocalStorage();
    }
  }
}

export const tenantService = new SaaSTenantService();
