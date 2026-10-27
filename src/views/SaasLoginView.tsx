import React, { useState, useEffect, useMemo } from 'react';
import {
  LogIn,
  ShieldCheck,
  Building2,
  Hash,
  Lock,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Globe,
  Unlock
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
    cleanEmailInput === 'superadmin@sor-saas.com' ||
    cleanEmailInput === '104235' ||
    cleanEmailInput === '#104235';

  // Verifica em tempo real se o código de registro (RE) ou login exige senha
  const passwordCheck = useMemo(() => {
    return tenantService.checkUserRequiresPassword(email, slugTenant?.slug);
  }, [email, slugTenant?.slug, allTenants]);

  const requiresPassword = !passwordCheck.found || passwordCheck.requiresPassword || passwordCheck.isSuperAdmin;

  // Descobre dinamicamente a empresa à medida que o usuário digita o Código de Registro (RE) ou E-mail
  useEffect(() => {
    if (slugTenant) {
      setDiscoveredTenant(slugTenant);
      tenantService.applyTenantThemeToDOM(slugTenant);
      return;
    }

    if (passwordCheck.found && passwordCheck.tenant) {
      setDiscoveredTenant(passwordCheck.tenant);
      tenantService.applyTenantThemeToDOM(passwordCheck.tenant);
      return;
    }

    setDiscoveredTenant(null);
  }, [email, slugTenant, passwordCheck]);

  const handleSubmit = (e?: React.FormEvent, forceSuperAdmin = false) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const auth = tenantService.authenticateByEmail(
      email,
      requiresPassword ? senha : '',
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
              Informe seu <strong>Código de Registro (RE numérico)</strong> ou e-mail corporativo para acessar sua conta.
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
                Código de Registro (RE Numérico) ou E-mail <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Digite seu código numérico de registro (ex: 30122) ou e-mail"
                  className="form-input !pl-10 w-full text-sm font-medium"
                  autoComplete="username"
                  required
                />
              </div>

              {passwordCheck.found && passwordCheck.user && !passwordCheck.isSuperAdmin && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {passwordCheck.user.nome}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        RE #{passwordCheck.user.reAcesso}
                        {passwordCheck.tenant ? ` • ${passwordCheck.tenant.nome}` : ''}
                      </div>
                    </div>
                  </div>
                  {!requiresPassword && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                      <Unlock className="w-3 h-3" />
                      Acesso Direto
                    </span>
                  )}
                </div>
              )}

              {isMasterEmail && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#0b5796]" />
                  <span>Credencial Exclusiva Super Admin reconhecida</span>
                </div>
              )}
            </div>

            {requiresPassword ? (
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
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Acesso liberado sem senha:</span> seu usuário está configurado para entrar diretamente com o Código de Registro (<strong>#{passwordCheck.user?.reAcesso}</strong>).
                </div>
              </div>
            )}

            <div className="pt-1 space-y-2.5">
              <button
                type="submit"
                className="w-full h-11 rounded-lg text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-95 cursor-pointer shadow-xs"
                style={{ backgroundColor: brandColor }}
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isMasterEmail
                    ? 'Entrar no Console Super Admin'
                    : activeBrandTenant
                    ? `Entrar em ${activeBrandTenant.nome}`
                    : 'Entrar no Sistema'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
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

