import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Save, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Wrench, 
  Camera, 
  ShieldCheck, 
  Activity, 
  Upload,
  Layers,
  ChevronDown,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade, PecaCatalogo, TipoRNC } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, DEFAULT_CLIENTE } from '../constants/clientes';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface Registro8DViewProps {
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
  rncId?: number;
  edicao?: boolean;
}

type TabType = 'geral' | 'pecas' | 'defeito' | 'risco' | 'contencao' | '8d';

interface TabStep {
  id: TabType;
  stepNum: number;
  label: string;
  shortLabel: string;
  icon: any;
}

const STEPS: TabStep[] = [
  { id: 'geral', stepNum: 1, label: '1. Geral & Montadora', shortLabel: 'Geral', icon: Car },
  { id: 'pecas', stepNum: 2, label: '2. Produto & Posto', shortLabel: 'Produto', icon: Wrench },
  { id: 'defeito', stepNum: 3, label: '3. Defeito & Fotos', shortLabel: 'Defeito', icon: Camera },
  { id: 'risco', stepNum: 4, label: '4. Avaliação de Risco', shortLabel: 'Risco', icon: AlertTriangle },
  { id: 'contencao', stepNum: 5, label: '5. Contenção (D3)', shortLabel: 'Contenção', icon: ShieldCheck },
  { id: '8d', stepNum: 6, label: '6. SAP & Decisão 8D', shortLabel: 'SAP / 8D', icon: Activity },
];

