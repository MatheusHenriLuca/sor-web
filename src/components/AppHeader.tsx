import React, { useState, useEffect } from 'react';
import { 
  Grip, 
  RefreshCw, 
  ChevronDown, 
  LogOut, 
  Menu,
  X,
  Shield,
  Palette
} from 'lucide-react';
import { UsuarioQualidade, ActiveScreen } from '../types';
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
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentScreen,
  currentUser,
  onNavigate,
  onOpenSyncModal,
  onRefreshData,
  onUserChange,
  onToggleMobileMenu,
  isMobileMenuOpen = false
}) => {
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [usersList, setUsersList] = useState<UsuarioQualidade[]>([]);

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';
  const brandName = activeTenant.customizacao.nome_exibicao || activeTenant.nome;
  const brandLogo = activeTenant.customizacao.logo_url;

  useEffect(() => {
    setUsersList(spStore.getUsuarios());
  }, [activeTenant.id]);

  const totalRncs = spStore.getRNCs().length;

  const getScreenTitle = (screen: ActiveScreen): string => {
    switch (screen) {
      case 'menu-2':
        return 'Painel de Gerenciamento de Não Conformidades';
      case 'lista-8d':
        return 'Lista de Ocorrências (RNC)';
      case 'detalhes-8d':
        return 'Detalhes da Ocorrência • Tratativa da Qualidade';
      case 'registro-8d':
        return 'Lançamento de Ocorrência • Relatório Inicial';
      case 'rastreabilidade':
        return 'Rastreabilidade SAP • Lotes e Etiquetas';
      case 'cadastro-usuarios':
        return 'Gestão de Usuários e Permissões';
      case 'configuracoes-empresa':
        return 'Gestão de Campos do Formulário, Listas de Opções & Marca';
      case 'impressao-8d':
        return 'Ficha Física de Posto de Trabalho (A4)';
      case 'verif-user':
      case 'saas-login':
        return 'Autenticação de Usuário';
      default:
        return 'Painel de Gerenciamento de Não Conformidades';
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
      
      {/* Esquerda: Menu Hamburguer Mobile + Marca White-Label do Tenant */}
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
          onClick={() => onNavigate('menu-2')}
          className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
          title="Início / Painel Principal"
        >
          <Grip className="w-4 h-4" />
        </button>

        {/* Logotipo Dinâmico White-Label e Nome da Empresa */}
        <div 
          onClick={() => onNavigate('menu-2')}
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
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm sm:text-base font-display text-slate-900 tracking-tight whitespace-nowrap">
                {brandName}
              </span>
              <span className="hidden md:inline text-xs font-mono text-slate-400">
                /{activeTenant.slug}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Centro: Título Dinâmico da Tela no Topo Superior */}
      <div className="flex items-center justify-center flex-1 px-3 sm:px-6 text-center max-w-2xl">
        <h1 className="text-xs sm:text-sm lg:text-[15px] font-display font-bold text-slate-800 tracking-tight truncate">
          {getScreenTitle(currentScreen)}
        </h1>
      </div>

      {/* Direita: Ações Rápidas & Perfil */}
      <div className="flex items-center gap-1.5 sm:gap-2">

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
          <span className="hidden lg:inline font-display">RNCs</span>
          <span className="text-slate-700 font-mono text-[11px] font-bold tabular-nums">({totalRncs.toLocaleString('pt-BR')})</span>
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
              <span className="text-xs font-semibold font-display text-slate-900 leading-tight max-w-[130px] truncate">
                {currentUser.nome.split(' ')[0]}
              </span>
              <span className="text-[10px] font-medium text-slate-500 leading-tight">
                {currentUser.perfil}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Menu Dropdown de Troca de Operador */}
          {usersDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-76 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl">
                <div className="text-xs font-bold font-display text-slate-900">{currentUser.nome}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono">RE: {currentUser.reAcesso} • {currentUser.cargo || currentUser.perfil}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">{activeTenant.nome} (/{activeTenant.slug})</div>
              </div>

              <div className="py-1.5">
                <div className="px-4 py-1 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
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
                    <span className="text-[10px] font-mono text-[#64748b] ml-2 shrink-0">{u.perfil}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-[#f1f5f9] pt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setUsersDropdownOpen(false);
                    onNavigate('configuracoes-empresa');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer font-semibold transition"
                >
                  <Palette className="w-3.5 h-3.5 text-[#0b5796]" />
                  <span>Configurações White-Label & Mestres</span>
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

