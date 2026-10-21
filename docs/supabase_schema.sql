-- ============================================================================
-- BANCO DE DADOS POSTGRESQL (SUPABASE) - SISTEMA SOR SAAS MULTI-TENANT
-- ============================================================================
-- Este script provisiona todas as tabelas, índices, Row Level Security (RLS),
-- permissões de Storage e dados de seed da empresa piloto (GPM Serviços).
-- Execute no Supabase SQL Editor.
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE TENANTS (EMPRESAS CLIENTES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    cnpj_contato VARCHAR(50),
    email_contato VARCHAR(255),
    telefone_contato VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'em_implantacao')),
    customizacao JSONB NOT NULL DEFAULT '{
        "nomeExibicao": "Gestão da Qualidade",
        "subtitulo": "Sistema de Ocorrências RNC & 8D",
        "logoUrl": "",
        "corPrimaria": "#0f6cbd",
        "corSecundaria": "#0b5796",
        "mensagemAlerta": "Atenção: Instrução de Contenção Operacional Ativa"
    }'::jsonb,
    limites JSONB NOT NULL DEFAULT '{
        "maxUsuarios": 25,
        "maxStorageMb": 1000,
        "modulosHabilitados": {
            "rnc8D": true,
            "alertaQualidade": true,
            "rastreabilidade": true,
            "protecaoCliente": true,
            "falhaEntrega": true,
            "matrizTreinamentos": true
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants (status);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE USUÁRIOS POR TENANT (RBAC MULTI-TENANT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_user_id UUID, -- Chave de vínculo com auth.users do Supabase
    email VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    re_acesso INTEGER NOT NULL,
    cargo VARCHAR(150),
    setor VARCHAR(150),
    papel VARCHAR(50) NOT NULL DEFAULT 'operador' CHECK (papel IN ('super_admin', 'admin_empresa', 'qualidade', 'inspetor', 'operador', 'visualizador')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email),
    CONSTRAINT uq_tenant_user_re UNIQUE (tenant_id, re_acesso)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_email ON public.tenant_users (email);

-- ----------------------------------------------------------------------------
-- 3. CADASTROS MESTRES DA EMPRESA (MONTADORAS, LINHAS, POSTOS, DEFEITOS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_master_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
    montadoras TEXT[] NOT NULL DEFAULT ARRAY['GPM Geral', 'Volkswagen', 'General Motors', 'Stellantis', 'Renault'],
    linhas_fabris TEXT[] NOT NULL DEFAULT ARRAY['Linha 1 - Estamparia', 'Linha 2 - Solda Robotizada', 'Linha 3 - Montagem Final', 'Linha 4 - Pintura & E-coat'],
    postos_trabalho TEXT[] NOT NULL DEFAULT ARRAY['P01 - Carga', 'P02 - Estampos', 'P03 - Solda Ponto', 'P04 - Acabamento', 'P05 - Inspeção Qualidade', 'P06 - Embalagem'],
    modos_falha TEXT[] NOT NULL DEFAULT ARRAY['Trinca no Ponto de Solda', 'Rebarba Excessiva', 'Desvio Dimensional', 'Falta de Componente', 'Arranhão / Deformação', 'Porosidade', 'Falha de Torque', 'Contaminação de Pintura'],
    tipos_rnc TEXT[] NOT NULL DEFAULT ARRAY['Formal', 'Informal', 'Improcedente', 'Interno'],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE OCORRÊNCIAS / RNCS (COM ISOLAMENTO MULTI-TENANT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rncs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    field1 VARCHAR(100), -- Código formatado (ex: RNC-2026-0001)
    tipo_rnc VARCHAR(50) NOT NULL DEFAULT 'Formal',
    status VARCHAR(50) NOT NULL DEFAULT 'Em Andamento',
    cliente VARCHAR(150) NOT NULL,
    data_ocorrencia DATE NOT NULL,
    data_oficializacao DATE,
    cod_ocorrencia_cliente VARCHAR(100),
    impacto_cliente VARCHAR(255),
    detalhamento_ocorrencia TEXT,
    classificacao_setor VARCHAR(150),
    setor_deteccao VARCHAR(150),
    turno VARCHAR(50) DEFAULT '1º Turno',
    produto VARCHAR(150) NOT NULL,
    componente VARCHAR(150) NOT NULL,
    subcomponente VARCHAR(150),
    final_componente VARCHAR(100),
    quantidade_afetada INTEGER NOT NULL DEFAULT 1,
    modo_falha VARCHAR(255),
    descricao_problema TEXT NOT NULL,
    descricao_completa TEXT,
    
    -- Fotos de Evidências (Salvas no Bucket Supabase com RLS)
    foto_peca_ng TEXT,
    foto_peca_ok TEXT,
    foto_auxiliar TEXT,
    
    -- Critérios de Qualidade e Segurança
    caracteristica_seguranca VARCHAR(10) DEFAULT 'Não',
    co_produto VARCHAR(10) DEFAULT 'Não',
    carry_over VARCHAR(10) DEFAULT 'Não',
    reincidente VARCHAR(10) DEFAULT 'NÃO',
    data_reincidente DATE,
    gravidade VARCHAR(50),
    possivel_detectar VARCHAR(50),
    tipo_deteccao VARCHAR(100),
    
    -- Contenção e Triagem
    posto VARCHAR(150),
    fmds VARCHAR(150),
    descricao_problema_interno TEXT,
    acoes_contencao TEXT,
    recomendacoes_providencias TEXT,
    data_contencao DATE,
    qtd_inspecionada INTEGER DEFAULT 0,
    qtd_suspeita INTEGER DEFAULT 0,
    qtd_bloqueada INTEGER DEFAULT 0,
    
    -- 5W2H e Disposição
    o_que_fazer TEXT,
    como_fazer TEXT,
    por_que_fazer TEXT,
    quem_fara VARCHAR(150),
    quando_fara DATE,
    onde_fara VARCHAR(150),
    participantes_atendimento TEXT,
    
    -- Rastreabilidade
    documento_rastreabilidade VARCHAR(100),
    codigo_rastreabilidade VARCHAR(150),
    data_inicio_rastreabilidade DATE,
    data_fim_rastreabilidade DATE,
    protcliente VARCHAR(50),
    data_pagamento DATE,
    abrir_8d VARCHAR(10) DEFAULT 'Sim',
    local_8d VARCHAR(150),
    
    -- Responsáveis e Auditoria
    detector VARCHAR(150) NOT NULL,
    re_detector INTEGER,
    responsavel_conclusao VARCHAR(150),
    data_conclusao DATE,
    observacoes_conclusao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rncs_tenant_id ON public.rncs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rncs_status ON public.rncs (status);
CREATE INDEX IF NOT EXISTS idx_rncs_data_ocorrencia ON public.rncs (data_ocorrencia);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE REGISTROS DE TREINAMENTO (ALERTA DA QUALIDADE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treinamentos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    id_rnc BIGINT NOT NULL REFERENCES public.rncs(id) ON DELETE CASCADE,
    re INTEGER NOT NULL,
    nome_colaborador VARCHAR(255) NOT NULL,
    produto VARCHAR(150),
    defeito VARCHAR(255),
    data_treinamento DATE NOT NULL DEFAULT CURRENT_DATE,
    responsavel VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_treinamentos_tenant_rnc ON public.treinamentos (tenant_id, id_rnc);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) - ISOLAMENTO CRÍTICO DE DADOS ENTRE EMPRESAS
-- ============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

-- Helper Function para obter o tenant_id do usuário autenticado no JWT
CREATE OR REPLACE FUNCTION auth.current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id', '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper Function para verificar se o usuário é Super Admin da plataforma
CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE((current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN, false);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Políticas para TENANTS
CREATE POLICY "Super admin possui acesso total aos tenants" ON public.tenants
    FOR ALL USING (auth.is_super_admin());

CREATE POLICY "Empresas visualizam apenas seus próprios dados" ON public.tenants
    FOR SELECT USING (id = auth.current_tenant_id());

-- Políticas para RNCS
CREATE POLICY "Super admin visualiza todas as RNCs" ON public.rncs
    FOR ALL USING (auth.is_super_admin());

CREATE POLICY "Isolamento estrito de RNCs por tenant" ON public.rncs
    FOR ALL USING (tenant_id = auth.current_tenant_id())
    WITH CHECK (tenant_id = auth.current_tenant_id());

-- Políticas para TREINAMENTOS
CREATE POLICY "Isolamento estrito de treinamentos por tenant" ON public.treinamentos
    FOR ALL USING (tenant_id = auth.current_tenant_id() OR auth.is_super_admin())
    WITH CHECK (tenant_id = auth.current_tenant_id() OR auth.is_super_admin());

-- Políticas para CADASTROS MESTRES
CREATE POLICY "Isolamento de cadastros mestres por tenant" ON public.tenant_master_data
    FOR ALL USING (tenant_id = auth.current_tenant_id() OR auth.is_super_admin())
    WITH CHECK (tenant_id = auth.current_tenant_id() OR auth.is_super_admin());

-- ============================================================================
-- 7. SUPABASE STORAGE (BUCKET: evidencias-qualidade)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias-qualidade', 'evidencias-qualidade', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política de Upload: apenas para a pasta do próprio tenant
CREATE POLICY "Upload permitido apenas na pasta do próprio tenant" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'evidencias-qualidade' AND (
            (storage.foldername(name))[1] = auth.current_tenant_id()::text
            OR auth.is_super_admin()
        )
    );

-- Política de Leitura das Fotos
CREATE POLICY "Visualização de fotos públicas do bucket de evidências" ON storage.objects
    FOR SELECT USING (bucket_id = 'evidencias-qualidade');

-- ============================================================================
-- 8. SEED DA EMPRESA PILOTO: GPM SERVIÇOS
-- ============================================================================

DO $$
DECLARE
    v_gpm_tenant_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
BEGIN
    -- 1. Inserir Tenant Piloto GPM Serviços
    INSERT INTO public.tenants (id, nome, slug, cnpj_contato, email_contato, telefone_contato, status, customizacao)
    VALUES (
        v_gpm_tenant_id,
        'GPM Serviços Industriais',
        'gpm-servicos',
        '12.345.678/0001-90',
        'qualidade@gpmservicos.com.br',
        '(11) 4589-9000',
        'ativo',
        '{
            "nomeExibicao": "GPM Serviços - Gestão da Qualidade",
            "subtitulo": "Sistema Integrado de Tratativa de RNC & Alerta Operacional 8D",
            "logoUrl": "",
            "corPrimaria": "#0f6cbd",
            "corSecundaria": "#0b5796",
            "mensagemAlerta": "Atenção: Instrução de Contenção Operacional GPM Serviços Ativa"
        }'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, slug = EXCLUDED.slug;

    -- 2. Inserir Cadastros Mestres da GPM Serviços
    INSERT INTO public.tenant_master_data (tenant_id, montadoras, linhas_fabris, postos_trabalho, modos_falha)
    VALUES (
        v_gpm_tenant_id,
        ARRAY['Volkswagen do Brasil', 'General Motors', 'Stellantis Betim', 'Renault Curitiba', 'Scania Latin America'],
        ARRAY['Linha 01 - Estamparia Pesada', 'Linha 02 - Solda Robotizada 3D', 'Linha 03 - Acabamento e Tapeçaria', 'Linha 04 - Pintura & E-coat'],
        ARRAY['OP-10 Prensa Transfer', 'OP-20 Célula Robotizada Solda', 'OP-30 Gabarito de Geometria', 'OP-40 Posto de Inspeção Visual', 'OP-50 Embalagem & Liberação'],
        ARRAY['Trinca no Ponto de Solda', 'Rebarba Cortante em Borda', 'Desvio Dimensional de Furação', 'Arranhão Profundo em Superfície Classe A', 'Falta de Componente / Presilha', 'Porosidade em Solda MAG', 'Falha de Torque em Parafuso Estrutural', 'Contaminação por Silicone em Pintura']
    )
    ON CONFLICT (tenant_id) DO NOTHING;

    -- 3. Inserir Administrador Inicial da GPM Serviços
    INSERT INTO public.tenant_users (tenant_id, email, nome, re_acesso, cargo, setor, papel, ativo)
    VALUES (
        v_gpm_tenant_id,
        'qualidade@gpmservicos.com.br',
        'Carlos Eduardo Moreira (GPM Qualidade)',
        80420,
        'Engenheiro Chefe da Qualidade',
        'Garantia da Qualidade Assegurada',
        'admin_empresa',
        true
    )
    ON CONFLICT (tenant_id, email) DO NOTHING;

END $$;
