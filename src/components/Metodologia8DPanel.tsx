import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Layers,
  Barcode,
  GitBranch,
  CheckSquare,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  FileText,
  Sparkles,
  Printer,
  X,
  UserPlus,
  HelpCircle,
  Activity,
  Check,
  ChevronRight,
  Calendar,
  Car,
  Wrench,
  Eye,
  Info,
  AlertCircle,
  Edit3,
  Lock,
  ChevronLeft
} from 'lucide-react';
import {
  RNCRecord,
  UsuarioQualidade,
  ActionPlanItem,
  EightDMetadata,
  IshikawaCauseItem,
  HenkatenRecord,
  Entrevista8DRecord,
  ActionItemType,
  IshikawaM,
  ActiveScreen
} from '../types';
import { spStore } from '../services/sharepointService';
import { formatDateBR } from '../utils/date';
import { formatOccurrenceId, normalizeDisplayText } from '../utils/formatText';
import { ImageWithFallback } from './ImageWithFallback';

interface Metodologia8DPanelProps {
  rnc: RNCRecord;
  currentUser: UsuarioQualidade;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  onRefreshRnc: () => void;
}

type Etapa8D = '1D' | '2D' | '3D' | '4D' | '5D' | '6D' | '7D' | '8D';

const ISHIKAWA_MS: IshikawaM[] = [
  'Máquina',
  'Mão de Obra',
  'Método',
  'Material',
  'Medição',
  'Meio Ambiente'
];

