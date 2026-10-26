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
  ChevronLeft,
  Upload,
  Paperclip,
  Search,
  ChevronDown
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
import { tenantService } from '../services/tenantService';
import { formatDateBR, isUserAdminQualidade8D } from '../utils/date';
import { formatOccurrenceId, normalizeDisplayText } from '../utils/formatText';
import { ImageWithFallback } from './ImageWithFallback';

interface Metodologia8DPanelProps {
  rnc: RNCRecord;
  currentUser: UsuarioQualidade;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  onRefreshRnc: () => void;
  initialEtapa?: Etapa8D;
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
  onRefreshRnc,
  initialEtapa
}) => {
  const [activeEtapa, setActiveEtapa] = useState<Etapa8D>(initialEtapa || '1D');
  const [subAba4D, setSubAba4D] = useState<'gemba' | 'henkaten' | 'ishikawa' | '5pq'>('gemba');
  const [refreshKey, setRefreshKey] = useState(0);
  const isAdminQualidade = useMemo(() => isUserAdminQualidade8D(currentUser), [currentUser]);

  const dynamicIshikawaMs = useMemo(() => {
    const resolved = tenantService.getFieldResolvedOptions('oitod_6m_ishikawa', 'oitod', 'oitod_6m_ishikawa');
    const opts = resolved.options.map(m => m.label as IshikawaM);
    return opts.length > 0 ? opts : ISHIKAWA_MS;
  }, [refreshKey]);

  const dynamicTiposAcao = useMemo(() => {
    const resolved = tenantService.getFieldResolvedOptions('oitod_tipo_acao', 'oitod', 'oitod_tipos_acao');
    return resolved.options.length > 0
      ? resolved.options.map(m => ({
          value: m.value.toUpperCase(),
          label: `${m.label}${m.rawItem.codigo && m.label !== m.rawItem.codigo ? ` (${m.rawItem.codigo})` : ''}`
        }))
      : [
          { value: 'CONTENÇÃO', label: 'CONTENÇÃO (3D)' },
          { value: 'CORRETIVA', label: 'CORRETIVA (5D / 6D)' },
          { value: 'PREVENTIVA', label: 'PREVENTIVA (7D)' },
          { value: 'MELHORIA', label: 'MELHORIA' }
        ];
  }, [refreshKey]);

  const dynamicDocs7D = useMemo(() => {
    const resolved = tenantService.getFieldResolvedOptions('oitod_documento_7d', 'oitod', 'oitod_documentos_7d');
    const opts = resolved.options.map(m => m.label);
    return opts.length > 0 ? opts : ['FMEA', 'Trabalho Padronizado', 'Auditoria Escalonada'];
  }, [refreshKey]);

  useEffect(() => {
    if (initialEtapa) {
      setActiveEtapa(initialEtapa);
    }
  }, [initialEtapa]);

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
    etapa_8d: '5D',
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

  const [formConclusao, setFormConclusao] = useState<{
    dataConclusao: string;
    comentarios: string;
    anexos: { name: string; url: string; type: string }[];
  }>({
    dataConclusao: new Date().toISOString().split('T')[0],
    comentarios: '',
    anexos: []
  });

  // Estado do Formulário de Rastreabilidade e Contenção de Lotes (3D)
  const pecaAutomatica = useMemo(
    () => normalizeDisplayText(rnc.produto || rnc.componente || 'Peça da Ocorrência'),
    [rnc.produto, rnc.componente]
  );

  const [formLote3D, setFormLote3D] = useState({
    lote: '',
    estoque: '',
    qtdVerificada: '',
    qtdNg: '0'
  });

  const qtdVerificadaNum3D = Math.max(0, Number(formLote3D.qtdVerificada) || 0);
  const qtdNgNum3D = Math.min(qtdVerificadaNum3D, Math.max(0, Number(formLote3D.qtdNg) || 0));
  const qtdOkCalc3D = Math.max(0, qtdVerificadaNum3D - qtdNgNum3D);

  const handleEvidenciaFiles8D = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemoveAnexo8D = (index: number) => {
    setFormConclusao(prev => ({
      ...prev,
      anexos: prev.anexos.filter((_, i) => i !== index)
    }));
  };

  const [formValidacao, setFormValidacao] = useState<{
    status: 'Validado' | 'Aberto' | 'Atrasado';
    comentarios: string;
    motivoRevisao: string;
  }>({
    status: 'Validado',
    comentarios: '',
    motivoRevisao: ''
  });

  // Estados de Aprovação Final e Solicitação de Revisão do 8D (4D, 5D, 6D, 7D)
  const [modalAprovar8DOpen, setModalAprovar8DOpen] = useState(false);
  const [modalSolicitarRevisaoOpen, setModalSolicitarRevisaoOpen] = useState(false);
  const [formSolicitarRevisao, setFormSolicitarRevisao] = useState<{
    etapas: Record<'4D' | '5D' | '6D' | '7D', boolean>;
    comentario: string;
  }>({
    etapas: { '4D': false, '5D': false, '6D': false, '7D': false },
    comentario: ''
  });
  const [draftComentarioRevisaoD, setDraftComentarioRevisaoD] = useState<
    Record<'4D' | '5D' | '6D' | '7D', string>
  >({
    '4D': '',
    '5D': '',
    '6D': '',
    '7D': ''
  });

  // Metadados do 8D (inicia vazio se não foi preenchido ainda — sem pré-preenchimento falso)
  const meta: EightDMetadata = useMemo(() => {
    return spStore.getEightDMetadata(id8d) || {
      id: 0,
      tenant_id: rnc.tenant_id || '',
      id8d: id8d,
      participantes_8d: '',
      validar_8d: 'Em Andamento',
      diretriz_yokoten: '',
      diretriz_pokayoke: '',
      yokoten_na: false,
      pokayoke_na: false
    };
  }, [id8d, refreshKey, rnc.tenant_id]);

  const [parecerAprovacao8D, setParecerAprovacao8D] = useState<string>('');

  useEffect(() => {
    setDraftComentarioRevisaoD({
      '4D': meta.comentarios_revisao_4d || '',
      '5D': meta.comentarios_revisao_5d || '',
      '6D': meta.comentarios_revisao_6d || '',
      '7D': meta.comentarios_revisao_7d || ''
    });
    setParecerAprovacao8D(
      meta.validar_8d === 'Aprovado' && meta.comentarios_validacao
        ? meta.comentarios_validacao
        : 'Todas as contramedidas do Plano de Ação (3D, 5D, 6D e 7D) foram validadas e demonstraram eficácia.'
    );
  }, [meta, id8d]);

  const causes = useMemo(() => spStore.getIshikawaCauses(id8d), [id8d, refreshKey]);
  const allActions = useMemo(() => spStore.getActionItems({ id_programa_acoes: id8d }), [id8d, refreshKey]);
  const linkedPlanHeader = useMemo(() => {
    const plans = spStore.getActionPlans({ idprograma: id8d });
    return plans[0];
  }, [id8d, refreshKey, allActions.length]);
  const baseAtivos = useMemo(() => spStore.getBaseAtivos(), []);
  const [searchParticipante2D, setSearchParticipante2D] = useState('');
  const [dropdown2DOpen, setDropdown2DOpen] = useState(false);

  const filteredAtivos2D = useMemo(() => {
    const q = searchParticipante2D.trim().toLowerCase();
    if (!q) return baseAtivos;
    return baseAtivos.filter(
      a =>
        a.nome.toLowerCase().includes(q) ||
        a.posicao.toLowerCase().includes(q) ||
        a.unidadeOrg.toLowerCase().includes(q) ||
        String(a.numPessoal).includes(q)
    );
  }, [baseAtivos, searchParticipante2D]);
  const lotesSAP = useMemo(() => spStore.getLotesSAP(rnc.id), [rnc.id, refreshKey]);
  const henkaten = useMemo(() => spStore.getHenkaten(id8d), [id8d, refreshKey]);
  const entrevista = useMemo(() => spStore.getEntrevista8D(id8d), [id8d, refreshKey]);

  // Estados editáveis para o 4D: Gemba, Henkaten e 5 Porquês
  const [formGemba, setFormGemba] = useState({
    gemba: '',
    entrevista: '',
    simulacao: '',
    rastreabilidade: ''
  });

  const [formHenkaten, setFormHenkaten] = useState<{
    maqhkt: 'Sim' | 'Não';
    maq_comentarios: string;
    mohkt: 'Sim' | 'Não';
    mo_comentarios: string;
    methkt: 'Sim' | 'Não';
    met_comentarios: string;
    mathkt: 'Sim' | 'Não';
    mat_comentarios: string;
    medhkt: 'Sim' | 'Não';
    med_comentarios: string;
    mambhkt: 'Sim' | 'Não';
    mamb_comentarios: string;
  }>({
    maqhkt: 'Não',
    maq_comentarios: '',
    mohkt: 'Não',
    mo_comentarios: '',
    methkt: 'Não',
    met_comentarios: '',
    mathkt: 'Não',
    mat_comentarios: '',
    medhkt: 'Não',
    med_comentarios: '',
    mambhkt: 'Não',
    mamb_comentarios: ''
  });

  const [draft5PQ, setDraft5PQ] = useState<
    Record<
      number,
      {
        umpq: string;
        doispq: string;
        trespq: string;
        quatropq: string;
        cincopq: string;
      }
    >
  >({});

  useEffect(() => {
    setFormGemba({
      gemba: entrevista?.gemba || '',
      entrevista: entrevista?.entrevista || '',
      simulacao: entrevista?.simulacao || '',
      rastreabilidade: entrevista?.rastreabilidade || ''
    });
  }, [entrevista, id8d]);

  useEffect(() => {
    setFormHenkaten({
      maqhkt: henkaten?.maqhkt || 'Não',
      maq_comentarios: henkaten?.maq_comentarios || '',
      mohkt: henkaten?.mohkt || 'Não',
      mo_comentarios: henkaten?.mo_comentarios || '',
      methkt: henkaten?.methkt || 'Não',
      met_comentarios: henkaten?.met_comentarios || '',
      mathkt: henkaten?.mathkt || 'Não',
      mat_comentarios: henkaten?.mat_comentarios || '',
      medhkt: henkaten?.medhkt || 'Não',
      med_comentarios: henkaten?.med_comentarios || '',
      mambhkt: henkaten?.mambhkt || 'Não',
      mamb_comentarios: henkaten?.mamb_comentarios || ''
    });
  }, [henkaten, id8d]);

  useEffect(() => {
    const nextDraft: Record<number, { umpq: string; doispq: string; trespq: string; quatropq: string; cincopq: string }> = {};
    causes.forEach(c => {
      nextDraft[c.id] = {
        umpq: c.umpq || '',
        doispq: c.doispq || '',
        trespq: c.trespq || '',
        quatropq: c.quatropq || '',
        cincopq: c.cincopq || ''
      };
    });
    setDraft5PQ(nextDraft);
  }, [causes]);

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

  // Ações filtradas por disciplina do 8D (vinculadas ao Plano de Ação da Ocorrência)
  const acoes3D = useMemo(
    () => allActions.filter(a => a.etapa_8d === '3D' || (!a.etapa_8d && a.tipo_acao === 'CONTENÇÃO')),
    [allActions]
  );
  const acoes5D = useMemo(
    () =>
      allActions.filter(
        a =>
          a.etapa_8d === '5D' ||
          (!a.etapa_8d && a.tipo_acao === 'CORRETIVA' && a.yokoten !== 'SIM' && a.poka_yoke !== 'SIM')
      ),
    [allActions]
  );
  const acoes6D = useMemo(
    () =>
      allActions.filter(
        a =>
          a.etapa_8d === '6D' ||
          (!a.etapa_8d && a.tipo_acao === 'CORRETIVA' && (a.yokoten === 'SIM' || a.poka_yoke === 'SIM'))
      ),
    [allActions]
  );
  const acoes7D = useMemo(
    () =>
      allActions.filter(
        a => a.etapa_8d === '7D' || (!a.etapa_8d && (a.tipo_acao === 'PREVENTIVA' || Boolean(a.oData_8d_7d)))
      ),
    [allActions]
  );
  const acoesPlano8D = useMemo(
    () => [...acoes3D, ...acoes5D, ...acoes6D, ...acoes7D],
    [acoes3D, acoes5D, acoes6D, acoes7D]
  );

  // Status sequencial das sub-etapas do 4D: Gemba > Henkaten > Ishikawa > 5 Porquês
  // Todos os 4 campos do Gemba são obrigatórios
  const isGembaDone = Boolean(
    entrevista &&
      entrevista.gemba?.trim() &&
      entrevista.entrevista?.trim() &&
      entrevista.simulacao?.trim() &&
      entrevista.rastreabilidade?.trim()
  );
  // Todos os 6M do Henkaten devem estar respondidos e qualquer item marcado como "Sim" precisa ter observação preenchida
  const isHenkatenDone = Boolean(
    henkaten &&
      henkaten.id > 0 &&
      (['maqhkt', 'mohkt', 'methkt', 'mathkt', 'medhkt', 'mambhkt'] as const).every(
        k => henkaten[k] === 'Sim' || henkaten[k] === 'Não'
      ) &&
      (henkaten.maqhkt !== 'Sim' || Boolean(henkaten.maq_comentarios?.trim())) &&
      (henkaten.mohkt !== 'Sim' || Boolean(henkaten.mo_comentarios?.trim())) &&
      (henkaten.methkt !== 'Sim' || Boolean(henkaten.met_comentarios?.trim())) &&
      (henkaten.mathkt !== 'Sim' || Boolean(henkaten.mat_comentarios?.trim())) &&
      (henkaten.medhkt !== 'Sim' || Boolean(henkaten.med_comentarios?.trim())) &&
      (henkaten.mambhkt !== 'Sim' || Boolean(henkaten.mamb_comentarios?.trim()))
  );
  const ngCauses = useMemo(() => causes.filter(c => c.okng === 'NG'), [causes]);
  const isIshikawaDone = causes.length > 0 && ngCauses.length > 0;
  // Todas as hipóteses NG do Ishikawa precisam ter seus 5 Porquês preenchidos e salvos
  const is5PQDone =
    ngCauses.length > 0 &&
    ngCauses.every(c => Boolean(c.umpq && c.umpq.trim().length > 0 && c.cincopq && c.cincopq.trim().length > 0));

  // Lista de causas-raiz preenchidas nos 5 Porquês do 4D para escolha na criação de ação do 5D
  const causasRaiz4D = useMemo(() => {
    return ngCauses
      .map(c => {
        const textoRaiz = (c.cincopq || c.quatropq || c.trespq || c.descricao_causa || '').trim();
        const label = `[${c.seisms}] ${textoRaiz}`;
        return {
          id: c.id,
          seisms: c.seisms,
          hipotese: c.descricao_causa,
          causaRaiz: textoRaiz,
          value: label
        };
      })
      .filter(item => item.causaRaiz.length > 0);
  }, [ngCauses]);

  const handleSelectSubAba4D = (target: 'gemba' | 'henkaten' | 'ishikawa' | '5pq') => {
    if (target === 'gemba') {
      setSubAba4D('gemba');
      return;
    }
    if (target === 'henkaten') {
      if (!isGembaDone) {
        setNotification({
          type: 'error',
          message: 'Sequência 4D: Preencha e salve todos os 4 campos do Gemba antes de avançar para o Henkaten.'
        });
        return;
      }
      setSubAba4D('henkaten');
      return;
    }
    if (target === 'ishikawa') {
      if (!isGembaDone || !isHenkatenDone) {
        setNotification({
          type: 'error',
          message: 'Sequência 4D: Preencha e salve todos os campos do Gemba e do Henkaten antes de preencher o Ishikawa (6M).'
        });
        return;
      }
      setSubAba4D('ishikawa');
      return;
    }
    if (target === '5pq') {
      if (!isGembaDone || !isHenkatenDone || !isIshikawaDone) {
        setNotification({
          type: 'error',
          message: 'Sequência 4D: Preencha Gemba, Henkaten e cadastre ao menos 1 hipótese NG no Ishikawa antes de preencher os 5 Porquês.'
        });
        return;
      }
      setSubAba4D('5pq');
    }
  };

  // =========================================================================
  // VALIDAÇÃO DAS TRAVAS DO 8D (Regra de transição sequencial obrigatória)
  // =========================================================================
  const isEtapaConcluida = (etapa: Etapa8D): boolean => {
    switch (etapa) {
      case '1D':
        return Boolean(rnc.produto && (rnc.modoFalha || rnc.descricaoProblema));
      case '2D':
        // Exige mínimo de 3 participantes na equipe multidisciplinar
        return participantesList.length >= 3;
      case '3D':
        // No 3º D, para liberar o 4º D, é obrigatório ter pelo menos 1 registro de rastreabilidade/triagem de lotes E 1 ação de contenção cadastrada
        return acoes3D.length >= 1 && lotesSAP.length >= 1;
      case '4D':
        return isGembaDone && isHenkatenDone && isIshikawaDone && is5PQDone;
      case '5D':
        return acoes5D.length >= 1;
      case '6D': {
        const hasYokotenAction = acoes6D.some(a => a.yokoten === 'SIM');
        const hasPokaYokeAction = acoes6D.some(a => a.poka_yoke === 'SIM');
        const yokotenResolved = hasYokotenAction || Boolean(meta.yokoten_na);
        const pokaYokeResolved = hasPokaYokeAction || Boolean(meta.pokayoke_na);
        return acoes6D.length >= 1 || (yokotenResolved && pokaYokeResolved);
      }
      case '7D':
        return acoes7D.length >= 1;
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
      '2D': '2D (Equipe: mínimo de 3 participantes)',
      '3D': '3D (Contenção & Lotes: mínimo 1 lote de rastreabilidade/triagem e 1 ação de contenção)',
      '4D': '4D (Causa Raiz: Todos os 4 campos do Gemba > Todos os 6M do Henkaten > Ishikawa > Todos os 5PQ das causas NG)',
      '5D': '5D (Ações Corretivas)',
      '6D': '6D (Abrangência / Poka-Yoke)',
      '7D': '7D (Prevenção IATF)',
      '8D': '8D (Validação)'
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

  // Registra o carimbo de data/hora exata e responsável pela análise (2D a 7D) para assinatura digital
  const recordAnalysisSignature = () => {
    spStore.saveEightDMetadata({
      id8d,
      responsavel_analise_8d: currentUser.nome,
      cargo_analise_8d: currentUser.cargo || currentUser.setor || rnc.classificacaoSetor || 'Liderança / Engenharia 8D',
      data_hora_analise_8d: new Date().toISOString()
    });
  };

  // Salvar Gemba (4D - Passo 1: todos os 4 campos são obrigatórios)
  const handleSaveGemba = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formGemba.gemba.trim() ||
      !formGemba.entrevista.trim() ||
      !formGemba.simulacao.trim() ||
      !formGemba.rastreabilidade.trim()
    ) {
      setNotification({
        type: 'error',
        message: 'Todos os 4 campos da Investigação Gemba (Avaliação Gemba, Entrevistas, Simulação e Rastreabilidade no Posto) são obrigatórios.'
      });
      return;
    }
    spStore.saveEntrevista8D({
      id8d,
      gemba: formGemba.gemba.trim(),
      entrevista: formGemba.entrevista.trim(),
      simulacao: formGemba.simulacao.trim(),
      rastreabilidade: formGemba.rastreabilidade.trim()
    });
    recordAnalysisSignature();
    setNotification({ type: 'success', message: 'Investigação Gemba salva com sucesso! Etapa Henkaten liberada.' });
    setRefreshKey(prev => prev + 1);
    setSubAba4D('henkaten');
  };

  // Salvar Henkaten (4D - Passo 2: todos os 6M obrigatórios e comentários obrigatórios quando houve mudança)
  const handleSaveHenkaten = (e: React.FormEvent) => {
    e.preventDefault();
    const checks: { label: string; flag: 'Sim' | 'Não'; comment: string }[] = [
      { label: 'Máquina', flag: formHenkaten.maqhkt, comment: formHenkaten.maq_comentarios },
      { label: 'Mão de Obra', flag: formHenkaten.mohkt, comment: formHenkaten.mo_comentarios },
      { label: 'Método', flag: formHenkaten.methkt, comment: formHenkaten.met_comentarios },
      { label: 'Material', flag: formHenkaten.mathkt, comment: formHenkaten.mat_comentarios },
      { label: 'Medição', flag: formHenkaten.medhkt, comment: formHenkaten.med_comentarios },
      { label: 'Meio Ambiente', flag: formHenkaten.mambhkt, comment: formHenkaten.mamb_comentarios }
    ];
    const missingSimComment = checks.find(c => c.flag === 'Sim' && !c.comment.trim());
    if (missingSimComment) {
      setNotification({
        type: 'error',
        message: `Henkaten (${missingSimComment.label}): Descreva obrigatoriamente a mudança ocorrida quando marcado como "Sim".`
      });
      return;
    }
    spStore.saveHenkaten({
      id8d,
      ...formHenkaten
    });
    recordAnalysisSignature();
    setNotification({ type: 'success', message: 'Mapeamento Henkaten (6M) salvo com sucesso! Etapa Ishikawa liberada.' });
    setRefreshKey(prev => prev + 1);
    setSubAba4D('ishikawa');
  };

  // Salvar 5 Porquês de uma hipótese NG (4D - Passo 4)
  const handleSave5PQ = (causaItem: IshikawaCauseItem) => {
    const draft = draft5PQ[causaItem.id] || {
      umpq: causaItem.umpq || '',
      doispq: causaItem.doispq || '',
      trespq: causaItem.trespq || '',
      quatropq: causaItem.quatropq || '',
      cincopq: causaItem.cincopq || ''
    };

    if (!draft.umpq.trim() || !draft.cincopq.trim()) {
      setNotification({
        type: 'error',
        message: 'Preencha a investigação dos Porquês até o 5º Porquê (Causa Raiz) para salvar.'
      });
      return;
    }

    spStore.saveIshikawaCause({
      ...causaItem,
      umpq: draft.umpq.trim(),
      doispq: draft.doispq.trim(),
      trespq: draft.trespq.trim(),
      quatropq: draft.quatropq.trim(),
      cincopq: draft.cincopq.trim()
    });
    recordAnalysisSignature();
    setNotification({ type: 'success', message: 'Análise dos 5 Porquês salva com sucesso!' });
    setRefreshKey(prev => prev + 1);
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

  // Salvar Nova Causa Ishikawa (4D - Passo 3)
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
    setNotification({ type: 'success', message: 'Hipótese registrada no Ishikawa (6M)!' });
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteCausa = (causaId: number) => {
    spStore.deleteIshikawaCause(causaId);
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

  // Salvar Nova Ação (vinculada ao Plano de Ação da ocorrência junto com 5D, 6D e 7D)
  const handleSaveAcao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAcao.contra_medida) return;

    const targetEtapa8D: '3D' | '5D' | '6D' | '7D' =
      formAcao.etapa_8d ||
      (activeEtapa === '3D'
        ? '3D'
        : activeEtapa === '6D'
        ? '6D'
        : activeEtapa === '7D'
        ? '7D'
        : '5D');

    // Garante que o Plano de Ação único da ocorrência exista (gerado a partir do 3D) e vincula id_rel2
    const linkedPlan = spStore.getOrCreatePlanForExternalApp(id8d);

    const normalizedAcao: Partial<ActionPlanItem> = {
      ...formAcao,
      id_rel2: linkedPlan?.id || 1,
      etapa_8d: targetEtapa8D,
      tipo_acao:
        targetEtapa8D === '3D'
          ? 'CONTENÇÃO'
          : targetEtapa8D === '7D'
          ? 'PREVENTIVA'
          : 'CORRETIVA',
      yokoten:
        targetEtapa8D === '6D'
          ? formAcao.yokoten || 'SIM'
          : 'NÃO',
      poka_yoke:
        targetEtapa8D === '6D'
          ? formAcao.poka_yoke || 'NÃO'
          : 'NÃO',
      id_programa_acoes: id8d,
      status: 'Aberto'
    };

    if (targetEtapa8D === '6D' && normalizedAcao.yokoten !== 'SIM' && normalizedAcao.poka_yoke !== 'SIM') {
      normalizedAcao.yokoten = 'SIM';
    }

    spStore.saveActionItem(normalizedAcao);
    recordAnalysisSignature();

    setModalNovaAcaoOpen(false);
    setNotification({
      type: 'success',
      message: `Ação registrada no ${targetEtapa8D} e vinculada ao Plano de Ação da ocorrência!`
    });
    setRefreshKey(prev => prev + 1);
  };

  const handleToggle6DNotApplicable = (field: 'yokoten_na' | 'pokayoke_na') => {
    const nextVal = !Boolean(meta[field]);
    spStore.saveEightDMetadata({
      id8d,
      [field]: nextVal
    });
    setNotification({
      type: 'success',
      message: nextVal
        ? `${field === 'yokoten_na' ? 'Abrangência (Yokoten)' : 'Poka-Yoke'} marcado como Não Aplicável.`
        : `${field === 'yokoten_na' ? 'Abrangência (Yokoten)' : 'Poka-Yoke'} marcado como Aplicável.`
    });
    setRefreshKey(prev => prev + 1);
  };

  // Salvar Lote Verificado na Contenção (3D)
  const handleSaveLote3D = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLote3D.lote.trim() || !formLote3D.estoque.trim() || qtdVerificadaNum3D <= 0) {
      setNotification({
        type: 'error',
        message: 'Informe o Lote de Produção, o Nome do Estoque e a Quantidade de Peças Verificadas.'
      });
      return;
    }

    spStore.addLoteSAP({
      idRnc: rnc.id,
      seqRel: String(lotesSAP.length + 1),
      produto: pecaAutomatica,
      lote: formLote3D.lote.trim(),
      estoque: formLote3D.estoque.trim(),
      qtd: qtdVerificadaNum3D,
      qtdVerificada: qtdVerificadaNum3D,
      qtdNg: qtdNgNum3D,
      qtdOk: qtdOkCalc3D,
      data: new Date().toISOString().split('T')[0],
      responsavel: currentUser.nome
    });

    setFormLote3D({
      lote: '',
      estoque: '',
      qtdVerificada: '',
      qtdNg: '0'
    });
    setNotification({ type: 'success', message: 'Lote de contenção e rastreabilidade registrado com sucesso!' });
    setRefreshKey(prev => prev + 1);
    onRefreshRnc();
  };

  const handleRemoveLote3D = (idOrIdx: number) => {
    spStore.deleteLoteSAP(idOrIdx, rnc.id);
    setRefreshKey(prev => prev + 1);
    onRefreshRnc();
  };

  // Concluir Ação
  const handleConfirmConclusao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConcluirAcao) return;

    const serializedAnexos = formConclusao.anexos.map(a =>
      a.url.startsWith('data:') ? `${a.name}:::${a.url}` : a.url
    );

    spStore.concluirActionItem(
      modalConcluirAcao.id,
      formConclusao.dataConclusao,
      formConclusao.comentarios,
      serializedAnexos
    );

    setModalConcluirAcao(null);
    setFormConclusao({ dataConclusao: new Date().toISOString().split('T')[0], comentarios: '', anexos: [] });
    setNotification({ type: 'success', message: 'Ação concluída com sucesso!' });
    setRefreshKey(prev => prev + 1);
  };

  // Validar Ação (8D)
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
    setNotification({ type: 'success', message: 'Validação da ação registrada no Plano de Ação e no 8D!' });
    setRefreshKey(prev => prev + 1);
  };

  const getEtapaRevisaoStatus = (etapa: Etapa8D): 'none' | 'pendente' | 'revisado' | 'ok' => {
    if (meta.validar_8d === 'Aprovado') return 'ok';
    if (etapa === '4D') return meta.status_revisao_4d || 'none';
    if (etapa === '5D') return meta.status_revisao_5d || 'none';
    if (etapa === '6D') return meta.status_revisao_6d || 'none';
    if (etapa === '7D') return meta.status_revisao_7d || 'none';
    return 'none';
  };

  // Solicitar revisão de etapas selecionadas (4D, 5D, 6D, 7D)
  const handleConfirmSolicitarRevisao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminQualidade) {
      setNotification({
        type: 'error',
        message: 'Permissão Restrita: Somente o perfil de Admin da Qualidade pode realizar a validação final ou solicitar revisão de um 8D.'
      });
      return;
    }
    const selecionadas = (['4D', '5D', '6D', '7D'] as const).filter(et => formSolicitarRevisao.etapas[et]);
    if (selecionadas.length === 0) {
      setNotification({
        type: 'error',
        message: 'Selecione ao menos uma etapa (4D, 5D, 6D ou 7D) para solicitar revisão.'
      });
      return;
    }
    if (!formSolicitarRevisao.comentario.trim()) {
      setNotification({
        type: 'error',
        message: 'Informe nos comentários quais revisões são necessárias.'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    spStore.saveEightDMetadata({
      id8d,
      validar_8d: 'Reprovado',
      comentarios_validacao: formSolicitarRevisao.comentario.trim(),
      motivo_revisao_8d: formSolicitarRevisao.comentario.trim(),
      data_solicitacao_revisao: nowIso,
      solicitado_revisao_por: currentUser.nome,
      etapas_revisao_solicitadas: [...selecionadas],
      status_revisao_4d: formSolicitarRevisao.etapas['4D'] ? 'pendente' : 'none',
      revisado_4d: formSolicitarRevisao.etapas['4D'] ? false : meta.revisado_4d,
      status_revisao_5d: formSolicitarRevisao.etapas['5D'] ? 'pendente' : 'none',
      revisado_5d: formSolicitarRevisao.etapas['5D'] ? false : meta.revisado_5d,
      status_revisao_6d: formSolicitarRevisao.etapas['6D'] ? 'pendente' : 'none',
      revisado_6d: formSolicitarRevisao.etapas['6D'] ? false : meta.revisado_6d,
      status_revisao_7d: formSolicitarRevisao.etapas['7D'] ? 'pendente' : 'none',
      revisado_7d: formSolicitarRevisao.etapas['7D'] ? false : meta.revisado_7d
    });

    setModalSolicitarRevisaoOpen(false);
    setNotification({
      type: 'success',
      message: `Revisão solicitada para ${selecionadas.join(', ')}. As etapas foram sinalizadas com alerta amarelo.`
    });
    setRefreshKey(prev => prev + 1);
  };

  // Marcar etapa (4D, 5D, 6D ou 7D) como revisada pela equipe
  const handleConfirmarRevisaoEtapa = (etapa: '4D' | '5D' | '6D' | '7D') => {
    const comentarioEquipe = (draftComentarioRevisaoD[etapa] || '').trim();
    if (!comentarioEquipe) {
      setNotification({
        type: 'error',
        message: `Descreva no campo de comentários o que foi revisado na etapa ${etapa} antes de confirmar.`
      });
      return;
    }

    const patch: Partial<EightDMetadata> = {
      id8d,
      responsavel_analise_8d: currentUser.nome,
      cargo_analise_8d: currentUser.cargo || currentUser.setor || rnc.classificacaoSetor || 'Liderança / Engenharia 8D',
      data_hora_analise_8d: new Date().toISOString()
    };
    if (etapa === '4D') {
      patch.status_revisao_4d = 'revisado';
      patch.revisado_4d = true;
      patch.comentarios_revisao_4d = comentarioEquipe;
    } else if (etapa === '5D') {
      patch.status_revisao_5d = 'revisado';
      patch.revisado_5d = true;
      patch.comentarios_revisao_5d = comentarioEquipe;
    } else if (etapa === '6D') {
      patch.status_revisao_6d = 'revisado';
      patch.revisado_6d = true;
      patch.comentarios_revisao_6d = comentarioEquipe;
    } else if (etapa === '7D') {
      patch.status_revisao_7d = 'revisado';
      patch.revisado_7d = true;
      patch.comentarios_revisao_7d = comentarioEquipe;
    }

    spStore.saveEightDMetadata(patch);
    setNotification({
      type: 'success',
      message: `Etapa ${etapa} marcada como Revisada! Status atualizado para azul claro (aguardando aprovação final no 8D).`
    });
    setRefreshKey(prev => prev + 1);
  };

  const renderBannerRevisaoEtapa = (etapa: '4D' | '5D' | '6D' | '7D') => {
    const revStatus = getEtapaRevisaoStatus(etapa);
    if (revStatus !== 'pendente' && revStatus !== 'revisado') return null;

    const comentarioRegistrado =
      etapa === '4D'
        ? meta.comentarios_revisao_4d
        : etapa === '5D'
        ? meta.comentarios_revisao_5d
        : etapa === '6D'
        ? meta.comentarios_revisao_6d
        : meta.comentarios_revisao_7d;

    if (revStatus === 'pendente') {
      return (
        <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/80">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span>Solicitação de Revisão Pendente para o {etapa}</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-950 border border-amber-400 self-start sm:self-auto">
              AGUARDANDO REVISÃO DA EQUIPE
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs text-slate-800">
            <span className="font-bold text-amber-900 block mb-0.5">
              O que foi solicitado revisar no 8D{meta.solicitado_revisao_por ? ` (por ${meta.solicitado_revisao_por})` : ''}:
            </span>
            <p className="font-semibold text-slate-900 whitespace-pre-wrap">
              {meta.motivo_revisao_8d || meta.comentarios_validacao || 'Revisar informações e ações desta etapa.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-amber-950 text-xs">
              Comentários da Equipe — O que foi revisado nesta etapa ({etapa})? *
            </label>
            <textarea
              rows={2}
              value={draftComentarioRevisaoD[etapa] || ''}
              onChange={e =>
                setDraftComentarioRevisaoD(prev => ({
                  ...prev,
                  [etapa]: e.target.value
                }))
              }
              placeholder={`Descreva o que foi revisado ou ajustado no ${etapa}...`}
              className="form-input w-full text-xs p-2.5 border-amber-300 rounded-lg bg-white resize-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleConfirmarRevisaoEtapa(etapa)}
                className="btn-primary bg-sky-600 hover:bg-sky-700 text-white h-8 px-4 text-xs font-bold gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar que o {etapa} foi Revisado</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl bg-sky-50 border-2 border-sky-300 shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-sky-200/80">
          <div className="flex items-center gap-2 text-sky-950 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Etapa {etapa} Revisada pela Equipe</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-200 text-sky-900 border border-sky-300 self-start sm:self-auto">
            REVISADO (AGUARDANDO APROVAÇÃO FINAL 8D)
          </span>
        </div>

        {(meta.motivo_revisao_8d || meta.comentarios_validacao) && (
          <div className="p-2.5 bg-white/80 rounded-lg border border-sky-200 text-xs">
            <span className="font-bold text-slate-600 block">Solicitação original do 8D:</span>
            <p className="text-slate-800 font-medium">{meta.motivo_revisao_8d || meta.comentarios_validacao}</p>
          </div>
        )}

        <div className="p-2.5 bg-white rounded-lg border border-sky-200 text-xs">
          <span className="font-bold text-sky-900 block">Comentário do que foi revisado pela equipe no {etapa}:</span>
          <p className="text-slate-900 font-semibold whitespace-pre-wrap">{comentarioRegistrado}</p>
        </div>
      </div>
    );
  };

  // Salvar Fechamento 8D (Exclusivo Admin da Qualidade)
  const handleSaveFechamento8D = (status: 'Aprovado' | 'Reprovado', parecer: string) => {
    if (!isAdminQualidade) {
      setNotification({
        type: 'error',
        message: 'Permissão Restrita: Somente o perfil de Admin da Qualidade pode realizar a aprovação final de um 8D.'
      });
      return;
    }

    if (status === 'Aprovado') {
      if (acoesPlano8D.some(a => a.status !== 'Validado')) {
        setNotification({
          type: 'error',
          message: 'Para aprovar o 8D, todas as ações vinculadas do plano (3D, 5D, 6D e 7D) precisam estar com status Validado.'
        });
        return;
      }

      const etapasPendentesRevisao = (['4D', '5D', '6D', '7D'] as const).filter(
        et => getEtapaRevisaoStatus(et) === 'pendente'
      );
      if (etapasPendentesRevisao.length > 0) {
        setNotification({
          type: 'error',
          message: `Não é possível aprovar o 8D enquanto houver revisão pendente em: ${etapasPendentesRevisao.join(', ')}. A equipe deve concluir a revisão primeiro.`
        });
        return;
      }

      if (!parecer.trim()) {
        setNotification({
          type: 'error',
          message: 'Informe o Parecer Técnico Final de Validação do Relatório 8D antes de confirmar a finalização.'
        });
        return;
      }
    }

    setModalAprovar8DOpen(false);
    setModalSolicitarRevisaoOpen(false);

    const nowIso = new Date().toISOString();
    spStore.saveEightDMetadata({
      id8d,
      validar_8d: status,
      comentarios_validacao: parecer,
      data_aprovacao: nowIso,
      data_hora_aprovacao: nowIso,
      aprovado_por: currentUser.nome,
      cargo_aprovador: 'Admin da Qualidade',
      re_aprovador: currentUser.reAcesso,
      status_revisao_4d:
        status === 'Aprovado' && (meta.status_revisao_4d === 'pendente' || meta.status_revisao_4d === 'revisado')
          ? 'ok'
          : meta.status_revisao_4d,
      status_revisao_5d:
        status === 'Aprovado' && (meta.status_revisao_5d === 'pendente' || meta.status_revisao_5d === 'revisado')
          ? 'ok'
          : meta.status_revisao_5d,
      status_revisao_6d:
        status === 'Aprovado' && (meta.status_revisao_6d === 'pendente' || meta.status_revisao_6d === 'revisado')
          ? 'ok'
          : meta.status_revisao_6d,
      status_revisao_7d:
        status === 'Aprovado' && (meta.status_revisao_7d === 'pendente' || meta.status_revisao_7d === 'revisado')
          ? 'ok'
          : meta.status_revisao_7d
    });

    if (status === 'Aprovado') {
      spStore.concluirRNC(rnc.id, currentUser.nome, parecer);
      onRefreshRnc();
    }

    setNotification({
      type: 'success',
      message: `Status do 8D atualizado para: ${status} (Assinado digitalmente por ${currentUser.nome} — Admin da Qualidade)`
    });
    setRefreshKey(prev => prev + 1);
  };

  if (rnc.abrir8D !== 'Sim') {
    return (
      <div className="card-saas p-8 border-slate-200 bg-white text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Metodologia 8D Não Aplicável (8D - Não)</h3>
        <p className="text-xs text-slate-500 max-w-md">
          Esta ocorrência está classificada como <strong>8D - Não</strong>. Para habilitar o preenchimento das etapas 1D a 8D, edite a ocorrência e altere o campo <strong>Abrir 8D</strong> para <strong>Sim</strong>.
        </p>
      </div>
    );
  }

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

      {/* BARRA DE NAVEGAÇÃO SUPERIOR DAS 8 DISCIPLINAS (1D a 8D) COM TRAVAS SEQUENCIAIS */}
      <div className="card-saas p-2.5 border-slate-200 bg-white shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: '1D', label: '1D. Ocorrência', icon: FileText, count: null },
            { id: '2D', label: '2D. Equipe', icon: Users, count: participantesList.length },
            { id: '3D', label: '3D. Contenção & Lotes', icon: Barcode, count: acoes3D.length + lotesSAP.length },
            { id: '4D', label: '4D. Causa Raiz', icon: GitBranch, count: causes.length },
            { id: '5D', label: '5D. Corretivas', icon: CheckSquare, count: acoes5D.length },
            { id: '6D', label: '6D. Abrangência', icon: Share2, count: acoes6D.length },
            { id: '7D', label: '7D. Prevenção', icon: ShieldAlert, count: acoes7D.length },
            { id: '8D', label: '8D. Validação', icon: ShieldCheck, count: meta.validar_8d === 'Aprovado' ? 'OK' : null }
          ].map(d => {
            const Icon = d.icon;
            const isActive = activeEtapa === d.id;
            const { liberada, motivo } = isEtapaLiberada(d.id as Etapa8D);
            const isDone = liberada && isEtapaConcluida(d.id as Etapa8D);
            const revStatus = getEtapaRevisaoStatus(d.id as Etapa8D);

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleTentarNavegarEtapa(d.id as Etapa8D)}
                title={
                  !liberada
                    ? motivo
                    : revStatus === 'pendente'
                    ? `${d.label} (Revisão Solicitada — Alerta Amarelo)`
                    : revStatus === 'revisado'
                    ? `${d.label} (Revisado pela equipe — Aguardando aprovação final 8D)`
                    : isDone
                    ? `${d.label} (Preenchido & Conforme)`
                    : `${d.label} (Em preenchimento)`
                }
                className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 transition select-none whitespace-nowrap border ${
                  revStatus === 'pendente'
                    ? isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-300 cursor-pointer'
                      : 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200/80 cursor-pointer'
                    : revStatus === 'revisado'
                    ? isActive
                      ? 'bg-sky-600 text-white border-sky-700 shadow-xs cursor-pointer'
                      : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200/70 cursor-pointer'
                    : isActive
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
                ) : revStatus === 'pendente' ? (
                  <AlertTriangle className={`w-3.5 h-3.5 shrink-0 animate-pulse ${isActive ? 'text-slate-950' : 'text-amber-700'}`} />
                ) : revStatus === 'revisado' ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-sky-600'}`} />
                ) : isDone && !isActive ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 shrink-0" />
                )}
                <span>{d.label}</span>
                {revStatus === 'pendente' ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-extrabold bg-amber-300 text-amber-950 border border-amber-500">
                    REVISAR
                  </span>
                ) : revStatus === 'revisado' ? (
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-sky-200 text-sky-900 border border-sky-300'
                  }`}>
                    REVISADO
                  </span>
                ) : isDone && !isActive ? (
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
                  <span>Ver relatório de 8D</span>
                </button>
              </div>
            </div>

            {/* Linha 1: Cliente, Setor, Data Ocorrência, Data Contenção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold text-slate-500">Cliente:</span>
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
                <span className="text-[11px] font-semibold text-slate-500">Posto / Linha:</span>
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
              <p className="text-xs text-slate-500 mt-0.5">Membros envolvidos na investigação da causa raiz e validação das contramedidas (mínimo de 3 membros para liberar a etapa 3D)</p>
            </div>
            <span className={`font-mono font-bold px-2.5 py-1 rounded-lg border ${
              participantesList.length >= 3
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {participantesList.length} / 3 mínimo cadastrado(s)
            </span>
          </div>

          {/* Lista de participantes com busca ativa (sem sobreposição de ícone) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
            <label htmlFor="search-ativo-2d" className="block text-[11px] font-semibold text-slate-700">
              Lista de participantes
            </label>
            <div className="relative">
              <div className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-200 rounded-lg focus-within:border-[#0b5796] focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                <Search className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                <input
                  id="search-ativo-2d"
                  type="text"
                  value={searchParticipante2D}
                  onFocus={() => setDropdown2DOpen(true)}
                  onChange={e => {
                    setSearchParticipante2D(e.target.value);
                    setDropdown2DOpen(true);
                  }}
                  placeholder="Pesquisar funcionário por nome, cargo, setor ou matrícula..."
                  className="w-full text-xs text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-400"
                />
                {searchParticipante2D ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchParticipante2D('');
                      setDropdown2DOpen(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDropdown2DOpen(prev => !prev)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                    title="Abrir lista de participantes"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdown2DOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {dropdown2DOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdown2DOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-lg z-20 divide-y divide-slate-100">
                    {filteredAtivos2D.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs italic">
                        Nenhum funcionário encontrado para &quot;{searchParticipante2D}&quot;.
                      </div>
                    ) : (
                      filteredAtivos2D.map(a => {
                        const alreadyAdded = participantesList.includes(a.nome);
                        return (
                          <button
                            key={a.numPessoal}
                            type="button"
                            onClick={() => {
                              if (!alreadyAdded) {
                                handleAddParticipante(a.nome);
                              }
                              setSearchParticipante2D('');
                              setDropdown2DOpen(false);
                            }}
                            disabled={alreadyAdded}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition ${
                              alreadyAdded
                                ? 'bg-slate-50 text-slate-400 cursor-default'
                                : 'hover:bg-blue-50/70 text-slate-800 cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold truncate">{a.nome}</span>
                              <span className="text-[11px] text-slate-500 truncate">
                                {a.posicao} • {a.unidadeOrg} (RE: {a.numPessoal})
                              </span>
                            </div>
                            {alreadyAdded ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                Adicionado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0b5796] border border-blue-200 shrink-0">
                                + Adicionar
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lista de Membros Atuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {participantesList.length === 0 ? (
              <p className="col-span-full text-slate-400 italic text-center py-6">Nenhum participante adicionado à equipe ainda. Selecione um colaborador acima para preencher o 2D.</p>
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
        </div>
      )}

      {/* =========================================================================
          ETAPA 3D: CONTENÇÃO IMEDIATA & RASTREABILIDADE DE LOTES (3D)
          ========================================================================= */}
      {activeEtapa === '3D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">3D. Ações de Contenção Imediata &amp; Rastreabilidade</h3>
                {linkedPlanHeader && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                    Plano de Ação #{linkedPlanHeader.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Segregação física de estoques suspeitos e ações de contenção fabril imediata (início do Plano de Ação da ocorrência)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedPlanHeader && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('plano-acao', {
                      planHeaderId: linkedPlanHeader.id,
                      fromScreen: 'detalhes-8d',
                      rncId: rnc.id,
                      returnEtapa8D: '3D'
                    })
                  }
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-[#0b5796] border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Plano de Ação</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFormAcao({
                    tipo_acao: 'CONTENÇÃO',
                    etapa_8d: '3D',
                    contra_medida: '',
                    causa: 'Bloqueio e contenção de produto não conforme',
                    data_acompanhamento: new Date().toISOString().split('T')[0],
                    data_planejada: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
                    responsavel_acao: currentUser.nome,
                    email: currentUser.email || '',
                    yokoten: 'NÃO',
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. FORMULÁRIO DE RASTREABILIDADE E VERIFICAÇÃO DE LOTES EM ESTOQUE (3D) */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Barcode className="w-4 h-4 text-[#0b5796]" />
                  <span>Rastreabilidade &amp; Triagem de Lotes em Estoque</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Data, responsável logado e peça da ocorrência são preenchidos automaticamente. Informe o total verificado e as peças NG para cálculo automático das peças OK.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  Verificadas: <strong className="font-mono text-slate-900">{lotesSAP.reduce((acc, l) => acc + Number(l.qtdVerificada ?? l.qtd ?? 0), 0)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  OK: <strong className="font-mono">{lotesSAP.reduce((acc, l) => acc + Number(l.qtdOk ?? Math.max(0, Number(l.qtdVerificada ?? l.qtd ?? 0) - Number(l.qtdNg ?? 0))), 0)}</strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                  NG: <strong className="font-mono">{lotesSAP.reduce((acc, l) => acc + Number(l.qtdNg ?? 0), 0)}</strong>
                </span>
              </div>
            </div>

            {/* Formulário de Apontamento de Lote */}
            <form onSubmit={handleSaveLote3D} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3.5">
              {/* Linha 1: Campos Automáticos (Data, Quem está logado, Peça da Ocorrência) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Data da Verificação (Automático)</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {formatDateBR(new Date().toISOString().split('T')[0])}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Responsável Logado (Automático)</span>
                  <span className="font-bold text-slate-900 text-xs truncate">
                    {currentUser.nome}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase text-blue-700">Peça da Ocorrência (Automático)</span>
                  <span className="font-mono font-bold text-[#0b5796] text-xs truncate" title={pecaAutomatica}>
                    {pecaAutomatica}
                  </span>
                </div>
              </div>

              {/* Linha 2: Campos Preenchidos pelo Usuário + Cálculo Automático OK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Lote de Produção *</label>
                  <input
                    type="text"
                    required
                    value={formLote3D.lote}
                    onChange={e => setFormLote3D({ ...formLote3D, lote: e.target.value })}
                    placeholder="Ex: LOTE-28926"
                    className="form-input w-full text-xs py-2 px-2.5 border-slate-200 rounded-lg bg-white font-mono font-bold"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Estoque / Local *</label>
                  <input
                    type="text"
                    required
                    value={formLote3D.estoque}
                    onChange={e => setFormLote3D({ ...formLote3D, estoque: e.target.value })}
                    placeholder="Ex: Almoxarifado, Expedição, Linha..."
                    className="form-input w-full text-xs py-2 px-2.5 border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Verificado *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formLote3D.qtdVerificada}
                    onChange={e => setFormLote3D({ ...formLote3D, qtdVerificada: e.target.value })}
                    placeholder="Ex: 200"
                    className="form-input w-full text-xs py-2 px-2.5 border-slate-200 rounded-lg bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-700 mb-1">Peças NG *</label>
                  <input
                    type="number"
                    min={0}
                    max={qtdVerificadaNum3D || undefined}
                    required
                    value={formLote3D.qtdNg}
                    onChange={e => setFormLote3D({ ...formLote3D, qtdNg: e.target.value })}
                    placeholder="0"
                    className="form-input w-full text-xs py-2 px-2.5 border-rose-200 rounded-lg bg-rose-50/40 text-rose-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">Peças OK (Auto)</label>
                  <div className="h-[34px] px-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono font-extrabold text-xs flex items-center justify-between">
                    <span>{qtdOkCalc3D}</span>
                    <span className="text-[10px] font-sans font-semibold text-emerald-700">pçs OK</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500">
                  Cálculo automático: <strong>Total ({qtdVerificadaNum3D}) − NG ({qtdNgNum3D}) = {qtdOkCalc3D} OK</strong>
                </span>
                <button
                  type="submit"
                  className="btn-primary bg-[#0b5796] hover:bg-[#09477d] h-8 px-4 text-xs font-bold text-white gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar Lote Verificado</span>
                </button>
              </div>
            </form>

            {/* Tabela de Lotes Verificados */}
            {lotesSAP.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 italic">
                Nenhum lote verificado registrado ainda para esta ocorrência. Preencha o formulário acima para adicionar.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Responsável</th>
                      <th className="py-2.5 px-3">Peça</th>
                      <th className="py-2.5 px-3">Lote de Produção</th>
                      <th className="py-2.5 px-3">Estoque / Local</th>
                      <th className="py-2.5 px-3 text-right">Total Verificado</th>
                      <th className="py-2.5 px-3 text-right">Qtd OK</th>
                      <th className="py-2.5 px-3 text-right">Qtd NG</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lotesSAP.map((l, i) => {
                      const total = Number(l.qtdVerificada ?? l.qtd ?? 0);
                      const ng = Number(l.qtdNg ?? 0);
                      const ok = l.qtdOk !== undefined ? Number(l.qtdOk) : Math.max(0, total - ng);
                      return (
                        <tr key={l.id || i} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-600">{formatDateBR(l.data)}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{l.responsavel || currentUser.nome}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{l.produto}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{l.lote}</td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{l.estoque || 'Estoque Geral'}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{total}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">{ok}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 bg-rose-50/40">{ng}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLote3D(l.id || i)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                              title="Remover registro de lote"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* =========================================================================
          ETAPA 4D: ANÁLISE DE CAUSA RAIZ (GEMBA > HENKATEN > ISHIKAWA > 5 PORQUÊS)
          ========================================================================= */}
      {activeEtapa === '4D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4 text-xs">
          {renderBannerRevisaoEtapa('4D')}

          {/* Header da Etapa 4D com Sequência Obrigatória: Gemba > Henkaten > Ishikawa > 5pqs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">4D. Investigação de Causa Raiz (Gemba &gt; Henkaten &gt; Ishikawa &gt; 5 Porquês)</h3>
                {isEtapaConcluida('4D') && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    4D Concluído
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Preencha na sequência: 1º Gemba &rarr; 2º Henkaten &rarr; 3º Ishikawa (6M) &rarr; 4º 5 Porquês (todas as hipóteses NG devem ser respondidas)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold flex-wrap gap-1">
                {[
                  { id: 'gemba' as const, label: '1. Gemba', done: isGembaDone, locked: false },
                  { id: 'henkaten' as const, label: '2. Henkaten', done: isHenkatenDone, locked: !isGembaDone },
                  { id: 'ishikawa' as const, label: '3. Ishikawa (6M)', done: isIshikawaDone, locked: !isGembaDone || !isHenkatenDone },
                  { id: '5pq' as const, label: '4. 5 Porquês', done: is5PQDone, locked: !isGembaDone || !isHenkatenDone || !isIshikawaDone }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectSubAba4D(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      subAba4D === tab.id
                        ? 'bg-white text-[#0b5796] shadow-2xs font-bold'
                        : tab.locked
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.locked ? (
                      <Lock className="w-3 h-3 text-slate-400" />
                    ) : tab.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : null}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SUB-ABA 1: GEMBA (FORMULÁRIO EDITÁVEL — TODOS OS 4 CAMPOS OBRIGATÓRIOS) */}
          {subAba4D === 'gemba' && (
            <form onSubmit={handleSaveGemba} className="flex flex-col gap-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  <strong>Etapa 1 do 4D — Gemba:</strong> Todos os 4 campos abaixo são obrigatórios para concluir o Gemba e liberar o Henkaten.
                </span>
                {isGembaDone && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    Preenchido
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                  <label className="font-bold text-slate-900">1. Avaliação Gemba (Chão de Fábrica) *</label>
                  <textarea
                    rows={3}
                    required
                    value={formGemba.gemba}
                    onChange={e => setFormGemba({ ...formGemba, gemba: e.target.value })}
                    placeholder="Descreva o que foi constatado presencialmente no posto/linha durante a operação..."
                    className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-white resize-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                  <label className="font-bold text-slate-900">2. Entrevistas com Operadores / Liderança *</label>
                  <textarea
                    rows={3}
                    required
                    value={formGemba.entrevista}
                    onChange={e => setFormGemba({ ...formGemba, entrevista: e.target.value })}
                    placeholder="Relato dos operadores do turno sobre o momento e condições em que o desvio ocorreu..."
                    className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-white resize-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                  <label className="font-bold text-slate-900">3. Simulação / Reprodução do Defeito *</label>
                  <textarea
                    rows={3}
                    required
                    value={formGemba.simulacao}
                    onChange={e => setFormGemba({ ...formGemba, simulacao: e.target.value })}
                    placeholder="Resultado dos testes práticos para reproduzir o modo de falha..."
                    className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-white resize-none"
                  />
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                  <label className="font-bold text-slate-900">4. Rastreabilidade no Posto (Gemba) *</label>
                  <textarea
                    rows={3}
                    required
                    value={formGemba.rastreabilidade}
                    onChange={e => setFormGemba({ ...formGemba, rastreabilidade: e.target.value })}
                    placeholder="Conferência de etiquetas, parâmetros de máquina ou lotes no posto..."
                    className="form-input w-full text-xs p-2.5 border-slate-200 rounded-lg bg-white resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="btn-primary bg-[#0b5796] hover:bg-[#09477d] h-8 px-4 text-xs font-bold text-white gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Gemba e Ir para Henkaten</span>
                </button>
              </div>
            </form>
          )}

          {/* SUB-ABA 2: HENKATEN (FORMULÁRIO EDITÁVEL — TODOS OS 6M OBRIGATÓRIOS) */}
          {subAba4D === 'henkaten' && (
            <form onSubmit={handleSaveHenkaten} className="flex flex-col gap-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  <strong>Etapa 2 do 4D — Henkaten (Pontos de Mudança nos 6M):</strong> Todos os 6 itens são obrigatórios. Quando houver mudança (&quot;Sim&quot;), o detalhamento da observação também é obrigatório.
                </span>
                {isHenkatenDone && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    Preenchido
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {([
                  { label: 'Máquina', flagKey: 'maqhkt', obsKey: 'maq_comentarios', placeholder: 'Parâmetros, manutenção, ferramental...' },
                  { label: 'Mão de Obra', flagKey: 'mohkt', obsKey: 'mo_comentarios', placeholder: 'Substituição de operador, treinamento...' },
                  { label: 'Método', flagKey: 'methkt', obsKey: 'met_comentarios', placeholder: 'Alteração de instrução de trabalho, sequência...' },
                  { label: 'Material', flagKey: 'mathkt', obsKey: 'mat_comentarios', placeholder: 'Troca de lote, fornecedor, matéria-prima...' },
                  { label: 'Medição', flagKey: 'medhkt', obsKey: 'med_comentarios', placeholder: 'Calibração de gabarito, sensor, instrumento...' },
                  { label: 'Meio Ambiente', flagKey: 'mambhkt', obsKey: 'mamb_comentarios', placeholder: 'Iluminação, temperatura, limpeza do posto...' }
                ] as const).map(item => {
                  const flagVal = formHenkaten[item.flagKey];
                  const obsVal = formHenkaten[item.obsKey];
                  return (
                    <div key={item.label} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{item.label} *</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-slate-500">Mudança? *</span>
                          <select
                            required
                            value={flagVal}
                            onChange={e => setFormHenkaten({ ...formHenkaten, [item.flagKey]: e.target.value as 'Sim' | 'Não' })}
                            className={`form-select text-[11px] font-bold py-1 px-2 rounded border ${
                              flagVal === 'Sim'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="Não">Não</option>
                            <option value="Sim">Sim</option>
                          </select>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        required={flagVal === 'Sim'}
                        value={obsVal}
                        onChange={e => setFormHenkaten({ ...formHenkaten, [item.obsKey]: e.target.value })}
                        placeholder={flagVal === 'Sim' ? `Obrigatório: Descreva a mudança em ${item.label}...` : item.placeholder}
                        className={`form-input w-full text-xs p-2 rounded-lg bg-white resize-none ${
                          flagVal === 'Sim' && !obsVal.trim() ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="btn-primary bg-[#0b5796] hover:bg-[#09477d] h-8 px-4 text-xs font-bold text-white gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Henkaten e Ir para Ishikawa (6M)</span>
                </button>
              </div>
            </form>
          )}

          {/* SUB-ABA 3: ISHIKAWA 6M */}
          {subAba4D === 'ishikawa' && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  <strong>Etapa 3 do 4D — Diagrama de Ishikawa (6M):</strong> Cadastre as hipóteses levantadas e classifique como <strong>NG (Causa Provável)</strong> ou <strong>OK (Descartada)</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => setModalNovaCausaOpen(true)}
                  className="btn-primary bg-[#0b5796] h-7 px-3 text-[11px] font-bold text-white gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Hipótese 6M</span>
                </button>
              </div>

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
            </div>
          )}

          {/* SUB-ABA 4: 5 PORQUÊS (FORMULÁRIO EDITÁVEL POR CAUSA NG) */}
          {subAba4D === '5pq' && (
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  <strong>Etapa 4 do 4D — Análise dos 5 Porquês:</strong> Preencha os Porquês para cada causa classificada como &quot;NG&quot; no Ishikawa e salve para habilitar o 5D.
                </span>
                {is5PQDone && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    5 Porquês Concluído
                  </span>
                )}
              </div>

              {causes.filter(c => c.okng === 'NG').length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                  Nenhuma causa classificada como &quot;NG&quot; no Ishikawa. Volte à aba Ishikawa (6M) e marque ao menos uma hipótese como NG.
                </div>
              ) : (
                causes.filter(c => c.okng === 'NG').map(c => {
                  const pqValues = draft5PQ[c.id] || {
                    umpq: c.umpq || '',
                    doispq: c.doispq || '',
                    trespq: c.trespq || '',
                    quatropq: c.quatropq || '',
                    cincopq: c.cincopq || ''
                  };

                  return (
                    <div key={c.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-rose-700 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {c.seisms} • NG ({c.ocnd})
                            </span>
                            {(c.umpq || '').trim() && (c.cincopq || '').trim() ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                5PQ Salvo
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Pendente 5PQ
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{c.descricao_causa}</h4>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleSave5PQ(c)}
                            className="btn-primary bg-[#0b5796] hover:bg-[#09477d] text-white h-8 px-3 text-xs font-bold gap-1.5 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar 5 Porquês</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
                        {([
                          { key: 'umpq', num: '1º Porquê *', placeholder: 'Por que o problema ocorreu?' },
                          { key: 'doispq', num: '2º Porquê *', placeholder: 'Por que a condição anterior ocorreu?' },
                          { key: 'trespq', num: '3º Porquê *', placeholder: 'Por que o desvio não foi evitado?' },
                          { key: 'quatropq', num: '4º Porquê', placeholder: 'Aprofundamento sistêmico...' },
                          { key: 'cincopq', num: '5º Porquê (Causa Raiz)', placeholder: 'Causa raiz definitiva...' }
                        ] as const).map(pq => (
                          <div key={pq.key} className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-1.5">
                            <label className="font-bold text-[#0b5796] text-[11px]">{pq.num}</label>
                            <textarea
                              rows={3}
                              value={pqValues[pq.key]}
                              onChange={e =>
                                setDraft5PQ(prev => ({
                                  ...prev,
                                  [c.id]: {
                                    ...pqValues,
                                    [pq.key]: e.target.value
                                  }
                                }))
                              }
                              placeholder={pq.placeholder}
                              className="form-input w-full text-[11px] p-2 border-slate-200 rounded bg-slate-50 focus:bg-white resize-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          ETAPA 5D: AÇÕES CORRETIVAS DEFINITIVAS (VINCULADAS AO PLANO DE AÇÃO)
          ========================================================================= */}
      {activeEtapa === '5D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4 text-xs">
          {renderBannerRevisaoEtapa('5D')}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">5D. Ações Corretivas Definitivas</h3>
                {linkedPlanHeader && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                    Vinculado ao Plano #{linkedPlanHeader.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contramedidas para eliminação da causa raiz (sincronizadas automaticamente com o Plano de Ação)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedPlanHeader && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('plano-acao', {
                      planHeaderId: linkedPlanHeader.id,
                      fromScreen: 'detalhes-8d',
                      rncId: rnc.id,
                      returnEtapa8D: '5D'
                    })
                  }
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-[#0b5796] border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Plano de Ação</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFormAcao({
                    tipo_acao: 'CORRETIVA',
                    etapa_8d: '5D',
                    contra_medida: '',
                    causa: causasRaiz4D.length === 1 ? causasRaiz4D[0].value : '',
                    data_acompanhamento: new Date().toISOString().split('T')[0],
                    data_planejada: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                    responsavel_acao: currentUser.nome,
                    email: currentUser.email || '',
                    yokoten: 'NÃO',
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
                <span>Nova Ação Corretiva (5D)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {acoes5D.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500">
                Nenhuma ação corretiva cadastrada no 5D ainda. Clique em &quot;Nova Ação Corretiva (5D)&quot; acima para adicionar ao Plano de Ação.
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 6D: ABRANGÊNCIA (YOKOTEN) & POKA-YOKE (AÇÕES VINCULADAS OU NÃO APLICÁVEL)
          ========================================================================= */}
      {activeEtapa === '6D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          {renderBannerRevisaoEtapa('6D')}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">6D. Abrangência (Yokoten) &amp; Poka-Yoke</h3>
                {linkedPlanHeader && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                    Vinculado ao Plano #{linkedPlanHeader.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre as ações vinculadas ao Plano de Ação ou marque quando Poka-Yoke / Abrangência não forem aplicáveis
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedPlanHeader && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('plano-acao', {
                      planHeaderId: linkedPlanHeader.id,
                      fromScreen: 'detalhes-8d',
                      rncId: rnc.id,
                      returnEtapa8D: '6D'
                    })
                  }
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-[#0b5796] border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Plano de Ação</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFormAcao({
                    tipo_acao: 'CORRETIVA',
                    etapa_8d: '6D',
                    contra_medida: '',
                    causa: 'Abrangência (Yokoten) / Dispositivo Poka-Yoke',
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
                <span>Nova Ação 6D (Yokoten / Poka-Yoke)</span>
              </button>
            </div>
          </div>

          {/* OPÇÃO DE MARCAR QUE POKA-YOKE OU ABRANGÊNCIA NÃO SÃO APLICÁVEIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
              meta.yokoten_na
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-900">Abrangência (Yokoten)</span>
                <span className="text-[11px] text-slate-500">
                  {meta.yokoten_na
                    ? 'Marcado como Não Aplicável para esta ocorrência'
                    : 'Requer ação vinculada ou marcação de Não Aplicável'}
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={Boolean(meta.yokoten_na)}
                  onChange={() => handleToggle6DNotApplicable('yokoten_na')}
                  className="rounded border-slate-300 text-[#0b5796] focus:ring-[#0b5796]"
                />
                <span className="text-xs font-bold text-slate-800">Não Aplicável</span>
              </label>
            </div>

            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
              meta.pokayoke_na
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-slate-900">Dispositivo Poka-Yoke</span>
                <span className="text-[11px] text-slate-500">
                  {meta.pokayoke_na
                    ? 'Marcado como Não Aplicável para esta ocorrência'
                    : 'Requer ação vinculada ou marcação de Não Aplicável'}
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <input
                  type="checkbox"
                  checked={Boolean(meta.pokayoke_na)}
                  onChange={() => handleToggle6DNotApplicable('pokayoke_na')}
                  className="rounded border-slate-300 text-[#0b5796] focus:ring-[#0b5796]"
                />
                <span className="text-xs font-bold text-slate-800">Não Aplicável</span>
              </label>
            </div>
          </div>

          {/* LISTA DE AÇÕES VINCULADAS DO 6D */}
          <div className="flex flex-col gap-2.5">
            <span className="font-bold text-slate-900">
              Ações Vinculadas de Abrangência / Poka-Yoke no Plano de Ação ({acoes6D.length}):
            </span>
            {acoes6D.length === 0 ? (
              <p className="text-slate-500 text-center py-5 bg-slate-50 rounded-xl border border-slate-200">
                {meta.yokoten_na && meta.pokayoke_na
                  ? 'Abrangência (Yokoten) e Poka-Yoke foram declarados como Não Aplicáveis. Etapa 6D liberada.'
                  : 'Nenhuma ação 6D cadastrada. Cadastre uma ação de Abrangência/Poka-Yoke ou marque acima quando não aplicável.'}
              </p>
            ) : (
              acoes6D.map(a => (
                <div key={a.id} className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                        AÇÃO 6D
                      </span>
                      {a.yokoten === 'SIM' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          YOKOTEN
                        </span>
                      )}
                      {a.poka_yoke === 'SIM' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                          POKA-YOKE
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        Prazo: {formatDateBR(a.data_planejada)}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{a.contra_medida}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 7D: AÇÕES PREVENTIVAS & LIÇÕES APRENDIDAS (VINCULADAS AO PLANO DE AÇÃO)
          ========================================================================= */}
      {activeEtapa === '7D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          {renderBannerRevisaoEtapa('7D')}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">7D. Prevenção de Reincidência (3 Eixos Obrigatórios IATF)</h3>
                {linkedPlanHeader && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                    Vinculado ao Plano #{linkedPlanHeader.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Atualização sistemática do FMEA, Trabalho Padronizado (SOS) e Auditoria Escalonada (LPA)</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedPlanHeader && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('plano-acao', {
                      planHeaderId: linkedPlanHeader.id,
                      fromScreen: 'detalhes-8d',
                      rncId: rnc.id,
                      returnEtapa8D: '7D'
                    })
                  }
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-[#0b5796] border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Plano de Ação</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFormAcao({
                    tipo_acao: 'PREVENTIVA',
                    etapa_8d: '7D',
                    contra_medida: '',
                    causa: 'Prevenção de reincidência sistêmica',
                    oData_8d_7d: 'FMEA',
                    data_acompanhamento: new Date().toISOString().split('T')[0],
                    data_planejada: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
                    responsavel_acao: currentUser.nome,
                    email: currentUser.email || '',
                    yokoten: 'NÃO',
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
                        <div key={a.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] flex flex-col gap-1.5 shadow-2xs">
                          <p className="font-semibold text-slate-800 leading-snug">{a.contra_medida}</p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                            <span>{a.responsavel_acao}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-blue-700">{a.status}</span>
                              {a.status !== 'Validado' && a.status !== 'Concluído' && (
                                <button
                                  type="button"
                                  onClick={() => setModalConcluirAcao(a)}
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold hover:bg-emerald-100"
                                >
                                  Concluir
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 8D: VALIDAÇÃO DE TODAS AS AÇÕES DO PLANO (3D, 5D, 6D E 7D) & HOMOLOGAÇÃO
          ========================================================================= */}
      {activeEtapa === '8D' && (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">8D. Validação das Ações do Plano (3D, 5D, 6D e 7D) &amp; Fechamento</h3>
                {linkedPlanHeader && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                    Plano de Ação #{linkedPlanHeader.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Validação técnica de todas as ações vinculadas ao Plano de Ação (3D Contenção, 5D Corretivas, 6D Abrangência/Poka-Yoke e 7D Preventivas) e aprovação final do relatório 8D
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedPlanHeader && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('plano-acao', {
                      planHeaderId: linkedPlanHeader.id,
                      fromScreen: 'detalhes-8d',
                      rncId: rnc.id,
                      returnEtapa8D: '8D'
                    })
                  }
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 text-[#0b5796] border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver no Plano de Ação</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
                className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Ver relatório de 8D</span>
              </button>
            </div>
          </div>

          {/* 1. Tabela de Validação das Ações Vinculadas ao Plano de Ação */}
          <div className="flex flex-col gap-2">
            <span className="font-bold text-slate-900 text-xs">
              1. Validação Individual das Ações Vinculadas ao Plano de Ação ({allActions.length}):
            </span>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Etapa / Tipo</th>
                    <th className="py-2.5 px-3">Contramedida</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Evidência</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Validação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allActions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">Nenhuma ação cadastrada para validar.</td>
                    </tr>
                  ) : (
                    allActions.map(a => {
                      const etapaLabel =
                        a.etapa_8d ||
                        (a.tipo_acao === 'CONTENÇÃO'
                          ? '3D'
                          : a.tipo_acao === 'PREVENTIVA' || Boolean(a.oData_8d_7d)
                          ? '7D'
                          : a.yokoten === 'SIM' || a.poka_yoke === 'SIM'
                          ? '6D'
                          : '5D');
                      return (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                                {etapaLabel}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {a.tipo_acao}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px] truncate font-medium text-slate-900" title={a.contra_medida}>
                            {a.contra_medida}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{a.responsavel_acao}</td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={a.comentarios_evidencia || ''}>
                            {a.comentarios_evidencia || <span className="text-slate-400 italic">Sem evidência</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              a.status === 'Validado' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              a.status === 'Concluído' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {(() => {
                              const hasEvidencia = Boolean(
                                (a.comentarios_evidencia && a.comentarios_evidencia.trim().length > 0) ||
                                  (a.anexos_evidencia && a.anexos_evidencia.length > 0)
                              );
                              const isValidado = a.status === 'Validado';
                              const podeValidar = a.status === 'Concluído' && hasEvidencia;

                              return (
                                <div className="flex items-center justify-end gap-1.5">
                                  {a.status !== 'Validado' && a.status !== 'Concluído' ? (
                                    <button
                                      type="button"
                                      onClick={() => setModalConcluirAcao(a)}
                                      className="h-6 px-2.5 rounded-lg text-[11px] font-semibold transition bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                                    >
                                      Concluir
                                    </button>
                                  ) : (
                                    <span className="h-6 px-2 inline-flex items-center rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      ✓ Concluída
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    disabled={!podeValidar}
                                    onClick={() => {
                                      if (!podeValidar) return;
                                      setModalValidarAcao(a);
                                      setFormValidacao({
                                        status: 'Validado',
                                        comentarios: a.comentarios_validacao || '',
                                        motivoRevisao: ''
                                      });
                                    }}
                                    title={
                                      isValidado
                                        ? 'Ação já validada'
                                        : podeValidar
                                        ? 'Validar eficácia e evidência da ação'
                                        : 'A ação precisa ser concluída com evidência antes de ser validada'
                                    }
                                    className={`h-6 px-2.5 rounded-lg text-[11px] font-semibold transition ${
                                      podeValidar
                                        ? 'bg-[#0b5796] hover:bg-[#09477d] text-white border border-[#0b5796] cursor-pointer'
                                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                    }`}
                                  >
                                    Validar Ação
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Parecer Final de Validação do 8D (Completo com Identificação, Parecer, Aprovação Digital e Solicitação de Revisão) */}
          <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                  2. Decisão Final de Validação e Homologação do Ciclo 8D
                </span>
                <span className="text-[11px] text-slate-500">
                  Registre o parecer técnico final para aprovar o 8D com assinatura digital ou solicite revisão de etapas específicas (4D a 7D)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-blue-50 text-[#0b5796] border border-blue-200 inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Aprovação Exclusiva: Perfil Admin da Qualidade</span>
              </span>
            </div>

            {/* Cartão de Identificação do Aprovador / Assinatura Digital */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Responsável pela Validação Final</span>
                <span className="font-bold text-slate-900 text-xs">
                  {meta.validar_8d === 'Aprovado' && meta.aprovado_por ? meta.aprovado_por : currentUser.nome}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  RE: {meta.validar_8d === 'Aprovado' && meta.re_aprovador ? meta.re_aprovador : currentUser.reAcesso}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Perfil / Alçada de Homologação</span>
                <span className="font-bold text-[#0b5796] text-xs">
                  {meta.validar_8d === 'Aprovado' && meta.cargo_aprovador
                    ? meta.cargo_aprovador
                    : isAdminQualidade
                    ? 'Admin da Qualidade'
                    : currentUser.perfil}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isAdminQualidade ? 'Habilitado para assinatura digital' : 'Somente leitura na aprovação final'}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Status &amp; Data/Hora da Assinatura</span>
                <span className={`font-bold text-xs ${
                  meta.validar_8d === 'Aprovado'
                    ? 'text-emerald-700'
                    : meta.validar_8d === 'Reprovado'
                    ? 'text-amber-800'
                    : 'text-slate-700'
                }`}>
                  {meta.validar_8d === 'Aprovado'
                    ? 'Aprovado Integralmente'
                    : meta.validar_8d === 'Reprovado'
                    ? 'Em Revisão (Solicitada)'
                    : 'Aguardando Parecer Final'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {meta.data_hora_aprovacao
                    ? formatDateBR(meta.data_hora_aprovacao)
                    : formatDateBR(new Date().toISOString().split('T')[0])}
                </span>
              </div>
            </div>

            {!isAdminQualidade && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-2.5 text-xs">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Acesso Restrito à Aprovação Final:</strong> Somente usuários com o perfil{' '}
                  <strong>Admin da Qualidade</strong> podem aprovar integralmente ou solicitar revisão oficial de um relatório 8D.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isAdminQualidade}
                onClick={() => {
                  if (!isAdminQualidade) return;
                  setModalSolicitarRevisaoOpen(false);
                  setModalAprovar8DOpen(prev => !prev);
                }}
                title={!isAdminQualidade ? 'Restrito ao perfil Admin da Qualidade' : 'Abrir parecer técnico e confirmar aprovação final do 8D'}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                  !isAdminQualidade
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-65'
                    : (meta.validar_8d === 'Aprovado' && !modalSolicitarRevisaoOpen) || modalAprovar8DOpen
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200 cursor-pointer'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer'
                }`}
              >
                {!isAdminQualidade ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Aprovar 8D Integral (Assinatura Digital)</span>
              </button>

              <button
                type="button"
                disabled={!isAdminQualidade}
                onClick={() => {
                  if (!isAdminQualidade) return;
                  const savedList = meta.etapas_revisao_solicitadas || [];
                  setFormSolicitarRevisao({
                    etapas: {
                      '4D':
                        savedList.includes('4D') ||
                        (Boolean(meta.status_revisao_4d) && meta.status_revisao_4d !== 'none') ||
                        Boolean(meta.comentarios_revisao_4d),
                      '5D':
                        savedList.includes('5D') ||
                        (Boolean(meta.status_revisao_5d) && meta.status_revisao_5d !== 'none') ||
                        Boolean(meta.comentarios_revisao_5d),
                      '6D':
                        savedList.includes('6D') ||
                        (Boolean(meta.status_revisao_6d) && meta.status_revisao_6d !== 'none') ||
                        Boolean(meta.comentarios_revisao_6d),
                      '7D':
                        savedList.includes('7D') ||
                        (Boolean(meta.status_revisao_7d) && meta.status_revisao_7d !== 'none') ||
                        Boolean(meta.comentarios_revisao_7d)
                    },
                    comentario: meta.motivo_revisao_8d || ''
                  });
                  setModalAprovar8DOpen(false);
                  setModalSolicitarRevisaoOpen(prev => !prev);
                }}
                title={!isAdminQualidade ? 'Restrito ao perfil Admin da Qualidade' : 'Solicitar revisão de etapas (4D a 7D)'}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                  !isAdminQualidade
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-65'
                    : (meta.validar_8d === 'Reprovado' && !modalAprovar8DOpen) || modalSolicitarRevisaoOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs ring-2 ring-amber-200 cursor-pointer'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300 cursor-pointer'
                }`}
              >
                {!isAdminQualidade ? <Lock className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>Solicitar Revisão (4D a 7D)</span>
              </button>
            </div>

            {/* Painel de Aprovação Final e Parecer Técnico do 8D */}
            {modalAprovar8DOpen && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveFechamento8D('Aprovado', parecerAprovacao8D.trim());
                }}
                className="p-4 bg-emerald-50/90 rounded-xl border-2 border-emerald-300 flex flex-col gap-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Aprovação Final e Assinatura Digital do Relatório 8D</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalAprovar8DOpen(false)}
                    className="p-1 text-emerald-800 hover:text-emerald-950"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 text-xs mb-1">
                    Parecer Técnico Final de Validação do Relatório 8D *
                  </label>
                  <textarea
                    rows={2}
                    required
                    disabled={!isAdminQualidade}
                    value={parecerAprovacao8D}
                    onChange={e => setParecerAprovacao8D(e.target.value)}
                    placeholder="Informe o parecer final de validação e eficácia das ações do ciclo 8D..."
                    className="form-input w-full text-xs p-2.5 border-emerald-300 rounded-lg bg-white resize-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAprovar8DOpen(false)}
                    className="btn-secondary h-8 px-3 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!isAdminQualidade}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white h-8 px-4 text-xs font-bold gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar Finalização do 8D</span>
                  </button>
                </div>
              </form>
            )}

            {/* Painel de Solicitação de Revisão por Etapa (4D, 5D, 6D, 7D) */}
            {modalSolicitarRevisaoOpen && (
              <form
                onSubmit={handleConfirmSolicitarRevisao}
                className="p-4 bg-amber-50/90 rounded-xl border-2 border-amber-300 flex flex-col gap-3 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2 font-bold text-amber-950 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Selecionar Etapas para Revisão (4D a 7D)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalSolicitarRevisaoOpen(false)}
                    className="p-1 text-amber-800 hover:text-amber-950"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {([
                    { id: '4D' as const, label: '4º D — Causa Raiz', desc: 'Gemba, Henkaten, Ishikawa e 5 Porquês' },
                    { id: '5D' as const, label: '5º D — Corretivas', desc: 'Ações corretivas para causa raiz' },
                    { id: '6D' as const, label: '6º D — Abrangência', desc: 'Yokoten e dispositivos Poka-Yoke' },
                    { id: '7D' as const, label: '7º D — Prevenção', desc: 'FMEA, Trabalho Padronizado e LPA' }
                  ]).map(item => {
                    const checked = formSolicitarRevisao.etapas[item.id];
                    return (
                      <label
                        key={item.id}
                        className={`p-3 rounded-xl border cursor-pointer select-none flex items-start gap-2.5 transition ${
                          checked
                            ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-400'
                            : 'bg-white border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e =>
                            setFormSolicitarRevisao(prev => ({
                              ...prev,
                              etapas: { ...prev.etapas, [item.id]: e.target.checked }
                            }))
                          }
                          className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{item.label}</span>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label className="block font-bold text-amber-950 text-xs mb-1">
                    Comentários da Revisão — O que precisa ser revisado? *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formSolicitarRevisao.comentario}
                    onChange={e => setFormSolicitarRevisao(prev => ({ ...prev, comentario: e.target.value }))}
                    placeholder="Escreva detalhadamente quais pontos precisam ser revistos pela equipe nos Ds selecionados..."
                    className="form-input w-full text-xs p-2.5 border-amber-300 rounded-lg bg-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSolicitarRevisaoOpen(false)}
                    className="btn-secondary h-8 px-3 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary bg-amber-600 hover:bg-amber-700 text-white h-8 px-4 text-xs font-bold gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Enviar Solicitação de Revisão</span>
                  </button>
                </div>
              </form>
            )}

            {/* Resumo das Etapas com Revisão Solicitada ou Revisada */}
            {(['4D', '5D', '6D', '7D'] as const).some(et => {
              const st = getEtapaRevisaoStatus(et);
              const savedList = meta.etapas_revisao_solicitadas || [];
              return st === 'pendente' || st === 'revisado' || savedList.includes(et);
            }) && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-2">
                <span className="font-bold text-slate-800 text-xs">Status das Revisões por Etapa (4D a 7D):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {(['4D', '5D', '6D', '7D'] as const).map(et => {
                    const st = getEtapaRevisaoStatus(et);
                    const com =
                      et === '4D'
                        ? meta.comentarios_revisao_4d
                        : et === '5D'
                        ? meta.comentarios_revisao_5d
                        : et === '6D'
                        ? meta.comentarios_revisao_6d
                        : meta.comentarios_revisao_7d;
                    return (
                      <div
                        key={et}
                        onClick={() => handleTentarNavegarEtapa(et)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex flex-col gap-1 ${
                          st === 'pendente'
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : st === 'revisado'
                            ? 'bg-sky-50 border-sky-300 text-sky-950'
                            : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{et}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            st === 'pendente'
                              ? 'bg-amber-200 text-amber-950'
                              : st === 'revisado'
                              ? 'bg-sky-200 text-sky-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {st === 'pendente' ? 'Pendente Revisão' : st === 'revisado' ? 'Revisado' : 'OK'}
                          </span>
                        </div>
                        {com && (
                          <p className="text-[11px] text-slate-700 line-clamp-2" title={com}>
                            <strong>Revisão:</strong> {com}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(meta.validar_8d === 'Aprovado' || meta.validar_8d === 'Reprovado') && meta.comentarios_validacao && (
              <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1 ${
                meta.validar_8d === 'Aprovado'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <strong>
                    Parecer Vigente ({meta.validar_8d === 'Aprovado' ? '8D Aprovado e Assinado Digitalmente' : '8D Em Revisão'}):
                  </strong>
                  {meta.aprovado_por && (
                    <span className="text-[11px] font-mono font-bold">
                      Assinado por: {meta.aprovado_por} {meta.re_aprovador ? `(RE: ${meta.re_aprovador})` : ''}
                    </span>
                  )}
                </div>
                <p className="font-medium">{meta.comentarios_validacao}</p>
              </div>
            )}
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
                    {dynamicIshikawaMs.map(m => (
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
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Nova Ação Vinculada ao Plano ({formAcao.etapa_8d || activeEtapa} — {formAcao.tipo_acao})
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
              {(() => {
                const modalEtapa = formAcao.etapa_8d || activeEtapa;
                const is7DModal = modalEtapa === '7D';
                const is5DModal = modalEtapa === '5D';

                return (
                  <>
                    <div className={is7DModal ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tipo de Ação *</label>
                        <select
                          value={formAcao.tipo_acao}
                          onChange={e => setFormAcao({ ...formAcao, tipo_acao: e.target.value as ActionItemType })}
                          className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50 font-bold"
                        >
                          {dynamicTiposAcao.map(ta => (
                            <option key={ta.value} value={ta.value}>{ta.label}</option>
                          ))}
                        </select>
                      </div>

                      {is7DModal && (
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Eixo / Documento 7D *</label>
                          <select
                            value={formAcao.oData_8d_7d || dynamicDocs7D[0] || 'FMEA'}
                            onChange={e => setFormAcao({ ...formAcao, oData_8d_7d: (e.target.value || undefined) as any })}
                            className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50 font-bold"
                          >
                            {dynamicDocs7D.map(doc => (
                              <option key={doc} value={doc}>{doc}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {is5DModal ? 'Causa Raiz (5 Porquês preenchidos no 4D) *' : 'Causa Raiz / Origem'}
                      </label>
                      {is5DModal ? (
                        <select
                          required
                          value={formAcao.causa || ''}
                          onChange={e => setFormAcao({ ...formAcao, causa: e.target.value })}
                          className="form-select w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-900"
                        >
                          <option value="">Selecione a Causa Raiz (do 4D) que esta ação irá tratar...</option>
                          {causasRaiz4D.map(cr => (
                            <option key={cr.id} value={cr.value}>
                              {cr.value}
                              {cr.hipotese && cr.hipotese !== cr.causaRaiz ? ` — (Hipótese: ${cr.hipotese})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formAcao.causa || ''}
                          onChange={e => setFormAcao({ ...formAcao, causa: e.target.value })}
                          placeholder="Causa raiz vinculada..."
                          className="form-input w-full text-xs py-2 px-3 border-slate-200 rounded-lg bg-slate-50"
                        />
                      )}
                    </div>
                  </>
                );
              })()}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição da Ação / Contramedida *</label>
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

              {(formAcao.etapa_8d === '6D' || activeEtapa === '6D') && (
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
              )}

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
                  Salvar Ação no Plano
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Anexo de Evidência (Arquivo ou Imagem)
                </label>
                <label className="flex flex-col items-center justify-center gap-1.5 p-3.5 border-2 border-dashed border-slate-300 hover:border-[#0b5796] rounded-xl bg-slate-50/70 hover:bg-blue-50/30 transition cursor-pointer text-center">
                  <Upload className="w-4 h-4 text-[#0b5796]" />
                  <span className="text-xs font-bold text-[#0b5796]">
                    Clique para anexar arquivo ou imagem
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Imagens (PNG, JPG) ou documentos (PDF, Excel, Word)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleEvidenciaFiles8D}
                    className="hidden"
                  />
                </label>

                {formConclusao.anexos.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                    {formConclusao.anexos.map((item, idx) => {
                      const isImage = item.type.startsWith('image/') || item.url.startsWith('data:image/');
                      return (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isImage ? (
                              <img src={item.url} alt={item.name} className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0" />
                            ) : (
                              <Paperclip className="w-4 h-4 text-[#0b5796] shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-slate-800 truncate">{item.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAnexo8D(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
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
              <h3 className="font-display font-bold text-sm text-slate-900">Validação da Ação no 8D</h3>
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
                <label className="block font-semibold text-slate-700 mb-1">Parecer da Validação *</label>
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
                  placeholder="Parecer técnico ou constatações da validação..."
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
                  Confirmar Validação
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

    </div>
  );
};

