import React, { useState, useEffect } from 'react';
import { 
  Grip, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  LogOut, 
  Menu,
  X,
  Plus
} from 'lucide-react';
import { UsuarioQualidade, ActiveScreen } from '../types';
import { spStore } from '../services/sharepointService';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setUsersList(spStore.getUsuarios());
  }, []);

  const totalRncs = spStore.getRNCs().length;

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onNavigate('lista-8d', { search: searchTerm.trim() });
      setMobileSearchOpen(false);
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
    <header className="h-14 bg-white border-b border-[#e2e8f0] px-3 sm:px-6 flex items-center justify-between select-none sticky top-0 z-40 shadow-2xs">
      
      {/* Esquerda: Menu Hamburguer Mobile + Marca SOR */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Botão de Menu Hamburguer para Mobile / Tablet */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition cursor-pointer"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Waffle / Início */}
        <button 
          type="button"
          onClick={() => onNavigate('menu-2')}
          className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition cursor-pointer"
          title="Início / Painel Principal"
        >
          <Grip className="w-4 h-4" />
        </button>

        {/* Logotipo e Nome do Sistema */}
        <div 
          onClick={() => onNavigate('menu-2')}
          className="flex items-center gap-2.5 cursor-pointer pl-1"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0f6cbd] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            G
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm sm:text-base text-[#0f172a] tracking-tight">
              SOR
            </span>
            <span className="hidden sm:inline text-xs font-medium text-[#64748b]">
              • Gestão da Qualidade
            </span>
          </div>
        </div>
      </div>

      {/* Centro: Barra de Pesquisa Rápida Global */}
      <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-6">
        <form onSubmit={handleGlobalSearch} className="w-full relative flex items-center">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Pesquisar RNC, peça, cliente ou SAP..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-[38px] !pl-[42px] !pr-9 bg-[#f8fafc] hover:bg-[#f1f5f9] focus:bg-white text-[#0f172a] placeholder-[#94a3b8] text-[13px] rounded-lg border border-[#e2e8f0] focus:border-[#0f6cbd] focus:ring-2 focus:ring-[#0f6cbd]/15 focus:outline-none transition-all shadow-2xs leading-normal"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1 cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Direita: Ações Rápidas, Telemetria & Perfil */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        
        {/* Botão de Pesquisa para telas pequenas */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition cursor-pointer"
          title="Pesquisar"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Status SharePoint Online */}
        <button
          type="button"
          onClick={onOpenSyncModal}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9] transition cursor-pointer border border-transparent hover:border-[#e2e8f0]"
          title="Clique para abrir status de conexão SharePoint"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden lg:inline">SharePoint Online</span>
          <span className="text-[#64748b] font-mono text-[11px]">({totalRncs.toLocaleString('pt-BR')})</span>
        </button>

        {/* Botão Sincronizar */}
        <button
          type="button"
          onClick={() => {
            if (onRefreshData) onRefreshData();
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition cursor-pointer"
          title="Atualizar dados"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Separador */}
        <div className="h-5 w-px bg-[#e2e8f0] mx-0.5 sm:mx-1" />

        {/* Avatar / Perfil do Operador com Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUsersDropdownOpen(!usersDropdownOpen)}
            className="flex items-center gap-2 h-9 px-2 sm:px-2.5 rounded-lg hover:bg-[#f1f5f9] transition cursor-pointer border border-transparent hover:border-[#e2e8f0]"
          >
            <div className="w-7 h-7 rounded-full bg-[#0f6cbd] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {getInitials(currentUser.nome)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#0f172a] leading-tight max-w-[130px] truncate">
                {currentUser.nome.split(' ')[0]}
              </span>
              <span className="text-[11px] text-[#64748b] leading-tight">
                {currentUser.perfil}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
          </button>

          {/* Menu Dropdown de Troca de Operador */}
          {usersDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl border border-[#e2e8f0] shadow-xl py-1.5 z-50 animate-in fade-in">
              <div className="px-4 py-3 border-b border-[#f1f5f9] bg-[#f8fafc]/70 rounded-t-xl">
                <div className="text-xs font-bold text-[#0f172a]">{currentUser.nome}</div>
                <div className="text-[11px] text-[#64748b] mt-0.5">RE: {currentUser.reAcesso} • {currentUser.cargo || currentUser.perfil}</div>
                <div className="text-[10px] text-[#94a3b8] mt-0.5">{currentUser.setor || 'Chão de Fábrica'}</div>
              </div>

              <div className="py-1.5">
                <div className="px-4 py-1 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                  Trocar Usuário (Modo Fábrica)
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

              <div className="border-t border-[#f1f5f9] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUsersDropdownOpen(false);
                    onNavigate('verif-user');
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair do Terminal</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Caixa de Pesquisa Expansível para Mobile */}
      {mobileSearchOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-white border-b border-[#e2e8f0] p-3 shadow-md z-40 animate-in slide-in-from-top-2">
          <form onSubmit={handleGlobalSearch} className="relative flex items-center">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              autoFocus
              placeholder="Pesquisar RNC, peça, cliente ou SAP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-[38px] !pl-[42px] !pr-9 bg-[#f8fafc] hover:bg-[#f1f5f9] focus:bg-white text-[#0f172a] placeholder-[#94a3b8] text-[13px] rounded-lg border border-[#e2e8f0] focus:border-[#0f6cbd] focus:ring-2 focus:ring-[#0f6cbd]/15 focus:outline-none transition-all leading-normal"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1 cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>
      )}

    </header>
  );
};

export default AppHeader;
