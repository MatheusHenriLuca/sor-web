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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ArrowLeft,
  Printer,
  Image as ImageIcon
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
import { SearchableSelect, SearchableOption } from '../components/SearchableSelect';

interface PlanoAcaoViewProps {
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  currentUser: UsuarioQualidade;
  initialFilterPrograma?: string;
  initialPlanHeaderId?: number;
  openNewPlan?: boolean;
  viewMode?: 'kanban' | 'list';
  filterEtapa?: 'todas' | 'validacao' | 'minhas';
  fromScreen?: ActiveScreen;
  originRncId?: number;
  returnEtapa8D?: string;
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
  initialFilterPrograma,
  initialPlanHeaderId,
  openNewPlan,
  viewMode: initialViewMode,
  filterEtapa,
  fromScreen,
  originRncId,
  returnEtapa8D
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(initialViewMode || 'kanban');
  const [activeEtapaAcoes, setActiveEtapaAcoes] = useState<
    'todas' | 'validacao' | 'minhas'
  >(filterEtapa || 'todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrograma, setFilterPrograma] = useState(initialFilterPrograma || 'Todos');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('Todas');
  const [filterTipoAcao, setFilterTipoAcao] = useState<string>('Todos');
  const [filterResponsavelPlano, setFilterResponsavelPlano] = useState<string>('Todos');
  const [filterSomenteMinhas, setFilterSomenteMinhas] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modais e Navegação em Tela Única (Plano + Ações / Ação Específica)
  const [modalNovoPlanoOpen, setModalNovoPlanoOpen] = useState(openNewPlan || false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [modalNovaAcaoOpen, setModalNovaAcaoOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [actionToDelete, setActionToDelete] = useState<ActionPlanItem | null>(null);
  const [planToDelete, setPlanToDelete] = useState<ActionPlanHeader | null>(null);
  const [modalConcluirOpen, setModalConcluirOpen] = useState<ActionPlanItem | null>(null);
  const [modalValidarOpen, setModalValidarOpen] = useState<ActionPlanItem | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [singleScreenPlanId, setSingleScreenPlanId] = useState<number | null>(initialPlanHeaderId || null);
  const [singleScreenActionId, setSingleScreenActionId] = useState<number | null>(null);

  // Formulário Novo / Editar Plano
  const [formPlano, setFormPlano] = useState<Partial<ActionPlanHeader>>({
    indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
    prioridade: 'Alta',
    setor_: 'Qualidade',
    descricao_problema_oportunidade: '',
    produto_: '',
    posto_: '',
    sub1: '',
    sub2: '',
    foto_acao: '',
    idprograma: '',
    responsavel_abertura: currentUser.nome
  });

  // Formulário Nova / Editar Ação
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
  const [formConclusao, setFormConclusao] = useState<{
    dataConclusao: string;
    comentarios: string;
    anexos: { name: string; url: string; type: string }[];
  }>({
    dataConclusao: new Date().toISOString().split('T')[0],
    comentarios: '',
    anexos: []
  });

  const handleEvidenciaFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormConclusao(prev => ({
            ...prev,
            anexos: [
              ...prev.anexos,
              {
                name: file.name,
                url: reader.result as string,
                type: file.type || (file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image/png' : 'application/octet-stream')
              }
            ]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveAnexoConclusao = (index: number) => {
    setFormConclusao(prev => ({
      ...prev,
      anexos: prev.anexos.filter((_, i) => i !== index)
    }));
  };

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
  const baseAtivos = useMemo(() => spStore.getBaseAtivos(), [refreshTrigger]);
  const allActions = useMemo(() => spStore.getActionItems(), [refreshTrigger]);
  const allRncs = useMemo(() => spStore.getRNCs(), [refreshTrigger]);

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';

  // Opções customizáveis do Plano de Ação resolvidas via Central de Bases e Campos (respeitando Base, Coluna de Valor e Coluna de Exibição)
  const resolvedIndicadores = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_indicador', 'plano_acao', 'plano_indicador', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedSub1 = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_sub1', 'plano_acao', 'plano_sub1', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedAreas = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_area', 'plano_acao', 'area_fabril', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedPostos = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_posto_acao', 'plano_acao', 'posto_trabalho', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedProdutos = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_produto', 'plano_acao', 'master_pecas_produtos', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedPrioridades = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_prioridade', 'plano_acao', 'plano_prioridade', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedResponsaveis = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_responsavel', 'plano_acao', 'master_funcionarios', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );
  const resolvedTiposAcao = useMemo(
    () => tenantService.getFieldResolvedOptions('plano_tipo_acao', 'plano_acao', 'oitod_tipos_acao', activeTenant.id),
    [activeTenant.id, refreshTrigger]
  );

  // Opções para SearchableSelect no modal de Novo / Editar Plano
  const optionsResponsaveis = useMemo<SearchableOption[]>(() => {
    if (resolvedResponsaveis.options.length > 0) {
      return resolvedResponsaveis.options.map(o => ({
        value: o.value,
        label: o.label,
        sublabel: o.sublabel,
        badge: o.rawItem.codigo ? `#${o.rawItem.codigo}` : undefined
      }));
    }
    return baseAtivos.map(a => ({
      value: a.nome,
      label: a.nome,
      sublabel: a.posicao ? `${a.posicao}${a.unidadeOrg ? ` • ${a.unidadeOrg}` : ''}` : undefined,
      badge: a.numPessoal ? `#${a.numPessoal}` : undefined
    }));
  }, [resolvedResponsaveis, baseAtivos]);

  const optionsIndicadores = useMemo<SearchableOption[]>(() => {
    if (resolvedIndicadores.options.length > 0) {
      return resolvedIndicadores.options.map(item => ({
        value: item.value,
        label: item.label,
        sublabel: item.sublabel
      }));
    }
    return PROGRAMAS_LIST.filter(p => p !== 'Todos').map(item => ({
      value: item,
      label: item
    }));
  }, [resolvedIndicadores]);

  const optionsSubindicador = useMemo<SearchableOption[]>(() => {
    return resolvedSub1.options.map(item => ({
      value: item.value,
      label: item.label,
      sublabel: item.sublabel
    }));
  }, [resolvedSub1]);

  const optionsAreas = useMemo<SearchableOption[]>(() => {
    return resolvedAreas.options.map(item => ({
      value: item.value,
      label: item.label,
      sublabel: item.sublabel
    }));
  }, [resolvedAreas]);

  const optionsPostos = useMemo<SearchableOption[]>(() => {
    return resolvedPostos.options.map(item => ({
      value: item.value,
      label: item.label,
      sublabel: item.sublabel
    }));
  }, [resolvedPostos]);

  const optionsProdutos = useMemo<SearchableOption[]>(() => {
    return resolvedProdutos.options.map(item => ({
      value: item.value,
      label: item.label,
      sublabel: item.sublabel
    }));
  }, [resolvedProdutos]);

  const optionsPrioridades = useMemo<SearchableOption[]>(() => {
    if (resolvedPrioridades.options.length > 0) {
      return resolvedPrioridades.options.map(p => ({
        value: p.value,
        label: p.label,
        badgeColor: p.value === 'Alta' ? 'bg-rose-500' : p.value === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
      }));
    }
    return ['Alta', 'Média', 'Baixa'].map(p => ({
      value: p,
      label: p,
      badgeColor: p === 'Alta' ? 'bg-rose-500' : p === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
    }));
  }, [resolvedPrioridades]);

  const optionsTiposAcao = useMemo<SearchableOption[]>(() => {
    if (resolvedTiposAcao.options.length > 0) {
      return resolvedTiposAcao.options.map(t => ({
        value: t.value.toUpperCase(),
        label: t.label,
        sublabel: t.sublabel,
        badgeColor:
          t.value.toUpperCase() === 'CONTENÇÃO'
            ? 'bg-amber-500'
            : t.value.toUpperCase() === 'CORRETIVA'
            ? 'bg-rose-500'
            : t.value.toUpperCase() === 'PREVENTIVA'
            ? 'bg-blue-500'
            : 'bg-emerald-500'
      }));
    }
    return [
      { value: 'CONTENÇÃO', label: 'Contenção', badgeColor: 'bg-amber-500' },
      { value: 'CORRETIVA', label: 'Corretiva', badgeColor: 'bg-rose-500' },
      { value: 'PREVENTIVA', label: 'Preventiva', badgeColor: 'bg-blue-500' },
      { value: 'MELHORIA', label: 'Melhoria', badgeColor: 'bg-emerald-500' }
    ];
  }, [resolvedTiposAcao]);

  const optionsPlanosVinculo = useMemo<SearchableOption[]>(() => {
    return planos.map(p => ({
      value: String(p.id),
      label: `#${p.id} - ${p.indicador_programa_estrategico}`,
      sublabel: p.descricao_problema_oportunidade.length > 55 
        ? `${p.descricao_problema_oportunidade.substring(0, 55)}...` 
        : p.descricao_problema_oportunidade,
      badge: p.prioridade,
      badgeColor: p.prioridade === 'Alta' ? 'bg-rose-500' : p.prioridade === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
    }));
  }, [planos]);

  const handleFotoAuxiliarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormPlano(prev => ({ ...prev, foto_acao: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
      setSingleScreenActionId(null);
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
    if (!activeSinglePlan || singleScreenActionId === null) return null;
    return (
      activeSinglePlan.actions.find(a => a.id === singleScreenActionId) ||
      allActions.find(a => a.id === singleScreenActionId) ||
      null
    );
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

    if (filterResponsavelPlano !== 'Todos') {
      result = result.filter(
        p => p.responsavel_abertura.toLowerCase() === filterResponsavelPlano.toLowerCase()
      );
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
    filterResponsavelPlano,
    filterSomenteMinhas,
    currentUser.nome
  ]);

  // Lista de Responsáveis únicos de Planos para o filtro
  const listaResponsaveisPlanos = useMemo(() => {
    const set = new Set<string>();
    planos.forEach(p => {
      if (p.responsavel_abertura && p.responsavel_abertura.trim()) {
        set.add(p.responsavel_abertura.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [planos]);

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

    if (filterResponsavelPlano !== 'Todos') {
      const planIdsWithResp = new Set(
        planos
          .filter(p => p.responsavel_abertura.toLowerCase() === filterResponsavelPlano.toLowerCase())
          .map(p => p.id)
      );
      result = result.filter(a => a.id_rel2 && planIdsWithResp.has(a.id_rel2));
    }

    if (filterSomenteMinhas) {
      result = result.filter(a => a.responsavel_acao.toLowerCase() === currentUser.nome.toLowerCase());
    }

    return result;
  }, [allActions, planos, activeEtapaAcoes, searchQuery, filterPrograma, filterTipoAcao, filterPrioridade, filterResponsavelPlano, filterSomenteMinhas, currentUser.nome]);

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

  // =========================================================================
  // REGRAS DE PERMISSÃO DO PLANO E DAS AÇÕES
  // - Responsável pelo Plano: pode editar o plano, editar/excluir/concluir ações e validar ações
  // - Responsável pela Execução da Ação: pode concluir a ação
  // =========================================================================
  const isSamePerson = (nameA?: string, nameB?: string): boolean => {
    if (!nameA || !nameB) return false;
    return normalizeDisplayText(nameA).trim().toLowerCase() === normalizeDisplayText(nameB).trim().toLowerCase();
  };

  const isPlanResponsible = (plano?: ActionPlanHeader | null): boolean => {
    if (!plano) return false;
    return isSamePerson(plano.responsavel_abertura, currentUser.nome);
  };

  const isActionResponsible = (acao?: ActionPlanItem | null): boolean => {
    if (!acao) return false;
    return isSamePerson(acao.responsavel_acao, currentUser.nome);
  };

  const canEditOrDeleteAction = (plano?: ActionPlanHeader | null): boolean => {
    return isPlanResponsible(plano);
  };

  const canConcludeAction = (plano?: ActionPlanHeader | null, acao?: ActionPlanItem | null): boolean => {
    return isActionResponsible(acao) || isPlanResponsible(plano);
  };

  const canValidateAction = (plano?: ActionPlanHeader | null): boolean => {
    return isPlanResponsible(plano);
  };

  // Abre modal de Novo Plano
  const handleOpenNewPlanModal = () => {
    setEditingPlanId(null);
    setFormPlano({
      indicador_programa_estrategico: optionsIndicadores[0]?.value || 'ATENDIMENTO AO CLIENTE',
      prioridade: (optionsPrioridades[0]?.value as ActionPlanPriority) || 'Alta',
      setor_: optionsAreas[0]?.value || 'Qualidade',
      descricao_problema_oportunidade: '',
      produto_: optionsProdutos[0]?.value || '',
      posto_: optionsPostos[0]?.value || '',
      sub1: optionsSubindicador[0]?.value || '',
      sub2: '',
      foto_acao: '',
      idprograma: '',
      responsavel_abertura: currentUser.nome
    });
    setModalNovoPlanoOpen(true);
  };

  // Abre modal para Editar Plano existente
  const handleOpenEditPlanModal = (plano: ActionPlanHeader) => {
    if (!isPlanResponsible(plano)) return;
    setEditingPlanId(plano.id);
    setFormPlano({
      id: plano.id,
      indicador_programa_estrategico: plano.indicador_programa_estrategico,
      prioridade: plano.prioridade,
      setor_: plano.setor_ || 'Qualidade',
      descricao_problema_oportunidade: plano.descricao_problema_oportunidade,
      produto_: plano.produto_ || '',
      posto_: plano.posto_ || '',
      sub1: plano.sub1 || '',
      sub2: plano.sub2 || '',
      foto_acao: plano.foto_acao || '',
      idprograma: plano.idprograma || '',
      responsavel_abertura: plano.responsavel_abertura || currentUser.nome
    });
    setModalNovoPlanoOpen(true);
  };

  // Abre modal para Nova Ação dentro de um plano
  const handleOpenNewActionModal = (plano: ActionPlanHeader) => {
    setEditingActionId(null);
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
      id_rel2: plano.id,
      id_programa_acoes: plano.idprograma || ''
    });
    setModalNovaAcaoOpen(true);
  };

  // Abre modal para Editar Ação existente
  const handleOpenEditActionModal = (plano: ActionPlanHeader, acao: ActionPlanItem) => {
    if (!canEditOrDeleteAction(plano)) return;
    setEditingActionId(acao.id);
    setFormAcao({
      id: acao.id,
      id_rel2: acao.id_rel2 || plano.id,
      id_programa_acoes: acao.id_programa_acoes || plano.idprograma || '',
      tipo_acao: acao.tipo_acao,
      causa: acao.causa || '',
      contra_medida: acao.contra_medida,
      data_acompanhamento: acao.data_acompanhamento,
      data_planejada: acao.data_planejada,
      responsavel_acao: acao.responsavel_acao,
      email: acao.email || '',
      yokoten: acao.yokoten || 'NÃO',
      poka_yoke: acao.poka_yoke || 'NÃO',
      evidencia_obrigatoria: acao.evidencia_obrigatoria || 'SIM',
      validacao_acao: acao.validacao_acao || 'SIM'
    });
    setModalNovaAcaoOpen(true);
  };

  // Confirma exclusão de Ação
  const handleConfirmDeleteAction = () => {
    if (!actionToDelete) return;
    const deletedId = actionToDelete.id;
    spStore.deleteActionItem(deletedId);
    setActionToDelete(null);
    if (singleScreenActionId === deletedId) {
      setSingleScreenActionId(null);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  // Ações de formulário
  const handleCreatePlano = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlano.descricao_problema_oportunidade) return;
    const isCreatingNew = !editingPlanId;
    const savedPlan = spStore.saveActionPlan(
      editingPlanId ? { ...formPlano, id: editingPlanId } : formPlano
    );
    setModalNovoPlanoOpen(false);
    setEditingPlanId(null);
    setFormPlano({
      indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
      prioridade: 'Alta',
      setor_: 'Qualidade',
      descricao_problema_oportunidade: '',
      produto_: '',
      posto_: '',
      sub1: '',
      sub2: '',
      foto_acao: '',
      idprograma: '',
      responsavel_abertura: currentUser.nome
    });
    setRefreshTrigger(prev => prev + 1);
    if (isCreatingNew && savedPlan?.id) {
      setSingleScreenPlanId(savedPlan.id);
      setSingleScreenActionId(null);
    }
  };

  const handleCreateAcao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAcao.contra_medida) return;
    const saved = spStore.saveActionItem(editingActionId ? { ...formAcao, id: editingActionId } : formAcao);
    setModalNovaAcaoOpen(false);
    setEditingActionId(null);
    if (singleScreenPlanId === saved.id_rel2) {
      setSingleScreenActionId(saved.id);
    }
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
    const serializedAnexos = formConclusao.anexos.map(a =>
      a.url.startsWith('data:') ? `${a.name}:::${a.url}` : a.url
    );
    spStore.concluirActionItem(
      modalConcluirOpen.id,
      formConclusao.dataConclusao,
      formConclusao.comentarios,
      serializedAnexos
    );
    setModalConcluirOpen(null);
    setFormConclusao({ dataConclusao: new Date().toISOString().split('T')[0], comentarios: '', anexos: [] });
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
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestão de planos de ação e acompanhamento de contramedidas
            </p>
          </div>
        </div>

        {/* Alternador de Visão (Kanban / Lista) & Novo Plano */}
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
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSingleScreenPlanId(null);
                setViewMode('list');
              }}
              className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer select-none ${
                singleScreenPlanId === null && viewMode === 'list'
                  ? 'bg-white text-[#0b5796] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>
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
                  if (fromScreen === 'detalhes-8d' && (originRncId || activeSinglePlan.idprograma)) {
                    const targetRncId = originRncId || Number(activeSinglePlan.idprograma);
                    onNavigate('detalhes-8d', {
                      rncId: targetRncId,
                      initialViewMode: 'metodologia8d',
                      initialEtapa8D: returnEtapa8D || '3D'
                    });
                    return;
                  }
                  setSingleScreenPlanId(null);
                  setSingleScreenActionId(null);
                }}
                className="btn-secondary h-8 px-3 text-xs font-bold text-slate-700 hover:text-slate-900 gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{fromScreen === 'detalhes-8d' ? 'Voltar para Metodologia 8D' : 'Voltar'}</span>
              </button>

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
                onClick={() => handleOpenEditPlanModal(activeSinglePlan)}
                disabled={!isPlanResponsible(activeSinglePlan)}
                title={isPlanResponsible(activeSinglePlan) ? 'Editar Plano' : `Apenas o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode editar`}
                className="btn-secondary h-8 px-3 text-xs font-bold text-[#0b5796] border-blue-200 hover:bg-blue-50 gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar Plano</span>
              </button>

              {isPlanResponsible(activeSinglePlan) && (
                <button
                  type="button"
                  onClick={() => setPlanToDelete(activeSinglePlan)}
                  className="btn-secondary h-8 px-3 text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Plano</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="btn-secondary h-8 px-3 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* BLOCO 1: CABEÇALHO DO PLANO DE AÇÃO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-white/15 font-mono font-bold text-xs text-white border border-white/20">
                  Plano #{activeSinglePlan.id}
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">
                    Cabeçalho do Plano de Ação
                  </h2>
                </div>
                {isPlanResponsible(activeSinglePlan) ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold">
                    Você é o Responsável pelo Plano
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[11px] font-semibold">
                    Responsável pelo Plano: {activeSinglePlan.responsavel_abertura}
                  </span>
                )}
              </div>

              {activeSinglePlan.idprograma && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
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
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Subindicador</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">
                    {activeSinglePlan.sub1 || '-'}
                  </span>
                </div>
              </div>

              {/* Descrição do Problema / Oportunidade + Foto Auxiliar + Progresso */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <div className="lg:col-span-2 p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 flex flex-col justify-between gap-3">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {activeSinglePlan.foto_acao && (
                      <div className="shrink-0 w-28 h-28 rounded-xl border border-blue-200 bg-white overflow-hidden shadow-2xs group relative">
                        <img 
                          src={activeSinglePlan.foto_acao} 
                          alt="Foto auxiliar do plano" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] font-bold text-center py-0.5">
                          Foto Auxiliar
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                        Descrição do Problema / Oportunidade
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                        {activeSinglePlan.descricao_problema_oportunidade}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500 pt-2 border-t border-blue-100 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>Responsável pelo Plano: <strong className="text-slate-900">{activeSinglePlan.responsavel_abertura}</strong></span>
                      <span>Data de Abertura: <strong className="font-mono text-slate-800">{formatDateBR(activeSinglePlan.data_abertura)}</strong></span>
                    </div>
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

          {/* BLOCO 2: TODAS AS AÇÕES DEDICADAS A ESTE PLANO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Ações do Plano ({activeSinglePlan.actions.length})</span>
                  {activeSingleAction && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0b5796] text-[11px] font-semibold font-mono">
                      Ação #{activeSingleAction.id} expandida
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Clique em uma ação na tabela para expandir ou recolher seus detalhes abaixo • Responsável pelo Plano edita, exclui e valida • Responsável pela Execução conclui
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenNewActionModal(activeSinglePlan)}
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
                      <th className="py-2.5 px-4">Responsável Execução</th>
                      <th className="py-2.5 px-4">Prazo Planejado</th>
                      <th className="py-2.5 px-4">Diretivas</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Operações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeSinglePlan.actions.map(acao => {
                      const isFocused = activeSingleAction?.id === acao.id;
                      const allowEditDelete = canEditOrDeleteAction(activeSinglePlan);
                      const allowConclude = canConcludeAction(activeSinglePlan, acao);
                      const allowValidate = canValidateAction(activeSinglePlan);

                      return (
                        <tr
                          key={acao.id}
                          onClick={() => setSingleScreenActionId(prev => prev === acao.id ? null : acao.id)}
                          className={`transition-colors cursor-pointer ${
                            isFocused ? 'bg-blue-50/90 ring-1 ring-inset ring-[#0b5796]/40 font-medium' : 'hover:bg-slate-50'
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
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setSingleScreenActionId(prev => prev === acao.id ? null : acao.id)}
                                className={`h-7 px-2.5 rounded text-[11px] font-semibold border transition flex items-center gap-1 ${
                                  isFocused
                                    ? 'bg-[#0b5796] text-white border-[#0b5796]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                                title={isFocused ? 'Recolher detalhes desta ação' : 'Expandir detalhes desta ação'}
                              >
                                {isFocused ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    <span>Recolher</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    <span>Detalhes</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={!allowEditDelete}
                                onClick={() => handleOpenEditActionModal(activeSinglePlan, acao)}
                                title={
                                  allowEditDelete
                                    ? 'Editar ação'
                                    : `Somente o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode editar`
                                }
                                className="btn-secondary h-7 px-2 text-[11px] font-semibold text-[#0b5796] border-blue-200 hover:bg-blue-50 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                disabled={!allowEditDelete}
                                onClick={() => setActionToDelete(acao)}
                                title={
                                  allowEditDelete
                                    ? 'Excluir ação'
                                    : `Somente o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode excluir`
                                }
                                className="btn-secondary h-7 px-2 text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Excluir</span>
                              </button>

                              {(acao.status === 'Aberto' || acao.status === 'Atrasado') && (
                                <button
                                  type="button"
                                  disabled={!allowConclude}
                                  onClick={() => {
                                    setModalConcluirOpen(acao);
                                    setFormConclusao({
                                      dataConclusao: new Date().toISOString().split('T')[0],
                                      comentarios: acao.comentarios_evidencia || '',
                                      anexos: []
                                    });
                                  }}
                                  title={
                                    allowConclude
                                      ? 'Concluir ação'
                                      : `Somente o responsável pela execução (${acao.responsavel_acao}) ou o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode concluir`
                                  }
                                  className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Concluir
                                </button>
                              )}

                              {acao.status === 'Concluído' && (
                                <button
                                  type="button"
                                  disabled={!allowValidate}
                                  onClick={() => {
                                    setModalValidarOpen(acao);
                                    setFormValidacao({
                                      status: 'Validado',
                                      comentarios: '',
                                      motivoRevisao: ''
                                    });
                                  }}
                                  title={
                                    allowValidate
                                      ? 'Validar ação'
                                      : `Somente o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode validar`
                                  }
                                  className="btn-primary h-7 px-2.5 text-[11px] font-semibold bg-[#0b5796] text-white disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* BLOCO 3: DETALHAMENTO DA AÇÃO SELECIONADA */}
          {activeSingleAction && (
            <div className="bg-white rounded-2xl border-2 border-[#0b5796]/40 shadow-sm overflow-hidden scroll-mt-6">
              <div className="px-5 py-3 bg-blue-50/80 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-[#0b5796] text-white font-mono text-xs font-bold">
                    Ação #{activeSingleAction.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Detalhamento da Ação
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    activeSingleAction.status === 'Validado' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    activeSingleAction.status === 'Concluído' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    activeSingleAction.status === 'Atrasado' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    'bg-blue-100 text-blue-800 border-blue-300'
                  }`}>
                    Status: {activeSingleAction.status}
                  </span>
                  {isActionResponsible(activeSingleAction) && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 text-[10px] font-bold">
                      Você é o Responsável pela Execução
                    </span>
                  )}
                </div>

                {/* Botões de Edição / Exclusão e Recolher */}
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <button
                    type="button"
                    disabled={!canEditOrDeleteAction(activeSinglePlan)}
                    onClick={() => handleOpenEditActionModal(activeSinglePlan, activeSingleAction)}
                    title={
                      canEditOrDeleteAction(activeSinglePlan)
                        ? 'Editar esta ação'
                        : `Apenas o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) tem permissão para editar a ação`
                    }
                    className="btn-secondary h-7 px-2.5 text-xs font-bold text-[#0b5796] border-blue-200 hover:bg-blue-100 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar Ação</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canEditOrDeleteAction(activeSinglePlan)}
                    onClick={() => setActionToDelete(activeSingleAction)}
                    title={
                      canEditOrDeleteAction(activeSinglePlan)
                        ? 'Excluir esta ação'
                        : `Apenas o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) tem permissão para excluir a ação`
                    }
                    className="btn-secondary h-7 px-2.5 text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Ação</span>
                  </button>

                  <div className="h-4 w-px bg-blue-200 mx-1 hidden sm:block" />

                  <button
                    type="button"
                    onClick={() => setSingleScreenActionId(null)}
                    title="Recolher detalhamento da ação"
                    className="btn-secondary h-7 px-2.5 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Recolher</span>
                  </button>
                </div>
              </div>

              <div className="p-5 flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Causa Raiz
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        {activeSingleAction.causa || 'Não informada'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Contramedida / Ação
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                        {activeSingleAction.contra_medida}
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
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Responsável pela Execução</span>
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
                    <div className="pt-2.5 border-t border-slate-200 flex flex-col gap-1.5">
                      {(activeSingleAction.status === 'Aberto' || activeSingleAction.status === 'Atrasado') && (
                        <>
                          <button
                            type="button"
                            disabled={!canConcludeAction(activeSinglePlan, activeSingleAction)}
                            onClick={() => {
                              setModalConcluirOpen(activeSingleAction);
                              setFormConclusao({
                                dataConclusao: new Date().toISOString().split('T')[0],
                                comentarios: activeSingleAction.comentarios_evidencia || '',
                                anexos: []
                              });
                            }}
                            title={
                              canConcludeAction(activeSinglePlan, activeSingleAction)
                                ? 'Registrar conclusão desta ação'
                                : `Apenas o responsável pela execução (${activeSingleAction.responsavel_acao}) ou o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode concluir a ação`
                            }
                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-8 px-3 text-xs font-bold text-white w-full justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Registrar Conclusão desta Ação</span>
                          </button>
                          {!canConcludeAction(activeSinglePlan, activeSingleAction) && (
                            <span className="text-[10px] text-amber-700 text-center">
                              Conclusão permitida para <strong>{normalizeDisplayText(activeSingleAction.responsavel_acao)}</strong> (Execução) ou <strong>{activeSinglePlan.responsavel_abertura}</strong> (Plano).
                            </span>
                          )}
                        </>
                      )}

                      {activeSingleAction.status === 'Concluído' && (
                        <>
                          <button
                            type="button"
                            disabled={!canValidateAction(activeSinglePlan)}
                            onClick={() => {
                              setModalValidarOpen(activeSingleAction);
                              setFormValidacao({
                                status: 'Validado',
                                comentarios: '',
                                motivoRevisao: ''
                              });
                            }}
                            title={
                              canValidateAction(activeSinglePlan)
                                ? 'Validar e homologar ação'
                                : `Apenas o responsável pelo plano (${activeSinglePlan.responsavel_abertura}) pode fazer a validação da ação`
                            }
                            className="btn-primary bg-[#0b5796] hover:bg-[#09477d] h-8 px-3 text-xs font-bold text-white w-full justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Validar &amp; Homologar Ação</span>
                          </button>
                          {!canValidateAction(activeSinglePlan) && (
                            <span className="text-[10px] text-amber-700 text-center">
                              Validação exclusiva do Responsável pelo Plano (<strong>{activeSinglePlan.responsavel_abertura}</strong>).
                            </span>
                          )}
                        </>
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
                {(activeSingleAction.comentarios_evidencia || (activeSingleAction.anexos_evidencia && activeSingleAction.anexos_evidencia.length > 0) || activeSingleAction.comentarios_validacao || activeSingleAction.status_revisar) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    {(activeSingleAction.comentarios_evidencia || (activeSingleAction.anexos_evidencia && activeSingleAction.anexos_evidencia.length > 0)) && (
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                          Evidência de Conclusão ({formatDateBR(activeSingleAction.data_conclusao || '')})
                        </span>
                        {activeSingleAction.comentarios_evidencia && (
                          <p className="text-xs text-slate-800">{activeSingleAction.comentarios_evidencia}</p>
                        )}
                        {activeSingleAction.anexos_evidencia && activeSingleAction.anexos_evidencia.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {activeSingleAction.anexos_evidencia.map((rawAnexo, idx) => {
                              const parts = rawAnexo.includes(':::') ? rawAnexo.split(':::') : ['Evidência Anexada', rawAnexo];
                              const fileName = parts[0];
                              const fileUrl = parts[1] || rawAnexo;
                              const isImg = fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
                              return isImg ? (
                                <a
                                  key={idx}
                                  href={fileUrl}
                                  download={fileName}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group relative w-20 h-20 rounded-lg border border-emerald-300 bg-white overflow-hidden shadow-2xs flex flex-col items-center justify-center"
                                  title={fileName}
                                >
                                  <img src={fileUrl} alt={fileName} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                </a>
                              ) : (
                                <a
                                  key={idx}
                                  href={fileUrl}
                                  download={fileName}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 transition"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[180px]">{fileName}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
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
        </div>
      ) : (
        <>
          {/* 2. PAINEL UNIFICADO DE CONTROLE E FILTROS */}
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col gap-2.5">
            {/* Linha 1: Botões de navegação rápida de etapas + Botão Novo Plano à direita */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
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
                  <span>Todos os Planos</span>
                  <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeEtapaAcoes === 'todas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {etapaCounts.planos}
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
                  <span>Aguardando validação</span>
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
              </div>

              {/* Botão Novo Plano no canto direito */}
              <button
                type="button"
                onClick={handleOpenNewPlanModal}
                className="btn-primary h-8 px-3.5 text-xs font-semibold bg-[#0b5796] hover:bg-[#09477d] text-white gap-1.5 shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Plano</span>
              </button>
            </div>

            {/* Linha 2: Filtros integrados com título acima de cada campo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-2.5 items-end">
              {/* Campo de Busca com padding corrigido contra sobreposição do ícone */}
              <div className="xl:col-span-4 lg:col-span-3 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Problema, produto, posto, contramedida..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="form-input w-full text-xs pr-3 h-8 bg-slate-50 border-slate-200 rounded-lg text-slate-800"
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
              </div>

              {/* Filtro: Programa */}
              <div className="xl:col-span-2 lg:col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Programa
                </label>
                <select
                  value={filterPrograma}
                  onChange={e => setFilterPrograma(e.target.value)}
                  className="form-select w-full text-xs h-8 px-2 bg-slate-50 border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  {PROGRAMAS_LIST.map(prog => (
                    <option key={prog} value={prog}>{prog}</option>
                  ))}
                </select>
              </div>

              {/* Filtro: Prioridade */}
              <div className="xl:col-span-1 lg:col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Prioridade
                </label>
                <select
                  value={filterPrioridade}
                  onChange={e => setFilterPrioridade(e.target.value)}
                  className="form-select w-full text-xs h-8 px-2 bg-slate-50 border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="Todas">Todas</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>

              {/* Filtro: Tipo de Ação */}
              <div className="xl:col-span-2 lg:col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tipo Ação
                </label>
                <select
                  value={filterTipoAcao}
                  onChange={e => setFilterTipoAcao(e.target.value)}
                  className="form-select w-full text-xs h-8 px-2 bg-slate-50 border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="Todos">Todos</option>
                  <option value="CONTENÇÃO">Contenção</option>
                  <option value="CORRETIVA">Corretiva</option>
                  <option value="PREVENTIVA">Preventiva</option>
                  <option value="MELHORIA">Melhoria</option>
                </select>
              </div>

              {/* Filtro: Responsável pelo Plano (NOVO!) */}
              <div className="xl:col-span-2 lg:col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 truncate" title="Responsável pelo Plano">
                  Resp. Plano
                </label>
                <select
                  value={filterResponsavelPlano}
                  onChange={e => setFilterResponsavelPlano(e.target.value)}
                  className="form-select w-full text-xs h-8 px-2 bg-slate-50 border-slate-200 rounded-lg text-slate-700 font-medium"
                >
                  <option value="Todos">Todos Responsáveis</option>
                  {listaResponsaveisPlanos.map(resp => (
                    <option key={resp} value={resp}>
                      {normalizeDisplayText(resp)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alternador Meus Planos & Limpar */}
              <div className="xl:col-span-1 lg:col-span-1 sm:col-span-1 flex items-center gap-1.5">
                <div className="w-full">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 opacity-0 pointer-events-none select-none">
                    Filtro
                  </label>
                  <button
                    type="button"
                    onClick={() => setFilterSomenteMinhas(!filterSomenteMinhas)}
                    title={filterSomenteMinhas ? 'Exibindo apenas seus planos' : 'Filtrar planos com ações suas'}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1 w-full ${
                      filterSomenteMinhas
                        ? 'bg-blue-50 text-[#0b5796] border-blue-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Meus</span>
                  </button>
                </div>

                {(searchQuery || filterPrograma !== 'Todos' || filterPrioridade !== 'Todas' || filterTipoAcao !== 'Todos' || filterResponsavelPlano !== 'Todos' || filterSomenteMinhas) && (
                  <div className="shrink-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 opacity-0 pointer-events-none select-none">
                      Limpar
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterPrograma('Todos');
                        setFilterPrioridade('Todas');
                        setFilterTipoAcao('Todos');
                        setFilterResponsavelPlano('Todos');
                        setFilterSomenteMinhas(false);
                      }}
                      title="Limpar todos os filtros"
                      className="h-8 px-2 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
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

          {/* 5. VISUALIZAÇÃO: KANBAN vs LISTA DE PLANOS */}
          {viewMode === 'kanban' ? (
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
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenSingleScreen(plano.id)}
                                  className="flex-1 h-8 px-3 rounded-lg bg-[#0b5796] hover:bg-[#09477d] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                                >
                                  <FolderKanban className="w-3.5 h-3.5" />
                                  <span>Abrir Plano</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPlanModal(plano)}
                                  title="Editar Plano"
                                  className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>

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
                                  onClick={() => handleOpenNewActionModal(plano)}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0b5796] border border-blue-200 hover:bg-blue-100 flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Ação</span>
                                </button>
                              </div>

                              {isPlanExpanded && (
                                <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-100 max-h-64 overflow-y-auto pr-0.5">
                                  {plano.actions.map(acao => {
                                    const allowEditDelete = canEditOrDeleteAction(plano);
                                    const allowConclude = canConcludeAction(plano, acao);
                                    const allowValidate = canValidateAction(plano);

                                    return (
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
                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenSingleScreen(plano.id, acao)}
                                            className="btn-secondary h-6 px-2 text-[10px] font-bold text-[#0b5796] border-blue-200 hover:bg-blue-50 flex-1 justify-center"
                                          >
                                            Detalhes
                                          </button>
                                          <button
                                            type="button"
                                            disabled={!allowEditDelete}
                                            onClick={() => handleOpenEditActionModal(plano, acao)}
                                            title={allowEditDelete ? 'Editar ação' : `Somente o responsável pelo plano (${plano.responsavel_abertura}) pode editar`}
                                            className="btn-secondary h-6 px-1.5 text-[10px] font-bold text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={!allowEditDelete}
                                            onClick={() => setActionToDelete(acao)}
                                            title={allowEditDelete ? 'Excluir ação' : `Somente o responsável pelo plano (${plano.responsavel_abertura}) pode excluir`}
                                            className="btn-secondary h-6 px-1.5 text-[10px] font-bold text-rose-700 border-rose-200 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                          {(acao.status === 'Aberto' || acao.status === 'Atrasado') && (
                                            <button
                                              type="button"
                                              disabled={!allowConclude}
                                              onClick={() => {
                                                setModalConcluirOpen(acao);
                                                setFormConclusao({
                                                  dataConclusao: new Date().toISOString().split('T')[0],
                                                  comentarios: acao.comentarios_evidencia || '',
                                                  anexos: []
                                                });
                                              }}
                                              title={allowConclude ? 'Concluir ação' : `Somente o responsável pela execução (${acao.responsavel_acao}) ou do plano (${plano.responsavel_abertura}) pode concluir`}
                                              className="btn-secondary h-6 px-2 text-[10px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              Concluir
                                            </button>
                                          )}
                                          {acao.status === 'Concluído' && (
                                            <button
                                              type="button"
                                              disabled={!allowValidate}
                                              onClick={() => {
                                                setModalValidarOpen(acao);
                                                setFormValidacao({
                                                  status: 'Validado',
                                                  comentarios: '',
                                                  motivoRevisao: ''
                                                });
                                              }}
                                              title={allowValidate ? 'Validar ação' : `Somente o responsável pelo plano (${plano.responsavel_abertura}) pode validar`}
                                              className="btn-primary h-6 px-2 text-[10px] font-bold bg-[#0b5796] text-white flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              Validar
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
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
            /* ======================== VISÃO LISTA DE PLANOS ======================== */
            <div className="flex flex-col gap-3.5">
              {filteredPlans.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <FolderKanban className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Nenhum plano de ação encontrado</p>
                  <button
                    type="button"
                    onClick={handleOpenNewPlanModal}
                    className="mt-3 btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Plano</span>
                  </button>
                </div>
              ) : (
                filteredPlans.map(plano => {
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
                              <span className="text-xs text-slate-500">
                                Responsável do Plano: <strong className="text-slate-700">{plano.responsavel_abertura}</strong>
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-2">
                              {plano.descricao_problema_oportunidade}
                            </h3>
                            {(plano.produto_ || plano.posto_ || plano.sub1) && (
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                {plano.produto_ && <span>Produto: <strong className="text-slate-700">{plano.produto_}</strong></span>}
                                {plano.posto_ && <span>Posto: <strong className="text-slate-700">{plano.posto_}</strong></span>}
                                {plano.sub1 && <span>Subindicador: <strong className="text-slate-700">{plano.sub1}</strong></span>}
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
                              onClick={() => handleOpenEditPlanModal(plano)}
                              className="btn-secondary h-8 px-2.5 text-xs font-semibold gap-1 text-[#0b5796] border-blue-200 hover:bg-blue-50"
                              title="Editar Plano"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
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
                            <button
                              type="button"
                              onClick={() => handleOpenNewActionModal(plano)}
                              className="btn-secondary h-7 px-2.5 text-xs font-semibold text-[#0b5796] border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Nova Ação</span>
                            </button>
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
                                  {acoesDoPlano.map(acao => {
                                    const allowEditDelete = canEditOrDeleteAction(plano);
                                    const allowConclude = canConcludeAction(plano, acao);
                                    const allowValidate = canValidateAction(plano);

                                    return (
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
                                        <td className="py-2.5 px-3 font-medium text-slate-700">{normalizeDisplayText(acao.responsavel_acao)}</td>
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
                                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenSingleScreen(plano.id, acao)}
                                              className="btn-secondary h-7 px-2 text-[11px] font-semibold text-[#0b5796] border-blue-200 hover:bg-blue-50"
                                            >
                                              Detalhes
                                            </button>
                                            <button
                                              type="button"
                                              disabled={!allowEditDelete}
                                              onClick={() => handleOpenEditActionModal(plano, acao)}
                                              title={allowEditDelete ? 'Editar ação' : `Somente o responsável pelo plano (${plano.responsavel_abertura}) pode editar`}
                                              className="btn-secondary h-7 px-2 text-[11px] font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              <Pencil className="w-3 h-3" />
                                              <span>Editar</span>
                                            </button>
                                            <button
                                              type="button"
                                              disabled={!allowEditDelete}
                                              onClick={() => setActionToDelete(acao)}
                                              title={allowEditDelete ? 'Excluir ação' : `Somente o responsável pelo plano (${plano.responsavel_abertura}) pode excluir`}
                                              className="btn-secondary h-7 px-2 text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Excluir</span>
                                            </button>
                                            {acao.status === 'Aberto' || acao.status === 'Atrasado' ? (
                                              <button
                                                type="button"
                                                disabled={!allowConclude}
                                                onClick={() => setModalConcluirOpen(acao)}
                                                title={allowConclude ? 'Concluir ação' : `Somente o responsável pela execução (${acao.responsavel_acao}) ou do plano (${plano.responsavel_abertura}) pode concluir`}
                                                className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                              >
                                                Concluir
                                              </button>
                                            ) : acao.status === 'Concluído' ? (
                                              <button
                                                type="button"
                                                disabled={!allowValidate}
                                                onClick={() => setModalValidarOpen(acao)}
                                                title={allowValidate ? 'Validar ação' : `Somente o responsável pelo plano (${plano.responsavel_abertura}) pode validar`}
                                                className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-amber-700 border-amber-200 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                              >
                                                Validar
                                              </button>
                                            ) : (
                                              <span className="text-emerald-700 text-xs font-semibold">Homologado</span>
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
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          MODAL: NOVO / EDITAR PLANO DE AÇÃO (FORMULÁRIO CONFORME POWER APPS)
          ========================================================================= */}
      {modalNovoPlanoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/15">
                  <CheckSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    {editingPlanId ? `Editar Plano de Ação #${editingPlanId}` : 'Criar Novo Plano de Ação'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Preencha os dados e anexe a foto auxiliar de acordo com o padrão fabril
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalNovoPlanoOpen(false);
                  setEditingPlanId(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlano} className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* Vínculo Automático com Ocorrência (Somente leitura se já veio vinculado de outro módulo) */}
              {formPlano.idprograma && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-[#0b5796] shrink-0" />
                  <div className="flex-1 flex items-center justify-between flex-wrap gap-1">
                    <span className="font-medium text-slate-700">
                      Plano vinculado automaticamente à ocorrência:
                    </span>
                    <span className="font-mono font-bold text-[#0b5796] bg-white px-2 py-0.5 rounded border border-blue-200">
                      {formatOccurrenceId(formPlano.idprograma)}
                    </span>
                  </div>
                </div>
              )}

              {/* Linha 1: Responsável pela Abertura (Linha Inteira) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Responsável pela Abertura *
                </label>
                <SearchableSelect
                  options={optionsResponsaveis}
                  value={formPlano.responsavel_abertura || currentUser.nome}
                  onChange={val => setFormPlano({ ...formPlano, responsavel_abertura: val })}
                  placeholder="Selecione o responsável..."
                  searchPlaceholder="Pesquisar por nome ou cargo..."
                  compact={true}
                  allowClear={false}
                  allowCustom={true}
                />
              </div>

              {/* Linha 2: Indicador / Programa Estratégico & Subindicador (2 por linha) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Indicador / Programa Estratégico *
                  </label>
                  <SearchableSelect
                    options={optionsIndicadores}
                    value={formPlano.indicador_programa_estrategico || ''}
                    onChange={val => setFormPlano({ ...formPlano, indicador_programa_estrategico: val })}
                    placeholder="Selecione o indicador..."
                    searchPlaceholder="Pesquisar ou adicionar..."
                    compact={true}
                    allowClear={false}
                    allowCustom={true}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subindicador
                  </label>
                  <SearchableSelect
                    options={optionsSubindicador}
                    value={formPlano.sub1 || ''}
                    onChange={val => setFormPlano({ ...formPlano, sub1: val })}
                    placeholder="Selecione ou digite um subindicador..."
                    searchPlaceholder="Pesquisar ou cadastrar subindicador..."
                    compact={true}
                    allowClear={true}
                    allowCustom={true}
                  />
                </div>
              </div>

              {/* Linha 3: Área (Setor) & Posto (2 por linha) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Área (Setor) *</label>
                  <SearchableSelect
                    options={optionsAreas}
                    value={formPlano.setor_ || ''}
                    onChange={val => setFormPlano({ ...formPlano, setor_: val })}
                    placeholder="Selecione a área..."
                    searchPlaceholder="Pesquisar área..."
                    compact={true}
                    allowClear={false}
                    allowCustom={true}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Posto</label>
                  <SearchableSelect
                    options={optionsPostos}
                    value={formPlano.posto_ || ''}
                    onChange={val => setFormPlano({ ...formPlano, posto_: val })}
                    placeholder="Selecione o posto..."
                    searchPlaceholder="Pesquisar posto..."
                    compact={true}
                    allowClear={true}
                    allowCustom={true}
                  />
                </div>
              </div>

              {/* Linha 4: Produto & Prioridade (2 por linha) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Produto</label>
                  <SearchableSelect
                    options={optionsProdutos}
                    value={formPlano.produto_ || ''}
                    onChange={val => setFormPlano({ ...formPlano, produto_: val })}
                    placeholder="Selecione o produto..."
                    searchPlaceholder="Pesquisar produto..."
                    compact={true}
                    allowClear={true}
                    allowCustom={true}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioridade *</label>
                  <SearchableSelect
                    options={optionsPrioridades}
                    value={formPlano.prioridade || 'Alta'}
                    onChange={val => setFormPlano({ ...formPlano, prioridade: (val as ActionPlanPriority) || 'Alta' })}
                    placeholder="Prioridade..."
                    compact={true}
                    allowClear={false}
                  />
                </div>
              </div>

              {/* Linha 4: Descrição do Problema / Oportunidade */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Descrição do Problema / Oportunidade *
                </label>
                <textarea
                  rows={3}
                  value={formPlano.descricao_problema_oportunidade || ''}
                  onChange={e => setFormPlano({ ...formPlano, descricao_problema_oportunidade: e.target.value })}
                  placeholder="Descreva detalhadamente o desvio identificado ou a melhoria a implementar..."
                  className="form-input w-full text-xs p-3 border-slate-200 rounded-lg bg-slate-50 resize-none font-medium"
                  required
                />
              </div>

              {/* Linha 5: Foto Auxiliar (Upload, Preview e Remoção) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                <label className="block font-semibold text-slate-700">
                  Foto Auxiliar da Peça / Posto / Problema
                </label>
                
                {formPlano.foto_acao ? (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0 relative">
                      <img 
                        src={formPlano.foto_acao} 
                        alt="Preview Foto Auxiliar" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Foto Auxiliar anexada
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormPlano(prev => ({ ...prev, foto_acao: '' }))}
                        className="btn-secondary h-7 px-2.5 text-[11px] font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 w-fit gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover Foto</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-[#0b5796] hover:bg-blue-50/40 transition cursor-pointer">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="font-semibold text-slate-700 text-xs">
                      Clique para carregar Foto Auxiliar
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG ou WEBP do posto ou peça
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoAuxiliarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalNovoPlanoOpen(false);
                    setEditingPlanId(null);
                  }}
                  className="btn-secondary h-8 px-4 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-5 text-xs font-semibold bg-[#0b5796] text-white hover:bg-[#09477d] cursor-pointer"
                >
                  {editingPlanId ? 'Salvar Alterações do Plano' : 'Criar Plano de Ação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NOVA / EDITAR AÇÃO
          ========================================================================= */}
      {modalNovaAcaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#0b5796]" />
                <h3 className="font-display font-bold text-sm text-slate-900">
                  {editingActionId ? `Editar Ação #${editingActionId}` : 'Nova Contramedida / Ação'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalNovaAcaoOpen(false);
                  setEditingActionId(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAcao} className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vincular ao Plano *</label>
                  <SearchableSelect
                    options={optionsPlanosVinculo}
                    value={String(formAcao.id_rel2 || '')}
                    onChange={val => {
                      const pId = Number(val);
                      const targetPlan = planos.find(p => p.id === pId);
                      setFormAcao({ 
                        ...formAcao, 
                        id_rel2: pId,
                        id_programa_acoes: targetPlan?.idprograma || ''
                      });
                    }}
                    placeholder="Selecione o plano..."
                    searchPlaceholder="Pesquisar por plano ou indicador..."
                    compact={true}
                    allowClear={false}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Ação *</label>
                  <SearchableSelect
                    options={optionsTiposAcao}
                    value={formAcao.tipo_acao || 'CORRETIVA'}
                    onChange={val => setFormAcao({ ...formAcao, tipo_acao: val as ActionItemType })}
                    compact={true}
                    allowClear={false}
                  />
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
                  <label className="block font-semibold text-slate-700 mb-1">Responsável pela Execução *</label>
                  <SearchableSelect
                    options={optionsResponsaveis}
                    value={formAcao.responsavel_acao || ''}
                    onChange={nome => {
                      const ativo = baseAtivos.find(a => a.nome === nome);
                      setFormAcao({
                        ...formAcao,
                        responsavel_acao: nome,
                        email: ativo ? `${ativo.numPessoal}@empresa.com.br` : ''
                      });
                    }}
                    placeholder="Selecione o responsável..."
                    searchPlaceholder="Pesquisar por nome ou cargo..."
                    compact={true}
                    allowClear={false}
                    allowCustom={true}
                  />
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
                  onClick={() => {
                    setModalNovaAcaoOpen(false);
                    setEditingActionId(null);
                  }}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white"
                >
                  {editingActionId ? 'Salvar Alterações da Ação' : 'Salvar Ação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRMAR EXCLUSÃO DE AÇÃO
          ========================================================================= */}
      {actionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h3 className="font-display font-bold text-sm text-rose-900">
                  Excluir Ação #{actionToDelete.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActionToDelete(null)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Tem certeza que deseja excluir esta ação do Plano #{actionToDelete.id_rel2}?
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Contramedida:</span>
                <p className="font-bold text-slate-900 mt-0.5">{actionToDelete.contra_medida}</p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionToDelete(null)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAction}
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRMAR EXCLUSÃO DE PLANO DE AÇÃO
          ========================================================================= */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h3 className="font-display font-bold text-sm text-rose-900">
                  Excluir Plano #{planToDelete.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="text-rose-400 hover:text-rose-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o <strong>Plano #{planToDelete.id}</strong> e todas as suas ações vinculadas?
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Descrição do Plano:</span>
                <p className="font-bold text-slate-900 mt-0.5">{planToDelete.descricao_problema_oportunidade}</p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    spStore.deleteActionPlan(planToDelete.id);
                    setPlanToDelete(null);
                    setSingleScreenPlanId(null);
                    setSingleScreenActionId(null);
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
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
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Anexo de Evidência (Arquivo ou Imagem)
                </label>
                <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 hover:border-[#0b5796] rounded-xl bg-slate-50/70 hover:bg-blue-50/30 transition cursor-pointer text-center">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0b5796] flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0b5796] block">
                      Clique para selecionar imagem ou arquivo
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Suporta fotos (PNG, JPG, WEBP) e documentos (PDF, Excel, Word)
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleEvidenciaFilesChange}
                    className="hidden"
                  />
                </label>

                {formConclusao.anexos.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {formConclusao.anexos.map((item, idx) => {
                      const isImage = item.type.startsWith('image/') || item.url.startsWith('data:image/');
                      return (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isImage ? (
                              <img
                                src={item.url}
                                alt={item.name}
                                className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0 bg-white"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-blue-50 border border-blue-200 text-[#0b5796] flex items-center justify-center shrink-0">
                                <Paperclip className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                              <span className="text-[10px] text-emerald-700 font-semibold">Arquivo pronto para envio</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAnexoConclusao(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0"
                            title="Remover anexo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
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
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Ação Implementada:</span>
                <p className="font-semibold text-slate-900">{modalValidarOpen.contra_medida}</p>
                {modalValidarOpen.comentarios_evidencia && (
                  <p className="text-slate-600 mt-1 text-[11px] bg-white p-2 rounded border border-slate-200">
                    <strong>Evidência Apresentada:</strong> {modalValidarOpen.comentarios_evidencia}
                  </p>
                )}
                {modalValidarOpen.anexos_evidencia && modalValidarOpen.anexos_evidencia.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {modalValidarOpen.anexos_evidencia.map((rawAnexo, idx) => {
                      const parts = rawAnexo.includes(':::') ? rawAnexo.split(':::') : ['Evidência Anexada', rawAnexo];
                      const fileName = parts[0];
                      const fileUrl = parts[1] || rawAnexo;
                      const isImg = fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
                      return isImg ? (
                        <a
                          key={idx}
                          href={fileUrl}
                          download={fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="w-16 h-16 rounded-lg border border-slate-300 bg-white overflow-hidden shadow-2xs block"
                          title={fileName}
                        >
                          <img src={fileUrl} alt={fileName} className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <a
                          key={idx}
                          href={fileUrl}
                          download={fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-[#0b5796] hover:bg-blue-50"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[160px]">{fileName}</span>
                        </a>
                      );
                    })}
                  </div>
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
