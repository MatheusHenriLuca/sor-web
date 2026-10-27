import React, { useState, useEffect } from 'react';
import {
  LogIn,
  ShieldCheck,
  Building2,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { TenantRecord, UsuarioQualidade } from '../types';
import { tenantService } from '../services/tenantService';
import { spStore } from '../services/sharepointService';

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
  onLoginSuperAdmin
}) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [discoveredTenant, setDiscoveredTenant] = useState<TenantRecord | null>(null);
  const [, setSyncTick] = useState(0);

  useEffect(() => {
    spStore.syncWithCloudAndSupabase('pull');
    const unsub = tenantService.subscribe(() => {
      setSyncTick(prev => prev + 1);
    });
    return () => unsub();
  }, []);

  const allTenants = tenantService.getTenants();
  const slugTenant = tenantSlug ? tenantService.getTenantBySlug(tenantSlug) : undefined;
  const activeBrandTenant = slugTenant || discoveredTenant;
  const brandColor = activeBrandTenant?.customizacao?.cor_primaria || '#0b5796';

  const cleanEmailInput = email.trim().toLowerCase();
  const isMasterEmail =
    cleanEmailInput === 'mhsolucoes@adimin.com.br' ||
    cleanEmailInput === 'mhsolucoes@admin.com.br' ||
    cleanEmailInput === 'superadmin@sor-saas.com';

  // Descobre dinamicamente a empresa à medida que o usuário digita o e-mail ou RE
  useEffect(() => {
    if (slugTenant) {
      setDiscoveredTenant(slugTenant);
      tenantService.applyTenantThemeToDOM(slugTenant);
      return;
    }

    const clean = email.trim().toLowerCase();
    const numericRe = /^\d+$/.test(clean.replace(/^#/, ''))
      ? Number(clean.replace(/^#/, ''))
      : NaN;

    if (!clean.includes('@') && isNaN(numericRe)) {
      setDiscoveredTenant(null);
      return;
    }

    for (const t of allTenants) {
      const users = tenantService.getUnifiedUsersMatrix(t.id);
      if (
        users.some(
          u =>
            (u.email || '').toLowerCase() === clean ||
            (!isNaN(numericRe) && u.reAcesso === numericRe)
        )
      ) {
        setDiscoveredTenant(t);
        tenantService.applyTenantThemeToDOM(t);
        return;
      }
    }
    setDiscoveredTenant(null);
  }, [email, slugTenant, allTenants]);

  const handleSubmit = (e?: React.FormEvent, forceSuperAdmin = false) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const auth = tenantService.authenticateByEmail(
      email,
      senha,
      forceSuperAdmin ? undefined : slugTenant?.slug,
      forceSuperAdmin
    );
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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between font-sans text-[#0f172a]">
      {/* Barra Superior Corporativa Limpa */}
      <header className="h-14 px-4 sm:px-8 flex items-center justify-between gap-4 border-b border-slate-200 bg-white">
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
              className="px-2.5 h-8 rounded-lg text-white flex items-center justify-center font-display font-bold text-xs shadow-2xs"
              style={{ backgroundColor: brandColor }}
            >
              {activeBrandTenant
                ? activeBrandTenant.nome.substring(0, 2).toUpperCase()
                : 'MH'}
            </div>
          )}
          <span className="font-display font-bold text-sm sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
            {activeBrandTenant
              ? activeBrandTenant.customizacao.nome_exibicao || activeBrandTenant.nome
              : 'MH Qualidade • Gestão Corporativa'}
          </span>
        </div>

        <div className="text-xs font-medium text-slate-500 hidden sm:flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#0b5796]" />
          <span>Ambiente Corporativo Isolado</span>
        </div>
      </header>

      {/* Card Central Único de Autenticação */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Identificação de Rota / Empresa */}
          <div className="flex items-center justify-between gap-2 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono">
                {slugTenant ? `/${slugTenant.slug}/login` : 'Acesso Seguro'}
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
                ? `Portal — ${slugTenant.customizacao.nome_exibicao || slugTenant.nome}`
                : 'Acesso ao Sistema'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Informe seu e-mail corporativo ou matrícula (RE) e sua senha de acesso.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={e => handleSubmit(e, false)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                E-mail Corporativo ou Matrícula (RE) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nome@suaempresa.com.br ou RE"
                  className="form-input !pl-10 w-full text-sm font-medium"
                  autoComplete="username"
                  required
                />
              </div>
              {!slugTenant && discoveredTenant && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Empresa: <strong>{discoveredTenant.nome}</strong>
                  </span>
                </div>
              )}
              {isMasterEmail && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#0b5796]" />
                  <span>Credencial Master Super Admin reconhecida</span>
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
                  placeholder="Digite sua senha"
                  className="form-input !pl-10 w-full text-sm font-medium"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <div className="pt-1 space-y-2.5">
              <button
                type="submit"
                className="w-full h-11 rounded-lg text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-95 cursor-pointer shadow-xs"
                style={{ backgroundColor: brandColor }}
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {activeBrandTenant
                    ? `Entrar em ${activeBrandTenant.nome}`
                    : 'Entrar no Sistema'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {isMasterEmail && (
                <button
                  type="button"
                  onClick={e => handleSubmit(e, true)}
                  className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-display font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Acessar Console Super Admin (Gestão de Empresas)</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* Rodapé Corporativo Discreto */}
      <footer className="h-11 px-6 flex items-center justify-center border-t border-slate-200 bg-white text-xs text-slate-500">
        <span>MH Qualidade — Gestão de Não Conformidades, Planos de Ação e Metodologia 8D</span>
      </footer>
    </div>
  );
};

export default SaasLoginView;
