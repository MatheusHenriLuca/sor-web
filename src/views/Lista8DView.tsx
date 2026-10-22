import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List,
  ChevronRight, 
  ChevronLeft, 
  RotateCw, 
  ShieldCheck,
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  X,
  FileText,
  Image,
  Building2,
  Factory,
  Barcode,
  Layers
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, getClientBadgeInfo } from '../constants/clientes';
import { formatDateBR } from '../utils/date';
import { handleSafeClick } from '../utils/selection';

interface Lista8DViewProps {
  onNavigate: (screen: string, params?: any) => void;
  currentUser: UsuarioQualidade;
  initialTipo?: string;
  initialStatus?: string;
  initialSearch?: string;
  initialCliente?: string;
  initialSetor?: string;
}

export const Lista8DView: React.FC<Lista8DViewProps> = ({ 
  onNavigate, 
  currentUser,
  initialTipo,
  initialStatus,
  initialSearch,
  initialCliente,
  initialSetor
}) => {
  const savedState = spStore.getListFiltersState();

  const [rncs, setRncs] = useState<RNCRecord[]>(spStore.getRNCs());
  const [tipoFilter, setTipoFilter] = useState<string>(initialTipo || savedState.tipoFilter || 'Tudo');
  const [searchInput, setSearchInput] = useState<string>(initialSearch !== undefined ? initialSearch : savedState.searchInput || '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch !== undefined ? initialSearch : savedState.searchInput || '');
  
  // Abas de Status (como na imagem do Power Apps)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus && initialStatus !== 'Todas' ? initialStatus : (savedState.statusFilter || 'Todas'));
  
  // 4 Dropdowns de Filtro da Imagem do Power Apps:
  const [setorFilter, setSetorFilter] = useState<string>(initialSetor || savedState.setorFilter || 'Todos');
  const [tipoRncFilter, setTipoRncFilter] = useState<string>(savedState.tipoRncFilter || 'Todos');
  const [clienteFilter, setClienteFilter] = useState<string>(initialCliente && initialCliente !== 'Todos' ? initialCliente : (savedState.clienteFilter || 'Todos'));
  const [areaFilter, setAreaFilter] = useState<string>(savedState.areaFilter || 'Todas');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(savedState.viewMode || 'grid');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(savedState.currentPage || 1);
  const pageSize = 15;

  const role = currentUser.perfil;
  const isOperator = role === 'User';

  useEffect(() => {
    if (initialTipo && initialTipo !== tipoFilter) {
      setTipoFilter(initialTipo);
      spStore.setListFiltersState({ tipoFilter: initialTipo, currentPage: 1 });
    }
  }, [initialTipo]);

  useEffect(() => {
    if (initialStatus && initialStatus !== statusFilter) {
      setStatusFilter(initialStatus);
      spStore.setListFiltersState({ statusFilter: initialStatus, currentPage: 1 });
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialCliente && initialCliente !== clienteFilter) {
      setClienteFilter(initialCliente);
      spStore.setListFiltersState({ clienteFilter: initialCliente, currentPage: 1 });
    }
  }, [initialCliente]);

  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== searchInput) {
      setSearchInput(initialSearch);
      setDebouncedSearch(initialSearch);
      spStore.setListFiltersState({ searchInput: initialSearch, currentPage: 1 });
    }
  }, [initialSearch]);

  // Sincroniza o estado dos filtros em tempo real com o store persistente
  useEffect(() => {
    spStore.setListFiltersState({
      tipoFilter,
      statusFilter,
      setorFilter,
      tipoRncFilter,
      clienteFilter,
      areaFilter,
      searchInput,
      viewMode,
      currentPage
    });
  }, [tipoFilter, statusFilter, setorFilter, tipoRncFilter, clienteFilter, areaFilter, searchInput, viewMode, currentPage]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
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
    if (spStore.getRNCs().length === 0) {
      handleRefresh(false);
    }
  }, []);

  // Opções dinâmicas para os 4 Dropdowns
  const setoresOptions = useMemo(() => {
    const set = new Set<string>();
    rncs.forEach(r => {
      if (r.classificacaoSetor) set.add(r.classificacaoSetor.trim());
    });
    return Array.from(set).sort();
  }, [rncs]);

  const areasOptions = useMemo(() => {
    const set = new Set<string>();
    rncs.forEach(r => {
      const area = r.fmds || r.classificacaoSetor;
      if (area) set.add(area.trim());
    });
    return Array.from(set).sort();
  }, [rncs]);

  const clientesOptions = useMemo(() => {
    const set = new Set<string>(CLIENTES_LIST);
    rncs.forEach(r => {
      if (r.cliente) set.add(r.cliente.trim());
    });
    return Array.from(set).sort();
  }, [rncs]);

  // Contadores ao vivo para cada aba da foto do Power Apps
  const tabCounts = useMemo(() => {
    let todas = rncs.length;
    let protCli = 0;
    let relInicial = 0;
    let rncEmitida = 0;
    let emAndamento = 0;
    let concluido = 0;
    let reprovado = 0;
    let reincidente = 0;

    for (let i = 0; i < rncs.length; i++) {
      const r = rncs[i];
      if (r.protcliente && r.protcliente !== 'Não') protCli++;
      if (r.status === 'Relatório Inicial') relInicial++;
      else if (r.status === 'RNC Emitida') rncEmitida++;
      else if (r.status === 'Em Andamento') emAndamento++;
      else if (r.status === 'Concluído') concluido++;
      else if (r.status === 'Reprovado') reprovado++;
      if (r.reincidente === 'SIM') reincidente++;
    }

    return {
      'Todas': todas,
      'Proteção ao cliente': protCli,
      'Relatório Inicial': relInicial,
      'RNC Emitida': rncEmitida,
      'Em Andamento': emAndamento,
      'Concluído': concluido,
      'Reprovado': reprovado,
      'Reincidente': reincidente
    };
  }, [rncs]);

  // Abas de Status exatamente como na foto do Power Apps
  const filterTabs = [
    { id: 'Todas', label: 'Todas' },
    { id: 'Proteção ao cliente', label: 'Proteção ao cliente' },
    { id: 'Relatório Inicial', label: 'Relatório Inicial' },
    { id: 'RNC Emitida', label: 'RNC Emitida' },
    { id: 'Em Andamento', label: 'Em Andamento' },
    { id: 'Concluído', label: 'Concluído' },
    { id: 'Reprovado', label: 'Reprovado' },
    { id: 'Reincidente', label: 'Reincidentes' },
  ];

  // Filtro de Alta Performance (O(N)) combinando os 4 Dropdowns + Abas + Busca Livre
  const filteredRncs = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    return rncs.filter(r => {
      // 1. Filtro do Menu Lateral (Origem / Categoria de Registro)
      if (tipoFilter === 'Cliente') {
        if (r.tipoRnc !== 'Formal' && r.tipoRnc !== 'Informal' && r.tipoRnc !== 'Improcedente') {
          return false;
        }
      } else if (tipoFilter === 'Interno') {
        if (r.tipoRnc !== 'Interno') {
          return false;
        }
      } else if (tipoFilter === 'protcliente') {
        if (!r.protcliente || r.protcliente === 'Não') {
          return false;
        }
      }

      // 2. Filtro das Abas de Status
      if (statusFilter === 'Reincidente') {
        if (r.reincidente !== 'SIM') return false;
      } else if (statusFilter === 'Proteção ao cliente') {
        if (!r.protcliente || r.protcliente === 'Não') return false;
      } else if (statusFilter !== 'Todas') {
        if (r.status !== statusFilter) return false;
      }

      // 3. Dropdown 1: Setor Responsável
      if (setorFilter !== 'Todos' && r.classificacaoSetor !== setorFilter) {
        return false;
      }

      // 4. Dropdown 2: Tipo de RNC
      if (tipoRncFilter !== 'Todos' && r.tipoRnc !== tipoRncFilter) {
        return false;
      }

      // 5. Dropdown 3: Cliente
      if (clienteFilter !== 'Todos' && r.cliente !== clienteFilter) {
        return false;
      }

      // 6. Dropdown 4: Área
      if (areaFilter !== 'Todas') {
        const area = r.fmds || r.classificacaoSetor;
        if (area !== areaFilter) return false;
      }

      // 7. Busca Livre Inteligente (ID, RNC, Produto, Componente, Defeito, Posto, SAP)
      if (query) {
        const matchId = String(r.id).includes(query);
        const matchTitle = (r.field1 || '').toLowerCase().includes(query);
        const matchCliente = (r.cliente || '').toLowerCase().includes(query);
        const matchProd = (r.produto || '').toLowerCase().includes(query);
        const matchComp = (r.componente || '').toLowerCase().includes(query);
        const matchSap = (r.codigoRastreabilidade || '').toLowerCase().includes(query);
        const matchDefeito = (r.descricaoProblema || '').toLowerCase().includes(query);
        const matchModoFalha = (r.modoFalha || '').toLowerCase().includes(query);
        const matchPosto = (r.posto || '').toLowerCase().includes(query);
        const matchSetor = (r.classificacaoSetor || '').toLowerCase().includes(query);
        
        if (!matchId && !matchTitle && !matchCliente && !matchProd && !matchComp && !matchSap && !matchDefeito && !matchModoFalha && !matchPosto && !matchSetor) {
          return false;
        }
      }

      return true;
    });
  }, [rncs, tipoFilter, statusFilter, setorFilter, tipoRncFilter, clienteFilter, areaFilter, debouncedSearch]);

  const totalPages = Math.ceil(filteredRncs.length / pageSize) || 1;
  const paginatedRncs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRncs.slice(start, start + pageSize);
  }, [filteredRncs, currentPage, pageSize]);

  const hasActiveFilters = setorFilter !== 'Todos' || tipoRncFilter !== 'Todos' || clienteFilter !== 'Todos' || areaFilter !== 'Todas' || searchInput || statusFilter !== 'Todas' || tipoFilter !== 'Tudo';

  const clearAllFilters = () => {
    setSetorFilter('Todos');
    setTipoRncFilter('Todos');
    setClienteFilter('Todos');
    setAreaFilter('Todas');
    setSearchInput('');
    setStatusFilter('Todas');
    setTipoFilter('Tudo');
    setCurrentPage(1);
  };

  const getTipoPecaBadge = (tipo?: string) => {
    switch (tipo) {
      case 'Peça Final':
      case 'Produto Final':
        return {
          label: 'Peça Final',
          style: 'bg-blue-50 text-[#0b5796] border-blue-200'
        };
      case 'Peça Final + Componente':
      case 'Produto Final + Componente':
      case 'Final + Componente':
        return {
          label: 'Final + Comp',
          style: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'Componente':
      case 'Componente Isolado':
        return {
          label: 'Componente',
          style: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'SubComponente + Componente':
      case 'Subcomponente':
        return {
          label: 'SubComponente',
          style: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      default:
        return {
          label: tipo || 'Peça Final',
          style: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  const getStatusBadge = (status: string, prot?: string) => {
    const isProtCliente = prot && prot !== 'Não';
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        {isProtCliente && (
          <span title="Proteção ao Cliente Ativa" className="text-emerald-600 shrink-0 inline-flex items-center">
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
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
        ) : status === 'RNC Emitida' ? (
          <span className="badge-status bg-indigo-100 text-indigo-900 border border-indigo-300">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
            <span>RNC Emitida</span>
          </span>
        ) : status === 'Relatório Inicial' ? (
          <span className="badge-status bg-sky-100 text-sky-800 border border-sky-300">
            <FileText className="w-3.5 h-3.5 shrink-0 text-sky-600" />
            <span>Relatório Inicial</span>
          </span>
        ) : status === 'Reprovado' ? (
          <span className="badge-status bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>Reprovado</span>
          </span>
        ) : (
          <span className="badge-status bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        )}
      </div>
    );
  };

  const getTipoRncBadge = (tipo?: string) => {
    switch (tipo) {
      case 'Formal':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 tracking-wide">
            Formal
          </span>
        );
      case 'Informal':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
            Informal
          </span>
        );
      case 'Interno':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200">
            Interno
          </span>
        );
      case 'Improcedente':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
            Improcedente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200">
            {tipo || 'Formal'}
          </span>
        );
    }
  };

  const getSapBadge = (doc?: string, codigo?: string) => {
    const isSap = doc === 'Etiqueta SAP' || !!codigo;
    if (isSap) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 max-w-full truncate" title={codigo ? `SAP: ${codigo}` : 'Etiqueta SAP'}>
          <Barcode className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="font-mono truncate">{codigo ? `SAP: ${codigo}` : 'Etiqueta SAP'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
        Não Informado
      </span>
    );
  };

  const get8DBadge = (abrir8D?: string) => {
    const isSim = abrir8D === 'Sim' || abrir8D === 'SIM';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border tracking-wide ${
        isSim 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
          : 'bg-slate-100 text-slate-500 border-slate-200'
      }`}>
        <Layers className="w-3 h-3 shrink-0" />
        <span>8D - {isSim ? 'Sim' : 'Não'}</span>
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150 pb-12">
      
      {/* 1. CABEÇALHO DA PÁGINA (Com botões de ação e alternador Bloco / Lista Compacta) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100 shadow-xs">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-display font-bold text-[#0f172a] tracking-tight">
                Lista de Ocorrências
              </h1>
              {tipoFilter !== 'Tudo' && (
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {tipoFilter}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748b] tabular-nums mt-0.5">
              {filteredRncs.length.toLocaleString('pt-BR')} registro(s) sincronizados com SharePoint Online
            </p>
          </div>
        </div>

        {/* Alternador de Visão: Visão em Bloco (Principal) vs Lista Compacta (Segunda Opção) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none ${
                viewMode === 'grid'
                  ? 'bg-white text-[#0b5796] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Visão principal em Blocos (Galeria completa com fotos)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Visão em Bloco</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none ${
                viewMode === 'list'
                  ? 'bg-white text-[#0b5796] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Visão de lista compacta (Tabela condensada de alta densidade)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Compacta</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleRefresh(true)}
            disabled={isSyncing}
            className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
            title="Sincronizar dados com SharePoint"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. PAINEL DE FILTROS & BUSCA (REFERÊNCIA DIRETA DA TELA DO POWER APPS)
          - Campo de Busca no topo
          - 4 Dropdowns: Setor Responsável, Tipo de RNC, Cliente, Área
          - Abas de Status com contadores numéricos
          ========================================================================= */}
      <div className="card-saas p-4 sm:p-5 border-slate-200 flex flex-col gap-4 shadow-2xs">
        
        {/* Linha 1: Campo de Busca com Atalho e Limpeza */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Buscar por código de produtos, RNC, defeito, posto ou SAP..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="form-input search-input-field w-full text-xs sm:text-sm bg-slate-50/70"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Limpar texto da busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn-subtle text-xs text-[#0b5796] font-bold h-[38px] px-3.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Linha 2: Os 4 Dropdowns da Foto do Power Apps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          
          {/* Dropdown 1: Setor Responsável */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Factory className="w-3.5 h-3.5 text-slate-400" />
              <span>Setor Responsável</span>
            </label>
            <select
              value={setorFilter}
              onChange={e => { setSetorFilter(e.target.value); setCurrentPage(1); }}
              className="form-input h-[38px] text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="Todos">Localizar itens (Todos)</option>
              {setoresOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Tipo de RNC */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tipo de RNC</span>
            </label>
            <select
              value={tipoRncFilter}
              onChange={e => { setTipoRncFilter(e.target.value); setCurrentPage(1); }}
              className="form-input h-[38px] text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="Todos">Localizar itens (Todos)</option>
              <option value="Formal">Formal</option>
              <option value="Informal">Informal</option>
              <option value="Interno">Interno</option>
              <option value="Improcedente">Improcedente</option>
            </select>
          </div>

          {/* Dropdown 3: Cliente */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Cliente</span>
            </label>
            <select
              value={clienteFilter}
              onChange={e => { setClienteFilter(e.target.value); setCurrentPage(1); }}
              className="form-input h-[38px] text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="Todos">Localizar itens (Todos)</option>
              {clientesOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Dropdown 4: Área */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Área</span>
            </label>
            <select
              value={areaFilter}
              onChange={e => { setAreaFilter(e.target.value); setCurrentPage(1); }}
              className="form-input h-[38px] text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="Todas">Localizar itens (Todas)</option>
              {areasOptions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Linha 3: Abas de Status da Imagem do Power Apps com Contadores em Tempo Real */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {filterTabs.map(tab => {
            const isActive = statusFilter === tab.id;
            const count = tabCounts[tab.id as keyof typeof tabCounts] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#0b5796] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums font-bold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* =========================================================================
          3. CONTEÚDO PRINCIPAL: VISÃO EM BLOCOS (PRINCIPAL) OU LISTA COMPACTA
          ========================================================================= */}
      {paginatedRncs.length === 0 ? (
        <div className="card-saas p-12 text-center text-xs text-slate-500">
          <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          Nenhuma ocorrência encontrada para os filtros aplicados.
        </div>
      ) : viewMode === 'grid' ? (
        /* VISÃO 1: BLOCOS / CARDS (GALERIA PRINCIPAL COM FOTOS) */
        <div className="flex flex-col gap-3">
          {paginatedRncs.map(r => {
            const tpBadge = getTipoPecaBadge(r.finalComponente);
            const isFormal = r.tipoRnc === 'Formal';
            const formalCode = isFormal 
              ? (r.codOcorrenciaCliente?.trim() || (
                  r.field1 && 
                  !['RNC #' + r.id, 'RNC-' + r.id, 'RNC ' + r.id, '#' + r.id, String(r.id)].includes(r.field1.trim()) 
                    ? r.field1.trim() 
                    : null
                ))
              : null;

            return (
              <div
                key={r.id}
                onClick={(e) => handleSafeClick(() => onNavigate('detalhes-8d', { rncId: r.id }), e)}
                className="card-saas p-4 sm:p-5 border-slate-200 hover:border-[#0f6cbd] hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* SEÇÃO 1: FOTO / MINIATURA (LADO ESQUERDO DA FOTO DO POWER APPS) */}
                {/* SEÇÃO 1: FOTO / MINIATURA EXPANDIDA (APROVEITANDO O ESPAÇO DO CARD) */}
                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 relative group-hover:scale-[1.02] transition-transform">
                    {r.fotoPecaNg ? (
                      <>
                        <img 
                          src={r.fotoPecaNg} 
                          alt={`Peça ${r.produto}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.display = 'none';
                            const fallback = el.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="hidden flex-col items-center justify-center text-slate-400 p-2 text-center w-full h-full bg-slate-50">
                          <Image className="w-8 h-8 text-slate-400" />
                          <span className="text-[10px] font-mono mt-1 font-bold">FOTO</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <Image className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] font-mono mt-1 font-bold">S/ FOTO</span>
                      </div>
                    )}

                    {/* Tag se tiver foto OK e Auxiliar */}
                    {(r.fotoPecaOk || r.fotoAuxiliar) && (
                      <span className="absolute bottom-2 right-2 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md font-mono shadow-xs">
                        +2 fotos
                      </span>
                    )}
                  </div>
                </div>

                {/* SEÇÃO 2: DADOS DO PRODUTO E PROCESSO */}
                <div className="flex-1 flex flex-col gap-1.5 min-w-0 md:px-2">
                  {/* Linha 1: Peça Final / Componente */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-base font-bold text-slate-900 group-hover:text-[#0b5796] transition-colors">
                      {r.finalComponente === 'Peça Final + Componente' && r.produto && r.componente ? (
                        <>Peça Final + Componente: <strong className="font-mono-numbers">{r.produto} - {r.componente}</strong></>
                      ) : (
                        <>Peça Final: <strong className="font-mono-numbers">{r.produto || r.componente}</strong></>
                      )}
                    </span>
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${tpBadge.style}`}>
                      {tpBadge.label}
                    </span>
                  </div>

                  {/* Linha 2: Posto - Máquina - Setor / Área */}
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                    <Factory className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {r.posto || 'Posto N/A'} {r.fmds ? `- ${r.fmds}` : r.classificacaoSetor ? `- ${r.classificacaoSetor}` : ''}
                    </span>
                  </div>

                  {/* Linha 3: Cliente - Data */}
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">
                      {r.cliente} • <span className="tabular-nums font-semibold">{formatDateBR(r.dataOcorrencia)}</span> {r.turno && `(${r.turno})`}
                    </span>
                  </div>
                </div>

                {/* SEÇÃO 3: STATUS/TIPO/DEFEITO E RNC/SAP/8D (2 COLUNAS COM 3 LINHAS CADA) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 items-start md:items-center">
                  
                  {/* Coluna 1: Status, Tipo e Defeito */}
                  <div className="flex flex-col items-start md:items-end gap-1.5">
                    {/* Linha 1: Status */}
                    <div className="flex items-center justify-start md:justify-end">
                      {getStatusBadge(r.status, r.protcliente)}
                    </div>
                    {/* Linha 2: Tipo de RNC */}
                    <div className="flex items-center justify-start md:justify-end">
                      {getTipoRncBadge(r.tipoRnc)}
                    </div>
                    {/* Linha 3: Defeito */}
                    <div className="flex items-center justify-start md:justify-end">
                      <span 
                        className="inline-block text-xs font-bold text-amber-950 bg-amber-50 border border-amber-300/80 px-2.5 py-0.5 rounded-lg max-w-[200px] truncate"
                        title={r.modoFalha || r.descricaoProblema || 'Defeito não informado'}
                      >
                        {r.modoFalha || r.descricaoProblema || 'Defeito não informado'}
                      </span>
                    </div>
                  </div>

                  {/* Coluna 2: RNC com Código, Etiqueta SAP e Governança 8D */}
                  <div className="flex flex-col items-start md:items-end gap-1.5">
                    {/* Linha 1: RNC # com código */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-start md:justify-end">
                      <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                        RNC #{r.id}
                      </span>
                      {formalCode && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200" title={`Código do Cliente: ${formalCode}`}>
                          <span className="text-slate-500 font-normal mr-0.5">Cód:</span>{formalCode}
                        </span>
                      )}
                    </div>
                    {/* Linha 2: Etiqueta SAP */}
                    <div className="flex items-center justify-start md:justify-end">
                      {getSapBadge(r.documentoRastreabilidade, r.codigoRastreabilidade)}
                    </div>
                    {/* Linha 3: Governança 8D */}
                    <div className="flex items-center justify-start md:justify-end">
                      {get8DBadge(r.abrir8D)}
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* VISÃO 2: LISTA COMPACTA (TABELA CONDENSADA DE ALTA DENSIDADE) */
        <div className="card-saas border-slate-200 overflow-hidden shadow-2xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                  <th className="py-2.5 px-3">Identificador</th>
                  <th className="py-2.5 px-3">Peça / Produto</th>
                  <th className="py-2.5 px-3">Defeito Identificado</th>
                  <th className="py-2.5 px-3">Montadora</th>
                  <th className="py-2.5 px-3">Posto / Linha</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">8D</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRncs.map(r => {
                  const isFormal = r.tipoRnc === 'Formal';
                  const formalCode = isFormal 
                    ? (r.codOcorrenciaCliente?.trim() || (
                        r.field1 && 
                        !['RNC #' + r.id, 'RNC-' + r.id, 'RNC ' + r.id, '#' + r.id, String(r.id)].includes(r.field1.trim()) 
                          ? r.field1.trim() 
                          : null
                      ))
                    : null;
                  const peca9 = (r.componente || r.produto || '').trim().substring(0, 9);

                  return (
                    <tr 
                      key={r.id}
                      onClick={(e) => handleSafeClick(() => onNavigate('detalhes-8d', { rncId: r.id }), e)}
                      className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 font-mono">RNC #{r.id}</span>
                          {formalCode && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200" title={`Código do Cliente: ${formalCode}`}>
                              <span className="text-slate-500 mr-0.5">Cód:</span>{formalCode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 group-hover:text-[#0b5796] transition-colors line-clamp-1" title={r.componente || r.produto}>
                          {peca9 || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={r.produto || r.componente}>
                          {r.produto || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[220px]">
                        <span className="font-semibold text-slate-800 truncate block" title={r.modoFalha || r.descricaoProblema}>
                          {r.modoFalha || r.descricaoProblema || 'Não informado'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {r.cliente}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {r.posto || r.fmds || r.classificacaoSetor || '-'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono tabular-nums">
                        {formatDateBR(r.dataOcorrencia)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(r.status, r.protcliente)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getTipoRncBadge(r.tipoRnc)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        {get8DBadge(r.abrir8D)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BARRA DE PAGINAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-[#64748b]">
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
