import React, { useState } from 'react';
import { 
  Plus, 
  LayoutGrid, 
  Truck, 
  Users, 
  UserCheck, 
  ChevronDown, 
  Layers,
  Building2,
  Factory,
  ShieldPlus,
  List,
  X
} from 'lucide-react';
import { ActiveScreen, UsuarioQualidade } from '../types';

interface AppSidebarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  currentUser: UsuarioQualidade;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentScreen,
  onNavigate,
  currentUser,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const isOperator = currentUser.perfil === 'User';
  const role = currentUser.perfil;

  // Estados dos grupos expansíveis (iniciam abertos conforme especificação)
  const [openOcorr, setOpenOcorr] = useState(true);
  const [openProtCli, setOpenProtCli] = useState(true);
  const [openFalha, setOpenFalha] = useState(true);
  const [openConfig, setOpenConfig] = useState(true);

  // Permissões conforme perfil do usuário
  const canSeeOcorrClienteInterna = role !== 'User';
  const canSeeFalha = ['Admin', 'Adminqual'].includes(role);
  const canSeeConfig = ['Admin', 'Adminqual'].includes(role);

  const handleItemClick = (screen: ActiveScreen, params?: any) => {
    onNavigate(screen, params);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getLinkClasses = (isActive: boolean) => `
    relative group w-full flex items-center !gap-3 !px-3 !h-9 rounded-lg text-[13px] transition-colors cursor-pointer text-left select-none
    ${isActive 
      ? 'bg-[#eff6fc] text-[#0f6cbd] font-semibold shadow-2xs' 
      : 'text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] font-medium'}
  `.trim();

  const getIconClasses = (isActive: boolean) => `
    w-4 h-4 shrink-0 transition-colors
    ${isActive ? 'text-[#0f6cbd]' : 'text-[#64748b] group-hover:text-[#0f172a]'}
  `.trim();

  const renderNavContent = (isMobileDrawer: boolean) => (
    <div className="flex flex-col justify-between h-full select-none bg-white">
      
      {/* Área Superior com Navegação e Grupos */}
      <div className="flex flex-col !gap-6 !p-4 overflow-y-auto flex-1">
        
        {/* Header do Drawer Mobile (apenas em visualização mobile) */}
        {isMobileDrawer && (
          <div className="flex items-center justify-between !pb-3 border-b border-[#e2e8f0]">
            <div className="flex items-center !gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0f6cbd] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                G
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#0f172a] leading-tight">SOR Qualidade</span>
                <span className="text-[11px] text-[#64748b]">Gestamp Sorocaba</span>
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

        {/* 1. BOTÃO DE AÇÃO PRINCIPAL: + Nova RNC / 8D */}
        {!isOperator && (
          <div>
            <button
              type="button"
              onClick={() => handleItemClick('registro-8d', { edicao: false })}
              className={`w-full flex items-center justify-center !gap-2 !px-4 !h-10 rounded-lg bg-[#0f6cbd] hover:bg-[#0b5a9e] active:scale-[0.98] text-white text-[13px] font-semibold shadow-xs hover:shadow transition-all cursor-pointer ${
                currentScreen === 'registro-8d' ? 'ring-2 ring-[#0f6cbd] ring-offset-2' : ''
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nova RNC / 8D</span>
            </button>
          </div>
        )}

        {/* 2. CATEGORIA: ACESSO PRINCIPAL */}
        <div>
          <div className="!px-3 !pb-2 text-xs font-semibold text-[#64748b] select-none">
            Acesso Principal
          </div>
          <div className="flex flex-col !gap-1">
            <button
              type="button"
              onClick={() => handleItemClick('menu-2')}
              className={getLinkClasses(currentScreen === 'menu-2')}
            >
              {currentScreen === 'menu-2' && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0f6cbd] rounded-r-full" />
              )}
              <LayoutGrid className={getIconClasses(currentScreen === 'menu-2')} />
              <span className="truncate">Menu Principal</span>
            </button>
          </div>
        </div>

        {/* 3. CATEGORIA: REGISTRO DE OCORRÊNCIAS */}
        <div>
          <button
            type="button"
            onClick={() => setOpenOcorr(!openOcorr)}
            className="w-full flex items-center justify-between !px-3 !py-2 text-xs font-semibold text-[#475569] hover:text-[#0f172a] rounded-lg hover:bg-[#f8fafc] transition-colors select-none group cursor-pointer"
          >
            <span>Registro de Ocorrências</span>
            <ChevronDown 
              className={`w-4 h-4 text-[#94a3b8] group-hover:text-[#64748b] ml-auto transition-transform duration-200 ${
                !openOcorr ? '-rotate-90' : ''
              }`} 
            />
          </button>

          {openOcorr && (
            <div className="flex flex-col !gap-1 !mt-1.5">
              <button
                type="button"
                onClick={() => handleItemClick('lista-8d', { tipo: 'Tudo' })}
                className={getLinkClasses(currentScreen === 'lista-8d')}
              >
                {currentScreen === 'lista-8d' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0f6cbd] rounded-r-full" />
                )}
                <Layers className={getIconClasses(currentScreen === 'lista-8d')} />
                <span className="truncate">Ocorrências Gerais</span>
              </button>

              {canSeeOcorrClienteInterna && (
                <>
                  <button
                    type="button"
                    onClick={() => handleItemClick('lista-8d', { tipo: 'Cliente' })}
                    className={getLinkClasses(false)}
                  >
                    <Building2 className={getIconClasses(false)} />
                    <span className="truncate">Ocorrências Cliente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleItemClick('lista-8d', { tipo: 'Interno' })}
                    className={getLinkClasses(false)}
                  >
                    <Factory className={getIconClasses(false)} />
                    <span className="truncate">Ocorrências Internas</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. CATEGORIA: PROTEÇÃO AO CLIENTE */}
        <div>
          <button
            type="button"
            onClick={() => setOpenProtCli(!openProtCli)}
            className="w-full flex items-center justify-between !px-3 !py-2 text-xs font-semibold text-[#475569] hover:text-[#0f172a] rounded-lg hover:bg-[#f8fafc] transition-colors select-none group cursor-pointer"
          >
            <span>Proteção ao Cliente</span>
            <ChevronDown 
              className={`w-4 h-4 text-[#94a3b8] group-hover:text-[#64748b] ml-auto transition-transform duration-200 ${
                !openProtCli ? '-rotate-90' : ''
              }`} 
            />
          </button>

          {openProtCli && (
            <div className="flex flex-col !gap-1 !mt-1.5">
              <button
                type="button"
                onClick={() => handleItemClick('registro-protcli')}
                className={getLinkClasses(currentScreen === 'registro-protcli')}
              >
                {currentScreen === 'registro-protcli' && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0f6cbd] rounded-r-full" />
                )}
                <ShieldPlus className={getIconClasses(currentScreen === 'registro-protcli')} />
                <span className="truncate">Novo Proteção ao Cliente</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick('lista-8d', { tipo: 'protcliente' })}
                className={getLinkClasses(false)}
              >
                <List className={getIconClasses(false)} />
                <span className="truncate">Lista Proteção ao Cliente</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. CATEGORIA: FALHA DE ENTREGA */}
        {canSeeFalha && (
          <div>
            <button
              type="button"
              onClick={() => setOpenFalha(!openFalha)}
              className="w-full flex items-center justify-between !px-3 !py-2 text-xs font-semibold text-[#475569] hover:text-[#0f172a] rounded-lg hover:bg-[#f8fafc] transition-colors select-none group cursor-pointer"
            >
              <span>Falha de Entrega</span>
              <ChevronDown 
                className={`w-4 h-4 text-[#94a3b8] group-hover:text-[#64748b] ml-auto transition-transform duration-200 ${
                  !openFalha ? '-rotate-90' : ''
                }`} 
              />
            </button>

            {openFalha && (
              <div className="flex flex-col !gap-1 !mt-1.5">
                <button
                  type="button"
                  onClick={() => handleItemClick('falha-entrega')}
                  className={getLinkClasses(currentScreen === 'falha-entrega')}
                >
                  {currentScreen === 'falha-entrega' && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0f6cbd] rounded-r-full" />
                  )}
                  <Truck className={getIconClasses(currentScreen === 'falha-entrega')} />
                  <span className="truncate">Incluir Falha de Entrega</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. CATEGORIA: CONFIGURAÇÕES */}
        {canSeeConfig && (
          <div>
            <button
              type="button"
              onClick={() => setOpenConfig(!openConfig)}
              className="w-full flex items-center justify-between !px-3 !py-2 text-xs font-semibold text-[#475569] hover:text-[#0f172a] rounded-lg hover:bg-[#f8fafc] transition-colors select-none group cursor-pointer"
            >
              <span>Configurações</span>
              <ChevronDown 
                className={`w-4 h-4 text-[#94a3b8] group-hover:text-[#64748b] ml-auto transition-transform duration-200 ${
                  !openConfig ? '-rotate-90' : ''
                }`} 
              />
            </button>

            {openConfig && (
              <div className="flex flex-col !gap-1 !mt-1.5">
                <button
                  type="button"
                  onClick={() => handleItemClick('cadastro-usuarios')}
                  className={getLinkClasses(currentScreen === 'cadastro-usuarios')}
                >
                  {currentScreen === 'cadastro-usuarios' && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0f6cbd] rounded-r-full" />
                  )}
                  <Users className={getIconClasses(currentScreen === 'cadastro-usuarios')} />
                  <span className="truncate">Cadastro de Usuários</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleItemClick('verif-user')}
                  className={getLinkClasses(currentScreen === 'verif-user')}
                >
                  {currentScreen === 'verif-user' && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0f6cbd] rounded-r-full" />
                  )}
                  <UserCheck className={getIconClasses(currentScreen === 'verif-user')} />
                  <span className="truncate">Trocar Usuário</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Rodapé Corporativo Discreto */}
      <div className="!p-4 border-t border-[#e2e8f0] text-xs text-[#64748b] bg-[#f8fafc]">
        <div className="font-bold text-[#0f172a]">Gestamp Sorocaba</div>
        <div className="text-[11px] text-[#64748b] mt-0.5">Planta Sorocaba • Qualidade</div>
      </div>

    </div>
  );

  return (
    <>
      {/* 1. Versão Desktop Estática com largura de 268px e respiro garantido */}
      <aside className="hidden lg:block w-[268px] shrink-0 bg-white border-r border-[#e2e8f0] min-h-[calc(100vh-56px)] z-20">
        {renderNavContent(false)}
      </aside>

      {/* 2. Versão Mobile / Tablet (Slide-over Drawer com Backdrop) */}
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
