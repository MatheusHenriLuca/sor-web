import React, { useState, useEffect } from 'react';
import {
  LogIn,
  ShieldCheck,
  Building2,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Layers,
  KeyRound,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { TenantRecord, UsuarioQualidade } from '../types';
import { tenantService } from '../services/tenantService';

interface SaasLoginViewProps {
  tenantSlug?: string;
  onLoginTenantSuccess: (user: UsuarioQualidade, tenant: TenantRecord) => void;
  onLoginSuperAdmin: (user: UsuarioQualidade) => void;
  onSwitchToFactoryKeypad?: () => void;
  onChangeSlugPreview?: (slug?: string) => void;
}

export const SaasLoginView: React.FC<SaasLoginViewProps> = ({
  tenantSlug,
  onLoginTenantSuccess,
  onLoginSuperAdmin,
  onSwitchToFactoryKeypad,
  onChangeSlugPreview
}) => {
  const [email, setEmail] = useState('mhsolucoes@adimin.com.br');
  const [senha, setSenha] = useState('123');
  const [errorMessage, setErrorMessage] = useState('');
  const [discoveredTenant, setDiscoveredTenant] = useState<TenantRecord | null>(null);

  const allTenants = tenantService.getTenants();
  const slugTenant = tenantSlug ? tenantService.getTenantBySlug(tenantSlug) : undefined;
  const activeBrandTenant = slugTenant || discoveredTenant;
  const brandColor = activeBrandTenant?.customizacao?.cor_primaria || '#0b5796';

  // Descobre dinamicamente a empresa à medida que o usuário digita o e-mail no Login Global
  useEffect(() => {
    if (slugTenant) {
      setDiscoveredTenant(slugTenant);
      tenantService.applyTenantThemeToDOM(slugTenant);
      return;
    }

    const clean = email.trim().toLowerCase();
    if (!clean.includes('@')) {
      setDiscoveredTenant(null);
      return;
    }

    for (const t of allTenants) {
      const users = tenantService.getUsersForTenant(t.id);
      if (users.some(u => (u.email || '').toLowerCase() === clean)) {
        setDiscoveredTenant(t);
        tenantService.applyTenantThemeToDOM(t);
        return;
      }
    }
    setDiscoveredTenant(null);
  }, [email, slugTenant, allTenants]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const auth = tenantService.authenticateByEmail(email, senha, slugTenant?.slug);
    if (!auth.success) {
      setErrorMessage(auth.message);
      return;
    }

    if (auth.isSuperAdmin && auth.user) {
      onLoginSuperAdmin(auth.user);
      return;
    }

    if (auth.user && auth.tenant) {
      onLoginTenantSuccess(auth.user, auth.tenant);
    }
  };

  const handleQuickDemoClick = (demoEmail: string, demoSenha: string, forceSuperAdmin?: boolean) => {
    setEmail(demoEmail);
    setSenha(demoSenha);
    setErrorMessage('');

    const auth = tenantService.authenticateByEmail(demoEmail, demoSenha, undefined, forceSuperAdmin);
    if (!auth.success) {
      setErrorMessage(auth.message);
      return;
    }

    if (auth.isSuperAdmin && auth.user) {
      onLoginSuperAdmin(auth.user);
      return;
    }

    if (auth.user && auth.tenant) {
      onLoginTenantSuccess(auth.user, auth.tenant);
    }
  };

  const quickProfiles = tenantService.getQuickDemoProfiles(slugTenant?.slug);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans text-[#0f172a]">
      {/* Barra Superior Seguindo Top Bar Contract */}
      <header className="h-14 px-4 sm:px-8 flex items-center justify-between gap-8 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2.5 shrink-0">
          {activeBrandTenant?.customizacao?.logo_url ? (
            <img
              src={activeBrandTenant.customizacao.logo_url}
              alt={activeBrandTenant.nome}
              referrerPolicy="no-referrer"
              className="h-8 w-auto max-w-[140px] object-contain rounded"
            />
          ) : (
            <div
              className="px-2 h-8 rounded-lg text-white flex items-center justify-center font-display font-bold text-xs shadow-2xs"
              style={{ backgroundColor: brandColor }}
            >
              {activeBrandTenant ? activeBrandTenant.nome.substring(0, 2).toUpperCase() : 'MH Qualidade'}
            </div>
          )}
          <span className="font-display font-bold text-sm sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
            {activeBrandTenant
              ? `MH Qualidade • ${activeBrandTenant.customizacao.nome_exibicao || activeBrandTenant.nome}`
              : 'MH Qualidade • MH Lean & Soluções'}
          </span>
        </div>

        {/* Seletor de Contexto de Rota para Demonstrar Roteamento por Slug */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onChangeSlugPreview && onChangeSlugPreview(undefined)}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !tenantSlug ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Login Global (/)
          </button>
          {allTenants.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChangeSlugPreview && onChangeSlugPreview(t.slug)}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer font-mono ${
                tenantSlug === t.slug ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
              }`}
            >
              /{t.slug}/login
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {onSwitchToFactoryKeypad && (
            <button
              type="button"
              onClick={onSwitchToFactoryKeypad}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Terminal RE (Fábrica)
            </button>
          )}
        </div>
      </header>

      {/* Corpo Principal em Grid 2 Colunas Balanceadas (1440px Baseline) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Coluna Esquerda: Formulário de Autenticação */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Identificação de Rota / Tenant */}
              <div className="flex items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">
                    {slugTenant ? `app.mhqualidade.com/${slugTenant.slug}/login` : 'app.mhqualidade.com/login'}
                  </span>
                </div>
                {activeBrandTenant && (
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{activeBrandTenant.nome}</span>
                  </span>
                )}
              </div>

              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 tracking-tight">
                  {slugTenant
                    ? `Portal da Qualidade — ${slugTenant.customizacao.nome_exibicao || slugTenant.nome}`
                    : 'Acesso Corporativo Multi-Tenant'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {slugTenant
                    ? 'Ambiente isolado com Row Level Security (RLS) dedicado à sua unidade fabril.'
                    : 'Insira seu e-mail corporativo. O sistema identifica automaticamente sua empresa ou perfil Super Admin.'}
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    E-mail Corporativo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="nome@suaempresa.com.br"
                      className="form-input !pl-10 w-full text-sm font-medium"
                      required
                    />
                  </div>
                  {!slugTenant && discoveredTenant && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Empresa identificada: <strong>{discoveredTenant.nome}</strong> (/{discoveredTenant.slug})
                      </span>
                    </div>
                  )}
                  {!slugTenant && (email.trim().toLowerCase() === 'mhsolucoes@adimin.com.br' || email.trim().toLowerCase() === 'superadmin@sor-saas.com') && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#0b5796]" />
                      <span>Credencial Master Autorizada: MH Lean & Soluções &amp; Console MH Qualidade</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Senha de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="••••••"
                      className="form-input !pl-10 w-full text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-11 rounded-lg text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-95 cursor-pointer shadow-xs"
                  style={{ backgroundColor: brandColor }}
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {email.trim().toLowerCase() === 'superadmin@sor-saas.com'
                      ? 'Acessar Console Super Admin'
                      : activeBrandTenant
                      ? `Entrar em ${activeBrandTenant.nome}`
                      : 'Autenticar e Identificar Empresa'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>Isolamento PostgreSQL RLS por tenant_id</span>
              <span>•</span>
              <span>Compressão WebP Client-Side Ativa</span>
            </div>
          </div>

          {/* Coluna Direita: Atalhos Rápidos de Homologação por Perfil */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-[#0b5796]" />
                <h2 className="text-sm font-display font-bold text-slate-900">
                  Acesso Rápido de Demonstração (1 Clique)
                </h2>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Selecione um perfil abaixo para acessar imediatamente o Console <strong>MH Qualidade</strong>, o Sistema Padrão{' '}
                <strong>MH Lean &amp; Soluções</strong> ou o isolamento entre empresas:
              </p>

              <div className="space-y-2.5">
                {quickProfiles.map((prof, idx) => (
                  <button
                    key={`${prof.email}-${idx}`}
                    type="button"
                    onClick={() => handleQuickDemoClick(prof.email, prof.senha, prof.isSuperAdmin)}
                    className="w-full p-3 rounded-lg border border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-white transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {prof.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {prof.email} · {prof.tenantName}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: prof.accentColor }}
                      >
                        {prof.roleBadge}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resumo de Arquitetura Multi-Tenant */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0b5796]" />
                <span>Empresas Ativas no Ambiente</span>
              </div>
              <div className="space-y-1.5 mt-2">
                {allTenants.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: t.customizacao.cor_primaria }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{t.nome}</span>
                      <span className="font-mono text-[11px] text-slate-400">/{t.slug}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé Limpo */}
      <footer className="h-11 px-6 flex items-center justify-between border-t border-slate-200 bg-white text-xs text-slate-500">
        <span>MH Qualidade • MH Lean &amp; Soluções — Plataforma de Gestão de Não Conformidades e 8D</span>
        <span className="font-mono tabular-nums">Sistema Padrão: MH Lean &amp; Soluções (/mh-lean-solucoes)</span>
      </footer>
    </div>
  );
};

export default SaasLoginView;
