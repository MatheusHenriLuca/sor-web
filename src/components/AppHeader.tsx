import React, { useState, useEffect, useRef } from 'react';
import { 
  Grip, 
  RefreshCw, 
  ChevronDown, 
  LogOut, 
  Menu,
  X,
  Shield,
  Palette,
  CheckSquare,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { UsuarioQualidade, ActiveScreen, ActiveApp } from '../types';
import { spStore } from '../services/sharepointService';
import { tenantService } from '../services/tenantService';

interface AppHeaderProps {
  currentScreen: ActiveScreen;
  currentUser: UsuarioQualidade;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  onOpenSyncModal: () => void;
  onRefreshData?: () => void;
  onUserChange?: (user: UsuarioQualidade) => void;
  showBackButton?: boolean;
  backScreen?: ActiveScreen;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  activeApp?: ActiveApp;
  onAppChange?: (app: ActiveApp) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentScreen,
  currentUser,
  onNavigate,
  onOpenSyncModal,
  onRefreshData,
  onUserChange,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  activeApp,
  onAppChange
}) => {
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [usersList, setUsersList] = useState<UsuarioQualidade[]>([]);
  const switcherRef = useRef<HTMLDivElement>(null);

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';
  const brandName = activeTenant.customizacao.nome_exibicao || activeTenant.nome;
  const brandLogo = activeTenant.customizacao.logo_url;

  const currentApp: ActiveApp = activeApp || (currentScreen === 'plano-acao' ? 'plano_acao' : 'qualidade_8d');

  useEffect(() => {
    setUsersList(spStore.getUsuarios());
  }, [activeTenant.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setAppSwitcherOpen(false);
      }
    };
    if (appSwitcherOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [appSwitcherOpen]);

  const totalRncs = spStore.getRNCs().length;

  const getScreenTitle = (screen: ActiveScreen): string => {
    switch (screen) {
      case 'plano-acao':
        return 'Planejamento & Planos de Ação da Fábrica';
      case 'menu-2':
        return 'Painel de Gerenciamento de Não Conformidades';
      case 'lista-8d':
        return 'Lista de Ocorrências (RNC)';
      case 'detalhes-8d':
        return 'Detalhes da Ocorrência • Tratativa da Qualidade';
      case 'registro-8d':
        return 'Lançamento de Ocorrência • Relatório Inicial';
      case 'rastreabilidade':
        return 'Rastreabilidade e Contenção • Triagem de Lotes';
      case 'cadastro-usuarios':
        return 'Gestão de Usuários e Permissões';
      case 'configuracoes-empresa':
        return currentApp === 'plano_acao'
          ? 'Configurações do Planejamento & Plano de Ação'
          : 'Gestão de Campos RNC, Listas de Opções & Marca';
      case 'impressao-8d':
        return 'Relatório de 8D • Exportação PDF (A4)';
      case 'repositorio-8d':
        return 'Repositório de Relatórios de 8D';
      case 'verif-user':
      case 'saas-login':
        return 'Autenticação de Usuário';
      default:
        return 'Painel Corporativo';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-14 glass-nav px-3 sm:px-6 flex items-center justify-between select-none sticky top-0 z-40 border-b border-slate-200/80">
      
      {/* Esquerda: Menu Hamburguer Mobile + Marca White-Label + Seletor de Apps */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <button 
          type="button"
          onClick={() => {
            if (currentApp === 'plano_acao') {
              onNavigate('plano-acao');
            } else {
              onNavigate('menu-2');
            }
          }}
          className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
          title="Início do Aplicativo Atual"
        >
          <Grip className="w-4 h-4" />
        </button>

        {/* Logotipo Dinâmico White-Label e Nome da Empresa */}
        <div 
          onClick={() => {
            if (currentApp === 'plano_acao') {
              onNavigate('plano-acao');
            } else {
              onNavigate('menu-2');
            }
          }}
          className="flex items-center gap-2.5 cursor-pointer pl-0.5 group"
        >
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              referrerPolicy="no-referrer"
              className="h-8 w-auto max-w-[120px] object-contain rounded"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-white/25 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: brandColor }}
            >
              {brandName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight truncate max-w-[130px] sm:max-w-none">
                {brandName}
              </span>
              <span className="hidden xl:inline text-xs font-medium text-slate-400">
                /{activeTenant.slug}
              </span>
            </div>
            <span className="md:hidden text-[11px] font-medium text-slate-500 truncate max-w-[140px] leading-tight">
              {currentApp === 'plano_acao' ? 'Planos de Ação' : 'Gestão RNC (8D)'}
            </span>
          </div>
        </div>

        {/* SELETOR CORPORATIVO DE APLICATIVOS (SUITE SWITCHER) */}
        <div className="relative ml-1 sm:ml-2" ref={switcherRef}>
          <button
            type="button"
            onClick={() => setAppSwitcherOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-2xs ${
              currentApp === 'plano_acao'
                ? 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100'
                : 'bg-blue-50/80 border-blue-200 text-[#0b5796] hover:bg-blue-100'
            }`}
            title="Clique para alternar entre Gestão 8D e Planos de Ação"
          >
            {currentApp === 'plano_acao' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-300" />
                <span className="font-bold hidden sm:inline">Planejamento &amp; Ações</span>
                <span className="font-bold sm:hidden">Planos</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#0b5796] ring-2 ring-blue-300" />
                <span className="font-bold hidden sm:inline">Qualidade &amp; RNC (8D)</span>
                <span className="font-bold sm:hidden">8D</span>
              </>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${appSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu Dropdown de Aplicativos */}
          {appSwitcherOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Seletor de Aplicativos da Fábrica
              </div>

              <button
                type="button"
                onClick={() => {
                  setAppSwitcherOpen(false);
                  if (onAppChange) onAppChange('qualidade_8d');
                  onNavigate('menu-2');
                }}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                  currentApp === 'qualidade_8d'
                    ? 'bg-blue-50/80 text-[#0b5796] ring-1 ring-blue-200 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0b5796] flex items-center justify-center shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Gestão da Qualidade &amp; RNC</span>
                    {currentApp === 'qualidade_8d' && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-200 text-[#0b5796] text-[10px] font-bold">Ativo</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    Ocorrências, Ishikawa, 5 Porquês, Metodologia 8D e Rastreabilidade
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAppSwitcherOpen(false);
                  if (onAppChange) onAppChange('plano_acao');
                  onNavigate('plano-acao');
                }}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition cursor-pointer mt-1 ${
                  currentApp === 'plano_acao'
                    ? 'bg-amber-50/80 text-amber-900 ring-1 ring-amber-200 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">Planejamento &amp; Planos de Ação</span>
                    {currentApp === 'plano_acao' && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 text-[10px] font-bold">Ativo</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    Kanban global, ações gerais da fábrica, prazos e validação
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Centro: Título Dinâmico da Tela no Topo Superior (Desktop/Tablet) */}
      <div className="hidden lg:flex items-center justify-center flex-1 px-3 sm:px-6 text-center max-w-xl">
        <h1 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
          {getScreenTitle(currentScreen)}
        </h1>
      </div>

      {/* Direita: Ações Rápidas & Perfil */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

        {/* Botão de Acesso Rápido ao Console Super Admin */}
        <button
          type="button"
          onClick={() => onNavigate('super-admin')}
          className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer whitespace-nowrap"
          title="Abrir Console Central do Super Administrador (/super-admin)"
        >
          <Shield className="w-3.5 h-3.5 text-[#0b5796]" />
          <span>Super Admin</span>
        </button>

        {/* Status Banco / Sincronismo */}
        <button
          type="button"
          onClick={onOpenSyncModal}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer whitespace-nowrap"
          title="Status de Sincronização e Dados do Tenant"
        >
          <span className="hidden lg:inline">RNCs</span>
          <span className="text-slate-700 text-xs font-bold tabular-nums">({totalRncs.toLocaleString('pt-BR')})</span>
        </button>

        {/* Botão Sincronizar */}
        <button
          type="button"
          onClick={() => {
            if (onRefreshData) onRefreshData();
          }}
          className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
          title="Atualizar dados operacionais"
        >
          <RefreshCw className="w-3.5 h-3.5 hover:rotate-180 transition-transform duration-500" />
        </button>

        {/* Separador */}
        <div className="h-4.5 w-px bg-slate-200 mx-0.5 sm:mx-1" />

        {/* Avatar / Perfil do Operador com Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUsersDropdownOpen(!usersDropdownOpen)}
            className="flex items-center gap-2 h-9 px-2 sm:px-2.5 rounded-xl hover:bg-slate-100/80 transition-all cursor-pointer border border-transparent hover:border-slate-200/80 active:scale-98"
          >
            <div
              className="w-7.5 h-7.5 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-1 ring-white/30"
              style={{ backgroundColor: brandColor }}
            >
              {getInitials(currentUser.nome)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight max-w-[130px] truncate">
                {currentUser.nome.split(' ')[0]}
              </span>
              <span className="text-[11px] font-medium text-slate-500 leading-tight">
                {currentUser.perfil}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Menu Dropdown de Troca de Operador */}
          {usersDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-76 max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                <div className="text-xs font-bold text-slate-900">{currentUser.nome}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">RE: {currentUser.reAcesso} • {currentUser.cargo || currentUser.perfil}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-semibold">{activeTenant.nome} (/{activeTenant.slug})</div>
              </div>

              <div className="py-1.5">
                <div className="px-4 py-1 text-xs font-bold text-[#64748b]">
                  Equipe da Empresa ({activeTenant.nome})
                </div>
                {usersList.slice(0, 6).map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      if (onUserChange) onUserChange(u);
                      setUsersDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-[#f1f5f9] transition cursor-pointer ${
                      u.id === currentUser.id ? 'font-bold text-[#0f6cbd] bg-blue-50/60' : 'text-[#0f172a]'
                    }`}
                  >
                    <span className="truncate">{u.nome}</span>
                    <span className="text-[11px] font-medium text-[#64748b] ml-2 shrink-0">{u.perfil}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-[#f1f5f9] pt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setUsersDropdownOpen(false);
                    onNavigate('configuracoes-empresa', {
                      tab: currentApp === 'plano_acao' ? 'plano_config' : 'form_builder'
                    });
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-semibold transition"
                >
                  <Palette className="w-3.5 h-3.5 text-[#0b5796]" />
                  <span>
                    {currentApp === 'plano_acao'
                      ? 'Configurações do Planejamento & Marca'
                      : 'Configurações RNC & Marca'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsersDropdownOpen(false);
                    onNavigate('super-admin');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-semibold transition"
                >
                  <Shield className="w-3.5 h-3.5 text-[#0b5796]" />
                  <span>Console Super Admin (/super-admin)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsersDropdownOpen(false);
                    onNavigate('saas-login');
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Trocar Empresa / Sair (Login SaaS)</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};

export default AppHeader;

