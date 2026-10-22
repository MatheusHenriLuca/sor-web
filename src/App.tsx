import React, { useState, useEffect } from 'react';
import { Eye, ArrowLeft } from 'lucide-react';
import { AppOnStartView } from './views/AppOnStartView';
import { VerifUserView } from './views/VerifUserView';
import { SaasLoginView } from './views/SaasLoginView';
import { SuperAdminView } from './views/SuperAdminView';
import { ConfiguracoesTenantView } from './views/ConfiguracoesTenantView';
import { Menu2View } from './views/Menu2View';
import { Lista8DView } from './views/Lista8DView';
import { Registro8DView } from './views/Registro8DView';
import { Detalhes8DView } from './views/Detalhes8DView';
import { DetalhesImpressaoView } from './views/DetalhesImpressaoView';
import { RastreabilidadeView } from './views/RastreabilidadeView';
import { CadastroUsuariosView } from './views/CadastroUsuariosView';
import { SharePointSyncModal } from './components/SharePointSyncModal';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';
import { spStore } from './services/sharepointService';
import { tenantService } from './services/tenantService';
import { UsuarioQualidade, ActiveScreen, TenantRecord } from './types';

function resolveInitialRouteFromUrl(): {
  screen: ActiveScreen;
  loginSlug?: string;
  rncId?: number;
} {
  if (typeof window === 'undefined') {
    return { screen: 'menu-2' };
  }

  const queryParams = new URLSearchParams(window.location.search);
  const queryScreen = queryParams.get('screen') as ActiveScreen | null;
  const queryRncId = queryParams.get('rncId') ? Number(queryParams.get('rncId')) : undefined;

  const pathParts = window.location.pathname
    .split('/')
    .map(p => p.trim())
    .filter(Boolean);

  // Rota /super-admin
  if (pathParts[0] === 'super-admin') {
    return { screen: 'super-admin' };
  }

  // Rota /login global
  if (pathParts[0] === 'login') {
    return { screen: 'saas-login' };
  }

  // Rota /:empresa-slug/...
  if (pathParts.length >= 1) {
    const maybeTenant = tenantService.getTenantBySlug(pathParts[0]);
    if (maybeTenant) {
      tenantService.setActiveTenantBySlug(maybeTenant.slug);
      const subRoute = pathParts[1] || 'dashboard';
      if (subRoute === 'login') {
        return { screen: 'saas-login', loginSlug: maybeTenant.slug };
      }
      if (subRoute === 'configuracoes') {
        return { screen: 'configuracoes-empresa' };
      }
      if (subRoute === 'ocorrencias') {
        return { screen: 'lista-8d' };
      }
      return { screen: queryScreen || 'menu-2', rncId: queryRncId };
    }
  }

  if (queryScreen) {
    return { screen: queryScreen, rncId: queryRncId };
  }

  // Se já existe um usuário autenticado, abre o workspace do tenant ativo; caso contrário, abre a tela de Login Global SaaS
  const existingAuth = tenantService.getAuthenticatedUser();
  if (existingAuth) {
    if (existingAuth.papel === 'super_admin' && !tenantService.isImpersonating()) {
      return { screen: 'super-admin' };
    }
    return { screen: 'menu-2' };
  }

  return { screen: 'saas-login' };
}

