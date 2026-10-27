import React, { useState, useMemo } from 'react';
import {
  Building2,
  Users,
  FileText,
  HardDrive,
  Plus,
  Search,
  Eye,
  Edit3,
  Ban,
  CheckCircle2,
  Trash2,
  Database,
  Copy,
  Check,
  LogOut,
  Shield,
  X,
  ExternalLink,
  KeyRound,
  Lock,
  Unlock
} from 'lucide-react';
import { TenantRecord, TenantStatus, UsuarioQualidade, AppPermissionLevel } from '../types';
import { tenantService, PILOT_TENANT_ID } from '../services/tenantService';
import { spStore } from '../services/sharepointService';

interface SuperAdminViewProps {
  currentUser: UsuarioQualidade;
  onImpersonateTenant: (tenant: TenantRecord, impersonatedUser: UsuarioQualidade) => void;
  onLogout: () => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({
  currentUser,
  onImpersonateTenant,
  onLogout
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | TenantStatus>('todos');
  const [activeTab, setActiveTab] = useState<'tenants' | 'usuarios' | 'sql'>('tenants');
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Estado: Credenciais e Senha do Próprio Super Admin
  const superAdminRecord = useMemo(() => tenantService.getSuperAdminUser(), [refreshTick]);
  const [saNome, setSaNome] = useState(superAdminRecord.nome || 'Matheus Henrique de Luca');
  const [saEmail, setSaEmail] = useState(superAdminRecord.email || 'mhsolucoes@adimin.com.br');
  const [saRe, setSaRe] = useState<number>(superAdminRecord.reAcesso || 104235);
  const [saNovaSenha, setSaNovaSenha] = useState('');
  const [saConfirmarSenha, setSaConfirmarSenha] = useState('');

  // Estado: Gestão de Usuários / Administradores por Empresa dentro do Super Admin
  const [selectedTenantIdForUsers, setSelectedTenantIdForUsers] = useState<string>(PILOT_TENANT_ID);
  const [tenantUserModalOpen, setTenantUserModalOpen] = useState(false);
  const [tenantUserForm, setTenantUserForm] = useState<{
    id?: number;
    tenantId: string;
    nome: string;
    reAcesso: number;
    cargo: string;
    setor: string;
    email: string;
    exigeSenha: boolean;
    senha: string;
    nivelAcesso: AppPermissionLevel;
  }>({
    tenantId: PILOT_TENANT_ID,
    nome: '',
    reAcesso: 10001,
    cargo: 'Administrador Geral',
    setor: 'Gestão Corporativa',
    email: '',
    exigeSenha: true,
    senha: '123',
    nivelAcesso: 'Admin'
  });

  // Modal de Criar Nova Empresa
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newCor, setNewCor] = useState('#0b5796');
  const [newMaxUsers, setNewMaxUsers] = useState(100);
  const [newMaxStorage, setNewMaxStorage] = useState(2048);
  const [newAdminNome, setNewAdminNome] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminSenha, setNewAdminSenha] = useState('123');

