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
  FormFieldType,
  HistoricoAcaoRecord,
  SaaSUserRole
} from '../types';
import { compressImageToWebP, estimateDataUrlSizeKB, CompressedImageResult } from '../utils/imageCompressor';

// ============================================================================
// GERADOR DE ILUSTRAÇÕES TÉCNICAS SVG (PEÇA NG / PEÇA OK) PARA AS 10 RNCS PILOTO
// Garante zero imagens quebradas e alto contraste técnico no chão de fábrica
// ============================================================================
function createTechnicalSvgDataUrl(
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
    {
      id: 'cliente_montadora',
      tenant_id: tenantId,
      nome: 'Montadoras / Clientes',
      descricao: 'Lista de clientes e montadoras atendidas pela planta industrial.',
      usadoNoFormulario: true,
      campoVinculado: 'Cliente (Montadora)',
      isSystem: true
    },
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
      id: 'area_fabril',
      tenant_id: tenantId,
      nome: 'Linhas Fabris / Áreas FMDS',
      descricao: 'Células produtivas, quadros FMDS e setores fabris.',
      usadoNoFormulario: true,
      campoVinculado: 'Área FMDS / Setor Fabril',
      isSystem: true
    },
    {
      id: 'posto_trabalho',
      tenant_id: tenantId,
      nome: 'Postos de Trabalho',
      descricao: 'Estações e máquinas operacionais vinculadas às linhas fabris.',
      usadoNoFormulario: true,
      campoVinculado: 'Posto de Trabalho Cadastrado',
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
    // Campos de opções de controle / sistema que não ficam abertos no formulário inicial,
    // mas que os admins podem incluir, editar ou excluir livremente (e vincular se desejarem)
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
        { id: `${tenantId}-def-1`, tenant_id: tenantId, tipo: 'cat_defeito', nome: 'Microfissura térmica pós-têmpera', codigo: 'MET-01', detalhe: 'Alta / Metalurgia', ativo: true }
      ]
    : [
        // MH Lean & Soluções — Clientes / Montadoras
        { id: `${tenantId}-cli-1`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'TDB - SOROCABA', codigo: 'TOYOTA', detalhe: 'Planta Sorocaba - SP', ativo: true },
        { id: `${tenantId}-cli-2`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'STELLANTIS', codigo: 'STEL-BR', detalhe: 'Polo Automotivo Betim / Goiana', ativo: true },
        { id: `${tenantId}-cli-3`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'VOLKSWAGEN', codigo: 'VW-ANCH', detalhe: 'São Bernardo / Taubaté', ativo: true },
        { id: `${tenantId}-cli-4`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'GENERAL MOTORS', codigo: 'GM-SCS', detalhe: 'São Caetano / São José dos Campos', ativo: true },
        { id: `${tenantId}-cli-5`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'HONDA', codigo: 'HAB-ITIR', detalhe: 'Planta Itirapina - SP', ativo: true },
        { id: `${tenantId}-cli-6`, tenant_id: tenantId, tipo: 'cliente_montadora', nome: 'HYUNDAI', codigo: 'HMB-PIRA', detalhe: 'Planta Piracicaba - SP', ativo: true },

        // MH Lean & Soluções — Áreas Fabris / FMDS
        { id: `${tenantId}-area-1`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'SOLDA 2 - CEL. TOYOTA', codigo: 'FMDS-S2', detalhe: 'Células Robotizadas Solda Ponto/MIG', ativo: true },
        { id: `${tenantId}-area-2`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'ESTAMPARIA TANDEM & PROGRESSIVA', codigo: 'FMDS-EST', detalhe: 'Prensas 1200T e 800T', ativo: true },
        { id: `${tenantId}-area-3`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'PINTURA E-COAT & ACABAMENTO', codigo: 'FMDS-PINT', detalhe: 'Tratamento Superficial Classe A', ativo: true },
        { id: `${tenantId}-area-4`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'USINAGEM & CONFORMAÇÃO CNC', codigo: 'FMDS-USI', detalhe: 'Centros de Furação e Rosqueamento', ativo: true },
        { id: `${tenantId}-area-5`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'MONTAGEM FINAL & TORQUE', codigo: 'FMDS-MONT', detalhe: 'Linhas de Subconjuntos Estruturais', ativo: true },
        { id: `${tenantId}-area-6`, tenant_id: tenantId, tipo: 'area_fabril', nome: 'LOGÍSTICA INTERNA & EXPEDIÇÃO', codigo: 'FMDS-LOG', detalhe: 'Kitting, Sequenciamento e Embarque', ativo: true },

        // MH Lean & Soluções — Postos de Trabalho
        { id: `${tenantId}-posto-1`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'POSTO 04 - SOLDA PONTO ROBOTIZADA', detalhe: 'SOLDA 2 - CEL. TOYOTA', ativo: true },
        { id: `${tenantId}-posto-2`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'POSTO 02 - PRENSA TRANSFER LINHA B', detalhe: 'ESTAMPARIA TANDEM & PROGRESSIVA', ativo: true },
        { id: `${tenantId}-posto-3`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'CABINE 01 - PINTURA CATAFORÉTICA', detalhe: 'PINTURA E-COAT & ACABAMENTO', ativo: true },
        { id: `${tenantId}-posto-4`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'CENTRO CNC 03 - FURAÇÃO DE PRECISÃO', detalhe: 'USINAGEM & CONFORMAÇÃO CNC', ativo: true },
        { id: `${tenantId}-posto-5`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'ESTAÇÃO 06 - APERTO ELETRÔNICO M10', detalhe: 'MONTAGEM FINAL & TORQUE', ativo: true },
        { id: `${tenantId}-posto-6`, tenant_id: tenantId, tipo: 'posto_trabalho', nome: 'DOCA 02 - EXPEDIÇÃO SEQUENCIADA JIT', detalhe: 'LOGÍSTICA INTERNA & EXPEDIÇÃO', ativo: true },

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

  // Demais listas de opções (usadas e não usadas no formulário) para que os admins possam incluir, editar ou excluir qualquer opção
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
    { id: `${tenantId}-pdet-1`, tenant_id: tenantId, tipo: 'possivel_detectar', nome: 'Sim', codigo: 'SIM', detalhe: 'Sim (Falha de Inspeção / Padrão)', ativo: true },
    { id: `${tenantId}-pdet-2`, tenant_id: tenantId, tipo: 'possivel_detectar', nome: 'Não', codigo: 'NAO', detalhe: 'Não (Defeito Latente / Oculto)', ativo: true },

    // Abrir 8D
    { id: `${tenantId}-ab8d-1`, tenant_id: tenantId, tipo: 'abrir_8d', nome: 'Sim', codigo: '8D-SIM', detalhe: 'Exige análise de causa raiz 8D completa', ativo: true },
    { id: `${tenantId}-ab8d-2`, tenant_id: tenantId, tipo: 'abrir_8d', nome: 'Não', codigo: '8D-NAO', detalhe: 'Apenas contenção e registro rápido', ativo: true },

    // Listas de Opções de Sistema / Fora do Formulário Inicial (Editáveis pelo Admin)
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
    { id: `${tenantId}-forn-4`, tenant_id: tenantId, tipo: 'origem_fornecedor', nome: 'PPG INDUSTRIAL — Químicos E-Coat', codigo: 'FORN-04', detalhe: 'Tratamento Superficial', ativo: true }
  ];

  return [...baseItems, ...commonOptionItems];
}

