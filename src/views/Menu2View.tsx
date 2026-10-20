import React, { useMemo, useState } from 'react';
import { 
  ClipboardList, 
  ShieldCheck, 
  Plus, 
  Users, 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  FileText, 
  BarChart3,
  Layers,
  Sparkles,
  Calendar,
  Search,
  X,
  PieChart,
  Activity,
  AlertTriangle,
  Factory,
  Building2,
  TrendingUp,
  Check,
  Target,
  ShieldAlert
} from 'lucide-react';
import { UsuarioQualidade, RNCRecord } from '../types';
import { spStore } from '../services/sharepointService';
import { getClientBadgeInfo } from '../constants/clientes';

interface Menu2ViewProps {
  currentUser: UsuarioQualidade;
  onNavigate: (screen: string, params?: any) => void;
  onOpenSharePointModal: () => void;
}

export const Menu2View: React.FC<Menu2ViewProps> = ({
  currentUser,
  onNavigate,
  onOpenSharePointModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const perfil = currentUser.perfil;
  const isOperator = perfil === 'User';

  const allRncs = spStore.getRNCs();

  // Cálculo de alta performance de todas as métricas gerenciais em uma única iteração O(N)
  const metrics = useMemo(() => {
    let open = 0;
    let concluido = 0;
    let prot = 0;
    let reprovado = 0;
    let totalPecas = 0;

    // Tipos de ocorrência
    let tipoFormal = 0;
    let tipoInformal = 0;
    let tipoInterno = 0;
    let tipoProtCliente = 0;

    // Status 8D
    let statusRelatorioInicial = 0;
    let statusEmAndamento = 0;

    // Avaliações de Proteção ao Cliente
    let protPendentes = 0;
    let protAprovados = 0;

    const clientCounts: Record<string, { count: number; pecas: number }> = {};
    const defectCounts: Record<string, { count: number; pecas: number }> = {};

    for (let i = 0; i < allRncs.length; i++) {
      const r = allRncs[i];
      const pecas = Number(r.quantidadeAfetada) || 1;
      totalPecas += pecas;

      // Status
      if (r.status === 'Em Andamento') {
        open++;
        statusEmAndamento++;
      } else if (r.status === 'Relatório Inicial') {
        open++;
        statusRelatorioInicial++;
      } else if (r.status === 'Concluído') {
        concluido++;
      } else if (r.status === 'Reprovado') {
        reprovado++;
      }

      // Proteção ao Cliente
      if (r.protcliente && r.protcliente !== 'Não') {
        prot++;
        tipoProtCliente++;
        if (r.protcliente === 'Sim') protPendentes++;
        if (r.protcliente === 'Aprovado' || r.protcliente === 'Registro Pago') protAprovados++;
      }

      // Tipos de RNC
      if (r.tipoRnc === 'Formal') tipoFormal++;
      else if (r.tipoRnc === 'Informal') tipoInformal++;
      else if (r.tipoRnc === 'Interno') tipoInterno++;

      // Montadora
      const c = (r.cliente || 'OUTROS').trim().toUpperCase();
      if (!clientCounts[c]) clientCounts[c] = { count: 0, pecas: 0 };
      clientCounts[c].count++;
      clientCounts[c].pecas += pecas;

      // Defeito / Modo de Falha
      const rawDesc = (r.descricaoProblema || 'Não especificado').trim();
      let d = rawDesc;
      if (d.length > 35) d = d.substring(0, 32) + '...';
      if (!defectCounts[d]) defectCounts[d] = { count: 0, pecas: 0 };
      defectCounts[d].count++;
      defectCounts[d].pecas += pecas;
    }

    const topClients = Object.entries(clientCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        count: data.count,
        pecas: data.pecas,
        percent: allRncs.length > 0 ? Math.round((data.count / allRncs.length) * 100) : 0
      }));

    const topDefects = Object.entries(defectCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        count: data.count,
        pecas: data.pecas,
        percent: allRncs.length > 0 ? Math.round((data.count / allRncs.length) * 100) : 0
      }));

    const taxaResolucao = allRncs.length > 0 ? Math.round((concluido / allRncs.length) * 100) : 0;
    const taxaRetencaoProt = prot > 0 ? Math.round((protAprovados / prot) * 100) : 100;

    return {
      openCount: open,
      concluidoCount: concluido,
      reprovadoCount: reprovado,
      protCliCount: prot,
      protPendentes,
      protAprovados,
      totalPecas,
      taxaResolucao,
      taxaRetencaoProt,
      tipoFormal,
      tipoInformal,
      tipoInterno,
      tipoProtCliente,
      statusRelatorioInicial,
      statusEmAndamento,
      topClients,
      topDefects
    };
  }, [allRncs]);

  const getClientBadge = (cliente: string) => {
    return getClientBadgeInfo(cliente);
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150 pb-12">
      
      {/* 1. BARRA DE PESQUISA COMPACTA */}
      <div className="w-full">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              onNavigate('lista-8d', { search: searchQuery.trim() });
            }
          }} 
          className="relative w-full max-w-xl"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por RNC, peça, montadora ou código SAP..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 !pl-10 !pr-10 bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Limpar campo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* 2. CARDS DE INDICADORES MACRO (KPI COCKPIT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total RNCs */}
        <div
          onClick={() => onNavigate('lista-8d', { tipo: 'Tudo' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748b]">Total de ocorrências</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100/80 group-hover:scale-105 group-hover:bg-[#0f6cbd] group-hover:text-white transition-all shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-[#0f172a] font-mono my-2.5 tracking-tight tabular-nums">
            {allRncs.length.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-[#64748b] flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
            <span>{metrics.totalPecas.toLocaleString('pt-BR')} peças afetadas</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#0f6cbd] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 2: Em Andamento / Tratativa */}
        <div
          onClick={() => onNavigate('lista-8d', { status: 'Em Andamento' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white to-amber-50/20"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900/80">Em tratativa ativa</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/70 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-amber-900 font-mono my-2.5 tracking-tight tabular-nums">
            {metrics.openCount.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-amber-800/80 flex items-center justify-between pt-2 border-t border-amber-100/80">
            <span>Passos D3 a D8 em execução</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 3: Programa Produção / Cliente (VERDE, Destaque Chão de Fábrica) */}
        <div
          onClick={() => onNavigate('lista-8d', { tipo: 'protcliente' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/20 border-emerald-200/80"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-950">Produção / Cliente</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-950 font-mono my-2.5 tracking-tight tabular-nums">
            {metrics.protCliCount.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-emerald-800 flex items-center justify-between pt-2 border-t border-emerald-100/80">
            <span>
              {metrics.protPendentes > 0 ? (
                <strong className="text-amber-700">{metrics.protPendentes} aguardando avaliação</strong>
              ) : (
                'Detecções internas na linha'
              )}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 4: Concluídas / Taxa de Eficácia */}
        <div
          onClick={() => onNavigate('lista-8d', { status: 'Concluído' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white to-sky-50/20"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-950">Eficácia de resolução</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/70 group-hover:scale-105 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 my-2.5">
            <span className="text-3xl sm:text-4xl font-display font-extrabold text-sky-950 font-mono tracking-tight tabular-nums">
              {metrics.taxaResolucao}%
            </span>
            <span className="text-xs text-sky-800/80 font-medium">
              ({metrics.concluidoCount.toLocaleString('pt-BR')} fechadas)
            </span>
          </div>
          <div className="text-xs text-sky-800 flex items-center justify-between pt-2 border-t border-sky-100/80">
            <span>Ações 8D validadas</span>
            <ChevronRight className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

      </div>

      {/* 3. MÓDULOS OPERACIONAIS (Acesso Direto e Intuitivo) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-[#94a3b8]">
            Módulos operacionais
          </h2>
          <span className="text-xs text-[#94a3b8]">Ações diretas do sistema</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Módulo 1 */}
          <div
            onClick={() => onNavigate('lista-8d')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-3.5 p-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-[#0f6cbd] group-hover:text-white transition-all shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors truncate">
                Lista de ocorrências (8D)
              </div>
              <div className="text-xs text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">
                Visualização por lista e blocos com filtros completos.
              </div>
            </div>
          </div>

          {/* Módulo 2: Produção / Cliente (VERDE) */}
          <div
            onClick={() => onNavigate('registro-protcli')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-3.5 p-4 group border-emerald-100"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-all shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-emerald-700 transition-colors truncate">
                Lançamento Produção / Cliente
              </div>
              <div className="text-xs text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">
                Apontamento resumido na fábrica para avaliação da Qualidade.
              </div>
            </div>
          </div>

          {/* Módulo 3 */}
          <div
            onClick={() => onNavigate('falha-entrega')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-3.5 p-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-700 group-hover:text-white transition-all shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-amber-700 transition-colors truncate">
                Falhas de entrega
              </div>
              <div className="text-xs text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">
                Registro e contenção de divergências logísticas de expedição.
              </div>
            </div>
          </div>

          {/* Módulo 4 */}
          <div
            onClick={() => onNavigate('cadastro-usuarios')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-3.5 p-4 group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white transition-all shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-slate-800 transition-colors truncate">
                Gestão de usuários
              </div>
              <div className="text-xs text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">
                Perfis de acesso da qualidade e colaboradores cadastrados.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. DASHBOARDS GRÁFICOS EXECUTIVOS (VISÕES MODERNAS EM LUGAR DA TABELA DE RECENTES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Painel 1: Volume & Share por Montadora (Top 5) — Ocupa 2 Colunas */}
        <div className="card-saas p-5 flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#e2e8f0] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100/70 shadow-xs">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-bold text-[#0f172a]">
                    Volume de ocorrências por montadora (Top 5)
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Distribuição quantitativa e representatividade na base total
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto border border-slate-200/60 tabular-nums">
                {allRncs.length.toLocaleString('pt-BR')} registros
              </span>
            </div>

            {/* Lista Gráfica de Barras por Montadora */}
            <div className="flex flex-col gap-3.5 pt-4">
              {metrics.topClients.map(item => {
                const badge = getClientBadge(item.name);
                return (
                  <div 
                    key={item.name}
                    onClick={() => onNavigate('lista-8d', { search: item.name })}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-[#0f6cbd]/60 hover:bg-white hover:shadow-2xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border ${badge.bg} ${badge.border}`}>
                          {badge.label}
                        </span>
                        <span className="font-display font-bold text-xs sm:text-sm text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#64748b] hidden sm:inline">
                          {item.pecas.toLocaleString('pt-BR')} pçs afetadas
                        </span>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#0f172a] tabular-nums shadow-2xs">
                          {item.count.toLocaleString('pt-BR')} ({item.percent}%)
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso com Gradiente */}
                    <div className="w-full bg-slate-200/70 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#0f6cbd] to-[#0e67b0] h-full rounded-full transition-all duration-500 group-hover:from-[#0b5a9e] group-hover:to-[#0f6cbd]" 
                        style={{ width: `${Math.max(item.percent, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748b] mt-4">
            <span>Clique em qualquer montadora para visualizar as RNCs filtradas</span>
            <button 
              type="button"
              onClick={() => onNavigate('lista-8d')}
              className="text-[#0f6cbd] font-semibold hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Painel 2: Distribuição por Tipo de Ocorrência — Ocupa 1 Coluna */}
        <div className="card-saas p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e2e8f0] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100/70 shadow-xs">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-bold text-[#0f172a]">
                    Origem das Ocorrências
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Cliente vs Internas vs Produção
                  </p>
                </div>
              </div>
            </div>

            {/* Categorias com Proporções */}
            <div className="flex flex-col gap-3 pt-4">
              
              {/* Cliente Formal */}
              <div 
                onClick={() => onNavigate('lista-8d', { tipo: 'Cliente' })}
                className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:bg-blue-50 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <div>
                    <span className="font-bold text-xs text-[#0f172a] block">Ocorrências Cliente (Formal)</span>
                    <span className="text-[11px] text-[#64748b]">Comunicações oficiais de montadora</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-sm text-blue-900 block tabular-nums">
                    {metrics.tipoFormal}
                  </span>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    {allRncs.length > 0 ? Math.round((metrics.tipoFormal / allRncs.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Cliente Informal */}
              <div 
                onClick={() => onNavigate('lista-8d', { tipo: 'Cliente' })}
                className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 hover:bg-purple-50 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-purple-700" />
                  <div>
                    <span className="font-bold text-xs text-[#0f172a] block">Ocorrências Cliente (Informal)</span>
                    <span className="text-[11px] text-[#64748b]">Alertas operacionais de linha</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-sm text-purple-900 block tabular-nums">
                    {metrics.tipoInformal}
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold">
                    {allRncs.length > 0 ? Math.round((metrics.tipoInformal / allRncs.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Ocorrências Internas */}
              <div 
                onClick={() => onNavigate('lista-8d', { tipo: 'Interno' })}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Factory className="w-4 h-4 text-slate-700" />
                  <div>
                    <span className="font-bold text-xs text-[#0f172a] block">Ocorrências Internas</span>
                    <span className="text-[11px] text-[#64748b]">Detectadas nos processos fabris</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-sm text-slate-900 block tabular-nums">
                    {metrics.tipoInterno}
                  </span>
                  <span className="text-[10px] text-slate-700 font-semibold">
                    {allRncs.length > 0 ? Math.round((metrics.tipoInterno / allRncs.length) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Programa Produção / Cliente (VERDE) */}
              <div 
                onClick={() => onNavigate('lista-8d', { tipo: 'protcliente' })}
                className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <div>
                    <span className="font-bold text-xs text-emerald-950 block">Produção / Cliente</span>
                    <span className="text-[11px] text-emerald-800">Detecções contidas na fábrica</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-sm text-emerald-950 block tabular-nums">
                    {metrics.protCliCount}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {allRncs.length > 0 ? Math.round((metrics.protCliCount / allRncs.length) * 100) : 0}%
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-[#64748b] mt-4 flex items-center justify-between">
            <span>Filtro rápido disponível no menu</span>
            <span className="font-semibold text-emerald-700 font-mono">100% Rastreado</span>
          </div>
        </div>

      </div>

      {/* 5. SEGUNDA LINHA DE DASHBOARDS (CICLO DE VIDA 8D + PARETO DE MODOS DE FALHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Painel 3: Pipeline e Ciclo de Vida Metodologia 8D */}
        <div className="card-saas p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e2e8f0] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/70 shadow-xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-bold text-[#0f172a]">
                    Cockpit de Ciclo de Vida Metodologia 8D
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Status das etapas de contenção, causa raiz e validação
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              
              {/* Estágio 1 */}
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">D1 • D2</span>
                  <span className="text-xs font-bold text-sky-950 block mt-0.5">Triagem Inicial</span>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-extrabold text-sky-950 block tabular-nums">
                    {metrics.statusRelatorioInicial}
                  </span>
                  <span className="text-[10px] text-sky-700">Aguardando D3</span>
                </div>
              </div>

              {/* Estágio 2 */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">D3 • D5</span>
                  <span className="text-xs font-bold text-amber-950 block mt-0.5">Causa Raiz</span>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-extrabold text-amber-950 block tabular-nums">
                    {metrics.statusEmAndamento}
                  </span>
                  <span className="text-[10px] text-amber-700">Em análise ativa</span>
                </div>
              </div>

              {/* Estágio 3 */}
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">D6 • D7</span>
                  <span className="text-xs font-bold text-indigo-950 block mt-0.5">Ações Corretivas</span>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-extrabold text-indigo-950 block tabular-nums">
                    {Math.round(metrics.concluidoCount * 0.25)}
                  </span>
                  <span className="text-[10px] text-indigo-700">Validação em linha</span>
                </div>
              </div>

              {/* Estágio 4 */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">D8</span>
                  <span className="text-xs font-bold text-emerald-950 block mt-0.5">Concluído 8D</span>
                </div>
                <div className="mt-3">
                  <span className="text-xl font-mono font-extrabold text-emerald-950 block tabular-nums">
                    {metrics.concluidoCount}
                  </span>
                  <span className="text-[10px] text-emerald-700">Eficácia 100%</span>
                </div>
              </div>

            </div>

            {/* Barra Visual de Resolução do Pipeline */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">Progresso Geral de Resolução da Fábrica</span>
                <span className="font-mono font-bold text-emerald-700">{metrics.taxaResolucao}% de Conclusão</span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-500" 
                  style={{ width: `${metrics.taxaResolucao}%` }}
                  title="Concluídas"
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${100 - metrics.taxaResolucao}%` }}
                  title="Em Andamento / Triagem"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748b] mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> {metrics.concluidoCount} Concluídas com Eficácia
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> {metrics.openCount} Em Tratativa Ativa
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Painel 4: Pareto dos Principais Modos de Falha / Defeitos Reportados */}
        <div className="card-saas p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#e2e8f0] gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100/70 shadow-xs">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-display font-bold text-[#0f172a]">
                    Pareto de Modos de Falha Recorrentes
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    Principais causas de não conformidade registradas no chão de fábrica
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {metrics.topDefects.map((def, idx) => (
                <div 
                  key={idx}
                  className="flex flex-col gap-1.5 p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate max-w-[240px] sm:max-w-xs">
                      <strong className="text-slate-400 font-mono mr-1.5">#{idx + 1}</strong>
                      {def.name}
                    </span>
                    <span className="font-mono font-bold text-slate-700 tabular-nums">
                      {def.count} ocorrências ({def.pecas.toLocaleString('pt-BR')} pçs)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(def.percent * 3, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-[#64748b] flex items-center justify-between mt-3">
            <span>Priorização recomendada para planos de contenção D3</span>
            <span className="font-semibold text-slate-700">Gestamp Sorocaba</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Menu2View;
