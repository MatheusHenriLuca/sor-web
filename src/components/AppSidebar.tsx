import React, { useState } from 'react';
import { 
  Plus, 
  LayoutGrid, 
  Users, 
  UserCheck, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Layers,
  Building2,
  Factory,
  X,
  Palette,
  Shield,
  CheckSquare,
  Archive,
  Sliders
} from 'lucide-react';
import { ActiveScreen, UsuarioQualidade, ActiveApp } from '../types';
import { tenantService } from '../services/tenantService';

interface AppSidebarProps {
  currentScreen: ActiveScreen;
  screenParams?: any;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  currentUser: UsuarioQualidade;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  activeApp?: ActiveApp;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentScreen,
  screenParams,
  onNavigate,
  currentUser,
  isMobileOpen = false,
  onCloseMobile,
  activeApp
}) => {
  const isOperator = currentUser.perfil === 'User';
  const role = currentUser.perfil;

  // Estados dos grupos expansíveis (iniciam abertos conforme especificação)
  const [openOcorr, setOpenOcorr] = useState(true);
  const [openConfig, setOpenConfig] = useState(true);

  // Estado de recuo/expansão no desktop (PC), persistente no localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('app_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('app_sidebar_collapsed', String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';

  // Permissões conforme perfil do usuário (Configurações e Perfis de Usuários exclusivos do Admin da empresa)
  const canSeeOcorrClienteInterna = role !== 'User';
  const canSeeConfig = tenantService.isCompanyAdminUser(currentUser);

  const handleItemClick = (screen: ActiveScreen, params?: any) => {
    onNavigate(screen, params);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getLinkClasses = (isActive: boolean, collapsed: boolean) => {
    if (collapsed) {
      return `
        relative group w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-[13px] transition-all duration-200 cursor-pointer select-none active:scale-95
        ${isActive 
          ? 'bg-[#0f6cbd]/15 text-[#0b5796] font-semibold ring-1 ring-[#0f6cbd]/30 shadow-xs' 
          : 'text-[#475569] hover:bg-slate-100 hover:text-[#0f172a]'}
      `.trim();
    }
    return `
      relative group w-full flex items-center !gap-3 !px-3.5 !h-10 rounded-xl text-[13px] transition-all duration-200 cursor-pointer text-left select-none active:scale-[0.98]
      ${isActive 
        ? 'bg-[#0f6cbd]/10 text-[#0b5796] font-semibold shadow-xs' 
        : 'text-[#475569] hover:bg-slate-100/80 hover:text-[#0f172a] font-medium'}
    `.trim();
  };

  const getIconClasses = (isActive: boolean, collapsed: boolean) => `
    ${collapsed ? 'w-5 h-5' : 'w-4 h-4'} shrink-0 transition-transform duration-200 group-hover:scale-105
    ${isActive ? 'text-[#0f6cbd]' : 'text-[#64748b] group-hover:text-[#0f172a]'}
  `.trim();

  const renderNavContent = (isMobileDrawer: boolean) => {
    // No mobile drawer o menu é sempre expandido por definição
    const collapsed = isMobileDrawer ? false : isCollapsed;

    return (
      <div className="flex flex-col justify-between h-full select-none bg-white">
        
        {/* Área Superior com Navegação e Grupos */}
        <div className={`flex flex-col overflow-y-auto flex-1 ${collapsed ? '!p-2 !gap-3' : '!p-4 !gap-5'}`}>
          
          {/* Header do Drawer Mobile (apenas em visualização mobile) */}
          {isMobileDrawer && (
            <div className="flex items-center justify-between !pb-3 border-b border-[#e2e8f0]">
              <div className="flex items-center !gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0e67b0] to-[#09477d] text-white flex items-center justify-center font-display font-bold text-xs shadow-xs border border-white/20">
                  {activeTenant.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-sm text-[#0f172a] leading-tight">{activeTenant.nome}</span>
                  <span className="text-[11px] text-[#64748b]">MH Qualidade • MH Lean &amp; Soluções</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="!p-1.5 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition cursor-pointer"
                aria-label="Fechar menu lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Botão de Recuar / Expandir no Desktop */}
          {!isMobileDrawer && (
            <div>
              {collapsed ? (
                <div className="flex justify-center pb-1">
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    title="Expandir Menu Lateral"
                    aria-label="Expandir menu"
                    className="w-10 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-[#0b5796] hover:bg-blue-50 border border-slate-200 shadow-2xs transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4 text-[#0b5796]" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navegação</span>
                  <button
                    type="button"
                    onClick={toggleCollapse}
                    title="Recuar Menu Lateral"
                    aria-label="Recuar menu"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-[#0b5796] hover:bg-blue-50 text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Recuar</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Condicional: Aplicativo de Planos de Ação vs Gestão da Qualidade (8D) */}
          {(() => {
            const isPlanApp = (activeApp === 'plano_acao') || (currentScreen === 'plano-acao');

            return (
              <>
                {isPlanApp ? (
                  <>
                    {/* BOTÃO PRINCIPAL PLANO: + Novo Plano */}
                    <div>
                      {collapsed ? (
                        <button
                          type="button"
                          onClick={() => handleItemClick('plano-acao', { openNewPlan: true, timestamp: Date.now() })}
                          style={{ backgroundColor: brandColor }}
                          title="Novo Plano de Ação"
                          aria-label="Novo Plano de Ação"
                          className="w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-white shadow-sm hover:opacity-95 transition cursor-pointer"
                        >
                          <Plus className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleItemClick('plano-acao', { openNewPlan: true, timestamp: Date.now() })}
                          style={{ backgroundColor: brandColor }}
                          className="btn-primary w-full !h-10.5 text-[13px] font-semibold !justify-center shadow-sm hover:opacity-95"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Novo Plano de Ação</span>
                        </button>
                      )}
                    </div>

                    {/* NAVEGAÇÃO DO APP DE PLANO DE AÇÃO */}
                    <div>
                      {!collapsed && (
                        <div className="!px-3 !pb-1.5 text-xs font-bold text-[#64748b] select-none">
                          Módulos de Ação
                        </div>
                      )}
                      {collapsed && (
                        <div className="w-8 mx-auto h-px bg-slate-200 my-1" />
                      )}
                      <div className={`flex flex-col ${collapsed ? 'gap-1.5 items-center' : '!gap-1'}`}>
                        <button
                          type="button"
                          onClick={() => handleItemClick('plano-acao', { viewMode: 'kanban', filterEtapa: 'todas' })}
                          title={collapsed ? 'Kanban de Planos' : undefined}
                          className={getLinkClasses(currentScreen === 'plano-acao' && screenParams?.viewMode !== 'list' && screenParams?.filterEtapa !== 'validacao' && screenParams?.filterEtapa !== 'minhas', collapsed)}
                        >
                          <LayoutGrid className={getIconClasses(currentScreen === 'plano-acao' && screenParams?.viewMode !== 'list' && screenParams?.filterEtapa !== 'validacao' && screenParams?.filterEtapa !== 'minhas', collapsed)} />
                          {!collapsed && <span className="truncate">Kanban de Planos</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemClick('plano-acao', { viewMode: 'list', filterEtapa: 'todas' })}
                          title={collapsed ? 'Visão em Lista' : undefined}
                          className={getLinkClasses(currentScreen === 'plano-acao' && screenParams?.viewMode === 'list', collapsed)}
                        >
                          <Layers className={getIconClasses(currentScreen === 'plano-acao' && screenParams?.viewMode === 'list', collapsed)} />
                          {!collapsed && <span className="truncate">Lista de Planos</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemClick('plano-acao', { filterEtapa: 'validacao' })}
                          title={collapsed ? 'Aguardando Validação' : undefined}
                          className={getLinkClasses(currentScreen === 'plano-acao' && screenParams?.filterEtapa === 'validacao', collapsed)}
                        >
                          <CheckSquare className={getIconClasses(currentScreen === 'plano-acao' && screenParams?.filterEtapa === 'validacao', collapsed)} />
                          {!collapsed && <span className="truncate">Aguardando Validação</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemClick('plano-acao', { filterEtapa: 'minhas' })}
                          title={collapsed ? 'Minhas Ações' : undefined}
                          className={getLinkClasses(currentScreen === 'plano-acao' && screenParams?.filterEtapa === 'minhas', collapsed)}
                        >
                          <Users className={getIconClasses(currentScreen === 'plano-acao' && screenParams?.filterEtapa === 'minhas', collapsed)} />
                          {!collapsed && <span className="truncate">Minhas Ações</span>}
                        </button>
                      </div>
                    </div>

                    {/* OUTROS APLICATIVOS: Ir para Gestão RNC (8D) */}
                    <div className="pt-2 border-t border-slate-200">
                      {!collapsed && (
                        <div className="!px-3 !pb-1.5 text-xs font-bold text-[#64748b] select-none">
                          Outros Aplicativos
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleItemClick('menu-2')}
                        title={collapsed ? 'Ir para Gestão RNC (8D)' : undefined}
                        className={getLinkClasses(false, collapsed)}
                      >
                        <Layers className={getIconClasses(false, collapsed)} />
                        {!collapsed && <span className="truncate font-semibold text-[#0b5796]">Ir para Gestão RNC (8D)</span>}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 1. BOTÃO DE AÇÃO PRINCIPAL: + Nova Ocorrência */}
                    <div>
                      {collapsed ? (
                        <button
                          type="button"
                          onClick={() => handleItemClick('registro-8d', { edicao: false, rncId: undefined, timestamp: Date.now() })}
                          style={{ backgroundColor: brandColor }}
                          title="Nova Ocorrência"
                          aria-label="Nova Ocorrência"
                          className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center text-white shadow-sm hover:opacity-95 transition cursor-pointer ${
                            currentScreen === 'registro-8d' ? 'ring-2 ring-[#0f6cbd] ring-offset-2' : ''
                          }`}
                        >
                          <Plus className="w-5 h-5 stroke-[2.5]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleItemClick('registro-8d', { edicao: false, rncId: undefined, timestamp: Date.now() })}
                          style={{ backgroundColor: brandColor }}
                          className={`btn-primary w-full !h-10.5 text-[13px] font-semibold !justify-center shadow-sm hover:opacity-95 ${
                            currentScreen === 'registro-8d' ? 'ring-2 ring-[#0f6cbd] ring-offset-2' : ''
                          }`}
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Nova Ocorrência</span>
                        </button>
                      )}
                    </div>

                    {/* 2. CATEGORIA: ACESSO PRINCIPAL */}
                    <div>
                      {!collapsed && (
                        <div className="!px-3 !pb-1.5 text-xs font-bold text-[#64748b] select-none">
                          Acesso Principal
                        </div>
                      )}
                      {collapsed && (
                        <div className="w-8 mx-auto h-px bg-slate-200 my-1" />
                      )}
                      <div className={`flex flex-col ${collapsed ? 'gap-1.5 items-center' : '!gap-1'}`}>
                        <button
                          type="button"
                          onClick={() => handleItemClick('menu-2')}
                          title={collapsed ? 'Menu Principal' : undefined}
                          aria-label="Menu Principal"
                          className={getLinkClasses(currentScreen === 'menu-2', collapsed)}
                        >
                          {currentScreen === 'menu-2' && !collapsed && (
                            <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                          )}
                          <LayoutGrid className={getIconClasses(currentScreen === 'menu-2', collapsed)} />
                          {!collapsed && <span className="truncate">Menu Principal</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleItemClick('repositorio-8d')}
                          title={collapsed ? 'Repositório 8D' : undefined}
                          aria-label="Repositório 8D"
                          className={getLinkClasses(currentScreen === 'repositorio-8d', collapsed)}
                        >
                          {currentScreen === 'repositorio-8d' && !collapsed && (
                            <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                          )}
                          <Archive className={getIconClasses(currentScreen === 'repositorio-8d', collapsed)} />
                          {!collapsed && <span className="truncate">Repositório 8D</span>}
                        </button>
                      </div>
                    </div>

                    {/* 3. CATEGORIA: REGISTRO DE OCORRÊNCIAS (Exclusivo do App RNC 8D) */}
                    <div>
                      {!collapsed ? (
                        <button
                          type="button"
                          onClick={() => setOpenOcorr(!openOcorr)}
                          className="w-full flex items-center justify-between !px-3 !py-1.5 text-xs font-bold text-[#64748b] hover:text-[#0f172a] rounded-lg hover:bg-slate-100/60 transition-colors select-none group cursor-pointer"
                        >
                          <span>Registro de Ocorrências</span>
                          <ChevronDown 
                            className={`w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#64748b] ml-auto transition-transform duration-200 ${
                              !openOcorr ? '-rotate-90' : ''
                            }`} 
                          />
                        </button>
                      ) : (
                        <div className="w-8 mx-auto h-px bg-slate-200 my-1" />
                      )}

                      {(openOcorr || collapsed) && (
                        <div className={`flex flex-col ${collapsed ? 'gap-1.5 items-center' : '!gap-1 !mt-1.5'}`}>
                          {/* 1. Ocorrências Gerais (Todas) */}
                          {(() => {
                            const isActive = currentScreen === 'lista-8d' && (!screenParams?.tipo || screenParams?.tipo === 'Tudo');
                            return (
                              <button
                                type="button"
                                onClick={() => handleItemClick('lista-8d', { tipo: 'Tudo' })}
                                title={collapsed ? 'Ocorrências Gerais' : undefined}
                                aria-label="Ocorrências Gerais"
                                className={getLinkClasses(isActive, collapsed)}
                              >
                                {isActive && !collapsed && (
                                  <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                                )}
                                <Layers className={getIconClasses(isActive, collapsed)} />
                                {!collapsed && <span className="truncate">Ocorrências Gerais</span>}
                              </button>
                            );
                          })()}

                          {canSeeOcorrClienteInterna && (
                            <>
                              {/* 2. Ocorrências Cliente (Formal e Informal) */}
                              {(() => {
                                const isActive = currentScreen === 'lista-8d' && screenParams?.tipo === 'Cliente';
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleItemClick('lista-8d', { tipo: 'Cliente' })}
                                    title={collapsed ? 'Ocorrências Cliente' : undefined}
                                    aria-label="Ocorrências Cliente"
                                    className={getLinkClasses(isActive, collapsed)}
                                  >
                                    {isActive && !collapsed && (
                                      <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                                    )}
                                    <Building2 className={getIconClasses(isActive, collapsed)} />
                                    {!collapsed && <span className="truncate">Ocorrências Cliente</span>}
                                  </button>
                                );
                              })()}

                              {/* 3. Ocorrências Internas (Interno) */}
                              {(() => {
                                const isActive = currentScreen === 'lista-8d' && screenParams?.tipo === 'Interno';
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleItemClick('lista-8d', { tipo: 'Interno' })}
                                    title={collapsed ? 'Ocorrências Internas' : undefined}
                                    aria-label="Ocorrências Internas"
                                    className={getLinkClasses(isActive, collapsed)}
                                  >
                                    {isActive && !collapsed && (
                                      <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                                    )}
                                    <Factory className={getIconClasses(isActive, collapsed)} />
                                    {!collapsed && <span className="truncate">Ocorrências Internas</span>}
                                  </button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* OUTROS APLICATIVOS: Ir para Planejamento & Ações */}
                    <div className="pt-2 border-t border-slate-200">
                      {!collapsed && (
                        <div className="!px-3 !pb-1.5 text-xs font-bold text-[#64748b] select-none">
                          Outros Aplicativos
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleItemClick('plano-acao')}
                        title={collapsed ? 'Ir para Planejamento & Ações' : undefined}
                        className={getLinkClasses(false, collapsed)}
                      >
                        <CheckSquare className={getIconClasses(false, collapsed)} />
                        {!collapsed && <span className="truncate font-semibold text-amber-800">Ir para Planejamento &amp; Ações</span>}
                      </button>
                    </div>
                  </>
                )}

                {/* 4. CATEGORIA: CONFIGURAÇÕES (Escopada conforme o Aplicativo Ativo + Super Admin) */}
                {canSeeConfig && (
                  <div className="pt-2 border-t border-slate-200">
                    {!collapsed ? (
                      <button
                        type="button"
                        onClick={() => setOpenConfig(!openConfig)}
                        className="w-full flex items-center justify-between !px-3 !py-1.5 text-xs font-bold text-[#64748b] hover:text-[#0f172a] rounded-lg hover:bg-slate-100/60 transition-colors select-none group cursor-pointer"
                      >
                        <span>Configurações</span>
                        <ChevronDown 
                          className={`w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#64748b] ml-auto transition-transform duration-200 ${
                            !openConfig ? '-rotate-90' : ''
                          }`} 
                        />
                      </button>
                    ) : (
                      <div className="w-8 mx-auto h-px bg-slate-200 my-1" />
                    )}

                    {(openConfig || collapsed) && (
                      <div className={`flex flex-col ${collapsed ? 'gap-1.5 items-center' : '!gap-1 !mt-1.5'}`}>
                        {isPlanApp ? (
                          <button
                            type="button"
                            onClick={() => handleItemClick('configuracoes-empresa', { tab: 'plano_config' })}
                            title={collapsed ? 'Configurações do Planejamento' : undefined}
                            aria-label="Configurações do Planejamento"
                            className={getLinkClasses(currentScreen === 'configuracoes-empresa', collapsed)}
                          >
                            {currentScreen === 'configuracoes-empresa' && !collapsed && (
                              <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                            )}
                            <Sliders className={getIconClasses(currentScreen === 'configuracoes-empresa', collapsed)} />
                            {!collapsed && <span className="truncate">Configurações do Planejamento</span>}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleItemClick('configuracoes-empresa', { tab: 'form_builder' })}
                            title={collapsed ? 'Campos, Opções & Marca (RNC)' : undefined}
                            aria-label="Campos, Opções & Marca (RNC)"
                            className={getLinkClasses(currentScreen === 'configuracoes-empresa', collapsed)}
                          >
                            {currentScreen === 'configuracoes-empresa' && !collapsed && (
                              <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                            )}
                            <Palette className={getIconClasses(currentScreen === 'configuracoes-empresa', collapsed)} />
                            {!collapsed && <span className="truncate">Campos, Opções &amp; Marca</span>}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleItemClick('cadastro-usuarios')}
                          title={collapsed ? 'Perfis de Usuários (Matriz)' : undefined}
                          aria-label="Perfis de Usuários (Matriz)"
                          className={getLinkClasses(currentScreen === 'cadastro-usuarios', collapsed)}
                        >
                          {currentScreen === 'cadastro-usuarios' && !collapsed && (
                            <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                          )}
                          <Users className={getIconClasses(currentScreen === 'cadastro-usuarios', collapsed)} />
                          {!collapsed && <span className="truncate">Perfis de Usuários (Matriz)</span>}
                        </button>

                        {(() => {
                          const authUser = tenantService.getAuthenticatedUser();
                          const emailLower = (currentUser.email || authUser?.email || '').toLowerCase();
                          const isMasterSuperAdmin =
                            currentUser.papel === 'super_admin' ||
                            authUser?.papel === 'super_admin' ||
                            emailLower === 'mhsolucoes@adimin.com.br' ||
                            emailLower === 'mhsolucoes@admin.com.br' ||
                            tenantService.isImpersonating();

                          if (!isMasterSuperAdmin) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => handleItemClick('super-admin')}
                              title={collapsed ? 'Console Super Admin' : undefined}
                              aria-label="Console Super Admin"
                              className={getLinkClasses(currentScreen === 'super-admin', collapsed)}
                            >
                              {currentScreen === 'super-admin' && !collapsed && (
                                <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                              )}
                              <Shield className={getIconClasses(currentScreen === 'super-admin', collapsed)} />
                              {!collapsed && <span className="truncate">Console Super Admin</span>}
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => {
                            tenantService.logout();
                            handleItemClick('saas-login');
                          }}
                          title={collapsed ? 'Sair da Conta' : undefined}
                          aria-label="Sair da Conta"
                          className={getLinkClasses(currentScreen === 'saas-login', collapsed)}
                        >
                          {currentScreen === 'saas-login' && !collapsed && (
                            <span className="absolute left-0 top-2 bottom-2 w-1.25 bg-[#0f6cbd] rounded-r-full shadow-[0_0_8px_rgba(15,108,189,0.5)]" />
                          )}
                          <UserCheck className={getIconClasses(currentScreen === 'saas-login', collapsed)} />
                          {!collapsed && <span className="truncate">Sair da Conta</span>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

        </div>

        {/* Rodapé Corporativo Discreto Dinâmico por Tenant */}
        {collapsed ? (
          <div className="!p-3 border-t border-[#e2e8f0] flex justify-center bg-[#f8fafc]/80 backdrop-blur-xs">
            <div 
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0e67b0] to-[#09477d] text-white flex items-center justify-center font-display font-bold text-xs shadow-xs border border-white/20 cursor-default"
              title={`${activeTenant.nome} (/${activeTenant.slug})`}
            >
              {activeTenant.nome.substring(0, 2).toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="!p-4 border-t border-[#e2e8f0] text-xs text-[#64748b] bg-[#f8fafc]/80 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0f172a] truncate">{activeTenant.nome}</span>
              <span className="text-[11px] font-medium text-slate-500">/{activeTenant.slug}</span>
            </div>
            <div className="text-[11px] text-[#64748b] mt-0.5 truncate">
              {activeTenant.customizacao.subtitulo_relatorio || 'Gestão da Qualidade 8D'}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <>
      {/* 1. Versão Desktop Estática com largura adaptável (268px expandido ou 72px recuado) */}
      <aside className={`hidden lg:block shrink-0 bg-white border-r border-[#e2e8f0] min-h-[calc(100vh-56px)] z-20 transition-all duration-300 ${
        isCollapsed ? 'w-[72px]' : 'w-[268px]'
      }`}>
        {renderNavContent(false)}
      </aside>

      {/* 2. Versão Mobile / Tablet (Slide-over Drawer com Backdrop - sempre expandido) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs animate-in fade-in transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Painel Lateral Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

export default AppSidebar;