export const Registro8DView: React.FC<Registro8DViewProps> = ({ 
  onNavigate, 
  currentUser,
  rncId,
  edicao = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [pecasCatalogo, setPecasCatalogo] = useState<PecaCatalogo[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      if (!prev[fieldName]) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const fileInputNgRef = useRef<HTMLInputElement>(null);
  const fileInputOkRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState<Partial<RNCRecord>>({
    tipoRnc: 'Formal',
    status: 'Relatório Inicial',
    cliente: DEFAULT_CLIENTE,
    dataOcorrencia: new Date().toISOString().split('T')[0],
    dataOficializacao: new Date().toISOString().split('T')[0],
    classificacaoSetor: 'SOLDA 2 - CEL. TOYOTA',
    setorDeteccao: 'Linha de Solda Robotizada',
    turno: '1º Turno',
    produto: '',
    componente: '',
    finalComponente: 'Peça Final',
    quantidadeAfetada: 1,
    descricaoProblema: '',
    descricaoCompleta: '',
    caracteristicaSeguranca: 'Não',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    posto: '',
    fmds: '',
    acoesContencao: '',
    dataContencao: new Date().toISOString().split('T')[0],
    qtdInspecionada: 0,
    qtdSuspeita: 0,
    qtdBloqueada: 0,
    oQueFazer: '',
    comoFazer: '',
    porQueFazer: '',
    quemFara: '',
    quandoFara: '',
    ondeFara: '',
    documentoRastreabilidade: 'Etiqueta SAP',
    codigoRastreabilidade: '',
    abrir8D: 'Não',
    protcliente: 'Não',
    detector: currentUser.nome,
    reDetector: currentUser.reAcesso,
    fotoPecaNg: '',
    fotoPecaOk: ''
  });

  useEffect(() => {
    const catalogo = spStore.getColPecasGeraisAA3();
    setPecasCatalogo(catalogo);

    if (edicao && rncId) {
      const existente = spStore.getRNCById(rncId);
      if (existente) {
        setForm(existente);
      }
    } else {
      const produtosIniciais = spStore.getProdutosPorCliente(DEFAULT_CLIENTE);
      if (produtosIniciais.length > 0) {
        const prod = produtosIniciais[0];
        const componentes = spStore.getComponentesPorProduto(prod.codCliText);
        setForm(prev => ({
          ...prev,
          produto: prod.codCliText || prod.material,
          componente: componentes[0] ? (componentes[0].componente || componentes[0].descricao) : prod.descricao,
          posto: prod.posto,
          fmds: prod.fmds,
          carryOver: prod.carryOver === 'Sim' ? 'Sim' : 'Não'
        }));
      }
    }
  }, [edicao, rncId]);

  const produtosDoCliente = useMemo(() => spStore.getProdutosPorCliente(form.cliente || DEFAULT_CLIENTE), [form.cliente]);
  const componentesDoProduto = useMemo(() => spStore.getComponentesPorProduto(form.produto || ''), [form.produto]);
  const postosDisponiveis = useMemo(() => spStore.getDistinctPostos(), []);
  const fmdsDisponiveis = useMemo(() => spStore.getDistinctFMDS(), []);

  const currentStepObj = STEPS.find(s => s.id === activeTab) || STEPS[0];
  const currentStepIndex = STEPS.findIndex(s => s.id === activeTab);

  const handleClienteChange = (novoCliente: string) => {
    const produtos = spStore.getProdutosPorCliente(novoCliente);
    const primeiroProd = produtos[0];
    const componentes = primeiroProd ? spStore.getComponentesPorProduto(primeiroProd.codCliText) : [];
    const primeiroComp = componentes[0];

    setForm(prev => ({
      ...prev,
      cliente: novoCliente,
      produto: primeiroProd ? (primeiroProd.codCliText || primeiroProd.material) : '',
      componente: primeiroComp ? (primeiroComp.componente || primeiroComp.descricao) : (primeiroProd ? primeiroProd.descricao : ''),
      posto: primeiroProd ? primeiroProd.posto : '',
      fmds: primeiroProd ? primeiroProd.fmds : '',
      carryOver: primeiroComp?.carryOver === 'Sim' ? 'Sim' : 'Não'
    }));
  };

  const handlePecaChange = (codCliText: string) => {
    const selecionada = pecasCatalogo.find(p => p.codCliText === codCliText || p.material === codCliText);
    const componentes = spStore.getComponentesPorProduto(codCliText);
    const primeiroComp = componentes[0];

    if (selecionada) {
      setForm(prev => ({
        ...prev,
        produto: selecionada.codCliText || selecionada.material,
        componente: primeiroComp ? (primeiroComp.componente || primeiroComp.descricao) : selecionada.descricao,
        posto: selecionada.posto,
        fmds: selecionada.fmds,
        carryOver: selecionada.carryOver === 'Sim' ? 'Sim' : 'Não'
      }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'fotoPecaNg' | 'fotoPecaOk') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'A imagem deve ter no máximo 10MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm(prev => ({ ...prev, [field]: base64 }));
      setNotification({ type: 'success', message: 'Imagem carregada com sucesso!' });
    };
    reader.readAsDataURL(file);
  };

  interface StepValidationResult {
    isValid: boolean;
    message?: string;
    fieldErrors: Record<string, string>;
  }

  // Validação estrita por etapa para garantir integridade antes de avançar
  const validateStep = (stepId: TabType): StepValidationResult => {
    const fieldErrors: Record<string, string> = {};

    if (stepId === 'geral') {
      if (!form.cliente || !form.cliente.trim()) {
        fieldErrors.cliente = 'Selecione a Montadora (Cliente).';
      }
      if (!form.tipoRnc) {
        fieldErrors.tipoRnc = 'Selecione o Tipo de Ocorrência.';
      }
      if (!form.dataOcorrencia || !form.dataOcorrencia.trim()) {
        fieldErrors.dataOcorrencia = 'Informe a Data da Ocorrência.';
      }
      const isValid = Object.keys(fieldErrors).length === 0;
      return {
        isValid,
        message: isValid ? undefined : 'Preencha todos os campos obrigatórios da Etapa 1 (Cliente, Tipo e Data).',
        fieldErrors
      };
    }

    if (stepId === 'pecas') {
      if (!form.produto || !form.produto.trim()) {
        fieldErrors.produto = 'Selecione o Produto / Conjunto da ocorrência.';
      }
      const isValid = Object.keys(fieldErrors).length === 0;
      return {
        isValid,
        message: isValid ? undefined : 'Selecione o Produto / Conjunto na Etapa 2 antes de avançar.',
        fieldErrors
      };
    }

    if (stepId === 'defeito') {
      if (!form.descricaoProblema || form.descricaoProblema.trim().length < 3) {
        fieldErrors.descricaoProblema = 'Descreva o modo de falha / defeito (mínimo de 3 caracteres).';
      }
      if (form.quantidadeAfetada === undefined || form.quantidadeAfetada === null || Number(form.quantidadeAfetada) <= 0) {
        fieldErrors.quantidadeAfetada = 'Informe uma quantidade de peças afetadas válida (maior que zero).';
      }
      const isValid = Object.keys(fieldErrors).length === 0;
      return {
        isValid,
        message: isValid ? undefined : 'Preencha a descrição do defeito e a quantidade afetada na Etapa 3 antes de avançar.',
        fieldErrors
      };
    }

    return { isValid: true, fieldErrors: {} };
  };

  const isStepComplete = (stepId: TabType): boolean => {
    return validateStep(stepId).isValid;
  };

  const handleStepClick = (targetStep: TabStep) => {
    const targetIndex = STEPS.findIndex(s => s.id === targetStep.id);
    if (targetStep.id === activeTab) return;

    // Permitir voltar para qualquer etapa anterior
    if (targetIndex < currentStepIndex) {
      setActiveTab(targetStep.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Se tentar avançar para uma etapa posterior, validar todas as etapas anteriores
    for (let i = 0; i < targetIndex; i++) {
      const stepToCheck = STEPS[i];
      const validation = validateStep(stepToCheck.id);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, ...validation.fieldErrors }));
        setNotification({
          type: 'error',
          message: `Atenção: complete os campos obrigatórios da "${stepToCheck.label}" antes de avançar.`
        });
        setActiveTab(stepToCheck.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setActiveTab(targetStep.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextStep = () => {
    const validation = validateStep(activeTab);
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, ...validation.fieldErrors }));
      setNotification({
        type: 'error',
        message: validation.message || 'Preencha os campos obrigatórios da etapa atual antes de avançar.'
      });
      return;
    }

    // Limpa erros da etapa que foi validada com sucesso
    setErrors(prev => {
      const updated = { ...prev };
      Object.keys(validation.fieldErrors).forEach(k => delete updated[k]);
      return updated;
    });

    if (currentStepIndex < STEPS.length - 1) {
      setActiveTab(STEPS[currentStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveTab(STEPS[currentStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validação completa de todas as etapas que contêm campos obrigatórios
    for (const step of STEPS) {
      const validation = validateStep(step.id);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, ...validation.fieldErrors }));
        setNotification({
          type: 'error',
          message: validation.message || `Preencha os campos obrigatórios da "${step.label}".`
        });
        setActiveTab(step.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    try {
      if (edicao && rncId) {
        spStore.updateRNC(rncId, form);
        setNotification({ type: 'success', message: `Ocorrência RNC #${rncId} atualizada com sucesso!` });
      } else {
        const novaRnc = spStore.addRNC(form as Omit<RNCRecord, 'id'>);
        setNotification({ type: 'success', message: `Ocorrência ${novaRnc.field1} criada com sucesso!` });
      }

      setTimeout(() => {
        onNavigate('lista-8d');
      }, 900);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erro ao salvar: ${err.message || 'Falha desconhecida'}` });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-24 space-y-5 animate-in fade-in duration-150">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-lg border ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 p-1 text-slate-400 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR DE CONTEXTO E TÍTULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => onNavigate('lista-8d')}
            className="btn-secondary h-9 px-3 text-xs"
            title="Voltar para a Lista"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0f6cbd] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {edicao ? 'Edição RNC' : 'Nova Ocorrência'}
              </span>
              <span className="text-xs text-[#64748b]">Metodologia 8D</span>
            </div>
            <h1 className="text-base sm:text-xl font-bold text-[#0f172a] mt-0.5">
              {edicao ? `Ocorrência: ${form.field1 || `RNC #${form.id}`}` : 'Registro de Não Conformidade (8D)'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button 
            type="button"
            onClick={() => onNavigate('lista-8d')}
            className="btn-secondary h-9 px-3.5 text-xs"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="btn-primary h-9 px-4 text-xs font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>Salvar RNC</span>
          </button>
        </div>
      </div>

      {/* 2. NAVEGAÇÃO DE ETAPAS (STEPPER RESPONSIVO) */}
      
      {/* Versão Desktop: Stepper Completo em Linha */}
      <div className="hidden md:grid grid-cols-6 gap-2 p-1.5 bg-white border border-[#e2e8f0] rounded-xl shadow-2xs">
        {STEPS.map((step, idx) => {
          const isActive = activeTab === step.id;
          const isCompleted = isStepComplete(step.id);
          const isPast = idx < currentStepIndex;
          const hasError = isPast && !isCompleted;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step)}
              className={`h-10 px-2.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2 select-none ${
                isActive
                  ? 'bg-blue-50 text-[#0f6cbd] font-bold border border-[#0f6cbd] shadow-2xs'
                  : isCompleted
                  ? 'bg-emerald-50/70 text-[#107c10] font-semibold border border-emerald-200 hover:bg-emerald-100/60'
                  : hasError
                  ? 'bg-rose-50/80 text-rose-700 font-semibold border border-rose-200 hover:bg-rose-100/70'
                  : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a] border border-transparent'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                isActive 
                  ? 'bg-[#0f6cbd] text-white' 
                  : isCompleted 
                  ? 'bg-emerald-600 text-white' 
                  : hasError 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-[#e2e8f0] text-[#64748b]'
              }`}>
                {isCompleted ? '✓' : hasError ? '!' : step.stepNum}
              </div>
              <span className="truncate">{step.label.split('. ')[1] || step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Versão Mobile / Tablet: Indicador Compacto de Progresso com Seleção Rápida */}
      <div className="md:hidden card-saas p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#0f6cbd] text-white flex items-center justify-center text-xs font-bold">
              {currentStepObj.stepNum}
            </div>
            <span className="font-bold text-xs text-[#0f172a]">
              Etapa {currentStepObj.stepNum} de 6: {currentStepObj.label.split('. ')[1]}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#64748b]">
            {STEPS.filter(s => isStepComplete(s.id)).length} de {STEPS.length} concluídas ({Math.round((STEPS.filter(s => isStepComplete(s.id)).length / STEPS.length) * 100)}%)
          </span>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="w-full bg-[#e2e8f0] h-2 rounded-full overflow-hidden">
          <div 
            className="bg-[#0f6cbd] h-full rounded-full transition-all duration-300"
            style={{ width: `${(STEPS.filter(s => isStepComplete(s.id)).length / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Seletor Rápido de Etapas em Pílulas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
          {STEPS.map((step, idx) => {
            const isCompleted = isStepComplete(step.id);
            const isPast = idx < currentStepIndex;
            const hasError = isPast && !isCompleted;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === step.id 
                    ? 'bg-[#0f6cbd] text-white shadow-xs' 
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : hasError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
                }`}
              >
                <span>{isCompleted ? '✓' : hasError ? '!' : step.stepNum}.</span>
                <span>{step.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CARD CENTRAL DO FORMULÁRIO (PADRÃO PROFISSIONAL DE ESPAÇAMENTO) */}
      <div className="card-saas p-5 sm:p-7 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* ========================================================================= */}
          {/* ETAPA 1: GERAL & MONTADORA */}
          {/* ========================================================================= */}
          {activeTab === 'geral' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                  <Car className="w-4 h-4 text-[#0f6cbd]" />
                  <span>Informações Gerais da Não Conformidade</span>
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Identificação do cliente montadora, classificação inicial e dados de emissão.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">
                    Cliente (Montadora) <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    className={`form-input ${errors.cliente ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-200' : ''}`}
                    value={form.cliente}
                    onChange={e => {
                      handleClienteChange(e.target.value);
                      clearFieldError('cliente');
                    }}
                  >
                    {CLIENTES_LIST.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.cliente && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.cliente}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Tipo de Ocorrência <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    className={`form-input ${errors.tipoRnc ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-200' : ''}`}
                    value={form.tipoRnc}
                    onChange={e => {
                      setForm({ ...form, tipoRnc: e.target.value as TipoRNC });
                      clearFieldError('tipoRnc');
                    }}
                  >
                    <option value="Formal">Formal (Reclamação Oficial Montadora)</option>
                    <option value="Informal">Informal (Alerta de Linha Cliente)</option>
                    <option value="Interno">Interno (Fábrica Gestamp)</option>
                    <option value="Improcedente">Improcedente</option>
                  </select>
                  {errors.tipoRnc && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.tipoRnc}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Data da Ocorrência <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="date"
                    className={`form-input font-mono ${errors.dataOcorrencia ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-200' : ''}`}
                    value={form.dataOcorrencia}
                    onChange={e => {
                      setForm({ ...form, dataOcorrencia: e.target.value });
                      clearFieldError('dataOcorrencia');
                    }}
                  />
                  {errors.dataOcorrencia && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.dataOcorrencia}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Turno de Detecção
                  </label>
                  <select 
                    className="form-input"
                    value={form.turno}
                    onChange={e => setForm({ ...form, turno: e.target.value as any })}
                  >
                    <option value="1º Turno">1º Turno (06:00 - 14:40)</option>
                    <option value="2º Turno">2º Turno (14:40 - 23:15)</option>
                    <option value="3º Turno">3º Turno (23:15 - 06:00)</option>
                    <option value="Central">Central / Administrativo</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Setor Fabril
                  </label>
                  <select 
                    className="form-input"
                    value={form.classificacaoSetor}
                    onChange={e => setForm({ ...form, classificacaoSetor: e.target.value })}
                  >
                    <option value="SOLDA 1 - ESTACIONÁRIAS">SOLDA 1 - ESTACIONÁRIAS</option>
                    <option value="SOLDA 2 - CEL. TOYOTA">SOLDA 2 - CEL. TOYOTA</option>
                    <option value="SOLDA 3 - CEL. HONDA/HYUNDAI">SOLDA 3 - CEL. HONDA/HYUNDAI</option>
                    <option value="ESTAMPARIA PROGRESSIVAS">ESTAMPARIA PROGRESSIVAS</option>
                    <option value="ESTAMPARIA TANDEM">ESTAMPARIA TANDEM</option>
                    <option value="OUTROS">OUTROS</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Setor de Detecção
                  </label>
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="Ex: Linha de Solda, Posto de Inspeção..."
                    value={form.setorDeteccao}
                    onChange={e => setForm({ ...form, setorDeteccao: e.target.value })}
                  />
                </div>
              </div>

              {/* Informação do Emissor */}
              <div className="p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider block">
                    Emissor / Detector Conectado
                  </span>
                  <div className="font-bold text-[#0f172a] text-sm mt-0.5">
                    {form.detector || currentUser.nome}
                  </div>
                  <div className="text-[#64748b] mt-0.5">
                    RE: <span className="font-mono">{form.reDetector || currentUser.reAcesso}</span> • Perfil: {currentUser.perfil}
                  </div>
                </div>
                <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-full bg-blue-50 text-[#0f6cbd] font-semibold border border-blue-100">
                  Operador Ativo
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 2: PRODUTO & POSTO */}
          {/* ========================================================================= */}
          {activeTab === 'pecas' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#0f6cbd]" />
                  <span>Produto, Peça e Posto de Trabalho</span>
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Vínculo com o catálogo de engenharia de peças da montadora.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">
                    Tipo de Peça / Montagem
                  </label>
                  <select 
                    className="form-input"
                    value={form.finalComponente}
                    onChange={e => setForm({ ...form, finalComponente: e.target.value as any })}
                  >
                    <option value="Peça Final">Peça Final (Conjunto Soldado / Montado)</option>
                    <option value="Componente">Componente (Peça Estampada Individual)</option>
                    <option value="Peça Final + Componente">Peça Final + Componente</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Posto de Trabalho (Origem)
                  </label>
                  <select 
                    className="form-input"
                    value={form.posto}
                    onChange={e => setForm({ ...form, posto: e.target.value })}
                  >
                    <option value="">Selecione o posto...</option>
                    {postosDisponiveis.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">
                    Produto / Conjunto ({form.cliente}) <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    className={`form-input font-medium ${errors.produto ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-200' : ''}`}
                    value={form.produto}
                    onChange={e => {
                      handlePecaChange(e.target.value);
                      clearFieldError('produto');
                    }}
                  >
                    <option value="">Selecione a peça...</option>
                    {produtosDoCliente.map(p => (
                      <option key={p.codCliText} value={p.codCliText}>
                        {p.codCliText} - {p.descricao}
                      </option>
                    ))}
                  </select>
                  {errors.produto && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.produto}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Componente Específico
                  </label>
                  <select 
                    className="form-input"
                    value={form.componente}
                    onChange={e => setForm({ ...form, componente: e.target.value })}
                  >
                    {componentesDoProduto.length > 0 ? (
                      componentesDoProduto.map(c => (
                        <option key={c.componente || c.descricao} value={c.componente || c.descricao}>
                          {c.componente || c.descricao}
                        </option>
                      ))
                    ) : (
                      <option value={form.produto}>{form.produto || 'Peça Principal'}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Área / FMDS
                  </label>
                  <select 
                    className="form-input"
                    value={form.fmds}
                    onChange={e => setForm({ ...form, fmds: e.target.value })}
                  >
                    <option value="">Selecione FMDS...</option>
                    {fmdsDisponiveis.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 3: DEFEITO & FOTOS */}
          {/* ========================================================================= */}
          {activeTab === 'defeito' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0f6cbd]" />
                  <span>Descrição da Não Conformidade e Evidências Fotográficas</span>
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Detalhes do defeito e upload direto das fotografias de peça NG e padrão OK.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    Descrição do Defeito / Modo de Falha <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    className={`form-input font-medium ${errors.descricaoProblema ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-200' : ''}`}
                    placeholder="Ex: Trinca na solda, Deformação dimensional, Furo obstruído..."
                    value={form.descricaoProblema}
                    onChange={e => {
                      setForm({ ...form, descricaoProblema: e.target.value });
                      clearFieldError('descricaoProblema');
                    }}
                  />
                  {errors.descricaoProblema && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.descricaoProblema}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Detalhamento do Ocorrido (O que aconteceu na fábrica / cliente)
                  </label>
                  <textarea 
                    rows={3}
                    className="form-input resize-y"
                    placeholder="Descreva o contexto operacional, posição do robô, impacto na montagem..."
                    value={form.descricaoCompleta || ''}
                    onChange={e => setForm({ ...form, descricaoCompleta: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">
                      Quantidade Afetada (Peças) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      min="1"
                      className={`form-input font-mono font-bold ${errors.quantidadeAfetada ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-200' : ''}`}
                      value={form.quantidadeAfetada}
                      onChange={e => {
                        setForm({ ...form, quantidadeAfetada: Number(e.target.value) });
                        clearFieldError('quantidadeAfetada');
                      }}
                    />
                    {errors.quantidadeAfetada && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.quantidadeAfetada}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      Gravidade da Falha
                    </label>
                    <select 
                      className="form-input"
                      value={form.gravidade || 'Média'}
                      onChange={e => setForm({ ...form, gravidade: e.target.value })}
                    >
                      <option value="Baixa">Baixa (Estética não aparente)</option>
                      <option value="Média">Média (Montagem com ajuste)</option>
                      <option value="Alta">Alta (Impossibilita montagem cliente)</option>
                      <option value="Crítica">Crítica (Item de Segurança)</option>
                    </select>
                  </div>
                </div>

                {/* EVIDÊNCIAS FOTOGRÁFICAS COM SUPORTE A UPLOAD E URL */}
                <div className="pt-4 border-t border-[#e2e8f0]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0f172a]">
                      Fotografias Registradas (NG vs OK)
                    </span>
                    <span className="text-xs text-[#64748b]">Upload direto ou link SharePoint</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    {/* Card Foto NG */}
                    <div className="card-saas p-4 border-2 border-rose-200 bg-rose-50/30 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-rose-800 pb-2 border-b border-rose-200">
                          <span>Peça Não Conforme (NG - Defeito)</span>
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                            Defeito
                          </span>
                        </div>

                        <div className="h-48 rounded-xl bg-white border border-rose-200 overflow-hidden my-3 flex items-center justify-center p-1.5 shadow-2xs">
                          <ImageWithFallback 
                            src={form.fotoPecaNg}
                            alt="Peça NG"
                            variant="ng"
                            className="w-full h-full object-contain"
                            emptyLabel="Sem foto anexada"
                            allowZoom={true}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input 
                          type="file" 
                          ref={fileInputNgRef} 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => handleFileUpload(e, 'fotoPecaNg')} 
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputNgRef.current?.click()}
                            className="btn-secondary w-full text-xs h-9 font-semibold text-rose-800 bg-white border-rose-300 hover:bg-rose-50"
                          >
                            <Upload className="w-3.5 h-3.5 text-rose-600" />
                            <span>Carregar Foto NG</span>
                          </button>
                        </div>
                        <input 
                          type="text"
                          className="form-input text-xs font-mono h-8"
                          placeholder="Ou cole a URL da imagem..."
                          value={form.fotoPecaNg}
                          onChange={e => setForm({ ...form, fotoPecaNg: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Card Foto OK */}
                    <div className="card-saas p-4 border-2 border-emerald-200 bg-emerald-50/30 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800 pb-2 border-b border-emerald-200">
                          <span>Peça Conforme (OK - Padrão)</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            Padrão
                          </span>
                        </div>

                        <div className="h-48 rounded-xl bg-white border border-emerald-200 overflow-hidden my-3 flex items-center justify-center p-1.5 shadow-2xs">
                          <ImageWithFallback 
                            src={form.fotoPecaOk}
                            alt="Peça OK"
                            variant="ok"
                            className="w-full h-full object-contain"
                            emptyLabel="Sem foto padrão cadastrada"
                            allowZoom={true}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input 
                          type="file" 
                          ref={fileInputOkRef} 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => handleFileUpload(e, 'fotoPecaOk')} 
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputOkRef.current?.click()}
                            className="btn-secondary w-full text-xs h-9 font-semibold text-emerald-800 bg-white border-emerald-300 hover:bg-emerald-50"
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Carregar Foto OK</span>
                          </button>
                        </div>
                        <input 
                          type="text"
                          className="form-input text-xs font-mono h-8"
                          placeholder="Ou cole a URL da imagem..."
                          value={form.fotoPecaOk}
                          onChange={e => setForm({ ...form, fotoPecaOk: e.target.value })}
                        />
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 4: AVALIAÇÃO DE RISCO */}
          {/* ========================================================================= */}
          {activeTab === 'risco' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#0f6cbd]" />
                  <span>Matriz de Risco e Segurança do Produto</span>
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Classificação de criticidade, itens de segurança, co-produto e reincidência.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="p-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                  <label className="form-label">
                    Item de Segurança?
                  </label>
                  <select 
                    className="form-input"
                    value={form.caracteristicaSeguranca}
                    onChange={e => setForm({ ...form, caracteristicaSeguranca: e.target.value as any })}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim (Componente de Proteção / Airbag / Cinto)</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                  <label className="form-label">
                    Co-Produto Afetado?
                  </label>
                  <select 
                    className="form-input"
                    value={form.coProduto}
                    onChange={e => setForm({ ...form, coProduto: e.target.value as any })}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                  <label className="form-label">
                    Carry Over?
                  </label>
                  <select 
                    className="form-input"
                    value={form.carryOver}
                    onChange={e => setForm({ ...form, carryOver: e.target.value as any })}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc]">
                  <label className="form-label">
                    Falha Reincidente?
                  </label>
                  <select 
                    className="form-input"
                    value={form.reincidente}
                    onChange={e => setForm({ ...form, reincidente: e.target.value as any })}
                  >
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM (Já ocorrido nos últimos 12 meses)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 5: CONTENÇÃO (D3) */}
          {/* ========================================================================= */}
          {activeTab === 'contencao' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0f6cbd]" />
                  <span>Ações de Contenção Imediata (D3) & Diretrizes 5W2H</span>
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Proteção da linha do cliente e estoque em quarentena.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">
                    Ações de Contenção Adotadas
                  </label>
                  <textarea 
                    rows={2}
                    className="form-input resize-y"
                    placeholder="Ex: Segregação 100% no posto, Inspeção visual por amostragem, Quarentena..."
                    value={form.acoesContencao || ''}
                    onChange={e => setForm({ ...form, acoesContencao: e.target.value })}
                  />
                </div>

                {/* Métricas de Contenção */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-3.5 rounded-xl border border-[#e2e8f0] bg-blue-50/50">
                    <span className="text-[11px] font-bold text-[#0f6cbd] uppercase block">
                      Inspecionadas
                    </span>
                    <input 
                      type="number"
                      min="0"
                      className="form-input mt-1.5 font-mono font-bold"
                      value={form.qtdInspecionada || 0}
                      onChange={e => setForm({ ...form, qtdInspecionada: Number(e.target.value) })}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                    <span className="text-[11px] font-bold text-rose-800 uppercase block">
                      Bloqueadas
                    </span>
                    <input 
                      type="number"
                      min="0"
                      className="form-input mt-1.5 font-mono font-bold"
                      value={form.qtdBloqueada || 0}
                      onChange={e => setForm({ ...form, qtdBloqueada: Number(e.target.value) })}
                    />
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
                    <span className="text-[11px] font-bold text-amber-800 uppercase block">
                      Suspeitas
                    </span>
                    <input 
                      type="number"
                      min="0"
                      className="form-input mt-1.5 font-mono font-bold"
                      value={form.qtdSuspeita || 0}
                      onChange={e => setForm({ ...form, qtdSuspeita: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* 5W2H */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#f1f5f9]">
                  <div>
                    <label className="form-label">O que fazer? (What)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ação corretiva..."
                      value={form.oQueFazer || ''}
                      onChange={e => setForm({ ...form, oQueFazer: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Como fazer? (How)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Procedimento técnico..."
                      value={form.comoFazer || ''}
                      onChange={e => setForm({ ...form, comoFazer: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Por que fazer? (Why)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Garantir a não evasão do defeito..."
                      value={form.porQueFazer || ''}
                      onChange={e => setForm({ ...form, porQueFazer: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Quem fará? (Who)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Responsável da contenção..."
                      value={form.quemFara || ''}
                      onChange={e => setForm({ ...form, quemFara: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 6: SAP & DECISÃO 8D */}
          {/* ========================================================================= */}
          {activeTab === '8d' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="border-b border-[#f1f5f9] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0f6cbd]" />
                  <span>Rastreabilidade SAP e Decisão Metodologia 8D</span>
                </h2>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Vínculo com etiqueta SAP de 9 dígitos e decisão formal de abertura de relatório 8D.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="form-label">
                    Tipo de Documento de Rastreabilidade
                  </label>
                  <select 
                    className="form-input"
                    value={form.documentoRastreabilidade}
                    onChange={e => setForm({ ...form, documentoRastreabilidade: e.target.value as any })}
                  >
                    <option value="Etiqueta SAP">Etiqueta SAP (Padrão)</option>
                    <option value="Ordem de Produção">Ordem de Produção</option>
                    <option value="Lote Fornecedor">Lote Fornecedor</option>
                    <option value="Nota Fiscal">Nota Fiscal</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Código de Rastreabilidade / Etiqueta SAP
                  </label>
                  <input 
                    type="text"
                    className="form-input font-mono font-bold"
                    placeholder="Ex: 668327624 (9 dígitos)"
                    value={form.codigoRastreabilidade}
                    onChange={e => setForm({ ...form, codigoRastreabilidade: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">
                    Ativar Proteção ao Cliente?
                  </label>
                  <select 
                    className="form-input"
                    value={form.protcliente}
                    onChange={e => setForm({ ...form, protcliente: e.target.value as any })}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim (Exige triagem 100% no estoque)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">
                    Abrir Metodologia 8D Completa?
                  </label>
                  <select 
                    className="form-input font-bold"
                    value={form.abrir8D}
                    onChange={e => setForm({ ...form, abrir8D: e.target.value as any })}
                  >
                    <option value="Não">Não (Tratativa Local RNC)</option>
                    <option value="Sim">Sim (8 Disciplinas Mandatórias)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </form>
      </div>

      {/* 4. BARRA INFERIOR ADESIVA / STICKY FOOTER PARA NAVEGAÇÃO ENTRE ETAPAS */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border border-[#e2e8f0] p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStepIndex === 0}
          className="btn-secondary h-10 px-4 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Etapa Anterior</span>
        </button>

        <div className="text-xs font-bold text-[#64748b] hidden sm:block">
          Etapa {currentStepObj.stepNum} de 6
        </div>

        <div className="flex items-center gap-2">
          {currentStepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="btn-primary h-10 px-5 text-xs font-bold"
            >
              <span>Próximo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary h-10 px-6 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 border-emerald-700"
            >
              <Check className="w-4 h-4" />
              <span>Concluir e Salvar RNC</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default Registro8DView;
