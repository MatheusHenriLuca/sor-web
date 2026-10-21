import { Tenant, TenantMasterData, TenantUser, RNCRecord } from '../types';
import { GPM_TENANT_ID, GPM_PILOT_RNCS } from '../constants/gpmPilotRncs';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY_TENANTS = 'sor_saas_tenants_v1';
const STORAGE_KEY_ACTIVE_SLUG = 'sor_saas_active_slug_v1';
const STORAGE_KEY_MASTERS_PREFIX = 'sor_saas_masters_';
const STORAGE_KEY_RNCS_PREFIX = 'sor_saas_rncs_';

// Tenants Padrão Iniciais
const INITIAL_TENANTS: Tenant[] = [
  {
    id: GPM_TENANT_ID,
    nome: 'GPM Serviços Industriais',
    slug: 'gpm-servicos',
    cnpjContato: '12.345.678/0001-90',
    emailContato: 'qualidade@gpmservicos.com.br',
    telefoneContato: '(11) 4589-9000',
    status: 'ativo',
    customizacao: {
      nomeExibicao: 'GPM Serviços - Gestão da Qualidade',
      subtitulo: 'Sistema Integrado de Tratativa de RNC & Alerta Operacional 8D',
      logoUrl: '',
      corPrimaria: '#0f6cbd',
      corSecundaria: '#0b5796',
      mensagemAlerta: 'Atenção: Instrução de Contenção Operacional GPM Serviços Ativa'
    },
    limites: {
      maxUsuarios: 25,
      maxStorageMb: 1000,
      modulosHabilitados: {
        rnc8D: true,
        alertaQualidade: true,
        rastreabilidade: true,
        protecaoCliente: true,
        falhaEntrega: true,
        matrizTreinamentos: true
      }
    },
    createdAt: '2026-10-01T08:00:00Z',
    stats: {
      totalRncs: 10,
      totalUsuarios: 8,
      storageUsadoMb: 14.5
    }
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nome: 'Gestamp Brasil',
    slug: 'gestamp-brasil',
    cnpjContato: '60.450.880/0001-44',
    emailContato: 'qualidade@gestamp.com',
    telefoneContato: '(11) 4613-8000',
    status: 'ativo',
    customizacao: {
      nomeExibicao: 'Gestamp Brasil - Qualidade Assegurada',
      subtitulo: 'Gestão 8D & Ocorrências Fabris',
      logoUrl: '',
      corPrimaria: '#0284c7',
      corSecundaria: '#0369a1',
      mensagemAlerta: 'Alerta da Qualidade - Contenção Operacional Ativa'
    },
    limites: {
      maxUsuarios: 100,
      maxStorageMb: 5000,
      modulosHabilitados: {
        rnc8D: true,
        alertaQualidade: true,
        rastreabilidade: true,
        protecaoCliente: true,
        falhaEntrega: true,
        matrizTreinamentos: true
      }
    },
    createdAt: '2026-09-15T10:00:00Z',
    stats: {
      totalRncs: 45,
      totalUsuarios: 34,
      storageUsadoMb: 48.2
    }
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    nome: 'Metalúrgica Progresso Auto',
    slug: 'progresso-auto',
    cnpjContato: '45.120.900/0001-12',
    emailContato: 'contato@progressoauto.ind.br',
    telefoneContato: '(19) 3880-1200',
    status: 'em_implantacao',
    customizacao: {
      nomeExibicao: 'Progresso Auto - Qualidade',
      subtitulo: 'Portal de Gestão de Não Conformidades',
      logoUrl: '',
      corPrimaria: '#16a34a',
      corSecundaria: '#15803d',
      mensagemAlerta: 'Instrução Operacional Interna'
    },
    limites: {
      maxUsuarios: 15,
      maxStorageMb: 500,
      modulosHabilitados: {
        rnc8D: true,
        alertaQualidade: true,
        rastreabilidade: true,
        protecaoCliente: false,
        falhaEntrega: false,
        matrizTreinamentos: true
      }
    },
    createdAt: '2026-10-15T14:30:00Z',
    stats: {
      totalRncs: 0,
      totalUsuarios: 2,
      storageUsadoMb: 0.0
    }
  }
];

