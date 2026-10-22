-- ============================================================================
-- MH QUALIDADE — ARQUITETURA SAAS MULTI-TENANT (SUPABASE POSTGRESQL 15+)
-- Script Completo: DDL Relacional + Row Level Security (RLS) + Storage + Seed
-- ============================================================================

-- Extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE EMPRESAS CLIENTES (TENANTS)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2. TABELA DE USUÁRIOS MULTI-TENANT
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. CADASTROS MESTRES ISOLADOS POR EMPRESA (TENANT)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. TABELA PRINCIPAL DE OCORRÊNCIAS (RNCS) COM SEQUENCIAL MONOTÔNICO POR EMPRESA
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 5. TABELAS DE TREINAMENTOS E HISTÓRICO DE AÇÕES
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (ISOLAMENTO ESTRITO POR TENANT)
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_montadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_fabris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postos_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_defeitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_acoes ENABLE ROW LEVEL SECURITY;

-- Leitura pública controlada de metadados básicos de tenant por slug (para tela de login White-Label)
DROP POLICY IF EXISTS "Leitura de Tenant por Slug ou Super Admin" ON public.tenants;
CREATE POLICY "Leitura de Tenant por Slug ou Super Admin" ON public.tenants
FOR SELECT
USING (
  status = 'ativo'
  OR id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Gestao de Tenants pelo Super Admin" ON public.tenants;
CREATE POLICY "Gestao de Tenants pelo Super Admin" ON public.tenants
FOR ALL
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
  OR id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
);

-- Políticas de Isolamento Estrito nas tabelas de domínio
DROP POLICY IF EXISTS "Isolamento Estrito Users" ON public.users;
CREATE POLICY "Isolamento Estrito Users" ON public.users
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Clientes Montadoras" ON public.clientes_montadoras;
CREATE POLICY "Isolamento Estrito Clientes Montadoras" ON public.clientes_montadoras
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Areas Fabris" ON public.areas_fabris;
CREATE POLICY "Isolamento Estrito Areas Fabris" ON public.areas_fabris
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Postos Trabalho" ON public.postos_trabalho;
CREATE POLICY "Isolamento Estrito Postos Trabalho" ON public.postos_trabalho
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Catalogo Defeitos" ON public.cat_defeitos;
CREATE POLICY "Isolamento Estrito Catalogo Defeitos" ON public.cat_defeitos
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito RNCs" ON public.rncs;
CREATE POLICY "Isolamento Estrito RNCs" ON public.rncs
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Treinamentos" ON public.treinamentos;
CREATE POLICY "Isolamento Estrito Treinamentos" ON public.treinamentos
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

DROP POLICY IF EXISTS "Isolamento Estrito Historico Acoes" ON public.historico_acoes;
CREATE POLICY "Isolamento Estrito Historico Acoes" ON public.historico_acoes
FOR ALL
USING (
  tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true
);

-- ----------------------------------------------------------------------------
-- 7. BUCKET DE STORAGE: evidencias-qualidade (/tenants/{tenant_id}/rncs/...)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias-qualidade', 'evidencias-qualidade', false)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. SEED INICIAL — EMPRESA PADRÃO: MH LEAN & SOLUÇÕES (100 USUÁRIOS / 2048 MB)
-- ----------------------------------------------------------------------------
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
ON CONFLICT (slug) DO NOTHING;

