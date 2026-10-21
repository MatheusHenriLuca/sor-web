import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, TenantMasterData, TenantCustomization } from '../types';
import { tenantStore } from '../services/tenantStore';

interface TenantContextType {
  activeTenant: Tenant;
  isSuperAdmin: boolean;
  isImpersonating: boolean;
  activeSlug: string;
  masterData: TenantMasterData;
  changeTenant: (slug: string) => void;
  impersonateTenant: (tenantId: string) => void;
  stopImpersonating: () => void;
  updateCustomization: (customization: Partial<TenantCustomization>) => void;
  updateMasterData: (data: Partial<TenantMasterData>) => void;
  refreshTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTenant, setActiveTenant] = useState<Tenant>(tenantStore.getActiveTenant());
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    // Verificar flag de super admin em localStorage ou query param
    return localStorage.getItem('sor_saas_is_super_admin') === 'true';
  });
  const [originalSuperAdminTenant, setOriginalSuperAdminTenant] = useState<string | null>(() => {
    return localStorage.getItem('sor_saas_impersonate_origin');
  });

  const [masterData, setMasterData] = useState<TenantMasterData>(() => {
    return tenantStore.getTenantMasterData(activeTenant.id);
  });

  // Atualizar tema de cor ao mudar de tenant
  useEffect(() => {
    tenantStore.applyThemeColors(activeTenant.customizacao?.corPrimaria);
    setMasterData(tenantStore.getTenantMasterData(activeTenant.id));
  }, [activeTenant]);

  const changeTenant = (slug: string) => {
    tenantStore.setActiveTenantSlug(slug);
    const updated = tenantStore.getActiveTenant();
    setActiveTenant(updated);
  };

  const impersonateTenant = (tenantId: string) => {
    const target = tenantStore.getTenantById(tenantId);
    if (!target) return;

    if (!originalSuperAdminTenant) {
      localStorage.setItem('sor_saas_impersonate_origin', activeTenant.id);
      setOriginalSuperAdminTenant(activeTenant.id);
    }

    tenantStore.setActiveTenantSlug(target.slug);
    setActiveTenant(target);
  };

  const stopImpersonating = () => {
    localStorage.removeItem('sor_saas_impersonate_origin');
    setOriginalSuperAdminTenant(null);

    // Retorna para o tenant padrão ou do super admin
    tenantStore.setActiveTenantSlug('gpm-servicos');
    setActiveTenant(tenantStore.getActiveTenant());
  };

  const updateCustomization = (customization: Partial<TenantCustomization>) => {
    const updatedCustom = {
      ...activeTenant.customizacao,
      ...customization
    };

    tenantStore.updateTenant(activeTenant.id, {
      customizacao: updatedCustom
    });

    const refreshed = tenantStore.getActiveTenant();
    setActiveTenant(refreshed);
    tenantStore.applyThemeColors(updatedCustom.corPrimaria);
  };

  const updateMasterData = (data: Partial<TenantMasterData>) => {
    const updated = {
      ...masterData,
      ...data
    };
    tenantStore.saveTenantMasterData(activeTenant.id, updated);
    setMasterData(updated);
  };

  const refreshTenant = () => {
    const refreshed = tenantStore.getActiveTenant();
    setActiveTenant(refreshed);
    setMasterData(tenantStore.getTenantMasterData(refreshed.id));
  };

  return (
    <TenantContext.Provider
      value={{
        activeTenant,
        isSuperAdmin,
        isImpersonating: Boolean(originalSuperAdminTenant),
        activeSlug: activeTenant.slug,
        masterData,
        changeTenant,
        impersonateTenant,
        stopImpersonating,
        updateCustomization,
        updateMasterData,
        refreshTenant
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant deve ser utilizado dentro de um TenantProvider');
  }
  return context;
};
