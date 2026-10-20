import React, { useMemo } from 'react';
import { 
  ClipboardList, 
  ShieldAlert, 
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
  Calendar
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
  const perfil = currentUser.perfil;
  const isOperator = perfil === 'User';

  const allRncs = spStore.getRNCs();

  // Cálculo de alta performance de todas as métricas em uma única iteração O(N)
  const { openCount, concluidoCount, protCliCount, recentRncs, clientDistribution } = useMemo(() => {
    let open = 0;
    let concluido = 0;
    let prot = 0;
    const clientCounts: Record<string, number> = {};

    for (let i = 0; i < allRncs.length; i++) {
      const r = allRncs[i];
      if (r.status === 'Em Andamento' || r.status === 'Relatório Inicial') {
        open++;
      } else if (r.status === 'Concluído') {
        concluido++;
      }
      if (r.protcliente === 'Sim' || r.protcliente === 'Aprovado' || (r.protcliente && r.protcliente !== 'Não')) {
        prot++;
      }
      const c = (r.cliente || 'OUTROS').trim().toUpperCase();
      clientCounts[c] = (clientCounts[c] || 0) + 1;
    }

    const dist = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        percent: allRncs.length > 0 ? Math.round((count / allRncs.length) * 100) : 0
      }));

    return {
      openCount: open,
      concluidoCount: concluido,
      protCliCount: prot,
      recentRncs: allRncs.slice(0, 7),
      clientDistribution: dist
    };
  }, [allRncs]);

  const getClientBadge = (cliente: string) => {
    return getClientBadgeInfo(cliente);
  };

  const getStatusBadge = (status: string, prot?: string) => {
    if (prot && prot !== 'Não') {
      return (
        <span className="badge-status bg-rose-100 text-rose-800 border border-rose-300">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>Proteção</span>
        </span>
      );
    }
    switch (status) {
      case 'Concluído':
        return (
          <span className="badge-status bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>Concluído</span>
          </span>
        );
      case 'Em Andamento':
        return (
          <span className="badge-status bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>Em Andamento</span>
          </span>
        );
      default:
        return (
          <span className="badge-status bg-sky-100 text-sky-800 border border-sky-300">
            <FileText className="w-3.5 h-3.5 shrink-0 text-sky-600" />
            <span>Relatório Inicial</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col !gap-6 sm:!gap-8 animate-in fade-in duration-200">
      
      {/* 1. CABEÇALHO DA PÁGINA INICIAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-[#0b5796] bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-200/60 shadow-xs">
              Gestamp Sorocaba • Planta Sorocaba
            </span>
          </div>
          <h1 className="text-xl sm:text-3xl font-display font-bold text-[#0f172a] tracking-tight">
            Olá, {currentUser.nome ? currentUser.nome.split(' ')[0] : 'Usuário'} • Visão geral da qualidade
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-1 leading-relaxed max-w-2xl text-balance">
            Painel corporativo de não conformidades, protocolos de proteção ao cliente e metodologia 8D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {!isOperator && (
            <button
              type="button"
              onClick={() => onNavigate('registro-8d', { edicao: false })}
              className="btn-primary !h-10.5 !px-4 text-xs sm:text-sm font-semibold shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="font-display">Nova RNC / 8D</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CARDS DE INDICADORES (MÉTRICAS ESCULPIDAS COM BRILHO TÊNUE E TABULAR NUMS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total RNCs */}
        <div
          onClick={() => onNavigate('lista-8d', { tipo: 'Tudo' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748b]">Total de ocorrências</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100/80 group-hover:scale-105 group-hover:bg-[#0f6cbd] group-hover:text-white transition-all shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-[#0f172a] font-mono my-3 tracking-tight tabular-nums">
            {allRncs.length.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-[#64748b] flex items-center justify-between pt-2.5 border-t border-[#f1f5f9]">
            <span>Base ativa SharePoint</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#0f6cbd] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 2: Em Andamento */}
        <div
          onClick={() => onNavigate('lista-8d', { status: 'Em Andamento' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white to-amber-50/20"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-900/80">Em andamento</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/70 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-amber-900 font-mono my-3 tracking-tight tabular-nums">
            {openCount.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-amber-800/80 flex items-center justify-between pt-2.5 border-t border-amber-100/80">
            <span>Tratativas D3 a D8 em execução</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 3: Proteção ao Cliente */}
        <div
          onClick={() => onNavigate('lista-8d', { tipo: 'protcliente' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white to-rose-50/20"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-900/80">Proteção ao cliente</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200/70 group-hover:scale-105 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-rose-900 font-mono my-3 tracking-tight tabular-nums">
            {protCliCount.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-rose-800/80 flex items-center justify-between pt-2.5 border-t border-rose-100/80">
            <span>Etiquetas SAP em triagem 100%</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Card 4: Concluídas */}
        <div
          onClick={() => onNavigate('lista-8d', { status: 'Concluído' })}
          className="card-saas card-saas-hover cursor-pointer flex flex-col justify-between group relative overflow-hidden bg-gradient-to-b from-white to-emerald-50/20"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-900/80">Concluídas</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/70 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-900 font-mono my-3 tracking-tight tabular-nums">
            {concluidoCount.toLocaleString('pt-BR')}
          </div>
          <div className="text-xs text-emerald-800/80 flex items-center justify-between pt-2.5 border-t border-emerald-100/80">
            <span>Eficácia das ações comprovada</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

      </div>

      {/* 3. MÓDULOS OPERACIONAIS (Cards Táteis e Elegantes) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-xs font-display font-semibold uppercase tracking-wider text-[#94a3b8]">
            Módulos operacionais
          </h2>
          <span className="text-xs text-[#94a3b8]">Acesso rápido às ferramentas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Módulo 1 */}
          <div
            onClick={() => onNavigate('lista-8d')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-4 p-4.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-[#0f6cbd] group-hover:text-white transition-all shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors truncate">
                Lista de ocorrências (8D)
              </div>
              <div className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                Galeria completa com filtros por linha, montadora e status.
              </div>
            </div>
          </div>

          {/* Módulo 2 */}
          <div
            onClick={() => onNavigate('registro-protcli')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-4 p-4.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100 group-hover:bg-rose-700 group-hover:text-white transition-all shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-rose-700 transition-colors truncate">
                Proteção ao cliente
              </div>
              <div className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                Cadastro e validação de etiqueta SAP (9 dígitos) para triagem imediata.
              </div>
            </div>
          </div>

          {/* Módulo 3 */}
          <div
            onClick={() => onNavigate('falha-entrega')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-4 p-4.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 group-hover:bg-amber-700 group-hover:text-white transition-all shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-amber-700 transition-colors truncate">
                Falhas de entrega
              </div>
              <div className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                Registro e contenção de divergências logísticas de expedição.
              </div>
            </div>
          </div>

          {/* Módulo 4 */}
          <div
            onClick={() => onNavigate('cadastro-usuarios')}
            className="card-saas card-saas-hover cursor-pointer flex items-start gap-4 p-4.5 group"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-slate-700 group-hover:text-white transition-all shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-display font-bold text-[#0f172a] group-hover:text-slate-800 transition-colors truncate">
                Gestão de usuários
              </div>
              <div className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                Perfis de acesso da qualidade e colaboradores cadastrados.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. RESUMO GERENCIAL POR MONTADORA (DADOS REAIS COM BARRAS PROPORCIONAIS) */}
      <div className="card-saas p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#e2e8f0] gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100/70 shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-display font-bold text-[#0f172a]">
                Volume de ocorrências por montadora (top 5)
              </h2>
              <p className="text-xs text-[#64748b]">
                Distribuição percentual e quantitativa dos incidentes registrados
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 self-start sm:self-auto border border-slate-200/60 tabular-nums">
            {allRncs.length.toLocaleString('pt-BR')} registros
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {clientDistribution.map(item => {
            const badge = getClientBadge(item.name);
            return (
              <div 
                key={item.name} 
                onClick={() => onNavigate('lista-8d', { search: item.name })}
                className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#0f6cbd]/60 hover:bg-white hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border ${badge.bg} ${badge.border}`}>
                        {badge.label}
                      </span>
                      <span className="font-display font-bold text-sm text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-white border border-[#e2e8f0] text-[#0f172a] shrink-0 tabular-nums shadow-2xs">
                      {item.percent}%
                    </span>
                  </div>

                  {/* Barra de Progresso com Escala Proporcional */}
                  <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden my-2.5">
                    <div 
                      className="bg-gradient-to-r from-[#0f6cbd] to-[#0e67b0] h-full rounded-full transition-all duration-500 group-hover:from-[#0b5a9e] group-hover:to-[#0f6cbd]" 
                      style={{ width: `${Math.max(item.percent, 4)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 text-[#64748b]">
                  <span className="font-mono font-bold text-sm text-[#0f172a] tabular-nums">
                    {item.count.toLocaleString('pt-BR')} <span className="text-xs font-normal text-[#64748b]">ocorrências</span>
                  </span>
                  <span className="text-[11px] text-[#0f6cbd] font-semibold group-hover:underline flex items-center gap-0.5">
                    Filtrar <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. OCORRÊNCIAS RECENTES (Tabela Responsiva no Desktop + Cards no Mobile) */}
      <div className="card-saas p-0 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-sm sm:text-base font-display font-bold text-[#0f172a]">
              Ocorrências recentes
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              Últimos registros reportados no chão de fábrica
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('lista-8d')}
            className="btn-subtle text-xs font-semibold text-[#0f6cbd]"
          >
            <span>Ver todas</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Versão Desktop: Tabela Bem Alinhada com Espaçamento Adequado */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-xs font-display font-semibold text-[#64748b] bg-[#f8fafc]/90">
                <th className="py-3 px-5 font-semibold">Identificação / peça</th>
                <th className="py-3 px-5 font-semibold">Cliente</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Data</th>
                <th className="py-3 px-5 font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9] text-xs sm:text-sm">
              {recentRncs.map(r => {
                const badge = getClientBadge(r.cliente);
                return (
                  <tr
                    key={r.id}
                    onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                    className="hover:bg-[#f8fafc] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border ${badge.bg} ${badge.border}`}>
                          {badge.label}
                        </div>
                        <div className="truncate max-w-xs md:max-w-md">
                          <span className="font-bold text-[#0f172a] group-hover:text-[#0f6cbd] transition-colors truncate block">
                            {r.field1 || `RNC #${r.id}`} • {r.componente || r.produto}
                          </span>
                          <span className="text-xs text-[#64748b] truncate block mt-0.5">
                            {r.descricaoProblema || 'Não Conformidade registrada na linha'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-[#334155] font-semibold">
                      {r.cliente}
                    </td>

                    <td className="py-3.5 px-5">
                      {getStatusBadge(r.status, r.protcliente)}
                    </td>

                    <td className="py-3.5 px-5 text-[#64748b] font-mono text-xs">
                      {r.dataOcorrencia}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <span className="btn-subtle text-xs text-[#0f6cbd] font-semibold group-hover:bg-blue-50 py-1.5 px-3">
                        <span>Detalhes</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Versão Mobile: Cards Compactos com Leitura Confortável */}
        <div className="sm:hidden divide-y divide-[#f1f5f9]">
          {recentRncs.map(r => {
            const badge = getClientBadge(r.cliente);
            return (
              <div
                key={r.id}
                onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                className="p-4 hover:bg-[#f8fafc] transition cursor-pointer space-y-2.5 active:bg-[#f1f5f9]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${badge.bg}`}>
                      {badge.label}
                    </div>
                    <span className="font-bold text-sm text-[#0f172a]">
                      {r.field1 || `RNC #${r.id}`}
                    </span>
                  </div>
                  <div>
                    {getStatusBadge(r.status, r.protcliente)}
                  </div>
                </div>

                <div className="text-xs font-semibold text-[#334155]">
                  {r.componente || r.produto}
                </div>

                <div className="text-xs text-[#64748b] line-clamp-2">
                  {r.descricaoProblema || 'Não Conformidade registrada'}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-[#94a3b8] font-mono">
                  <span>{r.cliente} • {r.dataOcorrencia}</span>
                  <span className="text-xs text-[#0f6cbd] font-bold flex items-center">
                    Ver <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};

export default Menu2View;