class TenantStore {
  private tenants: Tenant[] = [];
  private activeTenantSlug: string = 'gpm-servicos';

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      // 1. Carregar lista de tenants
      const savedTenants = localStorage.getItem(STORAGE_KEY_TENANTS);
      if (savedTenants) {
        this.tenants = JSON.parse(savedTenants);
      } else {
        this.tenants = [...INITIAL_TENANTS];
        this.persistTenants();
      }

      // 2. Resolver slug inicial a partir da URL
      const pathSlug = this.extractSlugFromUrl();
      const savedActiveSlug = localStorage.getItem(STORAGE_KEY_ACTIVE_SLUG);
      this.activeTenantSlug = pathSlug || savedActiveSlug || 'gpm-servicos';

      // 3. Inicializar dados do tenant piloto GPM se não existirem
      this.initGpmPilotRncs();
    } catch (e) {
      console.error('[TenantStore] Erro ao inicializar store:', e);
      this.tenants = [...INITIAL_TENANTS];
    }
  }

  private extractSlugFromUrl(): string | null {
    if (typeof window === 'undefined') return null;

    // Verificar se veio via query param: ?tenant=slug
    const urlParams = new URLSearchParams(window.location.search);
    const querySlug = urlParams.get('tenant') || urlParams.get('slug');
    if (querySlug) return querySlug.toLowerCase();

    // Verificar primeiro segmento de path: /gpm-servicos/...
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const candidate = pathParts[0].toLowerCase();
      // Ignorar rotas de sistema conhecidas
      if (!['super-admin', 'admin', 'login', 'api', 'assets'].includes(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private persistTenants() {
    try {
      localStorage.setItem(STORAGE_KEY_TENANTS, JSON.stringify(this.tenants));
    } catch (e) {
      console.error('[TenantStore] Erro ao persistir tenants:', e);
    }
  }

  private initGpmPilotRncs() {
    const gpmKey = `${STORAGE_KEY_RNCS_PREFIX}${GPM_TENANT_ID}`;
    const existing = localStorage.getItem(gpmKey);
    if (!existing) {
      localStorage.setItem(gpmKey, JSON.stringify(GPM_PILOT_RNCS));
    }
  }

  // ==========================================================================
  // OPERAÇÕES DO SUPER ADMIN (GESTÃO DE TENANTS)
  // ==========================================================================

  public getTenants(): Tenant[] {
    return [...this.tenants];
  }

  public getTenantBySlug(slug: string): Tenant | undefined {
    return this.tenants.find(t => t.slug.toLowerCase() === slug.toLowerCase());
  }

  public getTenantById(id: string): Tenant | undefined {
    return this.tenants.find(t => t.id === id);
  }

  public createTenant(newTenant: Omit<Tenant, 'id' | 'createdAt' | 'stats'>): Tenant {
    const tenant: Tenant = {
      ...newTenant,
      id: crypto.randomUUID(),
      slug: newTenant.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      createdAt: new Date().toISOString(),
      stats: {
        totalRncs: 0,
        totalUsuarios: 1,
        storageUsadoMb: 0.0
      }
    };

    this.tenants.unshift(tenant);
    this.persistTenants();

    // Inicializar cadastros mestres padrão para a nova empresa
    this.saveTenantMasterData(tenant.id, {
      tenantId: tenant.id,
      montadoras: ['Cliente Principal A', 'Cliente B', 'Montadora Parceira'],
      linhasFabris: ['Linha 01 - Produção', 'Linha 02 - Montagem', 'Linha 03 - Acabamento'],
      postosTrabalho: ['Posto 01', 'Posto 02', 'Inspeção Final'],
      modosFalha: ['Trinca', 'Rebarba', 'Desvio Dimensional', 'Falta de Componente', 'Arranhão / Deformação'],
      tiposRnc: ['Formal', 'Informal', 'Interno']
    });

    return tenant;
  }

  public updateTenant(id: string, updates: Partial<Tenant>): Tenant | undefined {
    const index = this.tenants.findIndex(t => t.id === id);
    if (index === -1) return undefined;

    this.tenants[index] = {
      ...this.tenants[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.persistTenants();
    return this.tenants[index];
  }

  public setTenantStatus(id: string, status: Tenant['status']): boolean {
    const tenant = this.updateTenant(id, { status });
    return Boolean(tenant);
  }

  public deleteTenant(id: string): boolean {
    const prevLength = this.tenants.length;
    this.tenants = this.tenants.filter(t => t.id !== id);
    if (this.tenants.length < prevLength) {
      this.persistTenants();
      return true;
    }
    return false;
  }

  // ==========================================================================
  // OPERAÇÕES DO CONTEXTO ATIVO
  // ==========================================================================

  public getActiveTenant(): Tenant {
    const tenant = this.getTenantBySlug(this.activeTenantSlug);
    if (tenant) return tenant;

    // Fallback para GPM Serviços
    return this.tenants[0] || INITIAL_TENANTS[0];
  }

  public setActiveTenantSlug(slug: string) {
    const cleanSlug = slug.toLowerCase();
    const found = this.getTenantBySlug(cleanSlug);
    if (found) {
      this.activeTenantSlug = cleanSlug;
      localStorage.setItem(STORAGE_KEY_ACTIVE_SLUG, cleanSlug);

      // Injetar variáveis de cores no CSS root
      this.applyThemeColors(found.customizacao.corPrimaria);
    }
  }

  public applyThemeColors(primaryColor?: string) {
    if (typeof document === 'undefined') return;
    const color = primaryColor || '#0f6cbd';
    document.documentElement.style.setProperty('--brand-primary', color);
  }

  // ==========================================================================
  // CADASTROS MESTRES DA EMPRESA
  // ==========================================================================

  public getTenantMasterData(tenantId: string): TenantMasterData {
    const saved = localStorage.getItem(`${STORAGE_KEY_MASTERS_PREFIX}${tenantId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    // Padrão específico para GPM Serviços
    if (tenantId === GPM_TENANT_ID) {
      return {
        tenantId,
        montadoras: ['Volkswagen do Brasil', 'General Motors', 'Stellantis Betim', 'Renault Curitiba', 'Scania Latin America'],
        linhasFabris: ['Linha 01 - Estamparia Pesada', 'Linha 02 - Solda Robotizada 3D', 'Linha 03 - Montagem Final', 'Linha 04 - Pintura & E-coat'],
        postosTrabalho: ['OP-10 Prensa Transfer', 'OP-20 Célula Robotizada Solda', 'OP-30 Gabarito de Geometria', 'OP-40 Posto de Inspeção Visual', 'OP-50 Embalagem & Liberação'],
        modosFalha: [
          'Trinca no Ponto de Solda Robotizada',
          'Rebarba Cortante em Borda Estampada',
          'Desvio Dimensional de Furação e Ângulo',
          'Contaminação por Silicone em Pintura E-Coat',
          'Falha de Torque em Parafuso Estrutural',
          'Falta de Componente / Presilha de Retenção',
          'Porosidade em Solda MAG com Perda de Estanqueidade',
          'Arranhão / Deformação por Manuseio Logístico',
          'Etiqueta com Código Ilegível / Falha de Rastreabilidade',
          'Inversão de Posição de Montagem de Componente Simétrico'
        ],
        tiposRnc: ['Formal', 'Informal', 'Interno', 'Improcedente']
      };
    }

    return {
      tenantId,
      montadoras: ['Cliente A', 'Cliente B'],
      linhasFabris: ['Linha 1', 'Linha 2'],
      postosTrabalho: ['Posto 01', 'Posto 02'],
      modosFalha: ['Trinca', 'Rebarba', 'Desvio Dimensional'],
      tiposRnc: ['Formal', 'Informal', 'Interno']
    };
  }

  public saveTenantMasterData(tenantId: string, data: TenantMasterData) {
    try {
      localStorage.setItem(`${STORAGE_KEY_MASTERS_PREFIX}${tenantId}`, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  }

  // ==========================================================================
  // GESTÃO DE RNCS ISOLADAS POR TENANT
  // ==========================================================================

  public getTenantRncs(tenantId: string): RNCRecord[] {
    const key = `${STORAGE_KEY_RNCS_PREFIX}${tenantId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    if (tenantId === GPM_TENANT_ID) {
      return [...GPM_PILOT_RNCS];
    }

    return [];
  }

  public saveTenantRncs(tenantId: string, rncs: RNCRecord[]) {
    try {
      localStorage.setItem(`${STORAGE_KEY_RNCS_PREFIX}${tenantId}`, JSON.stringify(rncs));
      
      // Atualizar métricas do tenant
      const tenant = this.getTenantById(tenantId);
      if (tenant && tenant.stats) {
        tenant.stats.totalRncs = rncs.length;
        this.updateTenant(tenantId, { stats: tenant.stats });
      }
    } catch (e) {
      console.error(e);
    }
  }
}

export const tenantStore = new TenantStore();
