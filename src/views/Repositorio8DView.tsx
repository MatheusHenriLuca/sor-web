import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Search, 
  Printer, 
  ExternalLink, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Car, 
  User, 
  ShieldCheck, 
  Layers, 
  FileText, 
  X, 
  Eye, 
  Tag, 
  Clock, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  RNCRecord, 
  EightDMetadata, 
  IshikawaCauseItem, 
  ActionPlanItem, 
  UsuarioQualidade, 
  ActiveScreen 
} from '../types';
import { spStore } from '../services/sharepointService';
import { tenantService } from '../services/tenantService';
import { formatDateBR } from '../utils/date';
import { normalizeDisplayText, formatOccurrenceId } from '../utils/formatText';

interface Repositorio8DViewProps {
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  currentUser: UsuarioQualidade;
}

export const Repositorio8DView: React.FC<Repositorio8DViewProps> = ({ onNavigate, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCliente, setFilterCliente] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [selectedDossier, setSelectedDossier] = useState<{
    rnc: RNCRecord;
    meta?: EightDMetadata;
    causes: IshikawaCauseItem[];
    actions: ActionPlanItem[];
  } | null>(null);

  const dossiers = useMemo(() => spStore.getConcluded8DDossiers(), []);
  const clientesList = useMemo(() => ['Todos', ...spStore.getDistinctClientes()], []);

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';

  // Filtragem dos Dossiês
  const filteredDossiers = useMemo(() => {
    return dossiers.filter(item => {
      const r = item.rnc;
      if (filterCliente !== 'Todos' && r.cliente !== filterCliente) return false;
      if (filterStatus === 'Homologado' && item.meta?.validar_8d !== 'Aprovado') return false;
      if (filterStatus === 'Em Andamento' && item.meta?.validar_8d === 'Aprovado') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullStr = `${r.id} ${r.field1 || ''} ${r.cliente} ${r.produto} ${r.componente || ''} ${r.modoFalha || ''} ${r.descricaoProblema || ''} ${item.meta?.participantes_8d || ''}`.toLowerCase();
        if (!fullStr.includes(q)) return false;
      }
      return true;
    });
  }, [dossiers, filterCliente, filterStatus, searchQuery]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = dossiers.length;
    const homologados = dossiers.filter(d => d.meta?.validar_8d === 'Aprovado' || d.rnc.status === 'Concluído').length;
    const emAnalise = total - homologados;
    const totalAcoesValidadas = dossiers.reduce((acc, curr) => acc + curr.actions.filter(a => a.status === 'Validado').length, 0);
    return { total, homologados, emAnalise, totalAcoesValidadas };
  }, [dossiers]);

  return (
    <div className="w-full flex flex-col gap-5 animate-in fade-in duration-150 pb-12">
      
      {/* 1. CABEÇALHO DO REPOSITÓRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b5796] flex items-center justify-center border border-blue-100 shadow-2xs">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-display font-bold text-slate-900 tracking-tight">
                Repositório de Dossiês 8D &amp; Histórico
              </h1>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                Auditoria IATF / VDA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Acervo de investigações 8D concluídas, causas raízes homologadas e relatórios técnicos oficiais
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('plano-acao')}
            className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ver Planos de Ação</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-saas p-3 border-slate-200 bg-white shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Dossiês no Repositório</span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-numbers mt-1">
            {stats.total}
          </div>
        </div>

        <div className="card-saas p-3 border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800">Homologados / Fechados</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono-numbers mt-1">
            {stats.homologados}
          </div>
        </div>

        <div className="card-saas p-3 border-amber-200 bg-amber-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800">Em Homologação</span>
          <div className="text-xl sm:text-2xl font-bold text-amber-900 font-mono-numbers mt-1">
            {stats.emAnalise}
          </div>
        </div>

        <div className="card-saas p-3 border-blue-200 bg-blue-50/40 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-800">Ações com Eficácia Validada</span>
          <div className="text-xl sm:text-2xl font-bold text-blue-900 font-mono-numbers mt-1">
            {stats.totalAcoesValidadas}
          </div>
        </div>
      </div>

      {/* 3. FILTROS E BUSCA */}
      <div className="card-saas p-3 sm:p-4 border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar por ID, cliente, veículo, defeito ou membro da equipe..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border-slate-200 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold hidden md:inline">Cliente:</span>
            <select
              value={filterCliente}
              onChange={e => setFilterCliente(e.target.value)}
              className="form-select text-xs py-1.5 px-2 bg-slate-50 border-slate-200 rounded-lg"
            >
              {clientesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold hidden md:inline">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="form-select text-xs py-1.5 px-2 bg-slate-50 border-slate-200 rounded-lg"
            >
              <option value="Todos">Todos</option>
              <option value="Homologado">Homologados</option>
              <option value="Em Andamento">Em Andamento</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. LISTA DE DOSSIÊS 8D (Linha única por ocorrência com cards do 1º ao 8º D) */}
      <div className="flex flex-col gap-3.5">
        {filteredDossiers.length === 0 ? (
          <div className="card-saas p-12 text-center text-slate-400 border-slate-200 bg-white">
            <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Nenhum dossiê 8D encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros de pesquisa para visualizar outros registros.</p>
          </div>
        ) : (
          filteredDossiers.map(dossier => {
            const r = dossier.rnc;
            const meta = dossier.meta;
            const isHomologado = meta?.validar_8d === 'Aprovado' || r.status === 'Concluído';
            const formalCode = r.codOcorrenciaCliente || r.field1;
            const occurrenceId = formatOccurrenceId(r.id, formalCode);

            // Causa raiz identificada (NG)
            const mainCause = dossier.causes.find(c => c.okng === 'NG');

            // Validação de preenchimento dos 8Ds
            const d1Done = Boolean(r.produto && (r.modoFalha || r.descricaoProblema));
            const d2Done = Boolean(meta?.participantes_8d && meta.participantes_8d.trim().length > 0);
            const d3Done = dossier.actions.some(a => a.tipo_acao === 'CONTENÇÃO') || Boolean(r.acoesContencao && r.acoesContencao.trim().length > 0);
            const d4Done = dossier.causes.length > 0 && dossier.causes.some(c => c.okng === 'NG' && Boolean(c.cincopq || c.descricao_causa));
            const d5Done = dossier.actions.some(a => a.tipo_acao === 'CORRETIVA');
            const d6Done = dossier.actions.some(a => a.yokoten === 'SIM' || a.poka_yoke === 'SIM') || Boolean(meta?.diretriz_yokoten && meta?.diretriz_pokayoke);
            const d7Done = dossier.actions.some(a => a.tipo_acao === 'PREVENTIVA' || Boolean(a.oData_8d_7d));
            const d8Done = isHomologado;

            const steps8D = [
              { id: '1D', name: 'Ocorrência', done: d1Done },
              { id: '2D', name: 'Equipe', done: d2Done },
              { id: '3D', name: 'Contenção', done: d3Done },
              { id: '4D', name: 'Causa Raiz', done: d4Done },
              { id: '5D', name: 'Corretivas', done: d5Done },
              { id: '6D', name: 'Abrangência', done: d6Done },
              { id: '7D', name: 'Prevenção', done: d7Done },
              { id: '8D', name: 'Homologação', done: d8Done },
            ];

            const completedCount = steps8D.filter(s => s.done).length;

            return (
              <div
                key={r.id}
                className="card-saas p-4 sm:p-5 border-slate-200 hover:border-[#0f6cbd] hover:shadow-md transition-all bg-white flex flex-col gap-3.5"
              >
                {/* Linha 1: ID Formatado + Informações do Veículo/Peça + Status Homologação */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-blue-50 text-[#0b5796] border border-blue-200">
                      {occurrenceId}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {r.cliente} • {r.produto}
                    </span>
                    {r.componente && r.componente !== r.produto && (
                      <span className="text-xs text-slate-500 hidden md:inline truncate">
                        ({r.componente})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Progresso 8D: {completedCount}/8
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                      isHomologado 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      {isHomologado ? '8D Homologado' : '8D Em Andamento'}
                    </span>
                  </div>
                </div>

                {/* Linha 2: Defeito e Descrição do Problema */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                      {normalizeDisplayText(r.modoFalha || r.descricaoProblema || 'Não conformidade registrada')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {r.detalhamentoOcorrencia || r.descricaoProblemaInterno || 'Tratativa e investigação técnica sob metodologia 8D.'}
                    </p>
                  </div>

                  <div className="flex flex-col justify-center gap-1.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                    {mainCause ? (
                      <div className="text-xs">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          Causa Raiz ({mainCause.seisms}):
                        </span>
                        <p className="text-amber-900 mt-0.5 line-clamp-1 font-medium">
                          {mainCause.cincopq || mainCause.descricao_causa}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Investigação de causa raiz (4D) em andamento</span>
                    )}
                    {meta?.participantes_8d && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">Equipe: {meta.participantes_8d}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linha 3: CARDS DO 1º AO 8º D (Indicação Visual Verde / OK de preenchimento) */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-2.5 bg-slate-100/60 rounded-xl border border-slate-200">
                  {steps8D.map(step => (
                    <div
                      key={step.id}
                      className={`py-2 px-1.5 rounded-lg border text-center flex flex-col items-center justify-center transition-all ${
                        step.done
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs font-mono">
                        <span>{step.id}</span>
                        {step.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold">•</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold truncate max-w-full mt-0.5 ${step.done ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {step.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Linha 4: Resumo de Ações e Botões de Operação */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                    <span>{dossier.actions.length} ação(ões) mapeada(s)</span>
                    <span>•</span>
                    <span>{dossier.causes.length} causa(s) investigada(s)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDossier(dossier)}
                      className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
                      title="Visualizar dossiê completo"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Dossiê</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('impressao-8d', { rncId: r.id })}
                      className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900"
                      title="Imprimir relatório técnico oficial"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('detalhes-8d', { rncId: r.id })}
                      className="btn-primary h-8 px-3.5 text-xs font-semibold gap-1.5 bg-[#0b5796] text-white"
                      title="Abrir tratativa 8D completa"
                    >
                      <span>Abrir</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =========================================================================
          MODAL: VISUALIZADOR DE DOSSIÊ COMPLETO 8D
          ========================================================================= */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0b5796] flex items-center justify-center font-black">
                  8D
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Dossiê Técnico 8D: {formatOccurrenceId(selectedDossier.rnc.id, selectedDossier.rnc.codOcorrenciaCliente || selectedDossier.rnc.field1)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedDossier.rnc.cliente} • {selectedDossier.rnc.produto} • {formatDateBR(selectedDossier.rnc.dataOcorrencia)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Dossiê */}
            <div className="p-5 overflow-y-auto flex flex-col gap-5 text-xs">
              
              {/* 1D & 2D */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 uppercase text-[11px]">1D. Descrição do Problema &amp; 2D. Equipe</span>
                  <span className="font-semibold text-slate-600">Posto: {selectedDossier.rnc.posto || 'Geral'}</span>
                </div>
                <p className="text-slate-800 text-sm font-semibold">
                  {normalizeDisplayText(selectedDossier.rnc.modoFalha || selectedDossier.rnc.descricaoProblema)}
                </p>
                <p className="text-slate-600 text-xs">
                  {selectedDossier.rnc.detalhamentoOcorrencia || 'Sem detalhes adicionais registrados.'}
                </p>
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span><strong>Membros da Equipe:</strong> {selectedDossier.meta?.participantes_8d || 'Equipe da Qualidade'}</span>
                </div>
              </div>

              {/* 4D. Causas e 5 Porquês */}
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px]">4D. Investigação e Árvore dos 5 Porquês</h4>
                <div className="flex flex-col gap-2">
                  {selectedDossier.causes.length === 0 ? (
                    <p className="text-slate-400 italic">Nenhuma causa do Ishikawa vinculada neste dossiê.</p>
                  ) : (
                    selectedDossier.causes.map(cause => (
                      <div 
                        key={cause.id}
                        className={`p-3 rounded-xl border ${
                          cause.okng === 'NG' ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {cause.seisms} ({cause.ocnd})
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cause.okng === 'NG' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {cause.okng === 'NG' ? 'Hipótese Confirmada (NG)' : 'Descartada (OK)'}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium mt-1">{cause.descricao_causa}</p>
                        {cause.cincopq && (
                          <div className="mt-2 pl-3 border-l-2 border-amber-400 text-[11px] text-amber-950">
                            <strong>5º Porquê (Causa Raiz):</strong> {cause.cincopq}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 5D, 6D e 7D. Ações Implementadas */}
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px]">5D, 6D &amp; 7D. Contramedidas, Abrangência e Prevenção</h4>
                <div className="flex flex-col gap-2">
                  {selectedDossier.actions.length === 0 ? (
                    <p className="text-slate-400 italic">Nenhuma ação cadastrada para este 8D.</p>
                  ) : (
                    selectedDossier.actions.map(action => (
                      <div key={action.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{action.tipo_acao}: {action.contra_medida}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {action.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                          <span>Responsável: {action.responsavel_acao}</span>
                          <span>Prazo: {formatDateBR(action.data_planejada)}</span>
                          {action.data_conclusao && <span>Conclusão: {formatDateBR(action.data_conclusao)}</span>}
                        </div>
                        {action.comentarios_evidencia && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                            <strong>Evidência:</strong> {action.comentarios_evidencia}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 8D. Parecer Final e Homologação */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col gap-2">
                <span className="font-bold text-emerald-950 uppercase text-[11px]">8D. Homologação Final da Qualidade</span>
                <p className="text-emerald-900 font-semibold">
                  Status: {selectedDossier.meta?.validar_8d || 'Aprovado'}
                </p>
                <p className="text-emerald-800 text-xs">
                  {selectedDossier.meta?.comentarios_validacao || 'Investigação validada e plano de ação homologado com base nos requisitos da montadora.'}
                </p>
                {selectedDossier.meta?.data_aprovacao && (
                  <p className="text-[11px] text-emerald-700">
                    Aprovado em {formatDateBR(selectedDossier.meta.data_aprovacao)} por {selectedDossier.meta.aprovado_por || 'Auditoria da Qualidade'}.
                  </p>
                )}
              </div>

            </div>

            {/* Footer do Modal */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="btn-secondary h-8 px-4 text-xs"
              >
                Fechar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rncId = selectedDossier.rnc.id;
                    setSelectedDossier(null);
                    onNavigate('impressao-8d', { rncId });
                  }}
                  className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Dossiê Oficial</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