// ============================================================================
// CONFIGURAÇÃO PADRÃO DOS CAMPOS DO FORMULÁRIO RNC POR EMPRESA (TENANT)
// Permite aos Admins: Ocultar, Mudar Sequência, Editar, Excluir e Criar Campos Novos
// ============================================================================
export function getDefaultFormFieldsForTenant(tenantId: string): FormFieldConfig[] {
  const rawFields: Omit<FormFieldConfig, 'fieldKey'>[] = [
    // SEÇÃO 1: Dados Gerais & Montadora
    {
      id: 'cliente',
      key: 'cliente',
      tenant_id: tenantId,
      label: 'Cliente (Montadora)',
      section: 'secao_1',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'cliente_montadora',
      placeholder: '-- Selecione a Montadora --',
      colSpan: 1
    },
    {
      id: 'tipoRnc',
      key: 'tipoRnc',
      tenant_id: tenantId,
      label: 'Tipo de Ocorrência',
      section: 'secao_1',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      optionCategory: 'tipo_rnc',
      placeholder: '-- Selecione o Tipo --',
      colSpan: 1
    },
    {
      id: 'dataOcorrencia',
      key: 'dataOcorrencia',
      tenant_id: tenantId,
      label: 'Data da Ocorrência',
      section: 'secao_1',
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
      type: 'select',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'turno',
      placeholder: 'Selecione o turno...',
      colSpan: 1
    },
    {
      id: 'condicionaisTipoRnc',
      key: 'setorDeteccao',
      tenant_id: tenantId,
      label: 'Detalhes por Tipo (Setor de Detecção / Portal do Cliente / Impacto)',
      section: 'secao_1',
      type: 'text',
      required: true,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'setor_deteccao',
      placeholder: 'Ex: Linha de Solda, Estamparia, Montagem...',
      colSpan: 4
    },
    {
      id: 'participantesAtendimento',
      key: 'participantesAtendimento',
      tenant_id: tenantId,
      label: 'Participantes do Atendimento',
      section: 'secao_1',
      type: 'multiselect',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      placeholder: 'Clique para selecionar colaboradores da equipe...',
      colSpan: 4
    },

    // SEÇÃO 2: Peça, Posto & FMDS (Autopreenchimento ProEPS)
    {
      id: 'finalComponente',
      key: 'finalComponente',
      tenant_id: tenantId,
      label: 'Tipo de Peça Rastreada',
      section: 'secao_2',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'tipo_componente',
      placeholder: 'Selecione o tipo de componente...',
      colSpan: 1
    },
    {
      id: 'produto',
      key: 'produto',
      tenant_id: tenantId,
      label: 'Produto / Conjunto',
      section: 'secao_2',
      type: 'select',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      placeholder: '-- Selecione o Produto / Conjunto --',
      colSpan: 1
    },
    {
      id: 'componente',
      key: 'componente',
      tenant_id: tenantId,
      label: 'Componente',
      section: 'secao_2',
      type: 'select',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      placeholder: '-- Selecione o Componente --',
      colSpan: 1
    },
    {
      id: 'posto',
      key: 'posto',
      tenant_id: tenantId,
      label: 'Posto de Trabalho Cadastrado',
      section: 'secao_2',
      type: 'select',
      required: false,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'posto_trabalho',
      placeholder: '-- Selecione o Posto de Trabalho --',
      colSpan: 1
    },
    {
      id: 'fmds',
      key: 'fmds',
      tenant_id: tenantId,
      label: 'Área FMDS / Setor Fabril',
      section: 'secao_2',
      type: 'select',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'area_fabril',
      placeholder: '-- Selecione a Área FMDS --',
      colSpan: 2
    },
    {
      id: 'atributosPeca',
      key: 'atributosPeca',
      tenant_id: tenantId,
      label: 'Indicadores Técnicos da Peça (Carry Over, Co-produto, Segurança FMEA e Reincidência)',
      section: 'secao_2',
      type: 'yesno',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      colSpan: 3
    },

    // SEÇÃO 3: Descrição do Defeito, Quantidade & Rastreabilidade
    {
      id: 'modoFalha',
      key: 'modoFalha',
      tenant_id: tenantId,
      label: 'Classificação do Defeito (Modo de Falha)',
      section: 'secao_3',
      type: 'select',
      required: true,
      visible: true,
      order: 1,
      isSystem: true,
      optionCategory: 'cat_defeito',
      placeholder: '-- Selecione o Modo de Falha --',
      colSpan: 1
    },
    {
      id: 'descricaoProblema',
      key: 'descricaoProblema',
      tenant_id: tenantId,
      label: 'Detalhamento Técnico da Não Conformidade',
      section: 'secao_3',
      type: 'textarea',
      required: true,
      visible: true,
      order: 2,
      isSystem: true,
      placeholder: 'Descreva aqui o detalhamento técnico do problema...',
      colSpan: 2
    },
    {
      id: 'quantidadeAfetada',
      key: 'quantidadeAfetada',
      tenant_id: tenantId,
      label: 'Quantidade Não Conforme',
      section: 'secao_3',
      type: 'number',
      required: true,
      visible: true,
      order: 3,
      isSystem: true,
      placeholder: 'Ex: 1, 5, 10...',
      colSpan: 1
    },
    {
      id: 'documentoRastreabilidade',
      key: 'documentoRastreabilidade',
      tenant_id: tenantId,
      label: 'Documento e Código / Período de Rastreabilidade',
      section: 'secao_3',
      type: 'select',
      required: true,
      visible: true,
      order: 4,
      isSystem: true,
      optionCategory: 'doc_rastreabilidade',
      placeholder: 'Selecione o documento...',
      colSpan: 4
    },

    // SEÇÃO 4: Evidência Fotográfica da Peça Não Conforme (NG)
    {
      id: 'fotoPecaNg',
      key: 'fotoPecaNg',
      tenant_id: tenantId,
      label: 'Evidência da Peça Defeituosa (NG)',
      section: 'secao_4',
      type: 'photo',
      required: false,
      visible: true,
      order: 1,
      isSystem: true,
      colSpan: 4
    },

    // SEÇÃO 5: Contenção & Tratativa da Qualidade (5W2H)
    {
      id: 'fotoPecaOk',
      key: 'fotoPecaOk',
      tenant_id: tenantId,
      label: 'Foto da Peça OK (Padrão de Referência / Aceitável)',
      section: 'secao_5',
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
      type: 'multiselect',
      required: false,
      visible: true,
      order: 3,
      isSystem: true,
      optionCategory: 'acoes_contencao',
      placeholder: 'Ou digite detalhes complementares das ações de contenção...',
      colSpan: 4
    },
    {
      id: 'recomendacoesProvidencias',
      key: 'recomendacoesProvidencias',
      tenant_id: tenantId,
      label: 'Recomendações / Providências',
      section: 'secao_5',
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
      type: 'select',
      required: false,
      visible: true,
      order: 5,
      isSystem: true,
      optionCategory: 'gravidade',
      colSpan: 1
    },
    {
      id: 'possivelDetectar',
      key: 'possivelDetectar',
      tenant_id: tenantId,
      label: 'Detecção no Processo?',
      section: 'secao_5',
      type: 'select',
      required: false,
      visible: true,
      order: 6,
      isSystem: true,
      optionCategory: 'possivel_detectar',
      colSpan: 1
    },
    {
      id: 'qtdInspecionada',
      key: 'qtdInspecionada',
      tenant_id: tenantId,
      label: 'Qtd Inspecionada',
      section: 'secao_5',
      type: 'number',
      required: false,
      visible: true,
      order: 7,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'qtdSuspeita',
      key: 'qtdSuspeita',
      tenant_id: tenantId,
      label: 'Qtd Suspeita',
      section: 'secao_5',
      type: 'number',
      required: false,
      visible: true,
      order: 8,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'qtdBloqueada',
      key: 'qtdBloqueada',
      tenant_id: tenantId,
      label: 'Qtd Bloqueada',
      section: 'secao_5',
      type: 'number',
      required: false,
      visible: true,
      order: 9,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'oQueFazer',
      key: 'oQueFazer',
      tenant_id: tenantId,
      label: '5W2H — O que fazer?',
      section: 'secao_5',
      type: 'textarea',
      required: false,
      visible: true,
      order: 10,
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
      type: 'textarea',
      required: false,
      visible: true,
      order: 11,
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
      type: 'textarea',
      required: false,
      visible: true,
      order: 12,
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
      type: 'date',
      required: false,
      visible: true,
      order: 13,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'ondeFara',
      key: 'ondeFara',
      tenant_id: tenantId,
      label: '5W2H — Onde fazer?',
      section: 'secao_5',
      type: 'text',
      required: false,
      visible: true,
      order: 14,
      isSystem: true,
      placeholder: 'Ex: Linha 3 / Posto de inspeção...',
      colSpan: 1
    },
    {
      id: 'quemFara',
      key: 'quemFara',
      tenant_id: tenantId,
      label: 'Equipe Responsável pelo 8D',
      section: 'secao_5',
      type: 'select',
      required: false,
      visible: true,
      order: 15,
      isSystem: true,
      placeholder: 'Selecione o responsável...',
      colSpan: 1
    },
    {
      id: 'fotoAuxiliar',
      key: 'fotoAuxiliar',
      tenant_id: tenantId,
      label: 'Foto Auxiliar Retrabalho / Seleção',
      section: 'secao_5',
      type: 'photo',
      required: false,
      visible: true,
      order: 16,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'dataContencao',
      key: 'dataContencao',
      tenant_id: tenantId,
      label: 'Data Final de Contenção',
      section: 'secao_5',
      type: 'date',
      required: false,
      visible: true,
      order: 17,
      isSystem: true,
      colSpan: 1
    },
    {
      id: 'abrir8D',
      key: 'abrir8D',
      tenant_id: tenantId,
      label: 'Abrir 8D',
      section: 'secao_5',
      type: 'select',
      required: false,
      visible: true,
      order: 18,
      isSystem: true,
      optionCategory: 'abrir_8d',
      colSpan: 1
    }
  ];
  return rawFields.map(f => ({ ...f, fieldKey: f.key }));
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

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  private ensureTenantSchemasInitialized(tenantId: string) {
    // 1. Garante categorias de opções para a empresa
    const existingCats = this.optionCategories.filter(c => c.tenant_id === tenantId);
    const defaultCats = getDefaultOptionCategoriesForTenant(tenantId);
    for (const defCat of defaultCats) {
      if (!existingCats.some(c => c.id === defCat.id)) {
        this.optionCategories.push(defCat);
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

    // 3. Garante campos do formulário para a empresa
    const existingFields = this.formFields.filter(f => f.tenant_id === tenantId);
    if (existingFields.length === 0) {
      this.formFields.push(...getDefaultFormFieldsForTenant(tenantId));
    } else {
      const defaultFields = getDefaultFormFieldsForTenant(tenantId);
      for (const defField of defaultFields) {
        if (!existingFields.some(f => f.id === defField.id)) {
          this.formFields.push(defField);
        }
      }
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
      this.masterData = rawMaster ? JSON.parse(rawMaster) : [...INITIAL_MASTER_DATA];

      const rawOptCats = localStorage.getItem('sor_saas_option_cats_v1');
      this.optionCategories = rawOptCats ? JSON.parse(rawOptCats) : [];

      const rawFormFields = localStorage.getItem('sor_saas_form_fields_v1');
      this.formFields = rawFormFields ? JSON.parse(rawFormFields) : [];

      this.tenants.forEach(t => {
        this.ensureTenantSchemasInitialized(t.id);
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

      this.saveToLocalStorage();
    } catch (e) {
      console.warn('[SaaS] Erro ao carregar store multi-tenant local, restaurando padrões:', e);
      this.tenants = [...INITIAL_TENANTS];
      this.users = [...INITIAL_SAAS_USERS];
      this.masterData = [...INITIAL_MASTER_DATA];
      this.optionCategories = [];
      this.formFields = [];
      this.tenants.forEach(t => this.ensureTenantSchemasInitialized(t.id));
      this.historicoAcoes = [...INITIAL_HISTORICO_ACOES];
      this.rncSeqByTenant = {
        [PILOT_TENANT_ID]: 10,
        [SECONDARY_TENANT_ID]: 1
      };
      this.activeTenantId = PILOT_TENANT_ID;
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('sor_saas_tenants_v1', JSON.stringify(this.tenants));
      localStorage.setItem('sor_saas_users_v1', JSON.stringify(this.users));
      localStorage.setItem('sor_saas_master_v1', JSON.stringify(this.masterData));
      localStorage.setItem('sor_saas_option_cats_v1', JSON.stringify(this.optionCategories));
      localStorage.setItem('sor_saas_form_fields_v1', JSON.stringify(this.formFields));
      localStorage.setItem('sor_saas_historico_v2', JSON.stringify(this.historicoAcoes));
      localStorage.setItem('sor_saas_rnc_seq_v2', JSON.stringify(this.rncSeqByTenant));
      localStorage.setItem('sor_saas_active_tenant_id', this.activeTenantId);
      localStorage.setItem('sor_saas_impersonating', String(this.impersonatingFromSuperAdmin));
      if (this.authenticatedUser?.email) {
        localStorage.setItem('sor_saas_auth_email', this.authenticatedUser.email);
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
      this.activeTenantId = found.id;
      this.applyTenantThemeToDOM(found);
      this.saveToLocalStorage();
      this.notifyListeners();
    }
    return found;
  }

  public setActiveTenantById(tenantId: string): TenantRecord | undefined {
    const found = this.getTenantById(tenantId);
    if (found) {
      this.activeTenantId = found.id;
      this.applyTenantThemeToDOM(found);
      this.saveToLocalStorage();
      this.notifyListeners();
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

    // Prioriza usuário vinculado a uma empresa (ex: Admin de MH Lean & Soluções)
    const foundUser =
      this.users.find(
        u =>
          (u.email || '').trim().toLowerCase() === cleanEmail &&
          u.ativo !== false &&
          u.papel !== 'super_admin'
      ) ||
      this.users.find(
        u => (u.email || '').trim().toLowerCase() === cleanEmail && u.ativo !== false
      );

    if (!foundUser) {
      return {
        success: false,
        message: 'E-mail não localizado na base de usuários ativos da plataforma MH Qualidade.'
      };
    }

    if (foundUser.senha && foundUser.senha !== senhaInput) {
      return {
        success: false,
        message: 'Credenciais inválidas. Verifique sua senha de acesso.'
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
        roleBadge: 'ADMIN PADRÃO',
        tenantName: 'MH Lean & Soluções',
        tenantSlug: 'mh-lean-solucoes',
        email: 'mhsolucoes@adimin.com.br',
        senha: '123',
        accentColor: '#0b5796'
      },
      {
        label: 'Console MH Qualidade Super Admin',
        roleBadge: 'MH QUALIDADE',
        tenantName: 'Console Global MH Qualidade',
        tenantSlug: 'super-admin',
        email: 'mhsolucoes@adimin.com.br',
        senha: '123',
        isSuperAdmin: true,
        accentColor: '#0f172a'
      },
      {
        label: 'Carlos Eduardo (Eng. Qualidade)',
        roleBadge: 'QUALIDADE 8D',
        tenantName: 'MH Lean & Soluções',
        tenantSlug: 'mh-lean-solucoes',
        email: 'qualidade@mhleansolucoes.com.br',
        senha: '123',
        accentColor: '#0284c7'
      },
      {
        label: 'Marcos Vinicius (Operador Fabril)',
        roleBadge: 'OPERADOR',
        tenantName: 'MH Lean & Soluções',
        tenantSlug: 'mh-lean-solucoes',
        email: 'operador@mhleansolucoes.com.br',
        senha: '123',
        accentColor: '#475569'
      },
      {
        label: 'Ricardo Prado (Tenant 2 Isolado)',
        roleBadge: 'ADMIN TENANT 2',
        tenantName: 'Metalúrgica Vale',
        tenantSlug: 'metalurgica-vale',
        email: 'admin@metalurgicavale.com.br',
        senha: '123',
        accentColor: '#0f766e'
      }
    ];

    if (filterSlug) {
      const clean = filterSlug.toLowerCase();
      return allProfiles.filter(p => p.tenantSlug === clean || p.isSuperAdmin);
    }
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
  // CADASTROS MESTRES, LISTAS DE OPÇÕES E USUÁRIOS ISOLADOS POR TENANT
  // ============================================================================
  public getUsersForTenant(tenantId?: string): UsuarioQualidade[] {
    const targetId = tenantId || this.activeTenantId;
    return this.users.filter(u => u.tenant_id === targetId);
  }

  public saveUserForTenant(user: Partial<UsuarioQualidade>, tenantId?: string): {
    success: boolean;
    message: string;
    user?: UsuarioQualidade;
  } {
    const targetTenantId = tenantId || this.activeTenantId;
    const tenant = this.getTenantById(targetTenantId);
    const currentTenantUsers = this.getUsersForTenant(targetTenantId);

    if (!user.id && tenant && currentTenantUsers.length >= tenant.limites.max_usuarios) {
      return {
        success: false,
        message: `Limite máximo de usuários atingido para ${tenant.nome} (${tenant.limites.max_usuarios} usuários).`
      };
    }

    if (user.id) {
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        this.users[idx] = { ...this.users[idx], ...user, tenant_id: targetTenantId } as UsuarioQualidade;
        this.saveToLocalStorage();
        this.notifyListeners();
        return { success: true, message: 'Usuário atualizado com sucesso.', user: this.users[idx] };
      }
    }

    const nextId = this.users.reduce((max, u) => (u.id > max ? u.id : max), 100) + 1;
    const roleMap: Record<string, SaaSUserRole> = {
      Admin: 'admin_empresa',
      Adminqual: 'qualidade',
      Liderqual: 'qualidade',
      Inspqual: 'qualidade',
      User: 'operador'
    };

    const newUser: UsuarioQualidade = {
      id: nextId,
      tenant_id: targetTenantId,
      papel: user.papel || roleMap[user.perfil || 'User'] || 'operador',
      ativo: true,
      nome: user.nome || 'Novo Colaborador',
      reAcesso: user.reAcesso || 10000 + nextId,
      perfil: user.perfil || 'User',
      senha: user.senha || '123',
      email: user.email || `colaborador${nextId}@${tenant?.slug || 'empresa'}.com.br`,
      cargo: user.cargo || 'Analista da Qualidade',
      setor: user.setor || 'Qualidade'
    };

    this.users.push(newUser);
    this.saveToLocalStorage();
    this.notifyListeners();
    return { success: true, message: 'Novo usuário cadastrado na empresa.', user: newUser };
  }

  public deleteUserForTenant(userId: number): boolean {
    this.users = this.users.filter(u => u.id !== userId);
    this.saveToLocalStorage();
    this.notifyListeners();
    return true;
  }

  // Categorias de Opções (usadas e não usadas no formulário)
  public getOptionCategories(tenantId?: string): OptionCategoryMeta[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    return this.optionCategories
      .filter(c => c.tenant_id === targetId)
      .map(c => ({
        ...c,
        title: c.title || c.nome,
        description: c.description || c.descricao,
        usedInForm: c.usedInForm ?? c.usadoNoFormulario,
        formFieldTarget: c.formFieldTarget || c.campoVinculado
      }));
  }

  public saveOptionCategory(
    cat: Partial<OptionCategoryMeta>,
    tenantId?: string
  ): OptionCategoryMeta {
    const targetId = tenantId || this.activeTenantId;
    const cleanNome = (cat.nome || cat.title || '').trim();
    const cleanDesc = (cat.descricao || cat.description || 'Lista de opções personalizada da empresa.').trim();
    const usedInForm = cat.usadoNoFormulario ?? cat.usedInForm ?? false;
    const campoVinculado = cat.campoVinculado || cat.formFieldTarget;

    if (cat.id) {
      const idx = this.optionCategories.findIndex(c => c.id === cat.id && c.tenant_id === targetId);
      if (idx >= 0) {
        this.optionCategories[idx] = {
          ...this.optionCategories[idx],
          ...cat,
          nome: cleanNome,
          title: cleanNome,
          descricao: cleanDesc,
          description: cleanDesc,
          usadoNoFormulario: usedInForm,
          usedInForm,
          campoVinculado,
          formFieldTarget: campoVinculado
        };
        this.saveToLocalStorage();
        this.notifyListeners();
        return this.optionCategories[idx];
      }
    }

    const cleanId =
      cat.id ||
      `cat_${cleanNome
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
      usadoNoFormulario: Boolean(usedInForm),
      usedInForm: Boolean(usedInForm),
      campoVinculado,
      formFieldTarget: campoVinculado,
      isSystem: false
    };

    this.optionCategories.push(newCat);
    this.saveToLocalStorage();
    this.notifyListeners();
    return newCat;
  }

  public deleteOptionCategory(catId: string, tenantId?: string): { success: boolean; message: string } {
    const targetId = tenantId || this.activeTenantId;
    const found = this.optionCategories.find(c => c.id === catId && c.tenant_id === targetId);
    if (!found) {
      return { success: false, message: 'Categoria não encontrada.' };
    }
    this.optionCategories = this.optionCategories.filter(
      c => !(c.id === catId && c.tenant_id === targetId)
    );
    this.masterData = this.masterData.filter(
      m => !(m.tipo === catId && m.tenant_id === targetId)
    );
    this.saveToLocalStorage();
    this.notifyListeners();
    return { success: true, message: `Lista de opções "${found.nome}" excluída com sucesso.` };
  }

  // Itens de Opções (Incluir, Editar, Excluir)
  public getMasterData(
    tipo?: MasterDataCategory,
    tenantId?: string
  ): MasterDataItem[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    return this.masterData.filter(
      m => m.tenant_id === targetId && (!tipo || m.tipo === tipo)
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
    if (item.id) {
      const idx = this.masterData.findIndex(m => m.id === item.id && m.tenant_id === targetId);
      if (idx >= 0) {
        this.masterData[idx] = {
          ...this.masterData[idx],
          ...item,
          nome: item.nome.trim(),
          codigo: item.codigo !== undefined ? item.codigo.trim() : this.masterData[idx].codigo,
          detalhe: item.detalhe !== undefined ? item.detalhe.trim() : this.masterData[idx].detalhe
        };
        this.saveToLocalStorage();
        this.notifyListeners();
        return this.masterData[idx];
      }
    }

    const newItem: MasterDataItem = {
      id: `${targetId}-${item.tipo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenant_id: targetId,
      tipo: item.tipo,
      nome: item.nome.trim(),
      codigo: item.codigo?.trim() || '',
      detalhe: item.detalhe?.trim() || '',
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
  // GERENCIADOR DE CAMPOS DO FORMULÁRIO RNC (OCULTAR, SEQUÊNCIA, CRIAR, EDITAR, EXCLUIR)
  // ============================================================================
  public getFormFields(tenantId?: string, includeDeleted = false): FormFieldConfig[] {
    const targetId = tenantId || this.activeTenantId;
    this.ensureTenantSchemasInitialized(targetId);
    return this.formFields
      .filter(f => f.tenant_id === targetId && (includeDeleted || !f.deleted))
      .map(f => ({
        ...f,
        fieldKey: f.fieldKey || f.key
      }))
      .sort((a, b) => {
        if (a.section !== b.section) return a.section.localeCompare(b.section);
        return a.order - b.order;
      });
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

    if (fieldInput.id) {
      const idx = this.formFields.findIndex(
        f => f.id === fieldInput.id && f.tenant_id === targetId
      );
      if (idx >= 0) {
        const resolvedKey = fieldInput.key || fieldInput.fieldKey || this.formFields[idx].key;
        this.formFields[idx] = {
          ...this.formFields[idx],
          ...fieldInput,
          key: resolvedKey,
          fieldKey: resolvedKey,
          label: fieldInput.label.trim(),
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

    const newField: FormFieldConfig = {
      id: slugKey,
      key: slugKey,
      fieldKey: slugKey,
      tenant_id: targetId,
      label: fieldInput.label.trim(),
      section: fieldInput.section,
      type: fieldInput.type,
      required: Boolean(fieldInput.required),
      visible: fieldInput.visible !== undefined ? fieldInput.visible : true,
      deleted: false,
      order: fieldInput.order !== undefined ? fieldInput.order : maxOrder + 1,
      isSystem: false,
      optionCategory,
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

  public resetFormFieldsToDefault(tenantId?: string) {
    const targetId = tenantId || this.activeTenantId;
    this.formFields = this.formFields.filter(f => f.tenant_id !== targetId);
    this.formFields.push(...getDefaultFormFieldsForTenant(targetId));
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
    return [...PILOT_GPM_RNCS, ...SECONDARY_VALE_RNCS];
  }

  public getInitialTreinamentosForSeed(): RegistroTreinamento[] {
    return [...INITIAL_SAAS_TREINAMENTOS];
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
