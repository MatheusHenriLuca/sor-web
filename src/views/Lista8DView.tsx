import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
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
  Layers,
  MapPin,
  Calendar,
  Filter
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
  
  // Abas de Status (como na imagem do Power Apps)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || 'Todas');
  
  // 4 Dropdowns de Filtro da Imagem do Power Apps:
  const [setorFilter, setSetorFilter] = useState<string>('Todos');
  const [tipoRncFilter, setTipoRncFilter] = useState<string>('Todos');
  const [clienteFilter, setClienteFilter] = useState<string>('Todos');
  const [areaFilter, setAreaFilter] = useState<string>('Todas');

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
  const pageSize = 15;

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

  const getClientBadge = (cliente: string) => {
    return getClientBadgeInfo(cliente);
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
      
      {/* 1. CABEÇALHO DA PÁGINA (Com botões de ação e alternador Tabela / Galeria) */}
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

        <div className="flex items-center gap-2.5 sm:gap-3 self-start sm:self-auto flex-wrap">
          {/* Botão Sincronizar */}
          <button
            type="button"
            onClick={() => handleRefresh(true)}
            disabled={isSyncing}
            className="btn-secondary !h-10 px-3.5 text-xs font-semibold flex items-center justify-center gap-1.5"
            title="Atualizar lista com o SharePoint"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Alternador de Visualização: Tabela vs Galeria (Estilo Power Apps) */}
          <div className="!h-10 flex items-center gap-1 border border-[#e2e8f0] rounded-xl bg-slate-100/90 p-1 shadow-2xs box-border">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-full flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-[#0b5796] font-bold shadow-xs border border-slate-200/80' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Exibir como Tabela de Dados"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-full flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-[#0b5796] font-bold shadow-xs border border-slate-200/80' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
              title="Exibir como Galeria de Ocorrências (Estilo Power Apps)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Galeria</span>
            </button>
          </div>

          {/* Botão Nova RNC */}
          <button
            type="button"
            onClick={() => onNavigate('registro-8d', { edicao: false, rncId: undefined, timestamp: Date.now() })}
            className="btn-primary !h-10 px-4 text-xs font-semibold shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
            title="Abrir novo Relatório Inicial de Não Conformidade"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="font-display">Nova NCC / RNC</span>
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
              className="w-full h-10 pl-10 pr-9 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0f6cbd] focus:ring-2 focus:ring-[#0f6cbd]/15 outline-none transition"
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
              className="btn-subtle text-xs text-[#0f6cbd] font-bold h-10 px-3.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        {/* Linha 2: Os 4 Dropdowns da Foto do Power Apps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
          
          {/* Dropdown 1: Setor Responsável */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Factory className="w-3 h-3 text-slate-400" />
              <span>Setor Responsável</span>
            </label>
            <select
              value={setorFilter}
              onChange={e => { setSetorFilter(e.target.value); setCurrentPage(1); }}
              className="h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0f6cbd] outline-none transition cursor-pointer"
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
              <FileText className="w-3 h-3 text-slate-400" />
              <span>Tipo de RNC</span>
            </label>
            <select
              value={tipoRncFilter}
              onChange={e => { setTipoRncFilter(e.target.value); setCurrentPage(1); }}
              className="h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0f6cbd] outline-none transition cursor-pointer"
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
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Cliente</span>
            </label>
            <select
              value={clienteFilter}
              onChange={e => { setClienteFilter(e.target.value); setCurrentPage(1); }}
              className="h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0f6cbd] outline-none transition cursor-pointer"
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
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Área</span>
            </label>
            <select
              value={areaFilter}
              onChange={e => { setAreaFilter(e.target.value); setCurrentPage(1); }}
              className="h-9.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:border-[#0f6cbd] outline-none transition cursor-pointer"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#092162] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* =========================================================================
          3. CONTEÚDO PRINCIPAL: TABELA OU GALERIA
          ========================================================================= */}
      {viewMode === 'list' ? (
        
        /* -------------------------------------------------------------------------
           MODO 1: TABELA DETALHADA COM INFORMAÇÕES AGREGADAS
           ------------------------------------------------------------------------- */
        <div className="card-saas p-0 overflow-hidden shadow-xs">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-xs font-display font-semibold text-[#64748b] bg-[#f8fafc]/90">
                  <th className="py-3 px-4 font-semibold w-[30%] max-w-[320px]">Identificação / Peça & Defeito</th>
                  <th className="py-3 px-4 font-semibold hidden md:table-cell w-[18%]">Posto & Célula Fabril</th>
                  <th className="py-3 px-4 font-semibold hidden lg:table-cell w-[15%] whitespace-nowrap">Cliente & Planta</th>
                  <th className="py-3 px-4 font-semibold w-[16%]">Governança & Rastreabilidade</th>
                  <th className="py-3 px-4 font-semibold w-[12%] whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 font-semibold hidden sm:table-cell w-[9%] whitespace-nowrap">Data</th>
                  <th className="py-3 px-4 font-semibold text-right">Ação</th>
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
                          Tente ajustar a busca ou limpe os filtros de setor, tipo, cliente ou área.
                        </p>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={clearAllFilters}
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
                    const tpBadge = getTipoPecaBadge(r.finalComponente);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                        className="hover:bg-[#f8fafc] transition-colors cursor-pointer group"
                      >
                        {/* Coluna 1: Miniatura + Identificação + Peça + Defeito */}
                        <td className="py-2.5 px-4 w-[30%] max-w-[320px]">
                          <div className="flex items-start gap-3">
                            {/* Miniatura Compacta */}
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 relative group-hover:border-[#0f6cbd]/40 transition-all mt-0.5">
                              {r.fotoPecaNg ? (
                                <>
                                  <img 
                                    src={r.fotoPecaNg} 
                                    alt={`Peça ${r.field1 || r.id}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const el = e.currentTarget;
                                      el.style.display = 'none';
                                      const fallback = el.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'flex';
                                    }}
                                  />
                                  <div className="hidden flex-col items-center justify-center text-slate-400 p-1 text-center w-full h-full bg-slate-50">
                                    <Image className="w-5 h-5 text-slate-400" />
                                    <span className="text-[8px] font-mono font-medium text-slate-500 mt-0.5">FOTO</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                                  <Image className="w-5 h-5 text-slate-300" />
                                  <span className="text-[8px] font-mono font-medium text-slate-400 mt-0.5">S/ FOTO</span>
                                </div>
                              )}
                              {r.fotoPecaOk && (
                                <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" title="Contém foto padrão OK" />
                              )}
                            </div>

                            {/* Informações da Peça e Defeito */}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors text-xs sm:text-sm font-mono-numbers">
                                  {r.field1 || `RNC #${r.id}`}
                                </span>
                                <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold border tracking-wide uppercase ${tpBadge.style}`}>
                                  {tpBadge.label}
                                </span>
                              </div>

                              {/* Linha da Peça */}
                              <div className="text-xs text-[#1e293b] font-semibold truncate flex items-center gap-1">
                                {r.finalComponente === 'Peça Final + Componente' && r.produto && r.componente ? (
                                  <span className="truncate" title={`Final: ${r.produto} • Comp: ${r.componente}`}>
                                    <span className="text-slate-400 font-normal">Final:</span> {r.produto} <span className="text-slate-300">•</span> <span className="text-slate-400 font-normal">Comp:</span> {r.componente}
                                  </span>
                                ) : (
                                  <span className="truncate" title={r.componente || r.produto}>
                                    {r.componente || r.produto || 'Peça não informada'}
                                  </span>
                                )}
                              </div>

                              {/* Defeito em destaque */}
                              <p className="text-xs font-bold text-slate-700 line-clamp-1 mt-0.5" title={r.modoFalha || r.descricaoProblema}>
                                {r.modoFalha || r.descricaoProblema || 'Defeito não informado'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Coluna 2: Posto & Célula Fabril */}
                        <td className="py-2.5 px-4 hidden md:table-cell text-slate-700">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-xs text-slate-900 truncate" title={r.posto}>
                              {r.posto || 'Posto N/A'}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate" title={r.fmds || r.classificacaoSetor}>
                              {r.fmds || r.classificacaoSetor || 'Área não informada'}
                            </span>
                          </div>
                        </td>

                        {/* Coluna 3: Cliente & Planta */}
                        <td className="py-2.5 px-4 hidden lg:table-cell text-slate-700 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-xs text-slate-900">
                              {r.cliente}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                              SOROCABA • {r.dataOcorrencia}
                            </span>
                          </div>
                        </td>

                        {/* Coluna 4: Governança & Rastreabilidade (Tipo + SAP + 8D) */}
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getTipoRncBadge(r.tipoRnc)}
                              {get8DBadge(r.abrir8D)}
                            </div>
                            {getSapBadge(r.documentoRastreabilidade, r.codigoRastreabilidade)}
                          </div>
                        </td>

                        {/* Coluna 5: Status */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {getStatusBadge(r.status, r.protcliente)}
                        </td>

                        {/* Coluna 6: Data */}
                        <td className="py-2.5 px-4 hidden sm:table-cell text-slate-500 font-mono text-xs whitespace-nowrap">
                          <div>{r.dataOcorrencia}</div>
                          <div className="text-[10px] text-slate-400">{r.turno}</div>
                        </td>

                        {/* Coluna 7: Ação */}
                        <td className="py-2.5 px-4 text-right">
                          <span className="btn-subtle text-xs text-[#0f6cbd] font-semibold group-hover:bg-blue-50 py-1 px-2.5 rounded-lg inline-flex items-center gap-1">
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

        </div>
      ) : (

        /* -------------------------------------------------------------------------
           MODO 2: GALERIA DE OCORRÊNCIAS (ADAPTAÇÃO FIEL DA FOTO DO POWER APPS)
           - Card Horizontal
           - Esquerda: Miniatura da Peça
           - Centro: Dados Operacionais (Peça, Posto, Cliente/Planta/Data, Defeito)
           - Direita: Governança (ID - Status, Formal em vermelho, SAP, 8D - Sim/Não)
           ------------------------------------------------------------------------- */
        <div className="flex flex-col gap-3">
          {paginatedRncs.length === 0 ? (
            <div className="card-saas p-12 text-center text-xs text-slate-500">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              Nenhuma ocorrência encontrada para os filtros aplicados.
            </div>
          ) : (
            paginatedRncs.map(r => {
              const tpBadge = getTipoPecaBadge(r.finalComponente);
              return (
                <div
                  key={r.id}
                  onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                  className="card-saas p-4 sm:p-5 border-slate-200 hover:border-[#0f6cbd] hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                >
                  {/* SEÇÃO 1: FOTO / MINIATURA (LADO ESQUERDO DA FOTO DO POWER APPS) */}
                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center shrink-0 relative group-hover:scale-105 transition-transform">
                      {r.fotoPecaNg ? (
                        <>
                          <img 
                            src={r.fotoPecaNg} 
                            alt={`Peça ${r.produto}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.display = 'none';
                              const fallback = el.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden flex-col items-center justify-center text-slate-400 p-1 text-center w-full h-full bg-slate-50">
                            <Image className="w-6 h-6 text-slate-400" />
                            <span className="text-[9px] font-mono mt-0.5">FOTO</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                          <Image className="w-6 h-6 text-slate-300" />
                          <span className="text-[9px] font-mono mt-0.5">S/ FOTO</span>
                        </div>
                      )}

                      {/* Tag se tiver foto OK e Auxiliar */}
                      {(r.fotoPecaOk || r.fotoAuxiliar) && (
                        <span className="absolute bottom-1.5 right-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          +2 fotos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SEÇÃO 2: DADOS DO PRODUTO E PROCESSO (CENTRO DA FOTO DO POWER APPS) */}
                  <div className="flex-1 flex flex-col gap-1 min-w-0 md:px-2">
                    {/* Linha 1: Peça Final / Componente */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0f6cbd] transition-colors">
                        {r.finalComponente === 'Peça Final + Componente' && r.produto && r.componente ? (
                          <>Peça Final + Componente: <strong className="font-mono-numbers">{r.produto} - {r.componente}</strong></>
                        ) : (
                          <>Peça Final: <strong className="font-mono-numbers">{r.produto || r.componente}</strong></>
                        )}
                      </span>
                      <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold border tracking-wide uppercase ${tpBadge.style}`}>
                        {tpBadge.label}
                      </span>
                    </div>

                    {/* Linha 2: Posto - Máquina - Setor / Área */}
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                      <Factory className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {r.posto || 'Posto N/A'} {r.fmds ? `- ${r.fmds}` : r.classificacaoSetor ? `- ${r.classificacaoSetor}` : ''}
                      </span>
                    </div>

                    {/* Linha 3: Cliente - Planta - Data */}
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium">
                        {r.cliente} - SOROCABA - {r.dataOcorrencia} ({r.turno})
                      </span>
                    </div>

                    {/* Linha 4: Defeito em destaque (Exatamente como a última linha em negrito da foto) */}
                    <div className="pt-1 mt-0.5">
                      <span className="inline-block text-xs sm:text-sm font-extrabold text-slate-900 bg-amber-50/70 border border-amber-200/60 px-2.5 py-1 rounded-lg">
                        {r.modoFalha || r.descricaoProblema || 'Defeito não informado'}
                      </span>
                    </div>
                  </div>

                  {/* SEÇÃO 3: GOVERNANÇA, RASTREABILIDADE E 8D (LADO DIREITO DA FOTO DO POWER APPS) */}
                  <div className="flex md:flex-col items-start md:items-end justify-between md:justify-center gap-1.5 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    
                    {/* Linha 1: ID - Status */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700 font-mono">
                        ID: {r.id} -
                      </span>
                      {getStatusBadge(r.status, r.protcliente)}
                    </div>

                    {/* Linha 2: Tipo de RNC (Formal em vermelho como no Power Apps) */}
                    <div className="mt-0.5">
                      {getTipoRncBadge(r.tipoRnc)}
                    </div>

                    {/* Linha 3: Etiqueta SAP ou Não Informado */}
                    <div className="mt-0.5">
                      {getSapBadge(r.documentoRastreabilidade, r.codigoRastreabilidade)}
                    </div>

                    {/* Linha 4: 8D - Sim ou 8D - Não */}
                    <div className="mt-0.5">
                      {get8DBadge(r.abrir8D)}
                    </div>

                  </div>

                </div>
              );
            })
          )}
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
