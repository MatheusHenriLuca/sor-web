import React, { useState } from 'react';
import { AppOnStartView } from './views/AppOnStartView';
import { VerifUserView } from './views/VerifUserView';
import { Menu2View } from './views/Menu2View';
import { Lista8DView } from './views/Lista8DView';
import { Registro8DView } from './views/Registro8DView';
import { Detalhes8DView } from './views/Detalhes8DView';
import { DetalhesImpressaoView } from './views/DetalhesImpressaoView';
import { RegistroProtCliView } from './views/RegistroProtCliView';
import { RastreabilidadeView } from './views/RastreabilidadeView';
import { FalhaEntregaView } from './views/FalhaEntregaView';
import { CadastroUsuariosView } from './views/CadastroUsuariosView';
import { SharePointSyncModal } from './components/SharePointSyncModal';
import { AppHeader } from './components/AppHeader';
import { AppSidebar } from './components/AppSidebar';
import { spStore } from './services/sharepointService';
import { UsuarioQualidade, ActiveScreen } from './types';

export function App() {
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialScreenParam = queryParams?.get('screen') as ActiveScreen | null;
  const initialRncId = queryParams?.get('rncId') ? Number(queryParams.get('rncId')) : undefined;

  const [currentUser, setCurrentUser] = useState<UsuarioQualidade>(spStore.getCurrentUser());
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(initialScreenParam || 'app-on-start');
  const [screenParams, setScreenParams] = useState<any>({ rncId: initialRncId });
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (screen: any, params?: any) => {
    const targetScreen = screen === 'dashboard' ? 'menu-2' : screen;
    setCurrentScreen(targetScreen as ActiveScreen);
    setScreenParams(params || {});
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleUserChange = (newUser: UsuarioQualidade) => {
    spStore.setCurrentUser(newUser);
    setCurrentUser(newUser);
  };

  // 1. TELA 1: App.OnStart (Inicialização de Bases e Cache)
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

  // 2. TELA 2: Verif_user (Login e Identificação de Operador)
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

  // 3. ESTRUTURA PRINCIPAL (Top Header + Sidebar + Main Canvas)
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans select-none antialiased text-[#0f172a]" key={refreshKey}>
      
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

        {/* Canvas de Conteúdo da Página: 16px padronizado nas laterais e espaçamento uniforme */}
        <main 
          className="flex-1 overflow-y-auto bg-[#f8fafc] !p-4 !pb-20"
          style={{ padding: '16px', paddingBottom: '80px' }}
        >
          <div className="w-full flex flex-col gap-4">
            {currentScreen === 'menu-2' && (
              <Menu2View 
                currentUser={currentUser}
                onNavigate={(screen, params) => handleNavigate(screen, params)}
                onOpenSharePointModal={() => setSyncModalOpen(true)}
              />
            )}

            {currentScreen === 'lista-8d' && (
              <Lista8DView 
                key={`${screenParams?.tipo || 'all'}-${screenParams?.status || 'all'}-${screenParams?.search || ''}`}
                onNavigate={handleNavigate} 
                currentUser={currentUser}
                initialTipo={screenParams.tipo}
                initialStatus={screenParams.status}
                initialSearch={screenParams.search}
              />
            )}

            {currentScreen === 'registro-8d' && (
              <Registro8DView 
                key={screenParams?.edicao && screenParams?.rncId ? `edit-${screenParams.rncId}` : `new-${screenParams?.timestamp || 'fresh'}`}
                onNavigate={handleNavigate} 
                currentUser={currentUser}
                rncId={screenParams.rncId}
                edicao={screenParams.edicao}
              />
            )}

            {currentScreen === 'detalhes-8d' && (
              <Detalhes8DView 
                rncId={screenParams.rncId || 101}
                onNavigate={handleNavigate}
                currentUser={currentUser}
              />
            )}

            {currentScreen === 'impressao-8d' && (
              <DetalhesImpressaoView 
                rncId={screenParams.rncId || 101}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'registro-protcli' && (
              <RegistroProtCliView 
                onNavigate={handleNavigate}
                currentUser={currentUser}
              />
            )}

            {currentScreen === 'rastreabilidade' && (
              <RastreabilidadeView 
                onNavigate={handleNavigate}
                currentUser={currentUser}
                rncId={screenParams?.rncId}
              />
            )}

            {currentScreen === 'falha-entrega' && (
              <FalhaEntregaView 
                onNavigate={handleNavigate}
                currentUser={currentUser}
              />
            )}

            {currentScreen === 'cadastro-usuarios' && (
              <CadastroUsuariosView 
                onNavigate={handleNavigate}
                currentUser={currentUser}
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