export function App() {
  const initialRoute = resolveInitialRouteFromUrl();

  const [currentUser, setCurrentUser] = useState<UsuarioQualidade>(
    tenantService.getAuthenticatedUser() || spStore.getCurrentUser()
  );
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(initialRoute.screen);
  const [loginSlugPreview, setLoginSlugPreview] = useState<string | undefined>(initialRoute.loginSlug);
  const [screenParams, setScreenParams] = useState<any>({ rncId: initialRoute.rncId });
  const [lastListParams, setLastListParams] = useState<any>({ tipo: 'Tudo' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeTenant = tenantService.getActiveTenant();
  const isImpersonating = tenantService.isImpersonating();

  useEffect(() => {
    tenantService.applyTenantThemeToDOM(activeTenant);
  }, [activeTenant]);

  const syncUrlWithScreen = (screen: ActiveScreen, slugOverride?: string) => {
    if (typeof window === 'undefined') return;
    const slug = slugOverride || tenantService.getActiveTenant().slug;
    try {
      if (screen === 'super-admin') {
        window.history.replaceState({}, '', '/super-admin');
      } else if (screen === 'saas-login') {
        window.history.replaceState({}, '', slugOverride ? `/${slugOverride}/login` : '/login');
      } else if (screen === 'configuracoes-empresa') {
        window.history.replaceState({}, '', `/${slug}/configuracoes`);
      } else if (screen === 'lista-8d') {
        window.history.replaceState({}, '', `/${slug}/ocorrencias`);
      } else if (screen === 'menu-2') {
        window.history.replaceState({}, '', `/${slug}/dashboard`);
      }
    } catch {
      // Ignora restrições de history API em iframes sandboxed se aplicável
    }
  };

  const handleNavigate = (screen: any, params?: any) => {
    const targetScreen = screen === 'dashboard' ? 'menu-2' : screen;

    if (currentScreen === 'lista-8d') {
      const activeTipo = screenParams?.tipo || spStore.getListFiltersState().tipoFilter || 'Tudo';
      setLastListParams({ ...screenParams, tipo: activeTipo });
    }

    let resolvedParams: any = {
      fromScreen: params?.fromScreen || currentScreen,
      ...(params || {})
    };

    if (targetScreen === 'lista-8d') {
      if (!params || Object.keys(params).length === 0) {
        resolvedParams = {
          ...(lastListParams || { tipo: spStore.getListFiltersState().tipoFilter || 'Tudo' }),
          fromScreen: currentScreen
        };
      } else {
        setLastListParams(resolvedParams);
      }
    }

    setCurrentScreen(targetScreen as ActiveScreen);
    setScreenParams(resolvedParams);
    setMobileMenuOpen(false);
    syncUrlWithScreen(targetScreen as ActiveScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleUserChange = (newUser: UsuarioQualidade) => {
    spStore.setCurrentUser(newUser);
    setCurrentUser(newUser);
  };

  const handleStopImpersonation = () => {
    tenantService.stopImpersonation();
    const superAdmin = tenantService.getAuthenticatedUser();
    if (superAdmin) {
      handleUserChange(superAdmin);
    }
    setCurrentScreen('super-admin');
    syncUrlWithScreen('super-admin');
  };

  // 1. TELA: App.OnStart (Inicialização de Bases e Cache)
  if (currentScreen === 'app-on-start') {
    return (
      <AppOnStartView 
        onComplete={(startScreen, user) => {
          handleUserChange(user);
          handleNavigate(startScreen);
        }}
        onOpenSharePointModal={() => setSyncModalOpen(true)}
      />
    );
  }

  // 2. TELA: Login SaaS Multi-Tenant Global (/) ou por Slug (/:empresa-slug/login)
  if (currentScreen === 'saas-login') {
    return (
      <SaasLoginView
        tenantSlug={loginSlugPreview}
        onLoginTenantSuccess={(user: UsuarioQualidade, tenant: TenantRecord) => {
          tenantService.setActiveTenantById(tenant.id);
          handleUserChange(user);
          setRefreshKey(prev => prev + 1);
          setCurrentScreen('menu-2');
          syncUrlWithScreen('menu-2', tenant.slug);
        }}
        onLoginSuperAdmin={(user: UsuarioQualidade) => {
          handleUserChange(user);
          setCurrentScreen('super-admin');
          syncUrlWithScreen('super-admin');
        }}
        onSwitchToFactoryKeypad={() => setCurrentScreen('verif-user')}
        onChangeSlugPreview={(slug?: string) => {
          setLoginSlugPreview(slug);
          if (slug) {
            tenantService.setActiveTenantBySlug(slug);
          }
          syncUrlWithScreen('saas-login', slug);
        }}
      />
    );
  }

  // 3. TELA: Console Central do Super Administrador (/super-admin)
  if (currentScreen === 'super-admin') {
    return (
      <SuperAdminView
        currentUser={currentUser}
        onImpersonateTenant={(tenant: TenantRecord, impersonatedUser: UsuarioQualidade) => {
          tenantService.setActiveTenantById(tenant.id);
          handleUserChange(impersonatedUser);
          setRefreshKey(prev => prev + 1);
          setCurrentScreen('menu-2');
          syncUrlWithScreen('menu-2', tenant.slug);
        }}
        onLogout={() => {
          tenantService.logout();
          setLoginSlugPreview(undefined);
          setCurrentScreen('saas-login');
          syncUrlWithScreen('saas-login');
        }}
      />
    );
  }

  // 4. TELA: Verif_user (Terminal Numérico de Fábrica por RE)
  if (currentScreen === 'verif-user') {
    return (
      <VerifUserView 
        onLoginSuccess={(user: UsuarioQualidade) => {
          handleUserChange(user);
          handleNavigate('menu-2');
        }}
      />
    );
  }

  // 5. ESTRUTURA PRINCIPAL DO TENANT ATIVO (/:empresa-slug/*)
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased text-[#0f172a]" key={`${activeTenant.id}-${refreshKey}`}>
      
      {/* Barra Superior de Impersonation quando o Super Admin está visualizando como a Empresa */}
      {isImpersonating && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 z-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Modo Suporte Super Admin (Impersonation): Visualizando ambiente isolado de{' '}
              <strong>{activeTenant.nome}</strong> (<code className="font-mono">/{activeTenant.slug}</code>)
            </span>
          </div>
          <button
            type="button"
            onClick={handleStopImpersonation}
            className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Console /super-admin</span>
          </button>
        </div>
      )}

      {/* Barra Superior */}
      <AppHeader 
        currentScreen={currentScreen}
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        onRefreshData={handleRefreshData}
        onUserChange={handleUserChange}
        showBackButton={currentScreen !== 'menu-2'}
        backScreen={currentScreen === 'detalhes-8d' || currentScreen === 'registro-8d' ? 'lista-8d' : 'menu-2'}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMobileMenuOpen={mobileMenuOpen}
      />

      {/* Corpo Central: Sidebar Lateral + Canvas de Trabalho */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Barra Lateral Responsiva */}
        <AppSidebar 
          currentScreen={currentScreen}
          screenParams={screenParams}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Canvas de Conteúdo da Página */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 bg-[#f8fafc] p-3 sm:p-6 pb-24">
          <div className="w-full max-w-[1600px] mx-auto flex flex-col gap-5 min-w-0">
            {currentScreen === 'menu-2' && (
              <Menu2View 
                currentUser={currentUser}
                onNavigate={(screen, params) => handleNavigate(screen, params)}
                onOpenSharePointModal={() => setSyncModalOpen(true)}
              />
            )}

            {currentScreen === 'lista-8d' && (
              <Lista8DView 
                onNavigate={handleNavigate} 
                currentUser={currentUser}
                initialTipo={screenParams?.tipo}
                initialStatus={screenParams?.status}
                initialSearch={screenParams?.search}
                initialCliente={screenParams?.cliente}
                initialSetor={screenParams?.setor}
              />
            )}

            {currentScreen === 'registro-8d' && (
              <Registro8DView 
                key={screenParams?.edicao && screenParams?.rncId ? `edit-${screenParams.rncId}` : `new-${screenParams?.timestamp || 'fresh'}`}
                onNavigate={handleNavigate} 
                currentUser={currentUser}
                rncId={screenParams.rncId}
                edicao={screenParams.edicao}
                fromScreen={screenParams?.fromScreen}
              />
            )}

            {currentScreen === 'detalhes-8d' && (
              <Detalhes8DView 
                rncId={Number(screenParams?.rncId || screenParams?.id || 6119)}
                onNavigate={handleNavigate}
                currentUser={currentUser}
              />
            )}

            {currentScreen === 'impressao-8d' && (
              <DetalhesImpressaoView 
                rncId={Number(screenParams?.rncId || screenParams?.id || 6119)}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'rastreabilidade' && (
              <RastreabilidadeView 
                onNavigate={handleNavigate}
                currentUser={currentUser}
                rncId={screenParams?.rncId}
              />
            )}

            {currentScreen === 'cadastro-usuarios' && (
              <CadastroUsuariosView 
                onNavigate={handleNavigate}
                currentUser={currentUser}
              />
            )}

            {currentScreen === 'configuracoes-empresa' && (
              <ConfiguracoesTenantView
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onTenantUpdated={handleRefreshData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modal de Sincronização SharePoint Online */}
      {syncModalOpen && (
        <SharePointSyncModal 
          isOpen={syncModalOpen}
          onClose={() => setSyncModalOpen(false)}
          onDataRefreshed={handleRefreshData}
        />
      )}

    </div>
  );
}

export default App;

