import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCw, 
  Tag, 
  User, 
  Sliders, 
  LayoutGrid, 
  List, 
  ExternalLink, 
  X, 
  Upload, 
  Paperclip, 
  HelpCircle,
  AlertCircle,
  Layers,
  Barcode,
  GitBranch,
  Share2,
  ShieldAlert,
  FolderKanban,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  ActionPlanHeader, 
  ActionPlanItem, 
  ActionItemStatus, 
  ActionItemType, 
  ActionPlanPriority, 
  UsuarioQualidade, 
  ActiveScreen 
} from '../types';
import { spStore } from '../services/sharepointService';
import { tenantService } from '../services/tenantService';
import { formatDateBR } from '../utils/date';
import { normalizeDisplayText, formatOccurrenceId } from '../utils/formatText';

interface PlanoAcaoViewProps {
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  currentUser: UsuarioQualidade;
  initialFilterPrograma?: string;
}

const PROGRAMAS_LIST = [
  'Todos',
  'ATENDIMENTO AO CLIENTE',
  'FAST RESPONSE',
  'KAIZEN',
  'AUDITORIA DE PROCESSO',
  '5S & SEGURANÇA',
  'REDUÇÃO DE SCRAP'
];

export const PlanoAcaoView: React.FC<PlanoAcaoViewProps> = ({ 
  onNavigate, 
  currentUser, 
  initialFilterPrograma 
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [activeEtapaAcoes, setActiveEtapaAcoes] = useState<
    'todas' | 'validacao' | 'minhas' | 'planos_mestres'
  >('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrograma, setFilterPrograma] = useState(initialFilterPrograma || 'Todos');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('Todas');
  const [filterTipoAcao, setFilterTipoAcao] = useState<string>('Todos');
  const [filterSomenteMinhas, setFilterSomenteMinhas] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modais e Navegação em Tela Única (Plano + Ações / Ação Específica)
  const [modalNovoPlanoOpen, setModalNovoPlanoOpen] = useState(false);
  const [modalNovaAcaoOpen, setModalNovaAcaoOpen] = useState(false);
  const [modalConcluirOpen, setModalConcluirOpen] = useState<ActionPlanItem | null>(null);
  const [modalValidarOpen, setModalValidarOpen] = useState<ActionPlanItem | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [singleScreenPlanId, setSingleScreenPlanId] = useState<number | null>(null);
  const [singleScreenActionId, setSingleScreenActionId] = useState<number | null>(null);

  // Formulário Novo Plano
  const [formPlano, setFormPlano] = useState<Partial<ActionPlanHeader>>({
    indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
    prioridade: 'Alta',
    setor_: 'Qualidade',
    descricao_problema_oportunidade: '',
    produto_: '',
    posto_: '',
    sub1: '',
    sub2: '',
    idprograma: ''
  });

  // Formulário Nova Ação
  const [formAcao, setFormAcao] = useState<Partial<ActionPlanItem>>({
    tipo_acao: 'CORRETIVA',
    contra_medida: '',
    causa: '',
    data_acompanhamento: new Date().toISOString().split('T')[0],
    data_planejada: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    responsavel_acao: currentUser.nome,
    email: currentUser.email || '',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM',
    id_rel2: 1,
    id_programa_acoes: ''
  });

  // Formulário Conclusão
  const [formConclusao, setFormConclusao] = useState({
    dataConclusao: new Date().toISOString().split('T')[0],
    comentarios: '',
    anexoUrl: ''
  });

  // Formulário Validação
  const [formValidacao, setFormValidacao] = useState<{
    status: 'Validado' | 'Aberto' | 'Atrasado';
    comentarios: string;
    motivoRevisao: string;
  }>({
    status: 'Validado',
    comentarios: '',
    motivoRevisao: ''
  });

  // Dados do Store
  const planos = useMemo(() => spStore.getActionPlans(), [refreshTrigger]);
  const baseAtivos = useMemo(() => spStore.getBaseAtivos(), []);
  const allActions = useMemo(() => spStore.getActionItems(), [refreshTrigger]);
  const allRncs = useMemo(() => spStore.getRNCs(), [refreshTrigger]);

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';

  // Navegação segura para o registro vinculado
  const handleNavigateTo8D = (refCode?: string) => {
    if (!refCode) return;
    const digits = refCode.replace(/[^0-9]/g, '');
    const numericId = digits ? Number(digits) : NaN;
    if (!Number.isNaN(numericId) && numericId > 0) {
      const found = spStore.getRNCById(numericId);
      if (found) {
        onNavigate('detalhes-8d', { rncId: found.id });
        return;
      }
    }
    const cleanRef = refCode.trim().toLowerCase();
    const byMatch = allRncs.find(
      r =>
        (r.title && r.title.toLowerCase().includes(cleanRef)) ||
        (r.field1 && r.field1.toLowerCase().includes(cleanRef))
    );
    if (byMatch) {
      onNavigate('detalhes-8d', { rncId: byMatch.id });
    } else if (allRncs.length > 0) {
      onNavigate('detalhes-8d', { rncId: numericId || allRncs[0].id });
    }
  };

  // Abre a Tela Única do Plano (e opcionalmente foca em uma ação específica)
  const handleOpenSingleScreen = (planId?: number, actionItem?: ActionPlanItem) => {
    let targetPlanId = planId || actionItem?.id_rel2;
    if (targetPlanId && !planos.some(p => p.id === targetPlanId) && actionItem?.id_programa_acoes) {
      const ensured = spStore.getOrCreatePlanForExternalApp(actionItem.id_programa_acoes);
      if (ensured) {
        targetPlanId = ensured.id;
        setRefreshTrigger(prev => prev + 1);
      }
    }
    if (!targetPlanId && actionItem?.id_programa_acoes) {
      const ensured = spStore.getOrCreatePlanForExternalApp(actionItem.id_programa_acoes);
      if (ensured) {
        targetPlanId = ensured.id;
        setRefreshTrigger(prev => prev + 1);
      }
    }
    const finalPlanId = targetPlanId || planos[0]?.id || 1;
    setSingleScreenPlanId(finalPlanId);
    if (actionItem) {
      setSingleScreenActionId(actionItem.id);
    } else {
      const firstAction = allActions.find(a => a.id_rel2 === finalPlanId);
      setSingleScreenActionId(firstAction ? firstAction.id : null);
    }
  };

  // Regra de Estado do Plano baseada nos estados das Ações dedicadas a ele
  const computePlanStatus = (pActions: ActionPlanItem[]): ActionItemStatus => {
    if (pActions.some(a => a.status === 'Atrasado')) return 'Atrasado';
    if (pActions.length > 0 && pActions.every(a => a.status === 'Validado')) return 'Validado';
    if (pActions.length > 0 && pActions.every(a => a.status === 'Concluído' || a.status === 'Validado')) {
      return 'Concluído';
    }
    return 'Aberto';
  };

  // Enriquecimento dos Planos com suas ações dedicadas e status calculado
  const enrichedPlans = useMemo(() => {
    return planos.map(plano => {
      const actions = allActions.filter(a => a.id_rel2 === plano.id);
      const computedStatus = computePlanStatus(actions);
      const abertasCount = actions.filter(a => a.status === 'Aberto').length;
      const atrasadasCount = actions.filter(a => a.status === 'Atrasado').length;
      const concluidasCount = actions.filter(a => a.status === 'Concluído').length;
      const validadasCount = actions.filter(a => a.status === 'Validado').length;
      const finalizadoCount = concluidasCount + validadasCount;
      const progresso = actions.length > 0 ? Math.round((finalizadoCount / actions.length) * 100) : 0;

      const digits = (plano.idprograma || '').replace(/[^0-9]/g, '');
      const rncNum = digits ? Number(digits) : 0;
      const rncVinculada = rncNum ? spStore.getRNCById(rncNum) : undefined;

      // Menor prazo planejado entre ações pendentes (ou geral)
      const pendingDates = actions
        .filter(a => a.status === 'Aberto' || a.status === 'Atrasado')
        .map(a => a.data_planejada)
        .filter(Boolean)
        .sort();
      const proximoPrazo = pendingDates[0] || actions.map(a => a.data_planejada).filter(Boolean).sort().slice(-1)[0] || '';

      return {
        ...plano,
        actions,
        computedStatus,
        abertasCount,
        atrasadasCount,
        concluidasCount,
        validadasCount,
        progresso,
        rncVinculada,
        proximoPrazo
      };
    });
  }, [planos, allActions]);

  // Plano e Ação ativos na Tela Única
  const activeSinglePlan = useMemo(
    () => (singleScreenPlanId !== null ? enrichedPlans.find(p => p.id === singleScreenPlanId) || null : null),
    [singleScreenPlanId, enrichedPlans]
  );

  const activeSingleAction = useMemo(() => {
    if (!activeSinglePlan) return null;
    if (singleScreenActionId !== null) {
      const found = activeSinglePlan.actions.find(a => a.id === singleScreenActionId) || allActions.find(a => a.id === singleScreenActionId);
      if (found) return found;
    }
    return activeSinglePlan.actions[0] || null;
  }, [activeSinglePlan, singleScreenActionId, allActions]);

  // Filtra Planos para o Kanban conforme filtros selecionados
  const filteredPlans = useMemo(() => {
    let result = [...enrichedPlans];

    if (activeEtapaAcoes === 'validacao') {
      result = result.filter(p => p.computedStatus === 'Concluído' || p.concluidasCount > 0);
    } else if (activeEtapaAcoes === 'minhas') {
      result = result.filter(p =>
        p.actions.some(a => a.responsavel_acao.toLowerCase() === currentUser.nome.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        p =>
          p.descricao_problema_oportunidade.toLowerCase().includes(q) ||
          (p.idprograma && p.idprograma.toLowerCase().includes(q)) ||
          (p.produto_ && p.produto_.toLowerCase().includes(q)) ||
          (p.posto_ && p.posto_.toLowerCase().includes(q)) ||
          p.actions.some(
            a =>
              (a.contra_medida && a.contra_medida.toLowerCase().includes(q)) ||
              (a.causa && a.causa.toLowerCase().includes(q)) ||
              (a.responsavel_acao && a.responsavel_acao.toLowerCase().includes(q))
          )
      );
    }

    if (filterPrograma !== 'Todos') {
      result = result.filter(p => p.indicador_programa_estrategico === filterPrograma);
    }

    if (filterPrioridade !== 'Todas') {
      result = result.filter(p => p.prioridade === filterPrioridade);
    }

    if (filterTipoAcao !== 'Todos') {
      result = result.filter(p => p.actions.some(a => a.tipo_acao === filterTipoAcao));
    }

    if (filterSomenteMinhas) {
      result = result.filter(p =>
        p.actions.some(a => a.responsavel_acao.toLowerCase() === currentUser.nome.toLowerCase())
      );
    }

    return result;
  }, [
    enrichedPlans,
    activeEtapaAcoes,
    searchQuery,
    filterPrograma,
    filterPrioridade,
    filterTipoAcao,
    filterSomenteMinhas,
    currentUser.nome
  ]);

  // Contadores gerais
  const etapaCounts = useMemo(() => {
    return {
      todas: allActions.length,
      validacao: allActions.filter(a => a.status === 'Concluído').length,
      minhas: allActions.filter(a => a.responsavel_acao.toLowerCase() === currentUser.nome.toLowerCase()).length,
      planos: planos.length
    };
  }, [allActions, planos, currentUser.nome]);

  // Filtra ações conforme critérios (usado na Lista Detalhada Tabular)
  const filteredActions = useMemo(() => {
    let result = [...allActions];

    if (activeEtapaAcoes === 'validacao') {
      result = result.filter(a => a.status === 'Concluído');
    } else if (activeEtapaAcoes === 'minhas') {
      result = result.filter(a => a.responsavel_acao.toLowerCase() === currentUser.nome.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        (a.contra_medida && a.contra_medida.toLowerCase().includes(q)) ||
        (a.causa && a.causa.toLowerCase().includes(q)) ||
        (a.responsavel_acao && a.responsavel_acao.toLowerCase().includes(q)) ||
        (a.id_programa_acoes && a.id_programa_acoes.toLowerCase().includes(q))
      );
    }

    if (filterPrograma !== 'Todos') {
      const planIds = planos
        .filter(p => p.indicador_programa_estrategico === filterPrograma)
        .map(p => p.id);
      result = result.filter(a => planIds.includes(a.id_rel2) || (a.id_programa_acoes && filterPrograma === 'ATENDIMENTO AO CLIENTE'));
    }

    if (filterTipoAcao !== 'Todos') {
      result = result.filter(a => a.tipo_acao === filterTipoAcao);
    }

    if (filterPrioridade !== 'Todas') {
      const planIds = planos
        .filter(p => p.prioridade === filterPrioridade)
        .map(p => p.id);
      result = result.filter(a => planIds.includes(a.id_rel2));
    }

    if (filterSomenteMinhas) {
      result = result.filter(a => a.responsavel_acao.toLowerCase() === currentUser.nome.toLowerCase());
    }

    return result;
  }, [allActions, planos, activeEtapaAcoes, searchQuery, filterPrograma, filterTipoAcao, filterPrioridade, filterSomenteMinhas, currentUser.nome]);

  // Contadores de KPIs (Planos e Ações)
  const stats = useMemo(() => {
    const totalPlanos = filteredPlans.length;
    const planosAbertos = filteredPlans.filter(p => p.computedStatus === 'Aberto').length;
    const planosAtrasados = filteredPlans.filter(p => p.computedStatus === 'Atrasado').length;
    const planosConcluidos = filteredPlans.filter(p => p.computedStatus === 'Concluído').length;
    const planosValidados = filteredPlans.filter(p => p.computedStatus === 'Validado').length;

    const totalAcoes = filteredActions.length;
    const acoesAtrasadas = filteredActions.filter(a => a.status === 'Atrasado').length;
    return {
      totalPlanos,
      planosAbertos,
      planosAtrasados,
      planosConcluidos,
      planosValidados,
      totalAcoes,
      acoesAtrasadas
    };
  }, [filteredPlans, filteredActions]);

  // Agrupamento por colunas Kanban: OS PLANOS ficam no Kanban com estados derivados de suas ações
  const kanbanPlanColumns: {
    id: ActionItemStatus;
    title: string;
    subtitle: string;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    plans: typeof enrichedPlans;
  }[] = [
    {
      id: 'Aberto',
      title: 'Planos em Andamento / Aberto',
      subtitle: 'Ações dentro do prazo planejado',
      colorClass: 'text-blue-800',
      borderClass: 'border-blue-200',
      bgClass: 'bg-blue-50/50',
      plans: filteredPlans.filter(p => p.computedStatus === 'Aberto')
    },
    {
      id: 'Atrasado',
      title: 'Planos em Atraso',
      subtitle: 'Possui 1 ou mais ações atrasadas',
      colorClass: 'text-rose-800',
      borderClass: 'border-rose-200',
      bgClass: 'bg-rose-50/50',
      plans: filteredPlans.filter(p => p.computedStatus === 'Atrasado')
    },
    {
      id: 'Concluído',
      title: 'Planos Concluídos',
      subtitle: 'Todas as ações concluídas • Aguardando validação',
      colorClass: 'text-amber-800',
      borderClass: 'border-amber-200',
      bgClass: 'bg-amber-50/50',
      plans: filteredPlans.filter(p => p.computedStatus === 'Concluído')
    },
    {
      id: 'Validado',
      title: 'Planos Validados & Homologados',
      subtitle: '100% das ações validadas pela Qualidade',
      colorClass: 'text-emerald-800',
      borderClass: 'border-emerald-200',
      bgClass: 'bg-emerald-50/50',
      plans: filteredPlans.filter(p => p.computedStatus === 'Validado')
    }
  ];

  // Ações de formulário
  const handleCreatePlano = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlano.descricao_problema_oportunidade) return;
    spStore.saveActionPlan(formPlano);
    setModalNovoPlanoOpen(false);
    setFormPlano({
      indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
      prioridade: 'Alta',
      setor_: 'Qualidade',
      descricao_problema_oportunidade: '',
      produto_: '',
      posto_: '',
      sub1: '',
      sub2: '',
      idprograma: ''
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateAcao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAcao.contra_medida) return;
    spStore.saveActionItem(formAcao);
    setModalNovaAcaoOpen(false);
    setFormAcao({
      tipo_acao: 'CORRETIVA',
      contra_medida: '',
      causa: '',
      data_acompanhamento: new Date().toISOString().split('T')[0],
      data_planejada: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      responsavel_acao: currentUser.nome,
      email: currentUser.email || '',
      yokoten: 'NÃO',
      poka_yoke: 'NÃO',
      evidencia_obrigatoria: 'SIM',
      validacao_acao: 'SIM',
      id_rel2: planos[0]?.id || 1,
      id_programa_acoes: ''
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleConfirmConclusao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConcluirOpen) return;
    spStore.concluirActionItem(
      modalConcluirOpen.id,
      formConclusao.dataConclusao,
      formConclusao.comentarios,
      formConclusao.anexoUrl ? [formConclusao.anexoUrl] : []
    );
    setModalConcluirOpen(null);
    setFormConclusao({ dataConclusao: new Date().toISOString().split('T')[0], comentarios: '', anexoUrl: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  const handleConfirmValidacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalValidarOpen) return;
    spStore.validarActionItem(
      modalValidarOpen.id,
      formValidacao.status,
      formValidacao.comentarios,
      formValidacao.motivoRevisao
    );
    setModalValidarOpen(null);
    setFormValidacao({ status: 'Validado', comentarios: '', motivoRevisao: '' });
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full flex flex-col gap-5 animate-in fade-in duration-150 pb-12">
      
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b5796] flex items-center justify-center border border-blue-100 shadow-2xs">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-display font-bold text-slate-900 tracking-tight">
                Planejamento &amp; Planos de Ação
              </h1>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                Geral Fábrica
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de planos de ação e acompanhamento de contramedidas
            </p>
          </div>
        </div>

        {/* Alternador de Visão & Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setSingleScreenPlanId(null);
                setViewMode('kanban');
              }}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none ${
                singleScreenPlanId === null && viewMode === 'kanban'
                  ? 'bg-white text-[#0b5796] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban de Planos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSingleScreenPlanId(null);
                setViewMode('table');
              }}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none ${
                singleScreenPlanId === null && viewMode === 'table'
                  ? 'bg-white text-[#0b5796] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista de Ações</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (singleScreenPlanId === null) {
                  handleOpenSingleScreen(filteredPlans[0]?.id || planos[0]?.id || 1);
                }
              }}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none ${
                singleScreenPlanId !== null
                  ? 'bg-white text-[#0b5796] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Tela do Plano de Ação</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModalNovoPlanoOpen(true)}
            className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Plano</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeSinglePlan) {
                setFormAcao(prev => ({
                  ...prev,
                  id_rel2: activeSinglePlan.id,
                  id_programa_acoes: activeSinglePlan.idprograma || ''
                }));
              }
              setModalNovaAcaoOpen(true);
            }}
            style={{ backgroundColor: brandColor }}
            className="btn-primary h-8 px-3.5 text-xs font-semibold gap-1.5 text-white shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Ação</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODO TELA ÚNICA DEDICADA: CABEÇALHO DO PLANO + DETALHES DA AÇÃO + TODAS AS AÇÕES
          ========================================================================= */}
      {activeSinglePlan ? (
        <div className="flex flex-col gap-5 animate-in fade-in duration-150">
          {/* Barra Superior de Navegação da Tela Única */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSingleScreenPlanId(null);
                  setSingleScreenActionId(null);
                }}
                className="btn-secondary h-8 px-3 text-xs font-bold text-slate-700 hover:text-slate-900 gap-1.5"
              >
                <span>← Voltar para {viewMode === 'kanban' ? 'Quadro Kanban' : 'Lista de Ações'}</span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              {/* Seletor rápido para trocar de Plano sem sair da Tela Única */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-500">Plano:</span>
                <select
                  value={activeSinglePlan.id}
                  onChange={e => handleOpenSingleScreen(Number(e.target.value))}
                  className="form-select text-xs font-bold py-1.5 px-2.5 bg-slate-50 border-slate-200 rounded-lg text-slate-900"
                >
                  {enrichedPlans.map(p => (
                    <option key={p.id} value={p.id}>
                      Plano #{p.id} • {p.idprograma ? `${p.idprograma}` : p.indicador_programa_estrategico} ({p.computedStatus})
                    </option>
                  ))}
                </select>
              </div>

              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                activeSinglePlan.computedStatus === 'Validado' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                activeSinglePlan.computedStatus === 'Concluído' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                activeSinglePlan.computedStatus === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                Status: {activeSinglePlan.computedStatus}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeSinglePlan.idprograma && (
                <button
                  type="button"
                  onClick={() => handleNavigateTo8D(activeSinglePlan.idprograma)}
                  className="h-8 px-3 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Abrir Registro ({formatOccurrenceId(activeSinglePlan.idprograma)})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFormAcao(prev => ({
                    ...prev,
                    id_rel2: activeSinglePlan.id,
                    id_programa_acoes: activeSinglePlan.idprograma || ''
                  }));
                  setModalNovaAcaoOpen(true);
                }}
                style={{ backgroundColor: brandColor }}
                className="btn-primary h-8 px-3 text-xs font-semibold text-white gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Ação neste Plano</span>
              </button>
            </div>
          </div>

          {/* BLOCO 1: CABEÇALHO DO PLANO DE AÇÃO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-white/15 font-mono font-bold text-xs text-white border border-white/20">
                  Plano #{activeSinglePlan.id}
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    Cabeçalho do Plano de Ação
                  </h2>
                </div>
              </div>

              {activeSinglePlan.idprograma && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-white/10 border border-white/15 font-mono text-[11px]">
                    Vínculo: <strong>{activeSinglePlan.idprograma}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Grade com os Campos do Cabeçalho */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Indicador / Programa</span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate" title={activeSinglePlan.indicador_programa_estrategico}>
                    {activeSinglePlan.indicador_programa_estrategico}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Prioridade</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold border ${
                    activeSinglePlan.prioridade === 'Alta' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    activeSinglePlan.prioridade === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {activeSinglePlan.prioridade}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Setor</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {activeSinglePlan.setor_ || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Produto</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {activeSinglePlan.produto_ || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Posto</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {activeSinglePlan.posto_ || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Subconjunto</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {activeSinglePlan.sub1 || activeSinglePlan.sub2
                      ? `${activeSinglePlan.sub1 || ''}${activeSinglePlan.sub2 ? ` / ${activeSinglePlan.sub2}` : ''}`
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Descrição do Problema / Oportunidade + Progresso */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="lg:col-span-2 p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                      Descrição do Problema / Oportunidade
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                      {activeSinglePlan.descricao_problema_oportunidade}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-blue-100 flex-wrap">
                    <span>Responsável pela Abertura: <strong className="text-slate-800">{activeSinglePlan.responsavel_abertura}</strong></span>
                    <span>Data de Abertura: <strong className="font-mono text-slate-800">{formatDateBR(activeSinglePlan.data_abertura)}</strong></span>
                  </div>
                </div>

                {/* Resumo de Progresso e Status Automático do Plano */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Progresso Geral do Plano</span>
                    <span className="font-mono text-sm font-bold text-slate-900">{activeSinglePlan.progresso}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        activeSinglePlan.computedStatus === 'Atrasado'
                          ? 'bg-rose-500'
                          : activeSinglePlan.computedStatus === 'Validado'
                          ? 'bg-emerald-500'
                          : activeSinglePlan.computedStatus === 'Concluído'
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${activeSinglePlan.progresso}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                      <span className="block text-sm font-mono">{activeSinglePlan.abertasCount}</span>
                      <span>Abertas</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                      <span className="block text-sm font-mono">{activeSinglePlan.atrasadasCount}</span>
                      <span>Atraso</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                      <span className="block text-sm font-mono">{activeSinglePlan.concluidasCount}</span>
                      <span>Concl.</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="block text-sm font-mono">{activeSinglePlan.validadasCount}</span>
                      <span>Valid.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO 2: DETALHES DA AÇÃO SELECIONADA */}
          {activeSingleAction && (
            <div className="bg-white rounded-2xl border-2 border-[#0b5796]/30 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-blue-50/80 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-[#0b5796] text-white font-mono text-xs font-bold">
                    Ação #{activeSingleAction.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Detalhes da Ação
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    activeSingleAction.status === 'Validado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    activeSingleAction.status === 'Concluído' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    activeSingleAction.status === 'Atrasado' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    'bg-blue-100 text-blue-800 border-blue-300'
                  }`}>
                    Status: {activeSingleAction.status}
                  </span>
                </div>

                {/* Navegação rápida entre as ações deste Plano */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 font-semibold mr-1">
                    Ação {activeSinglePlan.actions.findIndex(a => a.id === activeSingleAction.id) + 1} de {activeSinglePlan.actions.length}
                  </span>
                  <button
                    type="button"
                    disabled={activeSinglePlan.actions.findIndex(a => a.id === activeSingleAction.id) <= 0}
                    onClick={() => {
                      const idx = activeSinglePlan.actions.findIndex(a => a.id === activeSingleAction.id);
                      if (idx > 0) setSingleScreenActionId(activeSinglePlan.actions[idx - 1].id);
                    }}
                    className="btn-secondary h-7 px-2.5 text-xs disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    disabled={
                      activeSinglePlan.actions.findIndex(a => a.id === activeSingleAction.id) >=
                      activeSinglePlan.actions.length - 1
                    }
                    onClick={() => {
                      const idx = activeSinglePlan.actions.findIndex(a => a.id === activeSingleAction.id);
                      if (idx >= 0 && idx < activeSinglePlan.actions.length - 1) {
                        setSingleScreenActionId(activeSinglePlan.actions[idx + 1].id);
                      }
                    }}
                    className="btn-secondary h-7 px-2.5 text-xs disabled:opacity-40"
                  >
                    Próxima →
                  </button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Contramedida / Descrição da Ação
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {activeSingleAction.contra_medida}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Causa Raiz
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-1">
                        {activeSingleAction.causa || 'Não informada'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Tipo de Ação</span>
                        <span className="font-bold text-slate-900">{activeSingleAction.tipo_acao}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Responsável</span>
                        <span className="font-bold text-slate-900">{normalizeDisplayText(activeSingleAction.responsavel_acao)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Data Acompanhamento</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatDateBR(activeSingleAction.data_acompanhamento)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Prazo Planejado</span>
                        <span className={`font-mono font-bold ${activeSingleAction.status === 'Atrasado' ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatDateBR(activeSingleAction.data_planejada)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Yokoten</span>
                        <span className="font-bold text-slate-800">
                          {activeSingleAction.yokoten || 'NÃO'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Poka-Yoke</span>
                        <span className="font-bold text-slate-800">{activeSingleAction.poka_yoke || 'NÃO'}</span>
                      </div>
                    </div>

                    {/* Botões de Execução / Homologação da Ação em Foco */}
                    <div className="pt-2.5 border-t border-slate-200 flex items-center gap-2">
                      {(activeSingleAction.status === 'Aberto' || activeSingleAction.status === 'Atrasado') && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalConcluirOpen(activeSingleAction);
                            setFormConclusao({
                              dataConclusao: new Date().toISOString().split('T')[0],
                              comentarios: activeSingleAction.comentarios_evidencia || '',
                              anexoUrl: ''
                            });
                          }}
                          className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-8 px-3 text-xs font-bold text-white w-full justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Registrar Conclusão desta Ação</span>
                        </button>
                      )}

                      {activeSingleAction.status === 'Concluído' && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalValidarOpen(activeSingleAction);
                            setFormValidacao({
                              status: 'Validado',
                              comentarios: '',
                              motivoRevisao: ''
                            });
                          }}
                          className="btn-primary bg-[#0b5796] hover:bg-[#09477d] h-8 px-3 text-xs font-bold text-white w-full justify-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Validar &amp; Homologar Ação</span>
                        </button>
                      )}

                      {activeSingleAction.status === 'Validado' && (
                        <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-center flex items-center justify-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Ação Validada e Homologada</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evidências de Conclusão e Parecer de Validação da Ação */}
                {(activeSingleAction.comentarios_evidencia || activeSingleAction.comentarios_validacao || activeSingleAction.status_revisar) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    {activeSingleAction.comentarios_evidencia && (
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                          Evidência de Conclusão ({formatDateBR(activeSingleAction.data_conclusao || '')})
                        </span>
                        <p className="text-xs text-slate-800 mt-1">{activeSingleAction.comentarios_evidencia}</p>
                      </div>
                    )}
                    {activeSingleAction.comentarios_validacao && (
                      <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200">
                        <span className="text-[10px] font-bold uppercase text-blue-800 block">
                          Parecer da Validação
                        </span>
                        <p className="text-xs text-slate-800 mt-1">{activeSingleAction.comentarios_validacao}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BLOCO 3: TODAS AS AÇÕES DEDICADAS A ESTE PLANO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ações do Plano ({activeSinglePlan.actions.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Selecione qualquer ação abaixo para visualizar seus detalhes ou registrar conclusão/validação
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormAcao(prev => ({
                    ...prev,
                    id_rel2: activeSinglePlan.id,
                    id_programa_acoes: activeSinglePlan.idprograma || ''
                  }));
                  setModalNovaAcaoOpen(true);
                }}
                className="btn-secondary h-8 px-3 text-xs font-semibold text-[#0b5796] border-blue-200 hover:bg-blue-50 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Ação</span>
              </button>
            </div>

            {activeSinglePlan.actions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Nenhuma ação cadastrada para este plano ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">ID</th>
                      <th className="py-2.5 px-4">Tipo</th>
                      <th className="py-2.5 px-4">Contramedida &amp; Causa</th>
                      <th className="py-2.5 px-4">Responsável</th>
                      <th className="py-2.5 px-4">Prazo Planejado</th>
                      <th className="py-2.5 px-4">Diretivas</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Operações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSinglePlan.actions.map(acao => {
                      const isFocused = activeSingleAction?.id === acao.id;
                      return (
                        <tr
                          key={acao.id}
                          onClick={() => setSingleScreenActionId(acao.id)}
                          className={`transition-colors cursor-pointer ${
                            isFocused ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            #{acao.id}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              acao.tipo_acao === 'CONTENÇÃO' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              acao.tipo_acao === 'CORRETIVA' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              acao.tipo_acao === 'PREVENTIVA' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                              'bg-purple-50 text-purple-800 border-purple-200'
                            }`}>
                              {acao.tipo_acao}
                            </span>
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <p className="font-bold text-slate-900">{acao.contra_medida}</p>
                            {acao.causa && (
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Causa: {acao.causa}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {normalizeDisplayText(acao.responsavel_acao)}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <span className={acao.status === 'Atrasado' ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {formatDateBR(acao.data_planejada)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 flex-wrap">
                              {acao.yokoten === 'SIM' && (
                                <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                                  YOKOTEN
                                </span>
                              )}
                              {acao.poka_yoke === 'SIM' && (
                                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">
                                  POKA-YOKE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              acao.status === 'Validado' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              acao.status === 'Concluído' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              acao.status === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {acao.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSingleScreenActionId(acao.id)}
                                className={`h-7 px-2 rounded text-[11px] font-semibold border transition ${
                                  isFocused
                                    ? 'bg-[#0b5796] text-white border-[#0b5796]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Detalhes
                              </button>
                              {(acao.status === 'Aberto' || acao.status === 'Atrasado') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalConcluirOpen(acao);
                                    setFormConclusao({
                                      dataConclusao: new Date().toISOString().split('T')[0],
                                      comentarios: acao.comentarios_evidencia || '',
                                      anexoUrl: ''
                                    });
                                  }}
                                  className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                >
                                  Concluir
                                </button>
                              )}
                              {acao.status === 'Concluído' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalValidarOpen(acao);
                                    setFormValidacao({
                                      status: 'Validado',
                                      comentarios: '',
                                      motivoRevisao: ''
                                    });
                                  }}
                                  className="btn-primary h-7 px-2.5 text-[11px] font-semibold bg-[#0b5796] text-white"
                                >
                                  Validar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 2. BARRA DE NAVEGAÇÃO DO PLANO DE AÇÃO */}
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setActiveEtapaAcoes('todas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition cursor-pointer select-none ${
                  activeEtapaAcoes === 'todas'
                    ? 'bg-[#0b5796] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Todos os Planos &amp; Ações</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeEtapaAcoes === 'todas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {etapaCounts.planos} planos • {etapaCounts.todas} ações
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEtapaAcoes('validacao')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition cursor-pointer select-none ${
                  activeEtapaAcoes === 'validacao'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Validação Qualidade</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeEtapaAcoes === 'validacao' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {etapaCounts.validacao}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEtapaAcoes('minhas')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition cursor-pointer select-none ${
                  activeEtapaAcoes === 'minhas'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Minhas Ações</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeEtapaAcoes === 'minhas' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {etapaCounts.minhas}
                </span>
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

              <button
                type="button"
                onClick={() => setActiveEtapaAcoes('planos_mestres')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition cursor-pointer select-none ${
                  activeEtapaAcoes === 'planos_mestres'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Lista de Planos</span>
                <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeEtapaAcoes === 'planos_mestres' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {etapaCounts.planos}
                </span>
              </button>
            </div>
          </div>

          {/* 3. BARRA DE KPIS DOS PLANOS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="card-saas p-3 border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Total de Planos</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-numbers">{stats.totalPlanos}</span>
                <span className="text-[10px] text-slate-500 font-semibold">{stats.totalAcoes} ações vinculadas</span>
              </div>
            </div>

            <div className="card-saas p-3 border-blue-200 bg-blue-50/40 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-blue-700">Planos em Aberto</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold text-blue-900 font-mono-numbers">{stats.planosAbertos}</span>
                <span className="text-[10px] text-blue-600">Ações no prazo</span>
              </div>
            </div>

            <div className="card-saas p-3 border-rose-200 bg-rose-50/40 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-rose-700">Planos em Atraso</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold text-rose-900 font-mono-numbers">{stats.planosAtrasados}</span>
                <span className="text-[10px] text-rose-600">{stats.acoesAtrasadas} ações vencidas</span>
              </div>
            </div>

            <div className="card-saas p-3 border-amber-200 bg-amber-50/40 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-800">Planos Concluídos</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold text-amber-900 font-mono-numbers">{stats.planosConcluidos}</span>
                <span className="text-[10px] text-amber-700">Aguardando validação</span>
              </div>
            </div>

            <div className="card-saas p-3 border-emerald-200 bg-emerald-50/40 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-emerald-800">Planos Validados</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono-numbers">{stats.planosValidados}</span>
                <span className="text-[10px] text-emerald-700">100% homologados</span>
              </div>
            </div>
          </div>

          {/* 4. BARRA DE FILTROS & BUSCA */}
          <div className="card-saas p-3 sm:p-4 border-slate-200 bg-white shadow-2xs flex flex-col gap-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Campo de Busca */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar plano por problema, produto, posto, código ou contramedida..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="form-input w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border-slate-200 rounded-lg"
                />
              </div>

              {/* Filtros em linha */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Programa / Indicador */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold hidden lg:inline">Programa:</span>
                  <select
                    value={filterPrograma}
                    onChange={e => setFilterPrograma(e.target.value)}
                    className="form-select text-xs py-1.5 px-2 bg-slate-50 border-slate-200 rounded-lg"
                  >
                    {PROGRAMAS_LIST.map(prog => (
                      <option key={prog} value={prog}>{prog}</option>
                    ))}
                  </select>
                </div>

                {/* Prioridade */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold hidden lg:inline">Prioridade:</span>
                  <select
                    value={filterPrioridade}
                    onChange={e => setFilterPrioridade(e.target.value)}
                    className="form-select text-xs py-1.5 px-2 bg-slate-50 border-slate-200 rounded-lg"
                  >
                    <option value="Todas">Todas</option>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>

                {/* Tipo de Ação */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="font-semibold hidden lg:inline">Tipo Ação:</span>
                  <select
                    value={filterTipoAcao}
                    onChange={e => setFilterTipoAcao(e.target.value)}
                    className="form-select text-xs py-1.5 px-2 bg-slate-50 border-slate-200 rounded-lg"
                  >
                    <option value="Todos">Todos</option>
                    <option value="CONTENÇÃO">Contenção</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="MELHORIA">Melhoria</option>
                  </select>
                </div>

                {/* Alternador Minhas Ações */}
                <button
                  type="button"
                  onClick={() => setFilterSomenteMinhas(!filterSomenteMinhas)}
                  className={`h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                    filterSomenteMinhas
                      ? 'bg-blue-50 text-[#0b5796] border-blue-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Meus Planos</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. VISUALIZAÇÃO: LISTA DE PLANOS vs KANBAN DE PLANOS vs TABELA DE AÇÕES */}
          {activeEtapaAcoes === 'planos_mestres' ? (
            /* ======================== VISÃO LISTA DE PLANOS ======================== */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Planos de Ação</h2>
                  <p className="text-xs text-slate-500">Relação de planos de ação e acompanhamento das contramedidas</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNovoPlanoOpen(true)}
                  className="btn-primary h-8 px-3 text-xs font-semibold gap-1.5 bg-[#0b5796] text-white shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Plano</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {enrichedPlans.length === 0 ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                    <FolderKanban className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Nenhum plano de ação cadastrado</p>
                    <button
                      type="button"
                      onClick={() => setModalNovoPlanoOpen(true)}
                      className="mt-3 btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Primeiro Plano</span>
                    </button>
                  </div>
                ) : (
                  enrichedPlans.map(plano => {
                    const acoesDoPlano = plano.actions;
                    const concluidasOuValidadas = plano.concluidasCount + plano.validadasCount;
                    const progresso = plano.progresso;
                    const isExpanded = expandedPlanId === plano.id;

                    return (
                      <div key={plano.id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-blue-200">
                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0b5796] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                              #{plano.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  plano.computedStatus === 'Validado' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                  plano.computedStatus === 'Concluído' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                  plano.computedStatus === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                  'bg-blue-50 text-blue-800 border-blue-200'
                                }`}>
                                  Status: {plano.computedStatus}
                                </span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                  {plano.indicador_programa_estrategico}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  plano.prioridade === 'Alta' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  plano.prioridade === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  Prioridade {plano.prioridade}
                                </span>
                                {plano.idprograma && (
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateTo8D(plano.idprograma)}
                                    className="font-mono text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                                  >
                                    <span>Vínculo: {formatOccurrenceId(plano.idprograma)}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                                {plano.setor_ && (
                                  <span className="text-xs text-slate-500">Setor: {plano.setor_}</span>
                                )}
                              </div>
                              <h3 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">
                                {plano.descricao_problema_oportunidade}
                              </h3>
                              {(plano.produto_ || plano.posto_ || plano.sub1) && (
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                  {plano.produto_ && <span>Produto: <strong className="text-slate-700">{plano.produto_}</strong></span>}
                                  {plano.posto_ && <span>Posto: <strong className="text-slate-700">{plano.posto_}</strong></span>}
                                  {plano.sub1 && <span>Subconjunto: <strong className="text-slate-700">{plano.sub1}</strong></span>}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Progresso e Controles */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                            <div className="w-40 flex flex-col gap-1">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                                <span>Progresso</span>
                                <span className="font-mono font-bold text-slate-800">{progresso}% ({concluidasOuValidadas}/{acoesDoPlano.length})</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    plano.computedStatus === 'Atrasado' ? 'bg-rose-500' :
                                    progresso === 100 ? 'bg-emerald-500' : progresso > 0 ? 'bg-blue-600' : 'bg-slate-300'
                                  }`} 
                                  style={{ width: `${progresso}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleScreen(plano.id)}
                                className="btn-primary h-8 px-3 text-xs font-semibold gap-1.5 bg-[#0b5796] text-white"
                              >
                                <FolderKanban className="w-3.5 h-3.5" />
                                <span>Abrir Plano</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedPlanId(isExpanded ? null : plano.id)}
                                className="btn-secondary h-8 px-3 text-xs font-semibold gap-1 text-slate-700"
                              >
                                <span>{acoesDoPlano.length} {acoesDoPlano.length === 1 ? 'Ação' : 'Ações'}</span>
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Gaveta de Ações do Plano */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700">Ações deste Plano ({acoesDoPlano.length})</span>
                            </div>

                            {acoesDoPlano.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                                Nenhuma ação registrada para este plano ainda.
                              </div>
                            ) : (
                              <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                                      <th className="py-2 px-3">Tipo</th>
                                      <th className="py-2 px-3">Contramedida</th>
                                      <th className="py-2 px-3">Responsável</th>
                                      <th className="py-2 px-3">Prazo</th>
                                      <th className="py-2 px-3">Diretivas</th>
                                      <th className="py-2 px-3">Status</th>
                                      <th className="py-2 px-3 text-right">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {acoesDoPlano.map(acao => (
                                      <tr key={acao.id} className="hover:bg-slate-50">
                                        <td className="py-2.5 px-3">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            acao.tipo_acao === 'CONTENÇÃO' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                            acao.tipo_acao === 'CORRETIVA' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                            acao.tipo_acao === 'PREVENTIVA' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                                            'bg-purple-50 text-purple-800 border-purple-200'
                                          }`}>
                                            {acao.tipo_acao}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <p className="font-semibold text-slate-800 max-w-sm line-clamp-2">{acao.contra_medida}</p>
                                          {acao.causa && <span className="text-[10px] text-slate-500 block">Causa: {acao.causa}</span>}
                                        </td>
                                        <td className="py-2.5 px-3 font-medium text-slate-700">{acao.responsavel_acao}</td>
                                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateBR(acao.data_planejada)}</td>
                                        <td className="py-2.5 px-3">
                                          <div className="flex items-center gap-1">
                                            {acao.yokoten === 'SIM' && (
                                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">YOKOTEN</span>
                                            )}
                                            {acao.poka_yoke === 'SIM' && (
                                              <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">POKA-YOKE</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                            acao.status === 'Validado' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                            acao.status === 'Concluído' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                            acao.status === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                            'bg-blue-50 text-blue-800 border-blue-200'
                                          }`}>
                                            {acao.status}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenSingleScreen(plano.id, acao)}
                                              className="btn-secondary h-7 px-2 text-[11px] font-semibold text-[#0b5796] border-blue-200 hover:bg-blue-50"
                                            >
                                              Detalhes
                                            </button>
                                            {acao.status === 'Aberto' || acao.status === 'Atrasado' ? (
                                              <button
                                                type="button"
                                                onClick={() => setModalConcluirOpen(acao)}
                                                className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                              >
                                                Concluir
                                              </button>
                                            ) : acao.status === 'Concluído' ? (
                                              <button
                                                type="button"
                                                onClick={() => setModalValidarOpen(acao)}
                                                className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
                                              >
                                                Validar
                                              </button>
                                            ) : (
                                              <span className="text-emerald-700 text-xs font-semibold">Homologado</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : viewMode === 'kanban' ? (
            /* ======================== QUADRO KANBAN DE PLANOS ======================== */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {kanbanPlanColumns.map(col => (
                <div key={col.id} className="flex flex-col gap-2.5 bg-slate-100/70 p-3 rounded-2xl border border-slate-200">
                  {/* Header da Coluna */}
                  <div className="flex items-start justify-between px-1 pb-1 border-b border-slate-200/80">
                    <div>
                      <span className={`text-xs font-bold block ${col.colorClass}`}>
                        {col.title}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {col.subtitle}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs shrink-0">
                      {col.plans.length}
                    </span>
                  </div>

                  {/* Lista de Cards de Planos da Coluna */}
                  <div className="flex flex-col gap-3 min-h-[320px]">
                    {col.plans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-white/50">
                        <FolderKanban className="w-6 h-6 mb-1 text-slate-300" />
                        <span>Nenhum plano nesta etapa</span>
                      </div>
                    ) : (
                      col.plans.map(plano => {
                        const isQualidade = currentUser.perfil !== 'User';
                        const isPlanExpanded = expandedPlanId === plano.id;

                        return (
                          <div
                            key={plano.id}
                            className={`p-3.5 bg-white rounded-xl border transition-all flex flex-col gap-2.5 shadow-2xs hover:shadow-md ${
                              col.id === 'Atrasado'
                                ? 'border-rose-200 hover:border-rose-400'
                                : col.id === 'Validado'
                                ? 'border-emerald-200 hover:border-emerald-400'
                                : col.id === 'Concluído'
                                ? 'border-amber-200 hover:border-amber-400'
                                : 'border-slate-200 hover:border-[#0f6cbd]'
                            }`}
                          >
                            {/* 1. Cabeçalho do Card do Plano */}
                            <div className="flex items-center justify-between gap-1.5 text-[11px] flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white text-[10px]">
                                  Plano #{plano.id}
                                </span>

                                {plano.idprograma && (
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateTo8D(plano.idprograma)}
                                    className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 cursor-pointer"
                                    title="Abrir registro vinculado"
                                  >
                                    <span>{formatOccurrenceId(plano.idprograma)}</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                  </button>
                                )}
                              </div>

                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                plano.prioridade === 'Alta' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                plano.prioridade === 'Média' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {plano.prioridade}
                              </span>
                            </div>

                            {/* 2. Informações do Plano */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  {plano.indicador_programa_estrategico}
                                </span>
                                {plano.setor_ && (
                                  <span className="text-[10px] text-slate-400">• {plano.setor_}</span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                {plano.descricao_problema_oportunidade}
                              </p>

                              {(plano.produto_ || plano.posto_ || plano.sub1) && (
                                <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-0.5 text-[10px] text-slate-600">
                                  {plano.produto_ && (
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-slate-400 font-semibold">Produto:</span>
                                      <span className="font-semibold text-slate-700 truncate">{plano.produto_}</span>
                                    </div>
                                  )}
                                  {plano.posto_ && (
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-slate-400 font-semibold">Posto:</span>
                                      <span className="font-semibold text-slate-700 truncate">{plano.posto_}</span>
                                    </div>
                                  )}
                                  {plano.sub1 && (
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-slate-400 font-semibold">Subconjunto:</span>
                                      <span className="font-semibold text-slate-700 truncate">{plano.sub1}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 3. Termômetro de Estado das Ações do Plano */}
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-700">
                                  Ações do Plano ({plano.actions.length})
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {plano.progresso}% concluído
                                </span>
                              </div>

                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${
                                    col.id === 'Atrasado'
                                      ? 'bg-rose-500'
                                      : col.id === 'Validado'
                                      ? 'bg-emerald-500'
                                      : col.id === 'Concluído'
                                      ? 'bg-amber-500'
                                      : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${plano.progresso}%` }}
                                />
                              </div>

                              <div className="grid grid-cols-4 gap-1 pt-1 text-[9px] font-bold text-center">
                                <div className="px-1 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                  {plano.abertasCount} Aberta{plano.abertasCount === 1 ? '' : 's'}
                                </div>
                                <div className={`px-1 py-0.5 rounded border ${
                                  plano.atrasadasCount > 0
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                    : 'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                  {plano.atrasadasCount} Atraso
                                </div>
                                <div className="px-1 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  {plano.concluidasCount} Concl.
                                </div>
                                <div className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {plano.validadasCount} Valid.
                                </div>
                              </div>
                            </div>

                            {/* 5. Botão para Abrir Tela Única do Plano + Lista Expansível das Ações */}
                            <div className="flex flex-col gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleScreen(plano.id)}
                                className="w-full h-8 px-3 rounded-lg bg-[#0b5796] hover:bg-[#09477d] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                              >
                                <FolderKanban className="w-3.5 h-3.5" />
                                <span>Abrir Plano &amp; Ações em Tela Única</span>
                              </button>

                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedPlanId(isPlanExpanded ? null : plano.id)}
                                  className="text-[11px] font-bold text-[#0b5796] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{isPlanExpanded ? 'Ocultar resumo de ações' : `Resumo rápido (${plano.actions.length} ações)`}</span>
                                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isPlanExpanded ? 'rotate-90' : ''}`} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormAcao(prev => ({
                                      ...prev,
                                      id_rel2: plano.id,
                                      id_programa_acoes: plano.idprograma || ''
                                    }));
                                    setModalNovaAcaoOpen(true);
                                  }}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0b5796] border border-blue-200 hover:bg-blue-100 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Ação</span>
                                </button>
                              </div>

                              {isPlanExpanded && (
                                <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-100 max-h-64 overflow-y-auto pr-0.5">
                                  {plano.actions.map(acao => (
                                    <div
                                      key={acao.id}
                                      className={`p-2 rounded-lg border text-[11px] flex flex-col gap-1 ${
                                        acao.status === 'Atrasado'
                                          ? 'bg-rose-50/60 border-rose-200'
                                          : acao.status === 'Validado'
                                          ? 'bg-emerald-50/50 border-emerald-200'
                                          : acao.status === 'Concluído'
                                          ? 'bg-amber-50/50 border-amber-200'
                                          : 'bg-slate-50 border-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-[9px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700">
                                          {acao.tipo_acao}
                                        </span>
                                        <span className={`font-bold text-[9px] px-1.5 py-0.2 rounded ${
                                          acao.status === 'Atrasado'
                                            ? 'bg-rose-600 text-white'
                                            : acao.status === 'Validado'
                                            ? 'bg-emerald-600 text-white'
                                            : acao.status === 'Concluído'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-blue-600 text-white'
                                        }`}>
                                          {acao.status}
                                        </span>
                                      </div>
                                      <p className="font-semibold text-slate-800 leading-tight">
                                        {acao.contra_medida}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                        <span className="truncate max-w-[110px]">{normalizeDisplayText(acao.responsavel_acao)}</span>
                                        <span className="font-mono">{formatDateBR(acao.data_planejada)}</span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenSingleScreen(plano.id, acao)}
                                          className="btn-secondary h-6 px-2 text-[10px] font-bold text-[#0b5796] border-blue-200 hover:bg-blue-50 flex-1 justify-center"
                                        >
                                          Tela da Ação
                                        </button>
                                        {(acao.status === 'Aberto' || acao.status === 'Atrasado') && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setModalConcluirOpen(acao);
                                              setFormConclusao({
                                                dataConclusao: new Date().toISOString().split('T')[0],
                                                comentarios: acao.comentarios_evidencia || '',
                                                anexoUrl: ''
                                              });
                                            }}
                                            className="btn-secondary h-6 px-2 text-[10px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex-1 justify-center"
                                          >
                                            Concluir
                                          </button>
                                        )}
                                        {acao.status === 'Concluído' && isQualidade && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setModalValidarOpen(acao);
                                              setFormValidacao({
                                                status: 'Validado',
                                                comentarios: '',
                                                motivoRevisao: ''
                                              });
                                            }}
                                            className="btn-primary h-6 px-2 text-[10px] font-bold bg-[#0b5796] text-white flex-1 justify-center"
                                          >
                                            Validar
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ======================== LISTA DETALHADA TABULAR ======================== */
            <div className="card-saas border-slate-200 overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 select-none">
                      <th className="py-3 px-4">Plano / Vínculo</th>
                      <th className="py-3 px-4">Contramedida &amp; Causa</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Responsável</th>
                      <th className="py-3 px-4">Prazo Final</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Operações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Nenhuma ação encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredActions.map(acao => (
                        <tr key={acao.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            <div className="flex flex-col gap-0.5 items-start">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleScreen(acao.id_rel2, acao)}
                                className="text-[11px] font-bold text-slate-800 hover:text-[#0b5796] hover:underline cursor-pointer"
                              >
                                Plano #{acao.id_rel2}
                              </button>
                              {acao.id_programa_acoes && (
                                <button
                                  type="button"
                                  onClick={() => handleNavigateTo8D(acao.id_programa_acoes)}
                                  className="text-blue-700 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                                >
                                  <span>{formatOccurrenceId(acao.id_programa_acoes)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-[320px]">
                            <div className="font-bold text-slate-900 truncate" title={acao.contra_medida}>
                              {acao.contra_medida}
                            </div>
                            {acao.causa && (
                              <div className="text-[11px] text-slate-500 truncate" title={acao.causa}>
                                Causa: {acao.causa}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {acao.tipo_acao}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {normalizeDisplayText(acao.responsavel_acao)}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums">
                            <span className={acao.status === 'Atrasado' ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {formatDateBR(acao.data_planejada)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              acao.status === 'Concluído' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              acao.status === 'Validado' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              acao.status === 'Atrasado' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {acao.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleScreen(acao.id_rel2, acao)}
                                className="btn-secondary h-7 px-2.5 text-xs font-semibold text-[#0b5796] border-blue-200 hover:bg-blue-50"
                              >
                                Tela da Ação / Plano
                              </button>

                              {acao.status === 'Aberto' || acao.status === 'Atrasado' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalConcluirOpen(acao);
                                    setFormConclusao({
                                      dataConclusao: new Date().toISOString().split('T')[0],
                                      comentarios: acao.comentarios_evidencia || '',
                                      anexoUrl: ''
                                    });
                                  }}
                                  className="btn-secondary h-7 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                                >
                                  Concluir
                                </button>
                              ) : acao.status === 'Concluído' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalValidarOpen(acao);
                                    setFormValidacao({
                                      status: 'Validado',
                                      comentarios: '',
                                      motivoRevisao: ''
                                    });
                                  }}
                                  className="btn-primary h-7 px-2 text-xs font-semibold bg-[#0b5796]"
                                >
                                  Validar
                                </button>
                              ) : (
                                <span className="text-emerald-700 text-xs font-semibold px-1">OK</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          MODAL: NOVO PLANO DE AÇÃO
          ========================================================================= */}
      {modalNovoPlanoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#0b5796]" />
                <h3 className="font-display font-bold text-sm text-slate-900">Novo Plano de Ação</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoPlanoOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlano} className="p-5 flex flex-col gap-4 text-xs">
              {/* Vínculo com Registro: adapta os dados para os campos do Plano */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col gap-1.5">
                <label className="block font-bold text-blue-900">
                  Vincular Registro / Ocorrência (Opcional)
                </label>
                <select
                  value={formPlano.idprograma || ''}
                  onChange={e => {
                    const selectedCode = e.target.value;
                    if (!selectedCode) {
                      setFormPlano({ ...formPlano, idprograma: '' });
                      return;
                    }
                    const digits = selectedCode.replace(/[^0-9]/g, '');
                    const rnc = digits ? spStore.getRNCById(Number(digits)) : undefined;
                    if (rnc) {
                      setFormPlano({
                        ...formPlano,
                        idprograma: selectedCode,
                        descricao_problema_oportunidade: rnc.descricaoProblema || rnc.modoFalha || formPlano.descricao_problema_oportunidade || '',
                        produto_: rnc.produto || formPlano.produto_ || '',
                        posto_: rnc.posto || rnc.fmds || formPlano.posto_ || '',
                        setor_: rnc.classificacaoSetor || rnc.setorDeteccao || formPlano.setor_ || 'Qualidade',
                        sub1: rnc.componente || formPlano.sub1 || '',
                        sub2: rnc.subcomponente || formPlano.sub2 || ''
                      });
                    } else {
                      setFormPlano({ ...formPlano, idprograma: selectedCode });
                    }
                  }}
                  className="form-select w-full text-xs py-2 px-3 border-blue-200 rounded-lg bg-white"
                >
                  <option value="">-- Plano Independente ou Selecionar Registro --</option>
                  {allRncs.map(r => {
                    const prefix = r.tipoRnc === 'Formal' || r.tipoRnc === 'Informal' ? 'C' : 'I';
                    const code = `${prefix} - ${r.id}`;
                    return (
                      <option key={r.id} value={code}>
                        {code} • {r.descricaoProblema || r.title} ({r.produto || r.cliente || r.classificacaoSetor || 'Geral'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Indicador / Programa *</label>
                  <select
                    value={formPlano.indicador_programa_estrategico}
                    onChange={e => setFormPlano({ ...formPlano, indicador_programa_estrategico: e.target.value })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                    required
                  >
                    {PROGRAMAS_LIST.filter(p => p !== 'Todos').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Setor *</label>
                  <input
                    type="text"
                    value={formPlano.setor_}
                    onChange={e => setFormPlano({ ...formPlano, setor_: e.target.value })}
                    placeholder="Ex: SOLDA 3, Qualidade"
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioridade *</label>
                  <select
                    value={formPlano.prioridade}
                    onChange={e => setFormPlano({ ...formPlano, prioridade: e.target.value as ActionPlanPriority })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição do Problema / Oportunidade *</label>
                <textarea
                  rows={3}
                  value={formPlano.descricao_problema_oportunidade}
                  onChange={e => setFormPlano({ ...formPlano, descricao_problema_oportunidade: e.target.value })}
                  placeholder="Descreva o desvio identificado ou a melhoria necessária..."
                  className="form-input w-full text-xs p-3 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Produto</label>
                  <input
                    type="text"
                    value={formPlano.produto_}
                    onChange={e => setFormPlano({ ...formPlano, produto_: e.target.value })}
                    placeholder="Ex: HR-V, HB20"
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Posto</label>
                  <input
                    type="text"
                    value={formPlano.posto_}
                    onChange={e => setFormPlano({ ...formPlano, posto_: e.target.value })}
                    placeholder="Ex: B643033"
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subconjunto</label>
                  <input
                    type="text"
                    value={formPlano.sub1}
                    onChange={e => setFormPlano({ ...formPlano, sub1: e.target.value })}
                    placeholder="Componente"
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código de Vínculo</label>
                  <input
                    type="text"
                    value={formPlano.idprograma}
                    onChange={e => setFormPlano({ ...formPlano, idprograma: e.target.value })}
                    placeholder="Ex: I - 6119"
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovoPlanoOpen(false)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white"
                >
                  Criar Plano</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NOVA AÇÃO
          ========================================================================= */}
      {modalNovaAcaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#0b5796]" />
                <h3 className="font-display font-bold text-sm text-slate-900">Nova Contramedida / Ação</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaAcaoOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAcao} className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vincular ao Plano *</label>
                  <select
                    value={formAcao.id_rel2}
                    onChange={e => {
                      const pId = Number(e.target.value);
                      const targetPlan = planos.find(p => p.id === pId);
                      setFormAcao({ 
                        ...formAcao, 
                        id_rel2: pId,
                        id_programa_acoes: targetPlan?.idprograma || ''
                      });
                    }}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    {planos.map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.id} - {p.indicador_programa_estrategico} ({p.descricao_problema_oportunidade.substring(0, 35)}...)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Ação *</label>
                  <select
                    value={formAcao.tipo_acao}
                    onChange={e => setFormAcao({ ...formAcao, tipo_acao: e.target.value as ActionItemType })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="CONTENÇÃO">Contenção</option>
                    <option value="CORRETIVA">Corretiva</option>
                    <option value="PREVENTIVA">Preventiva</option>
                    <option value="MELHORIA">Melhoria</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Causa Raiz</label>
                <input
                  type="text"
                  value={formAcao.causa}
                  onChange={e => setFormAcao({ ...formAcao, causa: e.target.value })}
                  placeholder="Origem ou causa apurada..."
                  className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição da Contramedida / O que será feito *</label>
                <textarea
                  rows={3}
                  value={formAcao.contra_medida}
                  onChange={e => setFormAcao({ ...formAcao, contra_medida: e.target.value })}
                  placeholder="Detalhamento técnico da ação corretiva ou preventiva..."
                  className="form-input w-full text-xs p-3 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsável *</label>
                  <select
                    value={formAcao.responsavel_acao}
                    onChange={e => {
                      const nome = e.target.value;
                      const ativo = baseAtivos.find(a => a.nome === nome);
                      setFormAcao({
                        ...formAcao,
                        responsavel_acao: nome,
                        email: ativo ? `${ativo.numPessoal}@empresa.com.br` : ''
                      });
                    }}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    {baseAtivos.map(a => (
                      <option key={a.numPessoal} value={a.nome}>{a.nome} ({a.posicao})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Acompanhamento *</label>
                  <input
                    type="date"
                    value={formAcao.data_acompanhamento}
                    onChange={e => setFormAcao({ ...formAcao, data_acompanhamento: e.target.value })}
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prazo Planejado Final *</label>
                  <input
                    type="date"
                    value={formAcao.data_planejada}
                    onChange={e => setFormAcao({ ...formAcao, data_planejada: e.target.value })}
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Parâmetros Técnicos: Yokoten / Poka-Yoke */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Abrangência (Yokoten)?</label>
                  <select
                    value={formAcao.yokoten}
                    onChange={e => setFormAcao({ ...formAcao, yokoten: e.target.value as any })}
                    className="form-select w-full text-xs py-1.5 px-2.5 border-slate-200 rounded-lg bg-white"
                  >
                    <option value="NÃO">Não</option>
                    <option value="SIM">Sim</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Poka-Yoke (Dispositivo)?</label>
                  <select
                    value={formAcao.poka_yoke}
                    onChange={e => setFormAcao({ ...formAcao, poka_yoke: e.target.value as any })}
                    className="form-select w-full text-xs py-1.5 px-2.5 border-slate-200 rounded-lg bg-white"
                  >
                    <option value="NÃO">Não</option>
                    <option value="SIM">Sim</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovaAcaoOpen(false)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white"
                >
                  Salvar Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REGISTRAR CONCLUSÃO DA AÇÃO (Comprovante / Evidência)
          ========================================================================= */}
      {modalConcluirOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="font-display font-bold text-sm text-slate-900">Registrar Conclusão de Ação</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConcluirOpen(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmConclusao} className="p-5 flex flex-col gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ação a Concluir:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{modalConcluirOpen.contra_medida}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Efetiva da Implementação *</label>
                <input
                  type="date"
                  value={formConclusao.dataConclusao}
                  onChange={e => setFormConclusao({ ...formConclusao, dataConclusao: e.target.value })}
                  className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relato de Evidência / O que foi implementado *</label>
                <textarea
                  rows={3}
                  value={formConclusao.comentarios}
                  onChange={e => setFormConclusao({ ...formConclusao, comentarios: e.target.value })}
                  placeholder="Descreva as modificações físicas, ajustes de processo ou treinamentos efetuados..."
                  className="form-input w-full text-xs p-3 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL da Evidência / Anexo (Opcional)</label>
                <input
                  type="text"
                  value={formConclusao.anexoUrl}
                  onChange={e => setFormConclusao({ ...formConclusao, anexoUrl: e.target.value })}
                  placeholder="https://... ou caminho do arquivo"
                  className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalConcluirOpen(null)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Concluir Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VALIDAR / HOMOLOGAR AÇÃO (Qualidade)
          ========================================================================= */}
      {modalValidarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0b5796]" />
                <h3 className="font-display font-bold text-sm text-slate-900">Homologação Técnica pela Qualidade</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalValidarOpen(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmValidacao} className="p-5 flex flex-col gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Ação Implementada:</span>
                <p className="font-semibold text-slate-900">{modalValidarOpen.contra_medida}</p>
                {modalValidarOpen.comentarios_evidencia && (
                  <p className="text-slate-600 mt-1 text-[11px] bg-white p-2 rounded border border-slate-200">
                    <strong>Evidência Apresentada:</strong> {modalValidarOpen.comentarios_evidencia}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Decisão do Auditor da Qualidade *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormValidacao({ ...formValidacao, status: 'Validado' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      formValidacao.status === 'Validado'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aprovar &amp; Homologar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormValidacao({ ...formValidacao, status: 'Aberto' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      formValidacao.status === 'Aberto'
                        ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Solicitar Revisão</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parecer Técnico da Auditoria *</label>
                <textarea
                  rows={3}
                  value={formValidacao.comentarios}
                  onChange={e => setFormValidacao({ ...formValidacao, comentarios: e.target.value })}
                  placeholder="Relatório de eficácia após inspeção ou justificativa em caso de reprovação..."
                  className="form-input w-full text-xs p-3 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              {formValidacao.status === 'Aberto' && (
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">Motivo do Retorno para Correção *</label>
                  <input
                    type="text"
                    value={formValidacao.motivoRevisao}
                    onChange={e => setFormValidacao({ ...formValidacao, motivoRevisao: e.target.value })}
                    placeholder="Instruções para o responsável ajustar a contramedida..."
                    className="form-input w-full text-xs py-2 px-3 border-rose-200 rounded-lg bg-rose-50/50"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalValidarOpen(null)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`btn-primary h-8 px-4 text-xs font-semibold text-white ${
                    formValidacao.status === 'Validado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar Decisão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
