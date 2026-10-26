import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  CheckCircle2,
  Search,
  X,
  ShieldCheck,
  RotateCcw,
  CheckSquare,
  FileText,
  Layers,
  UserCheck
} from 'lucide-react';
import {
  UsuarioQualidade,
  ColaboradorBaseAtivos,
  AppPermissionLevel,
  UserAppProfiles
} from '../types';
import { spStore } from '../services/sharepointService';
import { tenantService } from '../services/tenantService';
import { SearchableSelect, SearchableOption } from '../components/SearchableSelect';

interface CadastroUsuariosViewProps {
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
}

const PERMISSION_LEVELS: AppPermissionLevel[] = [
  'Sem Acesso',
  'Usuário Comum',
  'Editor',
  'Admin'
];

const PERMISSION_OPTIONS: SearchableOption[] = [
  {
    value: 'Sem Acesso',
    label: 'Sem Acesso',
    sublabel: 'Bloqueado neste aplicativo',
    badge: 'Bloqueado',
    badgeColor: 'bg-slate-100 text-slate-600 border border-slate-200'
  },
  {
    value: 'Usuário Comum',
    label: 'Usuário Comum',
    sublabel: 'Padrão automático da lista geral de funcionários',
    badge: 'Padrão',
    badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  },
  {
    value: 'Editor',
    label: 'Editor',
    sublabel: 'Pode criar, editar e conduzir tratativas no app',
    badge: 'Edição',
    badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200'
  },
  {
    value: 'Admin',
    label: 'Admin',
    sublabel: 'Controle total e validação final neste aplicativo',
    badge: 'Total',
    badgeColor: 'bg-violet-100 text-violet-800 border border-violet-200'
  }
];