  // Modal de Editar Empresa
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editCor, setEditCor] = useState('#0b5796');
  const [editMaxUsers, setEditMaxUsers] = useState(100);
  const [editMaxStorage, setEditMaxStorage] = useState(2048);

  const [copiedSql, setCopiedSql] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackToast({ type, text });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Lista de empresas enriquecida com métricas reais
  const tenantsWithMetrics = useMemo(() => {
    const allTenants = tenantService.getTenants();
    const allRncs = spStore.getAllRNCsGlobal();
    const allTrein = spStore.getAllTreinamentosGlobal();

    return allTenants.map(t => {
      const tenantUsers = tenantService.getUsersForTenant(t.id);
      const tenantRncs = allRncs.filter(r => (r.tenant_id || PILOT_TENANT_ID) === t.id);
      const openRncs = tenantRncs.filter(r => r.status !== 'Concluído');
      const tenantTrein = allTrein.filter(tr => (tr.tenant_id || PILOT_TENANT_ID) === t.id);

      return {
        tenant: t,
        usersCount: tenantUsers.length,
        rncsTotal: tenantRncs.length,
        rncsOpen: openRncs.length,
        treinamentosCount: tenantTrein.length,
        adminUser: tenantUsers.find(u => u.papel === 'admin_empresa' || u.perfil === 'Admin') || tenantUsers[0]
      };
    });
  }, [refreshTick]);

  const filteredTenants = useMemo(() => {
    return tenantsWithMetrics.filter(({ tenant }) => {
      if (statusFilter !== 'todos' && tenant.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        tenant.nome.toLowerCase().includes(q) ||
        tenant.slug.toLowerCase().includes(q) ||
        tenant.cnpj_contato.toLowerCase().includes(q)
      );
    });
  }, [tenantsWithMetrics, statusFilter, searchQuery]);

  // Indicadores Globais da Plataforma
  const globalStats = useMemo(() => {
    const totalTenants = tenantsWithMetrics.length;
    const activeTenants = tenantsWithMetrics.filter(x => x.tenant.status === 'ativo').length;
    const totalUsers = tenantsWithMetrics.reduce((acc, x) => acc + x.usersCount, 0);
    const totalRncs = tenantsWithMetrics.reduce((acc, x) => acc + x.rncsTotal, 0);
    const totalStorageMb =
      Math.round(
        tenantsWithMetrics.reduce((acc, x) => acc + (x.tenant.limites.storage_usado_mb || 0), 0) * 10
      ) / 10;

    return { totalTenants, activeTenants, totalUsers, totalRncs, totalStorageMb };
  }, [tenantsWithMetrics]);

  const handleAutoSlug = (val: string) => {
    setNewNome(val);
    const generated = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setNewSlug(generated);
    if (!newAdminEmail && generated) {
      setNewAdminEmail(`admin@${generated.replace(/-/g, '')}.com.br`);
    }
  };

  const handleCreateTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = tenantService.createTenant({
      nome: newNome,
      slug: newSlug,
      cnpj_contato: newCnpj,
      cor_primaria: newCor,
      max_usuarios: newMaxUsers,
      max_storage_mb: newMaxStorage,
      admin_nome: newAdminNome || `Gestor ${newNome}`,
      admin_email: newAdminEmail,
      admin_senha: newAdminSenha
    });

    if (!res.success) {
      showToast('error', res.message);
      return;
    }

    setCreateModalOpen(false);
    setNewNome('');
    setNewSlug('');
    setNewCnpj('');
    setNewAdminNome('');
    setNewAdminEmail('');
    setRefreshTick(prev => prev + 1);
    showToast('success', res.message);
  };

  const handleOpenEdit = (t: TenantRecord) => {
    setEditingTenant(t);
    setEditNome(t.nome);
    setEditCnpj(t.cnpj_contato);
    setEditCor(t.customizacao.cor_primaria);
    setEditMaxUsers(t.limites.max_usuarios);
    setEditMaxStorage(t.limites.max_storage_mb);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const res = tenantService.updateTenant(editingTenant.id, {
      nome: editNome,
      cnpj_contato: editCnpj,
      customizacao: {
        ...editingTenant.customizacao,
        cor_primaria: editCor,
        nome_exibicao: editNome
      },
      limites: {
        ...editingTenant.limites,
        max_usuarios: editMaxUsers,
        max_storage_mb: editMaxStorage
      }
    });

    setEditingTenant(null);
    setRefreshTick(prev => prev + 1);
    showToast(res.success ? 'success' : 'error', res.message);
  };

  const handleToggleStatus = (t: TenantRecord) => {
    const nextStatus: TenantStatus = t.status === 'ativo' ? 'suspenso' : 'ativo';
    const res = tenantService.updateTenant(t.id, { status: nextStatus });
    setRefreshTick(prev => prev + 1);
    showToast(
      res.success ? 'success' : 'error',
      `Status da empresa "${t.nome}" alterado para ${nextStatus.toUpperCase()}.`
    );
  };

  const handleDeleteTenant = (t: TenantRecord) => {
    const res = tenantService.deleteTenant(t.id);
    setRefreshTick(prev => prev + 1);
    showToast(res.success ? 'success' : 'error', res.message);
  };

  const handleImpersonate = (t: TenantRecord) => {
    const res = tenantService.startImpersonation(t.id);
    if (res.success && res.tenant && res.impersonatedUser) {
      onImpersonateTenant(res.tenant, res.impersonatedUser);
    } else if (res.message) {
      showToast('error', res.message);
    }
  };

  const handleSaveSuperAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (saNovaSenha.trim() && saNovaSenha.trim() !== saConfirmarSenha.trim()) {
      showToast('error', 'A confirmação da nova senha do Super Admin não confere.');
      return;
    }

    const res = tenantService.updateSuperAdminCredentials({
      nome: saNome.trim(),
      email: saEmail.trim(),
      reAcesso: Number(saRe),
      novaSenha: saNovaSenha.trim() || undefined
    });

    if (!res.success) {
      showToast('error', res.message);
      return;
    }

    setSaNovaSenha('');
    setSaConfirmarSenha('');
    setRefreshTick(prev => prev + 1);
    showToast('success', res.message);
  };

  const selectedTenantForUsers = useMemo(() => {
    const all = tenantService.getTenants();
    return all.find(t => t.id === selectedTenantIdForUsers) || all[0];
  }, [selectedTenantIdForUsers, refreshTick]);

  const selectedTenantUsers = useMemo(() => {
    if (!selectedTenantForUsers) return [];
    return tenantService.getUnifiedUsersMatrix(selectedTenantForUsers.id);
  }, [selectedTenantForUsers, refreshTick]);

  const handleSaveTenantUserFromSuperAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const allTenants = tenantService.getTenants();
    const targetTenant =
      allTenants.find(t => t.id === tenantUserForm.tenantId) || selectedTenantForUsers;
    if (!targetTenant) return;
    if (!tenantUserForm.nome.trim() || !tenantUserForm.reAcesso) {
      showToast('error', 'Informe o nome e o Código de Registro (RE numérico) do usuário.');
      return;
    }

    const slug = targetTenant.slug || 'empresa';
    const emailSlug = tenantUserForm.nome
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.');

    // Perfil vem de forma automática: se já existir na empresa mantém o perfil atual, ou se for novo acesso liberado pelo Super Admin entra automaticamente como Admin da Empresa
    const existingMatrixUser = tenantService
      .getUnifiedUsersMatrix(targetTenant.id)
      .find(
        u =>
          (tenantUserForm.id && u.id === tenantUserForm.id) ||
          u.reAcesso === Number(tenantUserForm.reAcesso)
      );

    const autoNivel: AppPermissionLevel = existingMatrixUser
      ? tenantService.isCompanyAdminUser(existingMatrixUser)
        ? 'Admin'
        : existingMatrixUser.perfisPorApp?.rnc || 'Admin'
      : 'Admin';

    tenantService.saveUserForTenant(
      {
        id: tenantUserForm.id && tenantUserForm.id < 50000 ? tenantUserForm.id : undefined,
        nome: tenantUserForm.nome.trim(),
        reAcesso: Number(tenantUserForm.reAcesso),
        cargo: tenantUserForm.cargo.trim() || 'Administrador da Empresa',
        setor: tenantUserForm.setor.trim() || 'Gestão da Qualidade',
        email: tenantUserForm.email.trim().toLowerCase() || `${emailSlug}@${slug}.com.br`,
        exigeSenha: tenantUserForm.exigeSenha,
        senha: tenantUserForm.exigeSenha ? tenantUserForm.senha.trim() || '123' : '',
        papel: autoNivel === 'Admin' ? 'admin_empresa' : undefined,
        perfil: autoNivel === 'Admin' ? 'Admin' : undefined,
        perfisPorApp: existingMatrixUser?.perfisPorApp || {
          plano_acao: autoNivel,
          rnc: autoNivel,
          oitod: autoNivel
        },
        isDefaultProfile: autoNivel === 'Usuário Comum' && !tenantUserForm.exigeSenha
      },
      targetTenant.id
    );

    setSelectedTenantIdForUsers(targetTenant.id);
    setTenantUserModalOpen(false);
    setRefreshTick(prev => prev + 1);
    showToast(
      'success',
      `Usuário "${tenantUserForm.nome.trim()}" (RE #${tenantUserForm.reAcesso}) configurado automaticamente como ${autoNivel === 'Admin' ? 'Admin da Empresa' : autoNivel} em "${targetTenant.nome}"!`
    );
  };

  const sqlPreviewText = `-- ============================================================================
-- MH QUALIDADE — ARQUITETURA SAAS MULTI-TENANT (SUPABASE POSTGRESQL 15+)
-- Script Completo: Criação de Tabelas (DDL) + Row Level Security (RLS) + Seed
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE EMPRESAS CLIENTES (TENANTS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(180) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    cnpj_contato VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado')),
    customizacao JSONB NOT NULL DEFAULT '{
      "logo_url": "",
      "cor_primaria": "#0b5796",
      "nome_exibicao": "MH Qualidade",
      "subtitulo_relatorio": "Gestão da Qualidade e Tratativa 8D"
    }'::jsonb,
    limites JSONB NOT NULL DEFAULT '{
      "max_usuarios": 100,
      "max_storage_mb": 2048,
      "storage_usado_mb": 0
    }'::jsonb,
    ultimo_sequencial_rnc BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABELA DE USUÁRIOS MULTI-TENANT
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(180) NOT NULL,
    cargo VARCHAR(120),
    setor VARCHAR(120),
    re_acesso INTEGER NOT NULL DEFAULT 10000,
    papel VARCHAR(40) NOT NULL DEFAULT 'operador' CHECK (papel IN ('super_admin', 'admin_empresa', 'qualidade', 'operador')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CADASTROS MESTRES ISOLADOS POR EMPRESA (TENANT)
CREATE TABLE IF NOT EXISTS public.clientes_montadoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    codigo VARCHAR(60),
    planta VARCHAR(120),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.areas_fabris (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    codigo VARCHAR(60),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.postos_trabalho (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    area_fabril VARCHAR(150),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cat_defeitos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    nome VARCHAR(180) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'Processo',
    severidade_padrao VARCHAR(40) DEFAULT 'Média',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABELA PRINCIPAL DE OCORRÊNCIAS (RNCS) COM SEQUENCIAL MONOTÔNICO POR EMPRESA
CREATE TABLE IF NOT EXISTS public.rncs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    numero_rnc BIGINT NOT NULL DEFAULT 1,
    codigo_rnc VARCHAR(60) NOT NULL,
    tipo_rnc VARCHAR(40) NOT NULL DEFAULT 'Formal',
    data_ocorrencia DATE NOT NULL DEFAULT CURRENT_DATE,
    cliente_montadora VARCHAR(150) NOT NULL,
    produto VARCHAR(180) NOT NULL,
    componente VARCHAR(180),
    posto VARCHAR(150),
    fmds VARCHAR(150),
    modo_falha VARCHAR(180),
    descricao_problema TEXT NOT NULL,
    status VARCHAR(60) NOT NULL DEFAULT 'Relatório Inicial',
    foto_peca_ok TEXT,
    foto_peca_ng TEXT,
    foto_auxiliar TEXT,
    quantidade_afetada INTEGER NOT NULL DEFAULT 1,
    caracteristica_seguranca VARCHAR(10) NOT NULL DEFAULT 'Não',
    payload_completo JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_por UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, numero_rnc)
);

CREATE INDEX IF NOT EXISTS idx_rncs_tenant_id ON public.rncs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rncs_data_ocorrencia ON public.rncs(tenant_id, data_ocorrencia DESC);

-- Trigger que incrementa atomicamente o sequencial individual por empresa (1, 2, 3...)
-- e garante que um número excluído jamais seja reutilizado
CREATE OR REPLACE FUNCTION public.fn_next_rnc_numero_por_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_next BIGINT;
BEGIN
  UPDATE public.tenants
  SET ultimo_sequencial_rnc = ultimo_sequencial_rnc + 1
  WHERE id = NEW.tenant_id
  RETURNING ultimo_sequencial_rnc INTO v_next;

  IF NEW.numero_rnc IS NULL OR NEW.numero_rnc <= 0 THEN
    NEW.numero_rnc := COALESCE(v_next, 1);
  ELSIF NEW.numero_rnc > COALESCE(v_next, 0) THEN
    UPDATE public.tenants
    SET ultimo_sequencial_rnc = NEW.numero_rnc
    WHERE id = NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rncs_seq_por_tenant ON public.rncs;
CREATE TRIGGER trg_rncs_seq_por_tenant
BEFORE INSERT ON public.rncs
FOR EACH ROW
EXECUTE FUNCTION public.fn_next_rnc_numero_por_tenant();

-- 5. TABELAS DE TREINAMENTOS E HISTÓRICO DE AÇÕES
CREATE TABLE IF NOT EXISTS public.treinamentos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rnc_id BIGINT NOT NULL REFERENCES public.rncs(id) ON DELETE CASCADE,
    re_colaborador INTEGER NOT NULL,
    nome_colaborador VARCHAR(180) NOT NULL,
    produto VARCHAR(180),
    defeito TEXT,
    data_treinamento DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel VARCHAR(180) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treinamentos_tenant_rnc ON public.treinamentos(tenant_id, rnc_id);

CREATE TABLE IF NOT EXISTS public.historico_acoes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rnc_id BIGINT NOT NULL REFERENCES public.rncs(id) ON DELETE CASCADE,
    usuario_nome VARCHAR(180) NOT NULL,
    acao VARCHAR(180) NOT NULL,
    detalhes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (ISOLAMENTO ESTRITO POR TENANT)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_montadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_fabris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postos_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_defeitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de Tenant por Slug ou Super Admin" ON public.tenants;
CREATE POLICY "Leitura de Tenant por Slug ou Super Admin" ON public.tenants
FOR SELECT USING (
  status = 'ativo'
  OR id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Gestao de Tenants pelo Super Admin" ON public.tenants;
CREATE POLICY "Gestao de Tenants pelo Super Admin" ON public.tenants
FOR ALL USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
  OR id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

DROP POLICY IF EXISTS "Isolamento Estrito Users" ON public.users;
CREATE POLICY "Isolamento Estrito Users" ON public.users
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Clientes Montadoras" ON public.clientes_montadoras;
CREATE POLICY "Isolamento Estrito Clientes Montadoras" ON public.clientes_montadoras
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Areas Fabris" ON public.areas_fabris;
CREATE POLICY "Isolamento Estrito Areas Fabris" ON public.areas_fabris
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Postos Trabalho" ON public.postos_trabalho;
CREATE POLICY "Isolamento Estrito Postos Trabalho" ON public.postos_trabalho
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Catalogo Defeitos" ON public.cat_defeitos;
CREATE POLICY "Isolamento Estrito Catalogo Defeitos" ON public.cat_defeitos
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito RNCs" ON public.rncs;
CREATE POLICY "Isolamento Estrito RNCs" ON public.rncs
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Treinamentos" ON public.treinamentos;
CREATE POLICY "Isolamento Estrito Treinamentos" ON public.treinamentos
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Historico Acoes" ON public.historico_acoes;
CREATE POLICY "Isolamento Estrito Historico Acoes" ON public.historico_acoes
FOR ALL USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

-- 7. BUCKET DE STORAGE: evidencias-qualidade
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias-qualidade', 'evidencias-qualidade', false)
ON CONFLICT (id) DO NOTHING;

-- 8. SEED INICIAL — EMPRESA PADRÃO: MH LEAN & SOLUÇÕES (100 USUÁRIOS / 2048 MB)
INSERT INTO public.tenants (id, nome, slug, cnpj_contato, status, customizacao, limites)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'MH Lean & Soluções',
  'mh-lean-solucoes',
  '18.452.910/0001-64 · mhsolucoes@adimin.com.br',
  'ativo',
  '{
    "logo_url": "",
    "cor_primaria": "#0b5796",
    "nome_exibicao": "MH Lean & Soluções",
    "subtitulo_relatorio": "MH Lean & Soluções • Sistema MH Qualidade de Gestão de RNC e Qualidade 8D"
  }'::jsonb,
  '{
    "max_usuarios": 100,
    "max_storage_mb": 2048,
    "storage_usado_mb": 1.2
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlPreviewText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-[#0f172a]">
      {/* Top Bar do Console Super Admin */}
      <header className="h-14 px-4 sm:px-8 bg-[#0f172a] text-white flex items-center justify-between gap-8 border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-2.5 h-8 rounded-lg bg-[#0b5796] text-white flex items-center justify-center font-display font-bold text-xs tracking-wider">
            MH Qualidade
          </div>
          <span className="font-display font-bold text-sm sm:text-base tracking-tight whitespace-nowrap">
            MH Qualidade • Console Super Administrador
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('tenants')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'tenants' ? 'text-white font-semibold underline underline-offset-4' : ''
            }`}
          >
            Gestão de Empresas (Tenants)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'usuarios' ? 'text-white font-semibold underline underline-offset-4' : ''
            }`}
          >
            Configuração de Usuários &amp; Minha Senha
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'sql' ? 'text-white font-semibold underline underline-offset-4' : ''
            }`}
          >
            Infraestrutura Supabase &amp; RLS
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs text-slate-300 font-mono">
            {superAdminRecord.email || 'mhsolucoes@adimin.com.br'} (RE #{superAdminRecord.reAcesso || 104235})
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central — Largura Total Responsiva (100% da Tela) */}
      <main className="flex-1 w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 min-w-0">
        {feedbackToast && (
          <div
            className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{feedbackToast.text}</span>
            <button type="button" onClick={() => setFeedbackToast(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cabeçalho Executivo + Botões de Ação do Super Admin */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 tracking-tight">
              Console Exclusivo Super Admin — MH Qualidade
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Controle central de empresas clientes, liberação de acessos para administradores de empresas e gestão da sua senha Master.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'usuarios' ? 'tenants' : 'usuarios')}
              className={`h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition ${
                activeTab === 'usuarios'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <KeyRound className="w-4 h-4 text-[#0b5796]" />
              <span>Configuração de Usuários &amp; Minha Senha</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="btn-primary h-10 px-4 text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Nova Empresa</span>
            </button>
          </div>
        </div>

        {/* Strip de 4 KPIs Globais de Monitoramento de Consumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Empresas Cadastradas</div>
              <div className="text-2xl font-display font-bold text-slate-900 font-mono tabular-nums mt-1">
                {globalStats.totalTenants}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-1">
                {globalStats.activeTenants} ativas em operação
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Usuários Habilitados</div>
              <div className="text-2xl font-display font-bold text-slate-900 font-mono tabular-nums mt-1">
                {globalStats.totalUsers}
              </div>
              <div className="text-xs text-slate-500 mt-1">Cota Free Tier: 50.000 MAU</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Total de RNCs na Plataforma</div>
              <div className="text-2xl font-display font-bold text-slate-900 font-mono tabular-nums mt-1">
                {globalStats.totalRncs}
              </div>
              <div className="text-xs text-slate-500 mt-1">Isoladas por tenant_id (RLS)</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Consumo Global Storage WebP</div>
              <div className="text-2xl font-display font-bold text-slate-900 font-mono tabular-nums mt-1">
                {globalStats.totalStorageMb} MB
              </div>
              <div className="text-xs text-slate-500 mt-1">De 1.024 MB grátis (R$ 0,00/mês)</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </div>

        {activeTab === 'tenants' ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Barra de Busca e Filtro de Status */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome da empresa, slug ou CNPJ..."
                  className="form-input !pl-9 w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(['todos', 'ativo', 'suspenso', 'cancelado'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer capitalize whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabela de Empresas (High-Density Data Grid) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Empresa / Identidade</th>
                    <th className="py-3 px-4">Rota Slug (URL)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Usuários</th>
                    <th className="py-3 px-4 text-right">RNCs (Abertas / Total)</th>
                    <th className="py-3 px-4 text-right">Storage WebP</th>
                    <th className="py-3 px-4 text-right">Ações Gerenciais & Suporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredTenants.map(({ tenant, usersCount, rncsTotal, rncsOpen, adminUser }) => (
                    <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-display font-bold text-xs shrink-0"
                            style={{ backgroundColor: tenant.customizacao.cor_primaria }}
                          >
                            {tenant.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{tenant.nome}</span>
                              {tenant.id === PILOT_TENANT_ID && (
                                <span className="text-[10px] font-mono font-semibold text-[#0b5796]">
                                  · PILOTO OFICIAL
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {tenant.cnpj_contato}
                              {adminUser ? ` · Admin: ${adminUser.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        /{tenant.slug}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                            tenant.status === 'ativo'
                              ? 'text-emerald-700'
                              : tenant.status === 'suspenso'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {tenant.status === 'ativo' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                          <span className="capitalize">{tenant.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800">
                        {usersCount} / {tenant.limites.max_usuarios}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                        <span className="font-bold text-amber-700">{rncsOpen}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="font-semibold text-slate-900">{rncsTotal}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                        {tenant.limites.storage_usado_mb} / {tenant.limites.max_storage_mb} MB
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Botão Principal: Impersonation (Acessar como a Empresa) */}
                          <button
                            type="button"
                            onClick={() => handleImpersonate(tenant)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0b5796] hover:bg-[#09477d] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            title="Acessar painel exatamente como esta empresa vê (Impersonation)"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Acessar como Empresa</span>
                            <ExternalLink className="w-3 h-3 opacity-80" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const baseUrl =
                                typeof window !== 'undefined'
                                  ? window.location.origin
                                  : 'https://app.mhqualidade.com';
                              const loginUrl = `${baseUrl}/${tenant.slug}/login`;
                              const adminEmail = adminUser?.email || `admin@${tenant.slug}.com.br`;
                              const adminPass = adminUser?.senha || '123';
                              const text = `Acesso Corporativo MH Qualidade — ${tenant.nome}\nURL Exclusiva: ${loginUrl}\nAdministrador: ${adminUser?.nome || 'Gestor'}\nE-mail de Login: ${adminEmail}\nMatrícula (RE): ${adminUser?.reAcesso || 10001}\nSenha Inicial: ${adminPass}`;
                              navigator.clipboard.writeText(text);
                              showToast(
                                'success',
                                `Credenciais de acesso da empresa "${tenant.nome}" copiadas para a área de transferência!`
                              );
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-[#0b5796] transition-colors cursor-pointer"
                            title="Copiar Link de Login + E-mail Admin + Senha para enviar ao cliente"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tenant)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Editar limites e configurações da empresa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(tenant)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors cursor-pointer"
                            title={tenant.status === 'ativo' ? 'Suspender acesso da empresa' : 'Reativar empresa'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          {tenant.id !== PILOT_TENANT_ID && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTenant(tenant)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                              title="Remover empresa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'usuarios' ? (
          /* Aba 2: Configuração de Usuários & Minha Senha (Super Admin) — Layout Responsivo 100% da Tela */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
            {/* Coluna Esquerda: Meu Usuário Super Admin & Alterar/Criar Minha Senha */}
            <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5 h-fit min-w-0">
              <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b5796] flex items-center justify-center border border-blue-100 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                    Conta Exclusiva Super Admin
                  </span>
                  <h2 className="text-base font-display font-bold text-slate-900">
                    Meu Usuário &amp; Senha Master
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Este usuário é exclusivo do seu Console Super Admin e nunca aparece nas listas de usuários das empresas clientes.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveSuperAdminProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Super Administrador
                  </label>
                  <input
                    type="text"
                    value={saNome}
                    onChange={e => setSaNome(e.target.value)}
                    className="form-input w-full text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail Master de Login
                    </label>
                    <input
                      type="email"
                      value={saEmail}
                      onChange={e => setSaEmail(e.target.value)}
                      className="form-input w-full text-xs font-mono"
                      required
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código Registro (RE)
                    </label>
                    <input
                      type="number"
                      value={saRe}
                      onChange={e => setSaRe(Number(e.target.value))}
                      className="form-input w-full text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#0b5796]" />
                      <span>Criar ou Alterar Minha Senha Master</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Atual: {superAdminRecord.senha || '123'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={saNovaSenha}
                      onChange={e => setSaNovaSenha(e.target.value)}
                      placeholder="Digite a nova senha (ou deixe em branco para manter)"
                      className="form-input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={saConfirmarSenha}
                      onChange={e => setSaConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="form-input w-full text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full h-10 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Credenciais &amp; Senha do Super Admin</span>
                </button>
              </form>
            </div>

            {/* Coluna Direita: Tabela de Empresas Criadas + Tabela de Perfis de Usuários da Empresa */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6 min-w-0">
              {/* 1. Tabela de Empresas Criadas */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-display font-bold text-slate-900">
                      Empresas Criadas na Plataforma ({tenantsWithMetrics.length})
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Clique em uma empresa abaixo para visualizar seus perfis de usuários ou liberar um novo acesso de Administrador.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="btn-secondary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0b5796]" />
                    <span>Adicionar Nova Empresa</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                        <th className="py-3 px-4 whitespace-nowrap">Empresa / Slug</th>
                        <th className="py-3 px-4 whitespace-nowrap">Administrador Principal</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">Usuários</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tenantsWithMetrics.map(({ tenant, usersCount, adminUser }) => {
                        const isSelected = selectedTenantForUsers?.id === tenant.id;
                        return (
                          <tr
                            key={tenant.id}
                            onClick={() => setSelectedTenantIdForUsers(tenant.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-display font-bold text-xs shrink-0"
                                  style={{ backgroundColor: tenant.customizacao.cor_primaria }}
                                >
                                  {tenant.nome.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                    <span>{tenant.nome}</span>
                                    {isSelected && (
                                      <span className="px-1.5 py-0.5 rounded bg-[#0b5796] text-white text-[9px] font-bold uppercase whitespace-nowrap">
                                        Selecionada
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500">
                                    /{tenant.slug}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {adminUser ? (
                                <div>
                                  <div className="font-semibold text-slate-800">{adminUser.nome}</div>
                                  <div className="text-[11px] font-mono text-slate-500">
                                    RE #{adminUser.reAcesso} {adminUser.email ? `· ${adminUser.email}` : ''}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Sem Admin definido</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                              {usersCount} / {tenant.limites.max_usuarios}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                                  tenant.status === 'ativo' ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span className="capitalize">{tenant.status}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTenantIdForUsers(tenant.id);
                                    const tUsers = tenantService.getUnifiedUsersMatrix(tenant.id);
                                    const nextRe =
                                      tUsers.reduce(
                                        (max, u) => (u.reAcesso > max && u.reAcesso < 90000 ? u.reAcesso : max),
                                        10000
                                      ) + 1;
                                    setTenantUserForm({
                                      id: undefined,
                                      tenantId: tenant.id,
                                      nome: '',
                                      reAcesso: nextRe,
                                      cargo: 'Administrador da Empresa',
                                      setor: 'Gestão da Qualidade',
                                      email: '',
                                      exigeSenha: true,
                                      senha: '123',
                                      nivelAcesso: 'Admin'
                                    });
                                    setTenantUserModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b5796] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                  title="Liberar ou configurar usuário para esta empresa"
                                >
                                  <Plus className="w-3 h-3 shrink-0" />
                                  <span>Configurar Usuário</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleImpersonate(tenant)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b5796] hover:bg-blue-50 cursor-pointer"
                                  title="Acessar painel desta empresa"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(tenant)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                  title="Editar empresa"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Tabela de Perfis de Usuários da Empresa Selecionada */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-display font-bold text-slate-900">
                      Perfis de Usuários — {selectedTenantForUsers?.nome}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Crie ou edite o usuário Administrador de cada empresa cliente. Depois disso, o próprio Admin da empresa gerencia os demais funcionários dela.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = selectedTenantForUsers?.id || PILOT_TENANT_ID;
                      const nextRe =
                        selectedTenantUsers.reduce(
                          (max, u) => (u.reAcesso > max && u.reAcesso < 90000 ? u.reAcesso : max),
                          10000
                        ) + 1;
                      setTenantUserForm({
                        id: undefined,
                        tenantId: targetId,
                        nome: '',
                        reAcesso: nextRe,
                        cargo: 'Administrador da Empresa',
                        setor: 'Gestão da Qualidade',
                        email: '',
                        exigeSenha: true,
                        senha: '123',
                        nivelAcesso: 'Admin'
                      });
                      setTenantUserModalOpen(true);
                    }}
                    className="btn-primary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Liberar Novo Usuário / Admin</span>
                  </button>
                </div>

                {/* Seletor de Empresa Cliente */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Empresa Selecionada:
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Exibindo apenas os usuários vinculados a esta empresa (Total: {selectedTenantUsers.length})
                    </span>
                  </div>
                  <select
                    value={selectedTenantForUsers?.id || ''}
                    onChange={e => setSelectedTenantIdForUsers(e.target.value)}
                    className="form-input !h-9 text-xs font-semibold sm:w-72"
                  >
                    {tenantsWithMetrics.map(({ tenant }) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.nome} (/{tenant.slug})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lista de Usuários da Empresa Selecionada */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                        <th className="py-2.5 px-3">Usuário / Cargo</th>
                        <th className="py-2.5 px-3">Código (RE)</th>
                        <th className="py-2.5 px-3">Modo de Login</th>
                        <th className="py-2.5 px-3">Perfil na Empresa</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedTenantUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Nenhum usuário cadastrado para esta empresa.
                          </td>
                        </tr>
                      ) : (
                        selectedTenantUsers.map(u => {
                          const isAdminUser = tenantService.isCompanyAdminUser(u);
                          return (
                            <tr key={u.reAcesso} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{u.nome}</div>
                                <div className="text-[11px] text-slate-500">
                                  {u.cargo || 'Colaborador'} {u.email ? `· ${u.email}` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                #{u.reAcesso}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedTenantForUsers) return;
                                    tenantService.toggleUserPasswordRequirement(
                                      u.reAcesso,
                                      !u.exigeSenha,
                                      u.senha || '123',
                                      selectedTenantForUsers.id
                                    );
                                    setRefreshTick(prev => prev + 1);
                                  }}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer whitespace-nowrap ${
                                    u.exigeSenha
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                  title="Clique para alternar se exige senha ou apenas Código de Registro"
                                >
                                  {u.exigeSenha ? (
                                    <>
                                      <Lock className="w-3 h-3 shrink-0" />
                                      <span>Com Senha ({u.senha || '123'})</span>
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="w-3 h-3 shrink-0" />
                                      <span>Sem Senha (Só RE)</span>
                                    </>
                                  )}
                                </button>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${
                                    isAdminUser
                                      ? 'bg-violet-100 text-violet-900'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {isAdminUser ? 'Admin da Empresa' : u.perfisPorApp?.rnc || 'Usuário Comum'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!selectedTenantForUsers) return;
                                      const baseUrl =
                                        typeof window !== 'undefined'
                                          ? window.location.origin
                                          : 'https://app.mhqualidade.com';
                                      const loginUrl = `${baseUrl}/${selectedTenantForUsers.slug}/login`;
                                      const credText = u.exigeSenha
                                        ? `Acesso MH Qualidade — ${selectedTenantForUsers.nome}\nLink: ${loginUrl}\nUsuário: ${u.nome}\nCódigo de Registro (Login): ${u.reAcesso}\nE-mail: ${u.email || '-'}\nSenha: ${u.senha || '123'}`
                                        : `Acesso MH Qualidade — ${selectedTenantForUsers.nome}\nLink: ${loginUrl}\nUsuário: ${u.nome}\nCódigo de Registro (Login Direto sem senha): ${u.reAcesso}`;
                                      navigator.clipboard.writeText(credText);
                                      showToast('success', `Acesso de "${u.nome}" copiado!`);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b5796] hover:bg-blue-50 cursor-pointer"
                                    title="Copiar credenciais de acesso"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTenantUserForm({
                                        id: u.id,
                                        tenantId: selectedTenantForUsers?.id || PILOT_TENANT_ID,
                                        nome: u.nome,
                                        reAcesso: u.reAcesso,
                                        cargo: u.cargo || '',
                                        setor: u.setor || '',
                                        email: u.email || '',
                                        exigeSenha: Boolean(u.exigeSenha),
                                        senha: u.senha || '123',
                                        nivelAcesso: isAdminUser ? 'Admin' : u.perfisPorApp?.rnc || 'Usuário Comum'
                                      });
                                      setTenantUserModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                    title="Editar usuário e senha"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Aba 2: Script SQL & Status Supabase */
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0b5796] flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-display font-bold text-slate-900">
                    Camada de Banco de Dados Híbrida (Supabase PostgreSQL + RLS)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Status atual:{' '}
                    <strong>
                      {tenantService.getConnectionMode() === 'supabase_cloud'
                        ? 'Conectado ao Supabase Cloud'
                        : 'Modo Híbrido Local Multi-Tenant Ativo (Pronto para Supabase)'}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="btn-primary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Script SQL Completo Copiado!' : 'Copiar Script SQL Completo (Tabelas + RLS)'}</span>
              </button>
            </div>

            <div className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto max-h-[480px] overflow-y-auto leading-relaxed">
              <pre>{sqlPreviewText}</pre>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                O script DDL completo com todas as tabelas, índices, políticas de Row Level Security e bucket{' '}
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">evidencias-qualidade</code> está salvo em{' '}
                <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  /supabase/migrations/001_saas_multitenant_schema.sql
                </code>
                .
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Adicionar Nova Empresa (Onboarding Multi-Tenant) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-display font-bold text-slate-900">
                  Cadastrar Nova Empresa Cliente (Tenant)
                </h2>
                <p className="text-xs text-slate-500">
                  Cria o espaço isolado da empresa e o primeiro usuário Administrador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTenantSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Empresa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newNome}
                    onChange={e => handleAutoSlug(e.target.value)}
                    placeholder="Ex: Indústria Alfa Estamparia"
                    className="form-input w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug Único da URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={e => setNewSlug(e.target.value)}
                    placeholder="industria-alfa"
                    className="form-input w-full text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ / Contato Comercial
                  </label>
                  <input
                    type="text"
                    value={newCnpj}
                    onChange={e => setNewCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="form-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cor da Marca
                  </label>
                  <input
                    type="color"
                    value={newCor}
                    onChange={e => setNewCor(e.target.value)}
                    className="h-9.5 w-full rounded-lg border border-slate-200 cursor-pointer p-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Limite Máx. Usuários
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newMaxUsers}
                    onChange={e => setNewMaxUsers(Number(e.target.value))}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cota Storage Fotos (MB)
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={newMaxStorage}
                    onChange={e => setNewMaxStorage(Number(e.target.value))}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Primeiro Administrador da Empresa
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Gestor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAdminNome}
                      onChange={e => setNewAdminNome(e.target.value)}
                      placeholder="Nome completo"
                      className="form-input w-full text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      E-mail de Login <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      placeholder="admin@empresa.com.br"
                      className="form-input w-full text-xs font-mono"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Senha Inicial
                  </label>
                  <input
                    type="text"
                    value={newAdminSenha}
                    onChange={e => setNewAdminSenha(e.target.value)}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Criar Empresa e Ativar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Limites e Configurações da Empresa */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-display font-bold text-slate-900">
                Configurar Empresa — {editingTenant.nome}
              </h2>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  className="form-input w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNPJ / Contato
                </label>
                <input
                  type="text"
                  value={editCnpj}
                  onChange={e => setEditCnpj(e.target.value)}
                  className="form-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cor Marca
                  </label>
                  <input
                    type="color"
                    value={editCor}
                    onChange={e => setEditCor(e.target.value)}
                    className="h-9.5 w-full rounded-lg border border-slate-200 cursor-pointer p-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Máx. Usuários
                  </label>
                  <input
                    type="number"
                    value={editMaxUsers}
                    onChange={e => setEditMaxUsers(Number(e.target.value))}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Storage (MB)
                  </label>
                  <input
                    type="number"
                    value={editMaxStorage}
                    onChange={e => setEditMaxStorage(Number(e.target.value))}
                    className="form-input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="btn-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Liberar / Editar Usuário ou Administrador da Empresa Selecionada */}
      {tenantUserModalOpen && selectedTenantForUsers && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-display font-bold text-slate-900">
                  Configurar Usuário da Empresa
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione a empresa abaixo. O perfil de acesso é atribuído automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTenantUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenantUserFromSuperAdmin} className="space-y-4">
              {/* Campo para escolher qual empresa está sendo configurada */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Empresa que estou configurando <span className="text-rose-500">*</span>
                </label>
                <select
                  value={tenantUserForm.tenantId || selectedTenantForUsers.id}
                  onChange={e => {
                    const nextTenantId = e.target.value;
                    setSelectedTenantIdForUsers(nextTenantId);
                    const tUsers = tenantService.getUnifiedUsersMatrix(nextTenantId);
                    const nextRe =
                      tUsers.reduce(
                        (max, u) => (u.reAcesso > max && u.reAcesso < 90000 ? u.reAcesso : max),
                        10000
                      ) + 1;
                    setTenantUserForm(prev => ({
                      ...prev,
                      tenantId: nextTenantId,
                      reAcesso: prev.id ? prev.reAcesso : nextRe
                    }));
                  }}
                  className="form-input w-full text-xs font-semibold"
                  required
                >
                  {tenantsWithMetrics.map(({ tenant }) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.nome} (/{tenant.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tenantUserForm.nome}
                  onChange={e => setTenantUserForm({ ...tenantUserForm, nome: e.target.value })}
                  placeholder="Nome do administrador ou usuário"
                  className="form-input w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código Registro (RE Numérico) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={tenantUserForm.reAcesso}
                    onChange={e => {
                      const nextRe = Number(e.target.value);
                      const targetTenantId = tenantUserForm.tenantId || selectedTenantForUsers.id;
                      const existingUser = tenantService
                        .getUnifiedUsersMatrix(targetTenantId)
                        .find(u => u.reAcesso === nextRe);
                      const autoLevel: AppPermissionLevel = existingUser
                        ? tenantService.isCompanyAdminUser(existingUser)
                          ? 'Admin'
                          : existingUser.perfisPorApp?.rnc || 'Admin'
                        : 'Admin';
                      setTenantUserForm({
                        ...tenantUserForm,
                        reAcesso: nextRe,
                        nivelAcesso: autoLevel
                      });
                    }}
                    className="form-input w-full text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Perfil na Empresa (Automático)
                  </label>
                  <div className="form-input w-full text-xs font-bold bg-slate-100 text-slate-800 flex items-center gap-1.5 select-none">
                    <Shield className="w-3.5 h-3.5 text-[#0b5796] shrink-0" />
                    <span className="truncate">
                      {tenantUserForm.nivelAcesso === 'Admin'
                        ? 'Admin da Empresa'
                        : tenantUserForm.nivelAcesso}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail de Login (Opcional)
                </label>
                <input
                  type="email"
                  value={tenantUserForm.email}
                  onChange={e => setTenantUserForm({ ...tenantUserForm, email: e.target.value })}
                  placeholder={`admin@${
                    tenantsWithMetrics.find(x => x.tenant.id === tenantUserForm.tenantId)?.tenant
                      .slug || selectedTenantForUsers.slug
                  }.com.br`}
                  className="form-input w-full text-xs font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Exigir Senha no Login?</span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTenantUserForm({ ...tenantUserForm, exigeSenha: false })}
                      className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                        !tenantUserForm.exigeSenha
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Só Registro (Sem Senha)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantUserForm({ ...tenantUserForm, exigeSenha: true })}
                      className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                        tenantUserForm.exigeSenha
                          ? 'bg-[#0b5796] text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Exigir Senha
                    </button>
                  </div>
                </div>

                {tenantUserForm.exigeSenha && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Senha de Acesso <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenantUserForm.senha}
                      onChange={e =>
                        setTenantUserForm({ ...tenantUserForm, senha: e.target.value })
                      }
                      className="form-input w-full text-xs font-mono font-bold"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTenantUserModalOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-9 px-4 text-xs font-semibold cursor-pointer"
                >
                  Salvar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminView;