export const Metodologia8DPanel: React.FC<Metodologia8DPanelProps> = ({
  rnc,
  currentUser,
  onNavigate,
  onRefreshRnc
}) => {
  const [activeEtapa, setActiveEtapa] = useState<Etapa8D>('1D');
  const [subAba4D, setSubAba4D] = useState<'ishikawa' | '5pq' | 'henkaten' | 'gemba'>('ishikawa');
  const [refreshKey, setRefreshKey] = useState(0);

  // Identificador formal do 8D conforme padrão Power Apps (varid8d: "I - 10" ou "C - 10")
  const id8d = `${rnc.tipoRnc === 'Formal' ? 'C' : 'I'} - ${rnc.id}`;
  const codigoClienteOuFormal = rnc.tipoRnc === 'Formal'
    ? (rnc.codOcorrenciaCliente?.trim() || (
        rnc.field1 &&
        !['RNC #' + rnc.id, 'RNC-' + rnc.id, 'RNC ' + rnc.id, '#' + rnc.id, String(rnc.id)].includes(rnc.field1.trim())
          ? rnc.field1.trim()
          : null
      ))
    : null;
  const formalDisplayId = formatOccurrenceId(rnc.id, codigoClienteOuFormal);
  const codigoPeca9 = (rnc.componente || rnc.produto || '').trim().substring(0, 9);

  // Modais de Criação e Ação
  const [modalNovaCausaOpen, setModalNovaCausaOpen] = useState(false);
  const [modalNovaAcaoOpen, setModalNovaAcaoOpen] = useState(false);
  const [modalConcluirAcao, setModalConcluirAcao] = useState<ActionPlanItem | null>(null);
  const [modalValidarAcao, setModalValidarAcao] = useState<ActionPlanItem | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados dos Formulários
  const [formCausa, setFormCausa] = useState<Partial<IshikawaCauseItem>>({
    seisms: 'Máquina',
    ocnd: 'Ocorrência',
    okng: 'NG',
    descricao_causa: '',
    umpq: '',
    doispq: '',
    trespq: '',
    quatropq: '',
    cincopq: ''
  });

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
    oData_8d_7d: undefined,
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM',
    id_programa_acoes: id8d
  });

  const [formConclusao, setFormConclusao] = useState({
    dataConclusao: new Date().toISOString().split('T')[0],
    comentarios: ''
  });

  const [formValidacao, setFormValidacao] = useState<{
    status: 'Validado' | 'Aberto' | 'Atrasado';
    comentarios: string;
    motivoRevisao: string;
  }>({
    status: 'Validado',
    comentarios: '',
    motivoRevisao: ''
  });

  // Metadados do 8D, Causas e Ações da RNC
  const meta: EightDMetadata = useMemo(() => {
    return spStore.getEightDMetadata(id8d) || {
      id: 0,
      tenant_id: rnc.tenant_id || '',
      id8d: id8d,
      participantes_8d: currentUser.nome,
      validar_8d: 'Em Andamento',
      diretriz_yokoten: 'Avaliar extensão da contramedida para todas as células de solda e prensas análogas.',
      diretriz_pokayoke: 'Dispositivo mecânico ou sensor de presença para impedir montagem invertida.'
    };
  }, [id8d, refreshKey, rnc.tenant_id, currentUser.nome]);

  // Form de Diretrizes do 6D
  const [diretrizes6D, setDiretrizes6D] = useState({
    yokoten: (meta.diretriz_yokoten || '').length > 0 ? 'SIM' : 'NÃO',
    diretriz_yokoten: meta.diretriz_yokoten || '',
    poka_yoke: (meta.diretriz_pokayoke || '').length > 0 ? 'SIM' : 'NÃO',
    diretriz_pokayoke: meta.diretriz_pokayoke || ''
  });

  useEffect(() => {
    setDiretrizes6D({
      yokoten: meta.diretriz_yokoten ? 'SIM' : 'NÃO',
      diretriz_yokoten: meta.diretriz_yokoten || '',
      poka_yoke: meta.diretriz_pokayoke ? 'SIM' : 'NÃO',
      diretriz_pokayoke: meta.diretriz_pokayoke || ''
    });
  }, [meta]);

  const causes = useMemo(() => spStore.getIshikawaCauses(id8d), [id8d, refreshKey]);
  const allActions = useMemo(() => spStore.getActionItems({ id_programa_acoes: id8d }), [id8d, refreshKey]);
  const baseAtivos = useMemo(() => spStore.getBaseAtivos(), []);
  const lotesSAP = useMemo(() => spStore.getLotesSAP(rnc.id), [rnc.id]);
  const etiquetasVivas = useMemo(() => spStore.getEtiquetasVivas(rnc.id), [rnc.id]);
  const henkaten = useMemo(() => spStore.getHenkaten(id8d), [id8d, refreshKey]);
  const entrevista = useMemo(() => spStore.getEntrevista8D(id8d), [id8d, refreshKey]);

  // Histórico de reincidências
  const historicoReincidencias = useMemo(() => {
    const defeito = rnc.modoFalha || rnc.descricaoProblema;
    if (!defeito || (!rnc.produto && !rnc.componente)) return [];
    return spStore.getHistoricoReincidencias(
      rnc.produto,
      defeito,
      rnc.id,
      rnc.componente
    );
  }, [rnc]);

  // Participantes atuais como lista
  const participantesList = useMemo(() => {
    if (!meta.participantes_8d) return [];
    return meta.participantes_8d.split(',').map(s => s.trim()).filter(Boolean);
  }, [meta.participantes_8d]);

  // Ações filtradas por disciplina do 8D
  const acoes3D = useMemo(() => allActions.filter(a => a.tipo_acao === 'CONTENÇÃO'), [allActions]);
  const acoes5D = useMemo(() => allActions.filter(a => a.tipo_acao === 'CORRETIVA' && a.yokoten !== 'SIM' && a.poka_yoke !== 'SIM'), [allActions]);
  const acoes6D = useMemo(() => allActions.filter(a => a.yokoten === 'SIM' || a.poka_yoke === 'SIM'), [allActions]);
  const acoes7D = useMemo(() => allActions.filter(a => a.tipo_acao === 'PREVENTIVA' || Boolean(a.oData_8d_7d)), [allActions]);

  // =========================================================================
  // VALIDAÇÃO DAS TRAVAS DO 8D (Regra de transição sequencial obrigatória)
  // =========================================================================
  const isEtapaConcluida = (etapa: Etapa8D): boolean => {
    switch (etapa) {
      case '1D':
        return Boolean(rnc.produto && (rnc.modoFalha || rnc.descricaoProblema));
      case '2D':
        return participantesList.length >= 1;
      case '3D':
        return acoes3D.length >= 1 || Boolean(rnc.acoesContencao && rnc.acoesContencao.trim().length > 0);
      case '4D':
        return causes.length >= 1 && causes.some(c => c.okng === 'NG' && Boolean(c.cincopq || c.descricao_causa));
      case '5D':
        return acoes5D.length >= 1;
      case '6D':
        return acoes6D.length >= 1 || Boolean(meta.diretriz_yokoten && meta.diretriz_pokayoke);
      case '7D':
        return acoes7D.length >= 1 || allActions.some(a => a.tipo_acao === 'PREVENTIVA' || Boolean(a.oData_8d_7d));
      case '8D':
        return meta.validar_8d === 'Aprovado' || rnc.status === 'Concluído';
      default:
        return false;
    }
  };

  const isEtapaLiberada = (etapa: Etapa8D): { liberada: boolean; motivo?: string } => {
    const etapasOrdem: Etapa8D[] = ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D'];
    const idx = etapasOrdem.indexOf(etapa);
    if (idx === 0) return { liberada: true };

    const nomes: Record<Etapa8D, string> = {
      '1D': '1D (Ocorrência)',
      '2D': '2D (Equipe)',
      '3D': '3D (Contenção)',
      '4D': '4D (Causa Raiz)',
      '5D': '5D (Ações Corretivas)',
      '6D': '6D (Abrangência / Poka-Yoke)',
      '7D': '7D (Prevenção IATF)',
      '8D': '8D (Homologação)'
    };

    for (let i = 0; i < idx; i++) {
      const prev = etapasOrdem[i];
      if (!isEtapaConcluida(prev)) {
        return { 
          liberada: false, 
          motivo: `A etapa ${nomes[prev]} precisa estar preenchida antes de avançar para ${nomes[etapa]}.` 
        };
      }
    }
    return { liberada: true };
  };

  const handleTentarNavegarEtapa = (target: Etapa8D) => {
    const check = isEtapaLiberada(target);
    if (!check.liberada) {
      setNotification({
        type: 'error',
        message: `Trava do 8D: ${check.motivo}`
      });
      return;
    }
    setActiveEtapa(target);
  };

  // =========================================================================
  // BOTÃO DE 1 CLIQUE: GERAÇÃO DE AÇÃO NO 5D A PARTIR DO 5º PORQUÊ DO 4D
  // =========================================================================
  const handleGerarAcao5DCom5PQ = (causaItem: IshikawaCauseItem) => {
    const causaRaizTexto = causaItem.cincopq || causaItem.quatropq || causaItem.trespq || causaItem.doispq || causaItem.umpq || causaItem.descricao_causa;

    setFormAcao({
      tipo_acao: 'CORRETIVA',
      causa: `[${causaItem.seisms}] ${causaRaizTexto}`,
      contra_medida: `Eliminar causa raiz identificada no 5º Porquê: ${causaRaizTexto}`,
      data_acompanhamento: new Date().toISOString().split('T')[0],
      data_planejada: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      responsavel_acao: currentUser.nome,
      email: currentUser.email || '',
      yokoten: 'SIM',
      poka_yoke: 'SIM',
      evidencia_obrigatoria: 'SIM',
      validacao_acao: 'SIM',
      id_programa_acoes: id8d
    });

    setActiveEtapa('5D');
    setModalNovaAcaoOpen(true);
  };

  // Salvar Participantes (2D)
  const handleAddParticipante = (nome: string) => {
    if (!nome) return;
    const current = participantesList;
    if (current.includes(nome)) return;
    const updated = [...current, nome].join(', ');
    spStore.saveEightDMetadata({ id8d, participantes_8d: updated });
    setRefreshKey(prev => prev + 1);
  };

  const handleRemoveParticipante = (nome: string) => {
    const updated = participantesList.filter(n => n !== nome).join(', ');
    spStore.saveEightDMetadata({ id8d, participantes_8d: updated });
    setRefreshKey(prev => prev + 1);
  };

  // Salvar Nova Causa Ishikawa (4D)
  const handleSaveCausa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCausa.descricao_causa) return;
    spStore.saveIshikawaCause({
      ...formCausa,
      id8d
    });
    setModalNovaCausaOpen(false);
    setFormCausa({
      seisms: 'Máquina',
      ocnd: 'Ocorrência',
      okng: 'NG',
      descricao_causa: '',
      umpq: '',
      doispq: '',
      trespq: '',
      quatropq: '',
      cincopq: ''
    });
    setRefreshKey(prev => prev + 1);
  };

  // Alternar OK / NG na causa
  const handleToggleCausaStatus = (causaId: number, current: 'OK' | 'NG') => {
    const next = current === 'OK' ? 'NG' : 'OK';
    const item = causes.find(c => c.id === causaId);
    if (item) {
      spStore.saveIshikawaCause({ ...item, okng: next });
      setRefreshKey(prev => prev + 1);
    }
  };

  // Salvar Nova Ação
  const handleSaveAcao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAcao.contra_medida) return;

    spStore.saveActionItem({
      ...formAcao,
      id_programa_acoes: id8d,
      status: 'Aberto'
    });

    setModalNovaAcaoOpen(false);
    setNotification({ type: 'success', message: 'Ação registrada com sucesso!' });
    setRefreshKey(prev => prev + 1);
  };

  // Concluir Ação
  const handleConfirmConclusao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConcluirAcao) return;

    spStore.concluirActionItem(
      modalConcluirAcao.id,
      formConclusao.dataConclusao,
      formConclusao.comentarios,
      []
    );

    setModalConcluirAcao(null);
    setNotification({ type: 'success', message: 'Ação concluída com sucesso!' });
    setRefreshKey(prev => prev + 1);
  };

  // Validar Ação
  const handleConfirmValidacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalValidarAcao) return;

    spStore.validarActionItem(
      modalValidarAcao.id,
      formValidacao.status,
      formValidacao.comentarios,
      formValidacao.motivoRevisao
    );

    setModalValidarAcao(null);
    setNotification({ type: 'success', message: 'Validação da ação concluída!' });
    setRefreshKey(prev => prev + 1);
  };

  // Salvar Diretrizes 6D
  const handleSaveDiretrizes6D = (e: React.FormEvent) => {
    e.preventDefault();
    spStore.saveEightDMetadata({
      id8d,
      diretriz_yokoten: diretrizes6D.yokoten === 'SIM' ? diretrizes6D.diretriz_yokoten : 'Não aplicável',
      diretriz_pokayoke: diretrizes6D.poka_yoke === 'SIM' ? diretrizes6D.diretriz_pokayoke : 'Não aplicável'
    });
    setNotification({ type: 'success', message: 'Diretrizes 6D salvas com sucesso!' });
    setRefreshKey(prev => prev + 1);
  };

  // Salvar Fechamento 8D
  const handleSaveFechamento8D = (status: 'Aprovado' | 'Reprovado' | 'Em Andamento', parecer: string) => {
    spStore.saveEightDMetadata({
      id8d,
      validar_8d: status,
      comentarios_validacao: parecer,
      data_aprovacao: new Date().toISOString().split('T')[0],
      aprovado_por: currentUser.nome,
      revisado_4d: status === 'Aprovado',
      revisado_5d: status === 'Aprovado',
      revisado_6d: status === 'Aprovado',
      revisado_7d: status === 'Aprovado'
    });

    if (status === 'Aprovado') {
      spStore.concluirRNC(rnc.id, currentUser.nome, parecer);
      onRefreshRnc();
    }

    setNotification({ type: 'success', message: `Status do 8D atualizado para: ${status}` });
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150">

      {/* Notificação Temporária */}
      {notification && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-2xs ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO DAS 8 DISCIPLINAS (1D a 8D) COM TRAVAS VISUAIS */}
      <div className="card-saas p-2.5 border-slate-200 bg-white shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: '1D', label: '1D. Ocorrência', icon: FileText, count: null },
            { id: '2D', label: '2D. Equipe', icon: Users, count: participantesList.length },
            { id: '3D', label: '3D. Contenção & Lotes', icon: Barcode, count: acoes3D.length },
            { id: '4D', label: '4D. Causa Raiz', icon: GitBranch, count: causes.length },
            { id: '5D', label: '5D. Corretivas', icon: CheckSquare, count: acoes5D.length },
            { id: '6D', label: '6D. Abrangência', icon: Share2, count: acoes6D.length },
            { id: '7D', label: '7D. Prevenção', icon: ShieldAlert, count: acoes7D.length },
            { id: '8D', label: '8D. Homologação', icon: ShieldCheck, count: meta.validar_8d === 'Aprovado' ? 'OK' : null }
          ].map(d => {
            const Icon = d.icon;
            const isActive = activeEtapa === d.id;
            const isDone = isEtapaConcluida(d.id as Etapa8D);
            const { liberada, motivo } = isEtapaLiberada(d.id as Etapa8D);

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleTentarNavegarEtapa(d.id as Etapa8D)}
                title={!liberada ? motivo : isDone ? `${d.label} (Preenchido & Conforme)` : `${d.label} (Em preenchimento)`}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition select-none whitespace-nowrap border ${
                  isActive
                    ? 'bg-[#0b5796] text-white border-[#0b5796] shadow-xs cursor-pointer'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/70 cursor-pointer'
                    : liberada
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                }`}
              >
                {!liberada ? (
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : isDone && !isActive ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 shrink-0" />
                )}
                <span>{d.label}</span>
                {isDone && !isActive ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-200/60 text-emerald-900">
                    OK
                  </span>
                ) : d.count !== null && (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {d.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          ETAPA 1D: DETALHES COMPLETOS DA OCORRÊNCIA (ESPELHO INTEGRAL)
          ========================================================================= */}
      {activeEtapa === '1D' && (
        <div className="flex flex-col gap-5 animate-in fade-in">

          {/* Card de Identificação & Visão Executiva */}
          <div className="card-saas p-4 sm:p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="h-8 inline-flex items-center px-3 rounded-lg text-xs font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200 shadow-2xs">
                  {formalDisplayId}
                </span>
                <span className={`h-8 inline-flex items-center px-2.5 rounded-lg text-xs font-bold border ${
                  rnc.status === 'Concluído' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                  rnc.status === 'Em Andamento' ? 'bg-amber-50 text-amber-950 border-amber-300' :
                  'bg-sky-50 text-sky-950 border-sky-300'
                }`}>
                  {rnc.status}
                </span>
                <span className="h-8 inline-flex items-center px-2.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                  {rnc.tipoRnc || 'Formal'}
                </span>
                <span className="h-8 inline-flex items-center px-2.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                  8D - Sim
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Ficha A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEtapa('2D')}
                  className="btn-primary bg-[#0b5796] h-8 px-3.5 text-xs font-semibold gap-1.5"
                >
                  <span>Avançar para 2D</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Linha 1: Montadora, Setor, Data Ocorrência, Data Contenção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Montadora:</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {normalizeDisplayText(rnc.cliente || 'Não informada')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Setor Responsável:</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {normalizeDisplayText(rnc.classificacaoSetor || 'Qualidade')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Data Abertura &amp; Turno:</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                  {formatDateBR(rnc.dataOcorrencia)} - {normalizeDisplayText(rnc.turno || '1º Turno')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Data Final de Contenção:</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                  {formatDateBR(rnc.dataContencao || rnc.dataOcorrencia)}
                </span>
              </div>
            </div>

            {/* Linha 2: Especificações Técnicas e Origem */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Posto / Linha / FMDS:</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={`${rnc.posto || ''} ${rnc.fmds || ''}`}>
                  {normalizeDisplayText(rnc.posto || 'Geral')} {rnc.fmds ? `• ${normalizeDisplayText(rnc.fmds)}` : ''}
                </strong>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Código da Peça:</span>
                  <span className="text-[10px] font-bold text-[#0b5796] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    {normalizeDisplayText(rnc.finalComponente || 'Peça Final')}
                  </span>
                </div>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 font-mono" title={rnc.componente || rnc.produto}>
                  {codigoPeca9 || '-'}
                </strong>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Quantidade &amp; Defeito:</span>
                <strong className="text-xs sm:text-sm font-bold text-rose-700">
                  {rnc.quantidadeAfetada || 1} pç(s) — {normalizeDisplayText(rnc.modoFalha || rnc.descricaoProblema || 'Não especificado')}
                </strong>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Código do Componente:</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 font-mono truncate">
                  {rnc.componente ? normalizeDisplayText(rnc.componente) : '-'}
                </strong>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Local de Detecção do Cliente:</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {normalizeDisplayText(rnc.setorDeteccao || '-')}
                </strong>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Impacto no Cliente:</span>
                <strong className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={rnc.impactoCliente || '-'}>
                  {normalizeDisplayText(rnc.impactoCliente || '-')}
                </strong>
              </div>
            </div>

            {/* Participantes do Atendimento Inicial */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Participantes do Atendimento Inicial:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(rnc.participantesAtendimento || rnc.detector || 'Leandro Serafim de Lima;Paulo Henrique Vicente;Luis Henrique Camargo Felicio').split(';').map((p, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200">
                    {normalizeDisplayText(p.trim())}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* TRÍADE DE FOTOS DA NÃO CONFORMIDADE */}
          <div className="card-saas p-4 sm:p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0b5796]" />
                <h3 className="font-bold text-sm text-slate-900">Evidências Visuais da Peça</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Clique nas imagens para zoom</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Foto OK */}
              <div className="flex flex-col border border-emerald-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-emerald-700 text-white px-3 py-2 flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Foto Peça OK
                  </span>
                  <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.2 rounded font-semibold">Padrão</span>
                </div>
                <div
                  className="h-56 bg-slate-50 flex items-center justify-center p-2 cursor-pointer group relative overflow-hidden"
                  onClick={() => rnc.fotoPecaOk && setZoomImage({ src: rnc.fotoPecaOk, title: 'Foto Peça OK (Padrão de Conformidade)' })}
                >
                  <ImageWithFallback
                    src={rnc.fotoPecaOk}
                    alt="Foto peça OK"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    emptyLabel="Sem foto de peça OK"
                    itemId={rnc.id}
                  />
                </div>
              </div>

              {/* Foto NG */}
              <div className="flex flex-col border border-rose-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-rose-700 text-white px-3 py-2 flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Foto Peça NG
                  </span>
                  <span className="text-[10px] bg-rose-800/80 px-1.5 py-0.2 rounded font-semibold">Não Conformidade</span>
                </div>
                <div
                  className="h-56 bg-slate-50 flex items-center justify-center p-2 cursor-pointer group relative overflow-hidden"
                  onClick={() => rnc.fotoPecaNg && setZoomImage({ src: rnc.fotoPecaNg, title: 'Foto Peça NG (Não Conformidade)' })}
                >
                  <ImageWithFallback
                    src={rnc.fotoPecaNg}
                    alt="Foto peça NG"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    emptyLabel="Sem foto de peça NG"
                    itemId={rnc.id}
                  />
                </div>
              </div>

              {/* Foto Auxiliar */}
              <div className="flex flex-col border border-sky-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-sky-700 text-white px-3 py-2 flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Foto Auxiliar
                  </span>
                  <span className="text-[10px] bg-sky-800/80 px-1.5 py-0.2 rounded font-semibold">Instrução / Seleção</span>
                </div>
                <div
                  className="h-56 bg-slate-50 flex items-center justify-center p-2 cursor-pointer group relative overflow-hidden"
                  onClick={() => rnc.fotoAuxiliar && setZoomImage({ src: rnc.fotoAuxiliar, title: 'Foto Auxiliar (Retrabalho / Seleção)' })}
                >
                  <ImageWithFallback
                    src={rnc.fotoAuxiliar}
                    alt="Foto auxiliar"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    emptyLabel="Sem foto auxiliar"
                    itemId={rnc.id}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DISPOSIÇÃO INTERNA & CONTENÇÃO IMEDIATA (5W2H) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-saas p-4 sm:p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">Disposição Interna &amp; Contenção Inicial</h4>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
                <span className="font-bold text-[#0b5796] block mb-1">Ações Imediatas de Contenção:</span>
                <p className="text-slate-900 font-semibold leading-relaxed">
                  {normalizeDisplayText(rnc.acoesContencao || 'Nenhuma ação de contenção informada.')}
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-800 block mb-1">Recomendações / Providências Técnicas:</span>
                <p className="text-slate-900 leading-relaxed font-semibold">
                  {normalizeDisplayText(rnc.recomendacoesProvidencias || 'Sem recomendações complementares.')}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Descrição do Problema Interno:</span>
                <p className="text-slate-900 font-semibold leading-relaxed">
                  {normalizeDisplayText(rnc.descricaoProblemaInterno || rnc.descricaoProblema || 'Não especificada.')}
                </p>
              </div>
            </div>

            {/* Diretrizes 5W2H Iniciais */}
            <div className="card-saas p-4 sm:p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldAlert className="w-4 h-4 text-[#0b5796]" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">Diretrizes Operacionais de Contenção (5W2H)</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">O Que Fazer?</span>
                  <p className="text-slate-900 font-semibold">{normalizeDisplayText(rnc.oQueFazer || 'Não informado')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">Como Fazer?</span>
                  <p className="text-slate-900 font-semibold">{normalizeDisplayText(rnc.comoFazer || 'Não informado')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                  <span className="font-bold text-slate-600 block mb-0.5">Por Que Fazer?</span>
                  <p className="text-slate-900 font-semibold">{normalizeDisplayText(rnc.porQueFazer || 'Não informado')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">Quem Fará?</span>
                  <p className="text-slate-900 font-semibold">{normalizeDisplayText(rnc.quemFara || 'Qualidade / Produção')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-600 block mb-0.5">Quando Fará?</span>
                  <p className="text-slate-900 font-semibold font-mono">{formatDateBR(rnc.quandoFara || rnc.dataOcorrencia)}</p>
                </div>
              </div>

              {historicoReincidencias.length > 0 && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-950 flex flex-col gap-1">
                  <span className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Reincidência Confirmada ({historicoReincidencias.length} registro(s) anterior(es))
                  </span>
                  <span className="text-[11px] text-rose-800">
                    Última incidência registrada em {formatDateBR(historicoReincidencias[0].dataOcorrencia)}.
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          ETAPA 2D: EQUIPE MULTIDISCIPLINAR (BASE_ATIVOS)
          ========================================================================= */}
      {activeEtapa === '2D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">2D. Formação da Equipe Multidisciplinar</h3>
              <p className="text-xs text-slate-500 mt-0.5">Membros envolvidos na investigação da causa raiz e validação das contramedidas</p>
            </div>
            <span className="font-mono text-slate-500 font-semibold">{participantesList.length} membro(s) cadastrado(s)</span>
          </div>

          {/* Adicionar Colaborador de BASE_ATIVOS */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Adicionar Membro da BASE_ATIVOS:</label>
              <select
                id="select-ativo-2d"
                className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-white"
                onChange={e => {
                  if (e.target.value) {
                    handleAddParticipante(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Clique para selecionar um colaborador...</option>
                {baseAtivos.map(a => (
                  <option key={a.numPessoal} value={a.nome}>{a.nome} — {a.posicao} ({a.unidadeOrg})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista de Membros Atuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {participantesList.length === 0 ? (
              <p className="col-span-full text-slate-400 italic text-center py-6">Nenhum participante adicionado à equipe ainda.</p>
            ) : (
              participantesList.map((nome, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0b5796] flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                      {nome.charAt(0)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-800 truncate" title={nome}>{nome}</span>
                      <span className="text-[10px] text-slate-400">Membro Multidisciplinar</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipante(nome)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Remover da equipe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('1D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 1D</button>
            <button type="button" onClick={() => setActiveEtapa('3D')} className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5">
              <span>Avançar para 3D (Contenção &amp; Lotes)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 3D: CONTENÇÃO IMEDIATA & RASTREABILIDADE DE LOTES (3D)
          ========================================================================= */}
      {activeEtapa === '3D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">3D. Ações de Contenção Imediata &amp; Rastreabilidade</h3>
              <p className="text-xs text-slate-500 mt-0.5">Segregação física de estoques suspeitos e ações de contenção fabril imediata</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormAcao({
                    tipo_acao: 'CONTENÇÃO',
                    contra_medida: '',
                    causa: 'Bloqueio e contenção de produto não conforme',
                    data_acompanhamento: new Date().toISOString().split('T')[0],
                    data_planejada: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
                    responsavel_acao: currentUser.nome,
                    email: currentUser.email || '',
                    yokoten: 'SIM',
                    poka_yoke: 'NÃO',
                    evidencia_obrigatoria: 'SIM',
                    validacao_acao: 'SIM',
                    id_programa_acoes: id8d
                  });
                  setModalNovaAcaoOpen(true);
                }}
                className="btn-primary bg-[#0b5796] h-8 px-3.5 text-xs font-semibold gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Ação de Contenção</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('rastreabilidade', { rncId: rnc.id })}
                className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Rastrear SAP</span>
              </button>
            </div>
          </div>

          {/* 1. SEÇÃO DE AÇÕES DE CONTENÇÃO (3D) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Ações de Contenção Cadastradas ({acoes3D.length}):
              </span>
              <span className="text-[11px] text-slate-500">Exigência D3 da metodologia 8D</span>
            </div>

            {acoes3D.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                Nenhuma ação de contenção cadastrada no plano do 8D. Clique em &quot;Nova Ação de Contenção&quot; para registrar.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {acoes3D.map(a => (
                  <div key={a.id} className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          CONTENÇÃO 3D
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-500">Prazo: {formatDateBR(a.data_planejada)}</span>
                      </div>
                      <p className="font-semibold text-slate-900 leading-snug">{a.contra_medida}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Responsável: <strong>{a.responsavel_acao}</strong>
                        {a.comentarios_evidencia && ` • Evidência: ${a.comentarios_evidencia}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === 'Validado' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        a.status === 'Concluído' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-blue-50 text-[#0b5796] border border-blue-200'
                      }`}>
                        {a.status}
                      </span>

                      {a.status !== 'Validado' && a.status !== 'Concluído' && (
                        <button
                          type="button"
                          onClick={() => setModalConcluirAcao(a)}
                          className="btn-secondary h-7 px-2.5 text-[11px] font-semibold gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                        >
                          <Check className="w-3 h-3" />
                          <span>Concluir</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setModalValidarAcao(a);
                          setFormValidacao({ status: 'Validado', comentarios: a.comentarios_validacao || '', motivoRevisao: '' });
                        }}
                        className="btn-secondary h-7 px-2 text-[11px] font-semibold text-slate-600"
                      >
                        Auditar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. SEÇÃO DE RASTREABILIDADE SAP & BLOQUEIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            {/* Lotes SAP */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-sky-600" />
                Lotes SAP Rastreados ({lotesSAP.length})
              </span>
              {lotesSAP.length === 0 ? (
                <p className="text-slate-400 italic">Nenhum lote SAP registrado para esta RNC.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {lotesSAP.map((l, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between font-mono text-[11px]">
                      <span>Lote: <strong>{l.lote}</strong> ({l.produto})</span>
                      <span className="font-bold text-slate-700">{l.qtd} pçs</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Etiquetas Vivas */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Etiquetas Vivas &amp; Bloqueio de Depósito ({etiquetasVivas.length})
              </span>
              {etiquetasVivas.length === 0 ? (
                <p className="text-slate-400 italic">Nenhuma etiqueta viva bloqueada no momento.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {etiquetasVivas.map((e, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 flex justify-between font-mono text-[11px]">
                      <span>Depósito: <strong>{e.deposito}</strong></span>
                      <span className="font-bold text-rose-700 uppercase">{e.statusBloqueio}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('2D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 2D</button>
            <button type="button" onClick={() => setActiveEtapa('4D')} className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5">
              <span>Avançar para 4D (Causa Raiz &amp; 5PQ)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 4D: ANÁLISE DE CAUSA RAIZ (ISHIKAWA 6M & 5 PORQUÊS)
          ========================================================================= */}
      {activeEtapa === '4D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4 text-xs">

          {/* Header da Etapa 4D com Alternador de Sub-Abas e Botão Nova Causa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">4D. Análise de Causa Raiz &amp; 5 Porquês</h3>
                {meta.revisado_4d && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    4D Revisado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hipóteses nos 6M, descarte de hipóteses OK e aprofundamento das hipóteses NG
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSubAba4D('ishikawa')}
                  className={`px-3 py-1 rounded-lg transition ${subAba4D === 'ishikawa' ? 'bg-white text-[#0b5796] shadow-2xs font-bold' : 'text-slate-600'}`}
                >
                  Ishikawa (6M)
                </button>
                <button
                  type="button"
                  onClick={() => setSubAba4D('5pq')}
                  className={`px-3 py-1 rounded-lg transition ${subAba4D === '5pq' ? 'bg-white text-[#0b5796] shadow-2xs font-bold' : 'text-slate-600'}`}
                >
                  5 Porquês
                </button>
                <button
                  type="button"
                  onClick={() => setSubAba4D('henkaten')}
                  className={`px-3 py-1 rounded-lg transition ${subAba4D === 'henkaten' ? 'bg-white text-[#0b5796] shadow-2xs font-bold' : 'text-slate-600'}`}
                >
                  Henkaten
                </button>
                <button
                  type="button"
                  onClick={() => setSubAba4D('gemba')}
                  className={`px-3 py-1 rounded-lg transition ${subAba4D === 'gemba' ? 'bg-white text-[#0b5796] shadow-2xs font-bold' : 'text-slate-600'}`}
                >
                  Gemba
                </button>
              </div>

              {subAba4D === 'ishikawa' && (
                <button
                  type="button"
                  onClick={() => setModalNovaCausaOpen(true)}
                  className="btn-primary bg-[#0b5796] h-8 px-3 text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Hipótese 6M</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-ABA 1: ISHIKAWA 6M */}
          {subAba4D === 'ishikawa' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ISHIKAWA_MS.map(m => {
                const mCauses = causes.filter(c => c.seisms === m);
                return (
                  <div key={m} className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <span className="font-bold text-slate-800 text-xs">{m}</span>
                      <span className="text-[10px] font-mono text-slate-500">{mCauses.length} hipótese(s)</span>
                    </div>

                    <div className="flex flex-col gap-2 min-h-[90px]">
                      {mCauses.length === 0 ? (
                        <p className="text-slate-400 italic text-[11px] py-4 text-center">Nenhuma causa registrada neste M.</p>
                      ) : (
                        mCauses.map(c => (
                          <div key={c.id} className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5 shadow-2xs">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">{c.ocnd}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleCausaStatus(c.id, c.okng)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                  c.okng === 'NG' ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                }`}
                              >
                                {c.okng === 'NG' ? 'NG (Causa Provável)' : 'OK (Descartada)'}
                              </button>
                            </div>
                            <p className="font-semibold text-slate-800 text-xs">{c.descricao_causa}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SUB-ABA 2: 5 PORQUÊS */}
          {subAba4D === '5pq' && (
            <div className="flex flex-col gap-4">
              <span className="font-bold text-slate-800">Hipóteses Classificadas como &quot;NG&quot; (Causas Prováveis):</span>
              {causes.filter(c => c.okng === 'NG').length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                  Nenhuma causa classificada como &quot;NG&quot; ainda no Ishikawa. Marque hipóteses como NG para aprofundar nos 5 Porquês.
                </div>
              ) : (
                causes.filter(c => c.okng === 'NG').map(c => (
                  <div key={c.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <span className="text-[11px] font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {c.seisms} • NG
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{c.descricao_causa}</h4>
                      </div>

                      {/* BOTÃO DE 1 CLIQUE */}
                      <button
                        type="button"
                        onClick={() => handleGerarAcao5DCom5PQ(c)}
                        className="btn-primary bg-emerald-700 hover:bg-emerald-800 text-white h-8 px-3 text-xs font-bold gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Ação Corretiva no 5D</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                      {[
                        { num: '1º', text: c.umpq || 'Identificado desvio inicial' },
                        { num: '2º', text: c.doispq || 'Desvio nos parâmetros operacionais' },
                        { num: '3º', text: c.trespq || 'Falha mecânica/elétrica' },
                        { num: '4º', text: c.quatropq || 'Degradação sem aviso prévio' },
                        { num: '5º (Raiz)', text: c.cincopq || 'Procedimento preventivo insuficiente' }
                      ].map((pq, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1">
                          <span className="font-bold text-[#0b5796] text-[11px]">{pq.num} Porquê:</span>
                          <p className="text-slate-800 text-[11px] leading-snug">{pq.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUB-ABA 3: HENKATEN */}
          {subAba4D === 'henkaten' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">Pontos de Mudança nos 6M (Henkaten):</span>
                <span className="text-[11px] text-slate-500">Mapeamento de desvios e alterações nas 24h anteriores</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { m: 'Máquina', flag: henkaten?.maqhkt || 'Não', obs: henkaten?.maq_comentarios || 'Sem alteração de parâmetros' },
                  { m: 'Mão de Obra', flag: henkaten?.mohkt || 'Não', obs: henkaten?.mo_comentarios || 'Operador qualificado em posto' },
                  { m: 'Método', flag: henkaten?.methkt || 'Não', obs: henkaten?.met_comentarios || 'Folha de processo padrão' },
                  { m: 'Material', flag: henkaten?.mathkt || 'Não', obs: henkaten?.mat_comentarios || 'Matéria-prima de lote certificado' },
                  { m: 'Medição', flag: henkaten?.medhkt || 'Não', obs: henkaten?.med_comentarios || 'Dispositivo calibrado e verificado' },
                  { m: 'Meio Ambiente', flag: henkaten?.mambhkt || 'Não', obs: henkaten?.mamb_comentarios || 'Condições ambientais nominais' }
                ].map(h => (
                  <div key={h.m} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{h.m}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.flag === 'Sim' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        Houve Mudança: {h.flag}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">{h.obs}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-ABA 4: GEMBA */}
          {subAba4D === 'gemba' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Avaliação Gemba (Chão de Fábrica):</span>
                <p className="text-slate-700">{entrevista?.gemba || 'Inspeção direta no posto durante ciclo de operação real.'}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Entrevistas com Operadores:</span>
                <p className="text-slate-700">{entrevista?.entrevista || 'Operador relatou que o desvio ocorreu após parada para almoço.'}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Simulação do Defeito:</span>
                <p className="text-slate-700">{entrevista?.simulacao || 'Reproduzido desvio ao forçar chapa no batente desalinhado.'}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Rastreabilidade Gemba:</span>
                <p className="text-slate-700">{entrevista?.rastreabilidade || 'Lotes de peças brutas conferidos no sistema.'}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('3D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 3D</button>
            <button type="button" onClick={() => setActiveEtapa('5D')} className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5">
              <span>Avançar para 5D (Ações Corretivas)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 5D: AÇÕES CORRETIVAS DEFINITIVAS
          ========================================================================= */}
      {activeEtapa === '5D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">5D. Ações Corretivas Definitivas</h3>
              <p className="text-xs text-slate-500 mt-0.5">Contramedidas focadas na eliminação da causa raiz identificada no 5º Porquê</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormAcao({
                  tipo_acao: 'CORRETIVA',
                  contra_medida: '',
                  causa: '',
                  data_acompanhamento: new Date().toISOString().split('T')[0],
                  data_planejada: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                  responsavel_acao: currentUser.nome,
                  email: currentUser.email || '',
                  yokoten: 'SIM',
                  poka_yoke: 'SIM',
                  evidencia_obrigatoria: 'SIM',
                  validacao_acao: 'SIM',
                  id_programa_acoes: id8d
                });
                setModalNovaAcaoOpen(true);
              }}
              className="btn-primary bg-[#0b5796] h-8 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Ação Corretiva</span>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {acoes5D.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                Nenhuma ação corretiva cadastrada ainda. Utilize o botão &quot;Gerar Ação Corretiva no 5D&quot; no 4D ou clique em &quot;Nova Ação Corretiva&quot;.
              </div>
            ) : (
              acoes5D.map(a => (
                <div key={a.id} className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                        AÇÃO CORRETIVA (5D)
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">Prazo: {formatDateBR(a.data_planejada)}</span>
                    </div>
                    {a.causa && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mb-1 inline-block">
                        <strong>Causa Raiz:</strong> {a.causa}
                      </p>
                    )}
                    <p className="font-semibold text-slate-900 leading-snug">{a.contra_medida}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Responsável: <strong>{a.responsavel_acao}</strong>
                      {a.comentarios_evidencia && ` • Evidência: ${a.comentarios_evidencia}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.status === 'Validado' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      a.status === 'Concluído' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-blue-50 text-[#0b5796] border border-blue-200'
                    }`}>
                      {a.status}
                    </span>

                    {a.status !== 'Validado' && a.status !== 'Concluído' && (
                      <button
                        type="button"
                        onClick={() => setModalConcluirAcao(a)}
                        className="btn-secondary h-7 px-2.5 text-[11px] font-semibold gap-1 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                      >
                        <Check className="w-3 h-3" />
                        <span>Concluir</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setModalValidarAcao(a);
                        setFormValidacao({ status: 'Validado', comentarios: a.comentarios_validacao || '', motivoRevisao: '' });
                      }}
                      className="btn-secondary h-7 px-2 text-[11px] font-semibold text-slate-600"
                    >
                      Auditar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('4D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 4D</button>
            <button type="button" onClick={() => setActiveEtapa('6D')} className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5">
              <span>Avançar para 6D (Abrangência &amp; Poka-Yoke)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 6D: ABRANGÊNCIA (YOKOTEN) & POKA-YOKE
          ========================================================================= */}
      {activeEtapa === '6D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">6D. Abrangência (Yokoten) &amp; Dispositivos Poka-Yoke</h3>
              <p className="text-xs text-slate-500 mt-0.5">Replicação da solução em processos análogos e sistemas à prova de falha</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormAcao({
                  tipo_acao: 'CORRETIVA',
                  contra_medida: '',
                  causa: 'Abrangência Yokoten / Poka-Yoke',
                  data_acompanhamento: new Date().toISOString().split('T')[0],
                  data_planejada: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                  responsavel_acao: currentUser.nome,
                  email: currentUser.email || '',
                  yokoten: 'SIM',
                  poka_yoke: 'SIM',
                  evidencia_obrigatoria: 'SIM',
                  validacao_acao: 'SIM',
                  id_programa_acoes: id8d
                });
                setModalNovaAcaoOpen(true);
              }}
              className="btn-primary bg-[#0b5796] h-8 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Ação Abrangência</span>
            </button>
          </div>

          {/* 1. FORMULÁRIO DE DIRETRIZES DE QUALIDADE (YOKOTEN & POKA-YOKE) */}
          <form onSubmit={handleSaveDiretrizes6D} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-purple-600" />
                Diretrizes de Qualidade do 6D:
              </span>
              <button
                type="submit"
                className="btn-primary bg-[#0b5796] h-7 px-3 text-[11px] font-semibold gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Salvar Diretrizes 6D</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Abrangência (Yokoten)?</span>
                  <select
                    value={diretrizes6D.yokoten}
                    onChange={e => setDiretrizes6D({ ...diretrizes6D, yokoten: e.target.value })}
                    className="form-select text-xs py-1 px-2 border-slate-200 rounded"
                  >
                    <option value="SIM">Sim</option>
                    <option value="NÃO">Não</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={diretrizes6D.diretriz_yokoten}
                  onChange={e => setDiretrizes6D({ ...diretrizes6D, diretriz_yokoten: e.target.value })}
                  placeholder="Descreva as linhas ou peças onde a contramedida será replicada..."
                  className="form-input text-xs py-1.5 px-2.5 border-slate-200 rounded bg-slate-50"
                />
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Dispositivo Poka-Yoke?</span>
                  <select
                    value={diretrizes6D.poka_yoke}
                    onChange={e => setDiretrizes6D({ ...diretrizes6D, poka_yoke: e.target.value })}
                    className="form-select text-xs py-1 px-2 border-slate-200 rounded"
                  >
                    <option value="SIM">Sim</option>
                    <option value="NÃO">Não</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={diretrizes6D.diretriz_pokayoke}
                  onChange={e => setDiretrizes6D({ ...diretrizes6D, diretriz_pokayoke: e.target.value })}
                  placeholder="Descreva o sensor ou dispositivo à prova de falha..."
                  className="form-input text-xs py-1.5 px-2.5 border-slate-200 rounded bg-slate-50"
                />
              </div>
            </div>
          </form>

          {/* 2. LISTA DE AÇÕES DE ABRANGÊNCIA / POKA-YOKE */}
          <div className="flex flex-col gap-2.5">
            <span className="font-bold text-slate-900">Ações Vinculadas com Abrangência ou Poka-Yoke ({acoes6D.length}):</span>
            {acoes6D.length === 0 ? (
              <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-slate-200">
                Nenhuma ação com abrangência ou poka-yoke cadastrada.
              </p>
            ) : (
              acoes6D.map(a => (
                <div key={a.id} className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {a.yokoten === 'SIM' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          YOKOTEN
                        </span>
                      )}
                      {a.poka_yoke === 'SIM' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          POKA-YOKE
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">{a.contra_medida}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Resp: {a.responsavel_acao} • Prazo: {formatDateBR(a.data_planejada)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {a.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setModalValidarAcao(a);
                        setFormValidacao({ status: 'Validado', comentarios: a.comentarios_validacao || '', motivoRevisao: '' });
                      }}
                      className="btn-secondary h-7 px-2 text-[11px] font-semibold text-slate-600"
                    >
                      Auditar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('5D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 5D</button>
            <button type="button" onClick={() => setActiveEtapa('7D')} className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5">
              <span>Avançar para 7D (Prevenção &amp; Lições)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 7D: AÇÕES PREVENTIVAS & LIÇÕES APRENDIDAS (3 EIXOS OBRIGATÓRIOS IATF)
          ========================================================================= */}
      {activeEtapa === '7D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">7D. Prevenção de Reincidência (3 Eixos Obrigatórios IATF)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Atualização sistemática do FMEA, Trabalho Padronizado (SOS) e Auditoria Escalonada (LPA)</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormAcao({
                  tipo_acao: 'PREVENTIVA',
                  contra_medida: '',
                  causa: 'Prevenção de reincidência sistêmica',
                  oData_8d_7d: 'FMEA',
                  data_acompanhamento: new Date().toISOString().split('T')[0],
                  data_planejada: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
                  responsavel_acao: currentUser.nome,
                  email: currentUser.email || '',
                  yokoten: 'SIM',
                  poka_yoke: 'NÃO',
                  evidencia_obrigatoria: 'SIM',
                  validacao_acao: 'SIM',
                  id_programa_acoes: id8d
                });
                setModalNovaAcaoOpen(true);
              }}
              className="btn-primary bg-[#0b5796] h-8 px-3.5 text-xs font-semibold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Ação Preventiva (7D)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {[
              {
                eixo: 'FMEA',
                titulo: '1. Atualização FMEA',
                descricao: 'Revisão da severidade, ocorrência e detecção na matriz de riscos'
              },
              {
                eixo: 'Trabalho Padronizado',
                titulo: '2. Trabalho Padronizado',
                descricao: 'Atualização das folhas de instrução operacional, SOS e procedimentos'
              },
              {
                eixo: 'Auditoria Escalonada',
                titulo: '3. Auditoria Escalonada (LPA)',
                descricao: 'Inclusão de pontos de checagem na rota de auditoria da liderança'
              }
            ].map(col => {
              const eixoActions = acoes7D.filter(a => a.oData_8d_7d === col.eixo);

              return (
                <div key={col.eixo} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900">{col.titulo}</span>
                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.2 rounded border">
                      {eixoActions.length} ação(ões)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-1">{col.descricao}</p>

                  <div className="flex flex-col gap-2 min-h-[90px]">
                    {eixoActions.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px] py-4 text-center">Nenhuma ação cadastrada para este eixo.</span>
                    ) : (
                      eixoActions.map(a => (
                        <div key={a.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] flex flex-col gap-1 shadow-2xs">
                          <p className="font-semibold text-slate-800 leading-snug">{a.contra_medida}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                            <span>{a.responsavel_acao}</span>
                            <span className="font-bold text-blue-700">{a.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('6D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 6D</button>
            <button type="button" onClick={() => setActiveEtapa('8D')} className="btn-primary bg-[#0b5796] h-8 px-4 text-xs font-semibold gap-1.5">
              <span>Avançar para 8D (Homologação &amp; Fechamento)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 8D: VALIDAÇÃO DAS AÇÕES & APROVAÇÃO FINAL DO 8D
          ========================================================================= */}
      {activeEtapa === '8D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">8D. Validação Técnica &amp; Homologação Final</h3>
              <p className="text-xs text-slate-500 mt-0.5">Auditoria individual das ações e parecer formal de encerramento do 8D</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
              className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Dossiê 8D</span>
            </button>
          </div>

          {/* 1. Tabela de Validação de Todas as Ações */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-slate-900 text-xs">1. Auditoria e Validação Individual das Ações ({allActions.length}):</span>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Disciplina / Tipo</th>
                    <th className="py-2.5 px-3">Contramedida</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allActions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">Nenhuma ação cadastrada para validar.</td>
                    </tr>
                  ) : (
                    allActions.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {a.tipo_acao}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[260px] truncate" title={a.contra_medida}>{a.contra_medida}</td>
                        <td className="py-2.5 px-3">{a.responsavel_acao}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.status === 'Validado' ? 'bg-emerald-50 text-emerald-800' :
                            a.status === 'Concluído' ? 'bg-amber-50 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setModalValidarAcao(a);
                              setFormValidacao({ status: 'Validado', comentarios: a.comentarios_validacao || '', motivoRevisao: '' });
                            }}
                            className="btn-secondary h-6 px-2 text-[11px] font-semibold"
                          >
                            Auditar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Parecer Final de Homologação */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
            <span className="font-bold text-slate-900">2. Homologação Geral do Ciclo 8D:</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSaveFechamento8D('Aprovado', 'Todas as contramedidas foram validadas e demonstraram eficácia.')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  meta.validar_8d === 'Aprovado' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar 8D Integral</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveFechamento8D('Em Andamento', 'Em processo de monitoramento de eficácia pós-implementação.')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  meta.validar_8d === 'Em Andamento' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Manter Em Andamento</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveFechamento8D('Reprovado', 'Pendências identificadas nas contramedidas ou reincidência.')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  meta.validar_8d === 'Reprovado' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Solicitar Revisão</span>
              </button>
            </div>

            {meta.comentarios_validacao && (
              <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 mt-1">
                <strong>Parecer Vigente:</strong> {meta.comentarios_validacao}
              </p>
            )}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setActiveEtapa('7D')} className="btn-secondary h-8 px-3 text-xs">Voltar para 7D</button>
            <button
              type="button"
              onClick={() => onNavigate('repositorio-8d')}
              className="btn-secondary h-8 px-4 text-xs font-semibold gap-1.5 text-[#0b5796] border-blue-200 hover:bg-blue-50"
            >
              <span>Ver no Repositório 8D</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAIS: NOVA CAUSA ISHIKAWA (4D)
          ========================================================================= */}
      {modalNovaCausaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900">Adicionar Causa no Ishikawa (6M)</h3>
              <button
                type="button"
                onClick={() => setModalNovaCausaOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCausa} className="p-5 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Qual M pertence? *</label>
                  <select
                    value={formCausa.seisms}
                    onChange={e => setFormCausa({ ...formCausa, seisms: e.target.value as IshikawaM })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    {ISHIKAWA_MS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Eixo *</label>
                  <select
                    value={formCausa.ocnd}
                    onChange={e => setFormCausa({ ...formCausa, ocnd: e.target.value as any })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="Ocorrência">Ocorrência (Por que ocorreu?)</option>
                    <option value="Não Detecção">Não Detecção (Por que passou?)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição da Hipótese de Causa *</label>
                <textarea
                  rows={2}
                  value={formCausa.descricao_causa}
                  onChange={e => setFormCausa({ ...formCausa, descricao_causa: e.target.value })}
                  placeholder="Ex: Desgaste mecânico na bucha do grampo de fixação do dispositivo..."
                  className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Classificação Inicial da Hipótese *</label>
                <select
                  value={formCausa.okng}
                  onChange={e => setFormCausa({ ...formCausa, okng: e.target.value as any })}
                  className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50 font-bold"
                >
                  <option value="NG">NG (Causa Provável / Aprofundar nos 5PQ)</option>
                  <option value="OK">OK (Hipótese Descartada / Não gerou defeito)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovaCausaOpen(false)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white"
                >
                  Salvar Causa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAIS: NOVA AÇÃO (3D, 5D, 6D, 7D)
          ========================================================================= */}
      {modalNovaAcaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Nova Ação no Plano 8D ({formAcao.tipo_acao})
              </h3>
              <button
                type="button"
                onClick={() => setModalNovaAcaoOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAcao} className="p-5 flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Ação *</label>
                  <select
                    value={formAcao.tipo_acao}
                    onChange={e => setFormAcao({ ...formAcao, tipo_acao: e.target.value as ActionItemType })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50 font-bold"
                  >
                    <option value="CONTENÇÃO">CONTENÇÃO (3D)</option>
                    <option value="CORRETIVA">CORRETIVA (5D)</option>
                    <option value="PREVENTIVA">PREVENTIVA (7D)</option>
                    <option value="MELHORIA">MELHORIA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Eixo 7D (se preventiva)</label>
                  <select
                    value={formAcao.oData_8d_7d || ''}
                    onChange={e => setFormAcao({ ...formAcao, oData_8d_7d: (e.target.value || undefined) as any })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="">Nenhum / Não aplicável</option>
                    <option value="FMEA">FMEA</option>
                    <option value="Trabalho Padronizado">Trabalho Padronizado</option>
                    <option value="Auditoria Escalonada">Auditoria Escalonada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Causa Raiz / Origem 5PQ</label>
                <input
                  type="text"
                  value={formAcao.causa || ''}
                  onChange={e => setFormAcao({ ...formAcao, causa: e.target.value })}
                  placeholder="Causa raiz vinculada..."
                  className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição da Contramedida / O que fazer *</label>
                <textarea
                  rows={2}
                  value={formAcao.contra_medida}
                  onChange={e => setFormAcao({ ...formAcao, contra_medida: e.target.value })}
                  placeholder="Descreva com clareza o que será executado..."
                  className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsável *</label>
                  <select
                    value={formAcao.responsavel_acao}
                    onChange={e => setFormAcao({ ...formAcao, responsavel_acao: e.target.value })}
                    className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  >
                    {baseAtivos.map(a => (
                      <option key={a.numPessoal} value={a.nome}>{a.nome} ({a.posicao})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prazo Planejado *</label>
                  <input
                    type="date"
                    value={formAcao.data_planejada}
                    onChange={e => setFormAcao({ ...formAcao, data_planejada: e.target.value })}
                    className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Yokoten (Abrangência)?</label>
                  <select
                    value={formAcao.yokoten}
                    onChange={e => setFormAcao({ ...formAcao, yokoten: e.target.value as any })}
                    className="form-select w-full text-xs py-1.5 px-2.5 border-slate-200 rounded-lg bg-white"
                  >
                    <option value="SIM">Sim</option>
                    <option value="NÃO">Não</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Poka-Yoke?</label>
                  <select
                    value={formAcao.poka_yoke}
                    onChange={e => setFormAcao({ ...formAcao, poka_yoke: e.target.value as any })}
                    className="form-select w-full text-xs py-1.5 px-2.5 border-slate-200 rounded-lg bg-white"
                  >
                    <option value="SIM">Sim</option>
                    <option value="NÃO">Não</option>
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

      {/* MODAL: CONCLUIR AÇÃO */}
      {modalConcluirAcao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900">Registrar Conclusão de Ação</h3>
              <button
                type="button"
                onClick={() => setModalConcluirAcao(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmConclusao} className="p-5 flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Ação:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{modalConcluirAcao.contra_medida}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Efetiva de Conclusão *</label>
                <input
                  type="date"
                  value={formConclusao.dataConclusao}
                  onChange={e => setFormConclusao({ ...formConclusao, dataConclusao: e.target.value })}
                  className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidências e Comprovação da Execução *</label>
                <textarea
                  rows={3}
                  value={formConclusao.comentarios}
                  onChange={e => setFormConclusao({ ...formConclusao, comentarios: e.target.value })}
                  placeholder="Descreva o que foi alterado, parâmetros travados ou ensaios..."
                  className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-slate-50 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalConcluirAcao(null)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Concluir Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDITAR / VALIDAR AÇÃO */}
      {modalValidarAcao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900">Auditoria de Ação pela Qualidade</h3>
              <button
                type="button"
                onClick={() => setModalValidarAcao(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmValidacao} className="p-5 flex flex-col gap-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Ação:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{modalValidarAcao.contra_medida}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Parecer da Auditoria *</label>
                <select
                  value={formValidacao.status}
                  onChange={e => setFormValidacao({ ...formValidacao, status: e.target.value as any })}
                  className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50 font-bold"
                >
                  <option value="Validado">Aprovar e Homologar Ação (Validado)</option>
                  <option value="Aberto">Reprovar / Solicitar Ajuste (Retornar para Aberto)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Comentários da Validação</label>
                <textarea
                  rows={2}
                  value={formValidacao.comentarios}
                  onChange={e => setFormValidacao({ ...formValidacao, comentarios: e.target.value })}
                  placeholder="Parecer técnico ou constatações da auditoria..."
                  className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-slate-50 resize-none"
                />
              </div>

              {formValidacao.status !== 'Validado' && (
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">Motivo da Reprovação / O que revisar *</label>
                  <textarea
                    rows={2}
                    value={formValidacao.motivoRevisao}
                    onChange={e => setFormValidacao({ ...formValidacao, motivoRevisao: e.target.value })}
                    placeholder="Instrua o responsável sobre o que deve ser complementado..."
                    className="form-input w-full text-xs p-2.5 border-rose-200 rounded-lg bg-rose-50/50 resize-none"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalValidarAcao(null)}
                  className="btn-secondary h-8 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary h-8 px-4 text-xs font-semibold bg-[#0b5796] text-white"
                >
                  Confirmar Auditoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ZOOM DE IMAGEM */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">{zoomImage.title}</span>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[80vh]">
              <img
                src={zoomImage.src}
                alt={zoomImage.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* RODAPÉ DE NAVEGAÇÃO SEQUENCIAL COM TRAVAS (Power Apps 8D Standard) */}
      <div className="card-saas p-3 sm:p-4 border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-3 z-20">
        <div className="flex items-center gap-2">
          {activeEtapa !== '1D' ? (
            <button
              type="button"
              onClick={() => {
                const etapas: Etapa8D[] = ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D'];
                const idx = etapas.indexOf(activeEtapa);
                if (idx > 0) setActiveEtapa(etapas[idx - 1]);
              }}
              className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Etapa Anterior</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-medium italic">Primeira etapa (1D)</span>
          )}
        </div>

        {/* Indicador de Status da Etapa Atual */}
        <div className="flex items-center gap-2 text-xs">
          {isEtapaConcluida(activeEtapa) ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{activeEtapa} Preenchida &amp; Conforme</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{activeEtapa} Pendente de Preenchimento</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeEtapa !== '8D' ? (
            (() => {
              const etapas: Etapa8D[] = ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D'];
              const idx = etapas.indexOf(activeEtapa);
              const proxima = etapas[idx + 1];
              const checkProxima = isEtapaLiberada(proxima);

              return (
                <button
                  type="button"
                  onClick={() => handleTentarNavegarEtapa(proxima)}
                  disabled={!checkProxima.liberada}
                  className={`h-8 px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-xs ${
                    checkProxima.liberada
                      ? 'bg-[#0b5796] hover:bg-[#09477d] text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-75'
                  }`}
                  title={checkProxima.liberada ? `Avançar para ${proxima}` : checkProxima.motivo}
                >
                  {!checkProxima.liberada && <Lock className="w-3.5 h-3.5 mr-0.5" />}
                  <span>Avançar para {proxima}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              );
            })()
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              Etapa Final (8D)
            </span>
          )}
        </div>
      </div>

    </div>
  );
};
