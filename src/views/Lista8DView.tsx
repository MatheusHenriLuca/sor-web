import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  ChevronRight, 
  ChevronLeft, 
  RotateCw, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X,
  FileText,
  Image,
  Building2,
  Factory
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, getClientBadgeInfo } from '../constants/clientes';

interface Lista8DViewProps {
  onNavigate: (screen: string, params?: any) => void;
  currentUser: UsuarioQualidade;
  initialTipo?: string;
  initialStatus?: string;
  initialSearch?: string;
}

export const Lista8DView: React.FC<Lista8DViewProps> = ({ 
  onNavigate, 
  currentUser,
  initialTipo = 'Tudo',
  initialStatus = 'Todas',
  initialSearch = ''
}) => {
  const [rncs, setRncs] = useState<RNCRecord[]>(spStore.getRNCs());
  const [tipoFilter, setTipoFilter] = useState<string>(initialTipo || 'Tudo');
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [clienteFilter, setClienteFilter] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (initialTipo) {
      setTipoFilter(initialTipo);
      setCurrentPage(1);
    }
  }, [initialTipo]);

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const role = currentUser.perfil;
  const isOperator = role === 'User';

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleRefresh = async (force = false) => {
    setIsSyncing(true);
    try {
      await spStore.syncWithSharePoint({ forceRefresh: force });
      setRncs(spStore.getRNCs());
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Se a store estiver vazia, sincroniza; caso contrário, usa o cache instantâneo em memória
    if (spStore.getRNCs().length === 0) {
      handleRefresh(false);
    }
  }, []);

  const tabCounts = useMemo(() => {
    let emAndamento = 0;
    let relInicial = 0;
    let concluido = 0;
    let protCli = 0;
    let reincidente = 0;
    for (let i = 0; i < rncs.length; i++) {
      const r = rncs[i];
      if (r.status === 'Em Andamento') emAndamento++;
      else if (r.status === 'Relatório Inicial') relInicial++;
      else if (r.status === 'Concluído') concluido++;
      if (r.protcliente && r.protcliente !== 'Não') protCli++;
      if (r.reincidente === 'SIM') reincidente++;
    }
    return {
      'Todas': rncs.length,
      'Em Andamento': emAndamento,
      'Relatório Inicial': relInicial,
      'Concluído': concluido,
      'Proteção ao cliente': protCli,
      'Reincidente': reincidente
    };
  }, [rncs]);

  const filterTabs = [
    { id: 'Todas', label: 'Todas' },
    { id: 'Em Andamento', label: 'Em Andamento' },
    { id: 'Relatório Inicial', label: 'Relatório Inicial' },
    { id: 'Concluído', label: 'Concluídas' },
    { id: 'Proteção ao cliente', label: 'Proteção ao Cliente' },
    { id: 'Reincidente', label: 'Reincidentes' }
  ];

  // Filtro de Alta Performance (O(N) com indexação de busca e categoria lateral)
  const filteredRncs = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    return rncs.filter(r => {
      // 1. Filtro do Menu Lateral (Origem / Categoria de Registro)
      if (tipoFilter === 'Cliente') {
        // Ocorrências Cliente: Formal, Informal e Improcedente
        if (r.tipoRnc !== 'Formal' && r.tipoRnc !== 'Informal' && r.tipoRnc !== 'Improcedente') {
          return false;
        }
      } else if (tipoFilter === 'Interno') {
        // Ocorrências Internas
        if (r.tipoRnc !== 'Interno') {
          return false;
        }
      } else if (tipoFilter === 'protcliente') {
        // Ocorrências vindas do programa de Produção / Proteção ao Cliente
        if (!r.protcliente || r.protcliente === 'Não') {
          return false;
        }
      }

      // 2. Filtro das Abas Superiores (Status)
      if (statusFilter === 'Reincidente') {
        if (r.reincidente !== 'SIM') return false;
      } else if (statusFilter === 'Proteção ao cliente') {
        if (!r.protcliente || r.protcliente === 'Não') return false;
      } else if (statusFilter !== 'Todas') {
        if (r.status !== statusFilter) return false;
      }

      // 3. Filtro por Montadora
      if (clienteFilter !== 'Todos' && r.cliente !== clienteFilter) return false;

      // 4. Busca Livre
      if (query) {
        const searchStr = (r as any)._searchStr;
        if (searchStr) {
          if (!searchStr.includes(query)) return false;
        } else {
          const matchTitle = (r.field1 || '').toLowerCase().includes(query);
          const matchCliente = (r.cliente || '').toLowerCase().includes(query);
          const matchProd = (r.produto || '').toLowerCase().includes(query);
          const matchComp = (r.componente || '').toLowerCase().includes(query);
          const matchSap = (r.codigoRastreabilidade || '').includes(query);
          const matchDefeito = (r.descricaoProblema || '').toLowerCase().includes(query);
          if (!matchTitle && !matchCliente && !matchProd && !matchComp && !matchSap && !matchDefeito) {
            return false;
          }
        }
      }

      return true;
    });
  }, [rncs, tipoFilter, statusFilter, clienteFilter, debouncedSearch]);

  const totalPages = Math.ceil(filteredRncs.length / pageSize) || 1;
  const paginatedRncs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRncs.slice(start, start + pageSize);
  }, [filteredRncs, currentPage, pageSize]);

  const getClientBadge = (cliente: string) => {
    return getClientBadgeInfo(cliente);
  };

  const getStatusBadge = (status: string, prot?: string) => {
    const isProtCliente = prot && prot !== 'Não';
    return (
      <div className="flex flex-col gap-1 items-start">
        {isProtCliente && (
          <span className="badge-status bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>Produção/Cliente</span>
          </span>
        )}
        {status === 'Concluído' ? (
          <span className="badge-status bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>Concluído</span>
          </span>
        ) : status === 'Em Andamento' ? (
          <span className="badge-status bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>Em Andamento</span>
          </span>
        ) : status === 'Relatório Inicial' ? (
          <span className="badge-status bg-sky-100 text-sky-800 border border-sky-300">
            <FileText className="w-3.5 h-3.5 shrink-0 text-sky-600" />
            <span>Inicial</span>
          </span>
        ) : (
          <span className="badge-status bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150 pb-12">
      
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100 shadow-xs">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-display font-bold text-[#0f172a] tracking-tight">
                {tipoFilter === 'Cliente' ? 'Ocorrências Cliente (Formal & Informal)' :
                 tipoFilter === 'Interno' ? 'Ocorrências Internas' :
                 tipoFilter === 'protcliente' ? 'Programa Produção / Proteção ao Cliente' :
                 'Ocorrências registradas (8D)'}
              </h1>
              {tipoFilter !== 'Tudo' && (
                <button
                  type="button"
                  onClick={() => setTipoFilter('Tudo')}
                  className="text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 transition-colors cursor-pointer"
                  title="Ver todas as ocorrências sem filtro de categoria"
                >
                  Ver todas
                </button>
              )}
            </div>
            <p className="text-xs text-[#64748b] tabular-nums mt-0.5">
              {filteredRncs.length.toLocaleString('pt-BR')} registro(s) sincronizados com SharePoint Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 self-start sm:self-auto flex-wrap">
          {/* Botão Sincronizar */}
          <button
            type="button"
            onClick={() => handleRefresh(true)}
            disabled={isSyncing}
            className="btn-secondary h-9 px-3.5 text-xs font-semibold"
            title="Atualizar lista com o SharePoint"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Alternador de Visualização (Tabela vs Cartões) com proporção ampliada e espaçamento generoso */}
          <div className="flex items-center gap-1.5 border border-[#e2e8f0] rounded-xl bg-slate-100/90 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-[#0b5796] font-bold shadow-xs border border-slate-200/80' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Exibir como Tabela / Lista"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-[#0b5796] font-bold shadow-xs border border-slate-200/80' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Exibir como Blocos / Cartões"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Blocos</span>
            </button>
          </div>

          {/* Botão Nova RNC */}
          {!isOperator && (
            <button
              type="button"
              onClick={() => onNavigate('registro-8d', { edicao: false })}
              className="btn-primary h-9 px-4 text-xs font-semibold shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="font-display">Nova RNC</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. BARRA DE ABAS / FILTROS E BUSCA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Pílulas de Filtro com Espaçamento e Respiro Adequados */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 max-w-full">
          {filterTabs.map(tab => {
            const isActive = statusFilter === tab.id;
            const count = tabCounts[tab.id as keyof typeof tabCounts] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`filter-pill ${isActive ? 'filter-pill-active' : ''}`}
              >
                <span>{tab.label}</span>
                <span className="filter-pill-badge">
                  {count.toLocaleString('pt-BR')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Busca com Espaçamento Correto do Ícone e Filtro de Montadora */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Filtrar por RNC, peça, SAP..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="form-input search-input-field h-9 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={clienteFilter}
            onChange={e => setClienteFilter(e.target.value)}
            className="form-input h-9 px-3.5 text-xs w-auto font-medium"
          >
            <option value="Todos">Todas as Montadoras</option>
            {CLIENTES_LIST.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

      </div>

      {/* 3. CONTEÚDO: TABELA (DESKTOP) OU CARDS (MOBILE / GRID) */}
      {viewMode === 'list' ? (
        <div className="card-saas p-0 overflow-hidden shadow-xs">
          
          {/* Tabela Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-xs font-display font-semibold text-[#64748b] bg-[#f8fafc]/90">
                  <th className="py-3.5 px-5 font-semibold">Identificação / peça</th>
                  <th className="py-3.5 px-5 font-semibold">Tipo</th>
                  <th className="py-3.5 px-5 font-semibold hidden md:table-cell">Cliente / peça</th>
                  <th className="py-3.5 px-5 font-semibold hidden sm:table-cell">Setor / posto</th>
                  <th className="py-3.5 px-5 font-semibold">Status</th>
                  <th className="py-3.5 px-5 font-semibold hidden lg:table-cell">Data</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-xs sm:text-sm">
                {paginatedRncs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                          <Search className="w-6 h-6" />
                        </div>
                        <h3 className="font-display font-bold text-sm text-[#0f172a]">
                          Nenhuma ocorrência encontrada
                        </h3>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                          Tente ajustar a busca ou limpe os filtros de status e montadora para ver mais registros.
                        </p>
                        {(statusFilter !== 'Todas' || clienteFilter !== 'Todos' || searchInput || tipoFilter !== 'Tudo') && (
                          <button
                            type="button"
                            onClick={() => {
                              setTipoFilter('Tudo');
                              setStatusFilter('Todas');
                              setClienteFilter('Todos');
                              setSearchInput('');
                            }}
                            className="btn-subtle text-xs text-[#0f6cbd] font-semibold mt-1"
                          >
                            Limpar filtros aplicados
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRncs.map(r => {
                    const badge = getClientBadge(r.cliente);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                        className="hover:bg-[#f8fafc] transition-colors cursor-pointer group"
                      >
                        {/* Coluna 1: Miniatura da foto da peça não conforme + Identificação */}
                        <td className="py-5 sm:py-6 px-5">
                          <div className="flex items-center gap-3.5">
                            {/* Miniatura da foto da peça não conforme */}
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0 relative group-hover:border-[#0f6cbd]/40 transition-all">
                              {r.fotoPecaNg ? (
                                <img 
                                  src={r.fotoPecaNg} 
                                  alt={`Peça ${r.field1 || r.id}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                    e.currentTarget.parentElement?.classList.add('fallback-active');
                                  }}
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                                  <Image className="w-5 h-5 text-slate-300" />
                                  <span className="text-[9px] font-mono font-medium text-slate-400 mt-0.5">S/ FOTO</span>
                                </div>
                              )}
                            </div>
                            <div className="truncate max-w-xs md:max-w-sm">
                              <span className="font-bold text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors truncate block text-sm sm:text-base tracking-tight">
                                {r.field1 || `RNC #${r.id}`}
                              </span>
                              <span className="text-xs text-[#334155] font-semibold truncate block mt-0.5">
                                {r.componente || r.produto}
                              </span>
                              <span className="text-xs text-[#64748b] truncate block mt-0.5">
                                {r.descricaoProblema || 'Não Conformidade registrada'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Coluna 2: Tipo da RNC (Formal / Informal / Interno) */}
                        <td className="py-5 sm:py-6 px-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            r.tipoRnc === 'Formal' ? 'bg-blue-50 text-[#0b5796] border-blue-200' :
                            r.tipoRnc === 'Informal' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            r.tipoRnc === 'Interno' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {r.tipoRnc || 'Formal'}
                          </span>
                        </td>

                        {/* Coluna 3: Cliente / Montadora */}
                        <td className="py-5 sm:py-6 px-5 hidden md:table-cell text-[#334155]">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 border ${badge.bg} ${badge.border}`}>
                              {badge.label}
                            </div>
                            <span className="font-semibold block">{r.cliente}</span>
                          </div>
                          <span className="text-xs text-[#64748b] block font-mono truncate max-w-[200px] mt-1">{r.produto}</span>
                        </td>

                        {/* Coluna 4: Setor / Posto */}
                        <td className="py-5 sm:py-6 px-5 hidden sm:table-cell text-[#64748b]">
                          <span className="text-xs text-[#334155] block font-medium">{r.classificacaoSetor}</span>
                          <span className="text-[11px] text-[#94a3b8] block mt-0.5">
                            {r.posto || 'N/A'} {r.fmds ? `• ${r.fmds}` : ''}
                          </span>
                        </td>

                        {/* Coluna 5: Status */}
                        <td className="py-5 sm:py-6 px-5">
                          {getStatusBadge(r.status, r.protcliente)}
                        </td>

                        {/* Coluna 6: Data */}
                        <td className="py-5 sm:py-6 px-5 hidden lg:table-cell text-[#64748b] font-mono text-xs tabular-nums">
                          {r.dataOcorrencia}
                        </td>

                        {/* Coluna 7: Ação */}
                        <td className="py-5 sm:py-6 px-5 text-right">
                          <span className="btn-subtle text-xs text-[#0f6cbd] font-semibold group-hover:bg-blue-50 py-2 px-3.5 rounded-lg">
                            <span>Abrir</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile Automáticos quando em tela pequena */}
          <div className="sm:hidden divide-y divide-[#f1f5f9]">
            {paginatedRncs.length === 0 ? (
              <div className="py-14 text-center text-xs text-[#64748b]">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                  <Search className="w-5 h-5" />
                </div>
                Nenhuma ocorrência encontrada.
              </div>
            ) : (
              paginatedRncs.map(r => {
                const badge = getClientBadge(r.cliente);
                return (
                  <div
                    key={r.id}
                    onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                    className="p-4 hover:bg-[#f8fafc] transition cursor-pointer flex gap-3.5 items-start active:bg-[#f1f5f9]"
                  >
                    {/* Miniatura da Peça */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                      {r.fotoPecaNg ? (
                        <img src={r.fotoPecaNg} alt="Peça NG" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Image className="w-5 h-5 text-slate-300" />
                          <span className="text-[8px] font-mono mt-0.5">S/ FOTO</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[#0f172a] truncate">
                          {r.field1 || `RNC #${r.id}`}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                          r.tipoRnc === 'Formal' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          r.tipoRnc === 'Informal' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          r.tipoRnc === 'Interno' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {r.tipoRnc || 'Formal'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#334155] truncate">{r.componente || r.produto}</p>
                      <p className="text-xs text-[#64748b] line-clamp-1">{r.descricaoProblema}</p>
                      <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-slate-100 text-[11px] text-[#64748b]">
                        <span>{r.cliente}</span>
                        {getStatusBadge(r.status, r.protcliente)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      ) : (
        /* Modo Cartões Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedRncs.map(r => {
            const badge = getClientBadge(r.cliente);
            return (
              <div
                key={r.id}
                onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between gap-3.5 p-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                      r.tipoRnc === 'Formal' ? 'bg-blue-50 text-[#0b5796] border-blue-200' :
                      r.tipoRnc === 'Informal' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      r.tipoRnc === 'Interno' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {r.tipoRnc || 'Formal'}
                    </span>
                    {getStatusBadge(r.status, r.protcliente)}
                  </div>

                  {/* Foto e Título */}
                  <div className="flex gap-3 items-start my-2">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                      {r.fotoPecaNg ? (
                        <img src={r.fotoPecaNg} alt="Peça NG" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Image className="w-5 h-5 text-slate-300" />
                          <span className="text-[8px] font-mono mt-0.5">S/ FOTO</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-[#0f172a] block truncate">{r.field1 || `RNC #${r.id}`}</span>
                      <p className="text-xs font-bold text-[#334155] line-clamp-1 mt-0.5">{r.componente || r.produto}</p>
                      <p className="text-[11px] text-[#64748b] line-clamp-2 mt-1 leading-snug">{r.descricaoProblema}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#f1f5f9] flex items-center justify-between text-xs text-[#64748b]">
                  <span className="font-semibold">{r.cliente}</span>
                  <span className="font-mono text-[11px]">{r.dataOcorrencia}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. BARRA DE PAGINAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#64748b]">
        <div>
          Exibindo {paginatedRncs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a{' '}
          {Math.min(currentPage * pageSize, filteredRncs.length)} de {filteredRncs.length.toLocaleString('pt-BR')} ocorrências
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="btn-secondary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>
          <span className="px-2 font-bold text-[#0f172a]">
            {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="btn-secondary h-8 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Lista8DView;
