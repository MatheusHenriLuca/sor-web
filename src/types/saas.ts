// ============================================================================
// Tipos e Interfaces: Módulo SaaS Multi-Tenant (SOR Web)
// ============================================================================

export type TenantStatus = 'ativo' | 'suspenso' | 'cancelado' | 'em_implantacao';

export type TenantUserRole = 
  | 'super_admin'       // Dono/Administrador da plataforma SaaS (visão global)
  | 'admin_empresa'      // Gestor da Qualidade da empresa contratante (administra sua empresa)
  | 'qualidade'          // Analista / Engenheiro da Qualidade
  | 'inspetor'           // Inspetor de Linha / Auditor
  | 'operador'           // Operador de Chão de Fábrica (apenas registro / consulta)
  | 'visualizador';      // Acesso somente leitura

export interface TenantCustomization {
  nomeExibicao: string;
  subtitulo?: string;
  logoUrl?: string;
  corPrimaria: string;         // Ex: '#0f6cbd' ou '#b91c1c'
  corSecundaria?: string;      // Ex: '#0b5796'
  bannerUrl?: string;
  mensagemAlerta?: string;     // Mensagem padrão no topo dos Alertas
}

export interface TenantLimits {
  maxUsuarios: number;         // Limite de contas ativas (ex: 20)
  maxStorageMb: number;        // Cota de armazenamento de fotos (ex: 1000 MB)
  maxRncsMes?: number;         // Opcional: limite de RNCs abertas por mês
  modulosHabilitados: {
    rnc8D: boolean;
    alertaQualidade: boolean;
    rastreabilidade: boolean;
    protecaoCliente: boolean;
    falhaEntrega: boolean;
    matrizTreinamentos: boolean;
  };
}

export interface Tenant {
  id: string;                  // UUID
  nome: string;                // Razão Social / Nome Fantasia
  slug: string;                // Identificador único na URL (ex: 'gpm-servicos')
  cnpjContato?: string;
  emailContato?: string;
  telefoneContato?: string;
  status: TenantStatus;
  customizacao: TenantCustomization;
  limites: TenantLimits;
  createdAt: string;
  updatedAt?: string;
  // Métricas calculadas para o Super Admin
  stats?: {
    totalRncs: number;
    totalUsuarios: number;
    storageUsadoMb: number;
  };
}

export interface TenantUser {
  id: string;                  // UUID ou identificador
  tenantId: string;            // UUID do Tenant
  email: string;
  nome: string;
  reAcesso: number;            // Registro de Empregado / Matrícula
  cargo?: string;
  setor?: string;
  papel: TenantUserRole;
  ativo: boolean;
  ultimoAcesso?: string;
}

export interface TenantMasterData {
  tenantId: string;
  montadoras: string[];        // Lista de clientes/montadoras da empresa
  linhasFabris: string[];      // Lista de linhas/FMDS da fábrica
  postosTrabalho: string[];    // Lista de postos/estações
  modosFalha: string[];        // Catálogo de defeitos padronizados
  tiposRnc: string[];          // 'Formal', 'Informal', etc.
}