export const CadastroUsuariosView: React.FC<CadastroUsuariosViewProps> = ({
  onNavigate
}) => {
  const [users, setUsers] = useState<UsuarioQualidade[]>([]);
  const [baseAtivos, setBaseAtivos] = useState<ColaboradorBaseAtivos[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'custom' | 'default'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UsuarioQualidade | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Estado do modal de Novo / Editar Colaborador e seus 3 Perfis
  const [form, setForm] = useState<{
    id?: number;
    nome: string;
    reAcesso?: number;
    cargo: string;
    setor: string;
    email: string;
    perfisPorApp: UserAppProfiles;
  }>({
    nome: '',
    reAcesso: undefined,
    cargo: '',
    setor: '',
    email: '',
    perfisPorApp: {
      plano_acao: 'Usuário Comum',
      rnc: 'Usuário Comum',
      oitod: 'Usuário Comum'
    }
  });

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = () => {
    setUsers(tenantService.getUnifiedUsersMatrix());
    setBaseAtivos(spStore.getBaseAtivos());
  };

  useEffect(() => {
    loadData();
    const unsub = tenantService.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const colaboradorOptions = useMemo<SearchableOption[]>(() => {
    return baseAtivos.map(a => ({
      value: String(a.numPessoal),
      label: `${a.numPessoal} - ${a.nome}`,
      sublabel: `${a.posicao || 'Colaborador'} • ${a.unidadeOrg || 'Operações'}`,
      badge: `RE ${a.numPessoal}`
    }));
  }, [baseAtivos]);

  const handleSelectColaborador = (reStr: string) => {
    const numPessoal = Number(reStr);
    const colab = baseAtivos.find(a => a.numPessoal === numPessoal);
    const existing = users.find(u => u.reAcesso === numPessoal);
    if (colab) {
      const slug = tenantService.getActiveTenant().slug || 'empresa';
      const emailSlug = colab.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '.');
      setForm(prev => ({
        ...prev,
        id: existing?.id,
        nome: colab.nome,
        reAcesso: colab.numPessoal,
        cargo: colab.posicao || prev.cargo,
        setor: colab.unidadeOrg || prev.setor,
        email: existing?.email || `${emailSlug}@${slug}.com.br`,
        perfisPorApp: existing?.perfisPorApp || {
          plano_acao: 'Usuário Comum',
          rnc: 'Usuário Comum',
          oitod: 'Usuário Comum'
        }
      }));
    }
  };

  const handleInlineProfileChange = (
    user: UsuarioQualidade,
    appKey: keyof UserAppProfiles,
    newLevel: AppPermissionLevel
  ) => {
    tenantService.updateUserAppProfile(user.reAcesso, appKey, newLevel);
    loadData();
    const appLabel =
      appKey === 'plano_acao' ? 'Plano de Ação' : appKey === 'rnc' ? 'RNC' : '8D';
    notify(`Perfil de ${user.nome} no App ${appLabel} alterado para "${newLevel}".`);
  };

  const handleResetToDefaultComum = (user: UsuarioQualidade) => {
    tenantService.resetUserToDefaultProfile(user.reAcesso);
    loadData();
    notify(
      `${user.nome} restaurado para a regra padrão automática ("Usuário Comum" nos 3 aplicativos).`
    );
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.reAcesso) {
      notify('Nome completo e Matrícula (RE) são obrigatórios!', 'error');
      return;
    }

    const isDefault =
      form.perfisPorApp.plano_acao === 'Usuário Comum' &&
      form.perfisPorApp.rnc === 'Usuário Comum' &&
      form.perfisPorApp.oitod === 'Usuário Comum';

    tenantService.saveUserForTenant({
      id: form.id && form.id < 50000 ? form.id : undefined,
      nome: form.nome.trim(),
      reAcesso: Number(form.reAcesso),
      cargo: form.cargo.trim() || 'Colaborador',
      setor: form.setor.trim() || 'Operações',
      email: form.email.trim(),
      perfisPorApp: form.perfisPorApp,
      isDefaultProfile: isDefault
    });

    setModalOpen(false);
    loadData();
    notify(`Perfis de "${form.nome.trim()}" salvos e sincronizados na Lista Master de Funcionários!`);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      tenantService.deleteUserForTenant(deleteTarget.reAcesso);
      notify(`Colaborador "${deleteTarget.nome}" removido da lista.`);
      setDeleteTarget(null);
      loadData();
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getLevelBadgeClass = (level: AppPermissionLevel) => {
    switch (level) {
      case 'Admin':
        return 'bg-violet-50 text-violet-900 border-violet-300';
      case 'Editor':
        return 'bg-blue-50 text-blue-900 border-blue-300';
      case 'Usuário Comum':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Sem Acesso':
        return 'bg-slate-100 text-slate-500 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        String(u.reAcesso).includes(q) ||
        (u.cargo || '').toLowerCase().includes(q) ||
        (u.setor || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const profiles = u.perfisPorApp || {
        plano_acao: 'Usuário Comum',
        rnc: 'Usuário Comum',
        oitod: 'Usuário Comum'
      };
      const isAllComum =
        profiles.plano_acao === 'Usuário Comum' &&
        profiles.rnc === 'Usuário Comum' &&
        profiles.oitod === 'Usuário Comum';

      if (filterMode === 'custom') return !isAllComum;
      if (filterMode === 'default') return isAllComum;
      return true;
    });
  }, [users, searchTerm, filterMode]);

  const stats = useMemo(() => {
    let customCount = 0;
    let defaultComumCount = 0;
    users.forEach(u => {
      const p = u.perfisPorApp || {
        plano_acao: 'Usuário Comum',
        rnc: 'Usuário Comum',
        oitod: 'Usuário Comum'
      };
      if (
        p.plano_acao === 'Usuário Comum' &&
        p.rnc === 'Usuário Comum' &&
        p.oitod === 'Usuário Comum'
      ) {
        defaultComumCount++;
      } else {
        customCount++;
      }
    });
    return { total: users.length, customCount, defaultComumCount };
  }, [users]);

  return (
    <div className="w-full flex flex-col gap-5 pb-16 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-6 z-50">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{notification.message}</span>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="ml-2 text-inherit opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho Principal */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            type="button"
            onClick={() => onNavigate('configuracoes-empresa')}
            className="btn-secondary h-9 px-3 text-xs font-semibold shrink-0"
            title="Voltar às Configurações"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b5796] flex items-center justify-center border border-blue-100 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold text-slate-900 tracking-tight">
              Matriz Unificada de Perfis de Usuários (Multi-App)
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Determine o perfil de cada colaborador em <strong>Plano de Ação</strong>, <strong>RNC</strong> e <strong>8D</strong>. Funcionários da lista geral sem perfil específico são automaticamente definidos como <strong>Usuário Comum</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              onNavigate('configuracoes-empresa', { initialTab: 'options_manager' })
            }
            className="btn-secondary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Layers size={14} className="text-[#0b5796]" />
            <span>Lista Master de Funcionários</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setForm({
                id: undefined,
                nome: '',
                reAcesso: undefined,
                cargo: '',
                setor: '',
                email: '',
                perfisPorApp: {
                  plano_acao: 'Usuário Comum',
                  rnc: 'Usuário Comum',
                  oitod: 'Usuário Comum'
                }
              });
              setModalOpen(true);
            }}
            className="btn-primary h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Novo Funcionário / Perfil</span>
          </button>
        </div>
      </div>

      {/* Resumo da Regra de Negócio + Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#0b5796] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos da Lista Geral ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'custom'
                ? 'bg-violet-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Perfis Específicos / Customizados ({stats.customCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('default')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'default'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Padrão Automático: Usuário Comum ({stats.defaultComumCount})
          </button>
        </div>

        <div className="relative w-full lg:w-80">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            className="form-input !h-9 !pl-9 !pr-8 text-xs w-full"
            placeholder="Pesquisar funcionário por nome, RE ou setor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabela Matriz de 3 Colunas de Perfil por App */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full table-fixed text-left border-collapse min-w-[1060px]">
            <colgroup>
              <col className="w-[52px]" />
              <col className="w-[29%]" />
              <col className="w-[86px]" />
              <col className="w-[158px]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-display font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3 text-center">#</th>
                <th className="py-3 px-4 whitespace-nowrap">
                  Funcionário (Lista Master Geral)
                </th>
                <th className="py-3 px-3 whitespace-nowrap">RE</th>
                <th className="py-3 px-3 whitespace-nowrap">Regra de Vínculo</th>
                <th className="py-3 px-2.5 bg-amber-50/60 border-l border-amber-200/70 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-amber-900">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">1. Perfil Plano de Ação</span>
                  </div>
                </th>
                <th className="py-3 px-2.5 bg-blue-50/50 border-l border-blue-200/70 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-blue-950">
                    <FileText className="w-3.5 h-3.5 text-[#0b5796] shrink-0" />
                    <span className="truncate">2. Perfil App RNC</span>
                  </div>
                </th>
                <th className="py-3 px-2.5 bg-indigo-50/50 border-l border-indigo-200/70 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-indigo-950">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                    <span className="truncate">3. Perfil App 8D</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right border-l border-slate-200 whitespace-nowrap">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 text-xs">
                    Nenhum funcionário encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const initials = getInitials(u.nome);
                  const profiles: UserAppProfiles = u.perfisPorApp || {
                    plano_acao: 'Usuário Comum',
                    rnc: 'Usuário Comum',
                    oitod: 'Usuário Comum'
                  };
                  const isAllComum =
                    profiles.plano_acao === 'Usuário Comum' &&
                    profiles.rnc === 'Usuário Comum' &&
                    profiles.oitod === 'Usuário Comum';

                  const subInfo = `${u.cargo || 'Colaborador'}${u.setor ? ` • ${u.setor}` : ''}`;

                  return (
                    <tr
                      key={`${u.reAcesso}-${idx}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center">
                        <div
                          className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center font-bold text-xs ${
                            isAllComum
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-[#0b5796] text-white'
                          }`}
                        >
                          {initials}
                        </div>
                      </td>

                      {/* Nome e Cargo com espaço amplo e sem quebrar em várias linhas */}
                      <td className="py-2.5 px-4 overflow-hidden">
                        <div
                          className="font-bold text-slate-900 truncate text-[13px] leading-snug"
                          title={u.nome}
                        >
                          {u.nome}
                        </div>
                        <div
                          className="text-[11px] text-slate-500 truncate mt-0.5"
                          title={subInfo}
                        >
                          {subInfo}
                        </div>
                      </td>

                      {/* RE */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        #{u.reAcesso}
                      </td>

                      {/* Status do Vínculo (Automático Usuário Comum vs Customizado) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isAllComum ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Automático (Comum)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-900 border border-violet-200">
                            <ShieldCheck className="w-3 h-3 text-violet-700 shrink-0" />
                            <span>Perfil Específico</span>
                          </span>
                        )}
                      </td>

                      {/* COLUNA 1: PERFIL NO APP PLANO DE AÇÃO */}
                      <td className="py-2 px-2.5 bg-amber-50/20 border-l border-amber-100">
                        <SearchableSelect
                          value={profiles.plano_acao}
                          onChange={val =>
                            handleInlineProfileChange(
                              u,
                              'plano_acao',
                              (val as AppPermissionLevel) || 'Usuário Comum'
                            )
                          }
                          options={PERMISSION_OPTIONS}
                          placeholder="Perfil Plano..."
                          searchPlaceholder="Pesquisar nível..."
                          allowClear={false}
                          compact
                        />
                      </td>

                      {/* COLUNA 2: PERFIL NO APP RNC */}
                      <td className="py-2 px-2.5 bg-blue-50/20 border-l border-blue-100">
                        <SearchableSelect
                          value={profiles.rnc}
                          onChange={val =>
                            handleInlineProfileChange(
                              u,
                              'rnc',
                              (val as AppPermissionLevel) || 'Usuário Comum'
                            )
                          }
                          options={PERMISSION_OPTIONS}
                          placeholder="Perfil RNC..."
                          searchPlaceholder="Pesquisar nível..."
                          allowClear={false}
                          compact
                        />
                      </td>

                      {/* COLUNA 3: PERFIL NO APP 8D */}
                      <td className="py-2 px-2.5 bg-indigo-50/20 border-l border-indigo-100">
                        <SearchableSelect
                          value={profiles.oitod}
                          onChange={val =>
                            handleInlineProfileChange(
                              u,
                              'oitod',
                              (val as AppPermissionLevel) || 'Usuário Comum'
                            )
                          }
                          options={PERMISSION_OPTIONS}
                          placeholder="Perfil 8D..."
                          searchPlaceholder="Pesquisar nível..."
                          allowClear={false}
                          compact
                        />
                      </td>

                      {/* Ações */}
                      <td className="py-2.5 px-3 text-right border-l border-slate-100 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {!isAllComum && (
                            <button
                              type="button"
                              onClick={() => handleResetToDefaultComum(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Restaurar para Usuário Comum (padrão automático)"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setForm({
                                id: u.id,
                                nome: u.nome,
                                reAcesso: u.reAcesso,
                                cargo: u.cargo || '',
                                setor: u.setor || '',
                                email: u.email || '',
                                perfisPorApp: { ...profiles }
                              });
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0b5796] hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Editar dados e perfis do funcionário"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remover funcionário"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição Completa com as 3 Colunas de App */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-visible animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b5796] flex items-center justify-center border border-blue-100">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                    {form.id ? 'Configurar Perfis do Funcionário' : 'Novo Funcionário na Lista Geral & Perfis'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina os níveis de acesso independentes para Plano de Ação, RNC e 8D
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              {/* Busca rápida na Lista Geral de Funcionários */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Selecionar Funcionário Existente da Lista Geral ({baseAtivos.length})
                </label>
                <SearchableSelect
                  value={form.reAcesso ? String(form.reAcesso) : ''}
                  onChange={val => handleSelectColaborador(val)}
                  options={colaboradorOptions}
                  placeholder="Digite nome ou RE para autopreencher..."
                  searchPlaceholder="Pesquisar colaborador por nome ou RE..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full text-xs"
                    value={form.nome}
                    onChange={e => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome completo do colaborador"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matrícula (RE) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input w-full text-xs font-mono"
                    value={form.reAcesso || ''}
                    onChange={e => setForm({ ...form, reAcesso: Number(e.target.value) })}
                    placeholder="Ex: 88123"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    className="form-input w-full text-xs"
                    value={form.cargo}
                    onChange={e => setForm({ ...form, cargo: e.target.value })}
                    placeholder="Ex: Analista da Qualidade"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Setor / Área
                  </label>
                  <input
                    type="text"
                    className="form-input w-full text-xs"
                    value={form.setor}
                    onChange={e => setForm({ ...form, setor: e.target.value })}
                    placeholder="Ex: Qualidade Assegurada"
                  />
                </div>
              </div>

              {/* Matriz de 3 Colunas de Perfil no Modal */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Perfis por Aplicativo (Padrão: Usuário Comum)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm(prev => ({
                        ...prev,
                        perfisPorApp: {
                          plano_acao: 'Usuário Comum',
                          rnc: 'Usuário Comum',
                          oitod: 'Usuário Comum'
                        }
                      }))
                    }
                    className="text-[11px] font-semibold text-[#0b5796] hover:underline cursor-pointer"
                  >
                    Definir Todos como Usuário Comum
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      1. App Plano de Ação
                    </label>
                    <SearchableSelect
                      value={form.perfisPorApp.plano_acao}
                      onChange={val =>
                        setForm(prev => ({
                          ...prev,
                          perfisPorApp: {
                            ...prev.perfisPorApp,
                            plano_acao: (val as AppPermissionLevel) || 'Usuário Comum'
                          }
                        }))
                      }
                      options={PERMISSION_OPTIONS}
                      placeholder="Selecione..."
                      searchPlaceholder="Buscar nível..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-blue-950 mb-1">
                      2. App RNC
                    </label>
                    <SearchableSelect
                      value={form.perfisPorApp.rnc}
                      onChange={val =>
                        setForm(prev => ({
                          ...prev,
                          perfisPorApp: {
                            ...prev.perfisPorApp,
                            rnc: (val as AppPermissionLevel) || 'Usuário Comum'
                          }
                        }))
                      }
                      options={PERMISSION_OPTIONS}
                      placeholder="Selecione..."
                      searchPlaceholder="Buscar nível..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      3. App 8D
                    </label>
                    <SearchableSelect
                      value={form.perfisPorApp.oitod}
                      onChange={val =>
                        setForm(prev => ({
                          ...prev,
                          perfisPorApp: {
                            ...prev.perfisPorApp,
                            oitod: (val as AppPermissionLevel) || 'Usuário Comum'
                          }
                        }))
                      }
                      options={PERMISSION_OPTIONS}
                      placeholder="Selecione..."
                      searchPlaceholder="Buscar nível..."
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {PERMISSION_LEVELS.map(lvl => (
                    <span
                      key={lvl}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getLevelBadgeClass(
                        lvl
                      )}`}
                    >
                      {lvl}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-9 px-5 text-xs font-semibold"
                >
                  Salvar Perfis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl w-full max-w-sm text-center flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">
                Remover Funcionário?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Tem certeza que deseja remover <strong>{deleteTarget.nome}</strong> (RE #{deleteTarget.reAcesso}) da lista geral e matriz de perfis?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary h-9 px-4 text-xs font-semibold flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn-primary !bg-rose-600 hover:!bg-rose-700 !border-rose-600 h-9 px-4 text-xs font-semibold flex-1"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroUsuariosView;
