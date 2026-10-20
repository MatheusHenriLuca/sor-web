import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Save, 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Wrench, 
  Camera, 
  ShieldCheck, 
  ShieldAlert,
  Upload,
  ChevronDown,
  Info,
  Check,
  AlertCircle,
  Trash2,
  Eye,
  Sparkles,
  Clock,
  User,
  FileText,
  ChevronRight,
  ChevronUp,
  History,
  ExternalLink,
  Layers
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade, PecaCatalogo, TipoRNC } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, DEFAULT_CLIENTE, getClientBadgeInfo } from '../constants/clientes';
import { MODOS_FALHA_LIST, IMPACTOS_CLIENTE_LIST, GRAVIDADE_LIST } from '../constants/defeitos';

interface Registro8DViewProps {
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
  rncId?: number;
  edicao?: boolean;
}

// Determina o turno industrial de trabalho com base no horário local atual
export const getTurnoPorHorario = (): '1º Turno' | '2º Turno' | '3º Turno' => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  // 1º Turno: 06:00 (360 min) até 14:40 (880 min)
  // 2º Turno: 14:40 (880 min) até 23:15 (1395 min)
  // 3º Turno: 23:15 (1395 min) até 06:00 (360 min)
  if (minutes >= 360 && minutes < 880) {
    return '1º Turno';
  } else if (minutes >= 880 && minutes < 1395) {
    return '2º Turno';
  } else {
    return '3º Turno';
  }
};

export const Registro8DView: React.FC<Registro8DViewProps> = ({ 
  onNavigate, 
  currentUser,
  rncId,
  edicao = false
}) => {
  const [pecasCatalogo, setPecasCatalogo] = useState<PecaCatalogo[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewFoto, setPreviewFoto] = useState<{ url: string; titulo: string } | null>(null);
  const [qualidadeExpandida, setQualidadeExpandida] = useState<boolean>(false);
  const [mostrarHistorico, setMostrarHistorico] = useState<boolean>(false);

  const fileInputNgRef = useRef<HTMLInputElement>(null);
  const fileInputOkRef = useRef<HTMLInputElement>(null);

  // Form State - Estritamente limpo na criação: campos que dependem de escolha iniciam vazios
  const [form, setForm] = useState<Partial<RNCRecord>>({
    tipoRnc: '' as any,
    status: 'Relatório Inicial',
    cliente: '',
    dataOcorrencia: new Date().toISOString().split('T')[0],
    dataOficializacao: new Date().toISOString().split('T')[0],
    codOcorrenciaCliente: '',
    impactoCliente: '',
    detalhamentoOcorrencia: '',
    classificacaoSetor: '',
    setorDeteccao: '',
    turno: getTurnoPorHorario(),
    produto: '',
    componente: '',
    finalComponente: 'Peça Final',
    quantidadeAfetada: '' as any,
    modoFalha: '',
    descricaoProblema: '',
    descricaoCompleta: '',
    caracteristicaSeguranca: 'Não',
    coProduto: 'Não',
    carryOver: 'Não',
    reincidente: 'NÃO',
    gravidade: 'Média',
    possivelDetectar: 'Sim',
    posto: '',
    fmds: '',
    acoesContencao: '',
    dataContencao: '',
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
    abrir8D: 'Sim',
    protcliente: 'Não',
    detector: currentUser.nome,
    reDetector: currentUser.reAcesso,
    fotoPecaNg: '',
    fotoPecaOk: ''
  });

  // Carregamento de catálogo e dados iniciais
  useEffect(() => {
    const catalogo = spStore.getColPecasGeraisAA3();
    setPecasCatalogo(catalogo);

    if (edicao && rncId) {
      const existente = spStore.getRNCById(rncId);
      if (existente) {
        setForm(existente);
        if (existente.acoesContencao || existente.oQueFazer) {
          setQualidadeExpandida(true);
        }
      }
    } else {
      // Novo apontamento: 100% limpo! Somente data de hoje e turno automático pelo horário vêm preenchidos
      setForm({
        tipoRnc: '' as any,
        status: 'Relatório Inicial',
        cliente: '',
        dataOcorrencia: new Date().toISOString().split('T')[0],
        dataOficializacao: new Date().toISOString().split('T')[0],
        codOcorrenciaCliente: '',
        impactoCliente: '',
        detalhamentoOcorrencia: '',
        classificacaoSetor: '',
        setorDeteccao: '',
        turno: getTurnoPorHorario(),
        produto: '',
        componente: '',
        finalComponente: 'Peça Final',
        quantidadeAfetada: '' as any,
        modoFalha: '',
        descricaoProblema: '',
        descricaoCompleta: '',
        caracteristicaSeguranca: 'Não',
        coProduto: 'Não',
        carryOver: 'Não',
        reincidente: 'NÃO',
        gravidade: 'Média',
        possivelDetectar: 'Sim',
        posto: '',
        fmds: '',
        acoesContencao: '',
        dataContencao: '',
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
        abrir8D: 'Sim',
        protcliente: 'Não',
        detector: currentUser.nome,
        reDetector: currentUser.reAcesso,
        fotoPecaNg: '',
        fotoPecaOk: ''
      });
    }
  }, [edicao, rncId, currentUser]);

  const produtosDoCliente = useMemo(() => {
    if (!form.cliente) return [];
    return spStore.getProdutosPorCliente(form.cliente);
  }, [form.cliente]);

  const componentesDoProduto = useMemo(() => {
    if (!form.produto) return [];
    return spStore.getComponentesPorProduto(form.produto);
  }, [form.produto]);

  // Histórico de reincidências calculado da mesma forma que a Gallery1 do Power Apps
  const historicoReincidencias = useMemo(() => {
    if (!form.produto) return [];
    return spStore.getHistoricoReincidencias(form.produto, form.modoFalha, rncId);
  }, [form.produto, form.modoFalha, rncId]);

  const postosDisponiveis = useMemo(() => spStore.getDistinctPostos(), []);
  const fmdsDisponiveis = useMemo(() => spStore.getDistinctFMDS(), []);

  const clearFieldError = (fieldName: string) => {
    setErrors(prev => {
      if (!prev[fieldName]) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  // Regra ProEPS: Troca de Cliente apenas disponibiliza a lista de peças daquele cliente.
  // Nenhum produto ou posto é preenchido automaticamente antes da escolha do usuário!
  const handleClienteChange = (novoCliente: string) => {
    clearFieldError('cliente');
    clearFieldError('produto');
    setForm(prev => ({
      ...prev,
      cliente: novoCliente,
      produto: '',
      componente: '',
      posto: '',
      fmds: '',
      classificacaoSetor: '',
      carryOver: 'Não',
      coProduto: 'Não',
      caracteristicaSeguranca: 'Não',
      reincidente: 'NÃO'
    }));
  };

  // Regra ProEPS: Somente quando o usuário escolhe a peça é que os dados associados
  // (Posto, FMDS, Componente, CarryOver, Co-produto e Peça de Segurança) são preenchidos automaticamente!
  const handlePecaChange = (codCliTextOuMaterial: string) => {
    clearFieldError('produto');
    if (!codCliTextOuMaterial) {
      setForm(prev => ({
        ...prev,
        produto: '',
        componente: '',
        posto: '',
        fmds: '',
        classificacaoSetor: '',
        carryOver: 'Não',
        coProduto: 'Não',
        caracteristicaSeguranca: 'Não',
        reincidente: 'NÃO'
      }));
      return;
    }

    const selecionada = pecasCatalogo.find(
      p => p.codCliText === codCliTextOuMaterial || p.material === codCliTextOuMaterial
    );

    if (selecionada) {
      const prodKey = selecionada.codCliText || selecionada.material;
      // Formula do Power Apps: Filter(varReincidente, Left(produto,9) = Material || Left(componente,9) = Componente)
      const reincList = spStore.getHistoricoReincidencias(prodKey, form.modoFalha, rncId);
      const isReinc = reincList.length > 0 ? 'SIM' : 'NÃO';

      setForm(prev => ({
        ...prev,
        produto: prodKey,
        componente: selecionada.descricao || selecionada.componente || '',
        finalComponente: 'Peça Final',
        posto: selecionada.posto || '',
        fmds: selecionada.fmds || '',
        classificacaoSetor: selecionada.fmds || '',
        carryOver: selecionada.carryOver === 'Sim' ? 'Sim' : 'Não',
        coProduto: selecionada.coProduto === 'Sim' ? 'Sim' : 'Não',
        caracteristicaSeguranca: selecionada.caracteristicaSeguranca === 'Sim' ? 'Sim' : 'Não',
        reincidente: isReinc
      }));
    }
  };

  // Regra ProEPS: Troca do Tipo de Componente ou seleção de Componente Específico
  const handleComponenteChange = (novoComponente: string) => {
    if (!novoComponente) {
      setForm(prev => ({ ...prev, componente: '' }));
      return;
    }

    const compObj = pecasCatalogo.find(
      p => p.componente === novoComponente || p.descricao === novoComponente || p.codCliText === novoComponente
    );

    setForm(prev => ({
      ...prev,
      componente: novoComponente,
      posto: compObj?.posto || prev.posto,
      fmds: compObj?.fmds || prev.fmds,
      classificacaoSetor: compObj?.fmds || prev.classificacaoSetor
    }));
  };

  // Upload de Evidências Fotográficas
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
      setNotification({ type: 'success', message: 'Evidência fotográfica anexada com sucesso!' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFoto = (field: 'fotoPecaNg' | 'fotoPecaOk') => {
    setForm(prev => ({ ...prev, [field]: '' }));
  };

  // Validação focada exclusivamente no Relatório Inicial
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.cliente || !form.cliente.trim()) {
      newErrors.cliente = 'Selecione o Cliente / Montadora.';
    }
    if (!form.tipoRnc) {
      newErrors.tipoRnc = 'Selecione o Tipo de Ocorrência (Formal, Informal ou Interno).';
    }
    if (!form.dataOcorrencia || !form.dataOcorrencia.trim()) {
      newErrors.dataOcorrencia = 'Informe a data da ocorrência.';
    }
    if (!form.produto || !form.produto.trim()) {
      newErrors.produto = 'Selecione a Peça / Conjunto da ocorrência.';
    }
    if (!form.modoFalha && (!form.descricaoProblema || form.descricaoProblema.trim().length < 3)) {
      newErrors.descricaoProblema = 'Selecione a classificação do defeito (modo de falha) ou descreva o problema.';
    }
    if (form.quantidadeAfetada === undefined || form.quantidadeAfetada === null || String(form.quantidadeAfetada).trim() === '' || Number(form.quantidadeAfetada) <= 0) {
      newErrors.quantidadeAfetada = 'Informe a quantidade de peças afetadas (maior que zero).';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      setNotification({
        type: 'error',
        message: firstError || 'Preencha todos os campos obrigatórios do Relatório Inicial.'
      });
      return false;
    }

    return true;
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) return;

    try {
      if (edicao && rncId) {
        spStore.updateRNC(rncId, form);
        setNotification({ type: 'success', message: `Ocorrência RNC #${rncId} atualizada com sucesso!` });
      } else {
        const payload: Omit<RNCRecord, 'id'> = {
          title: '',
          tipoRnc: form.tipoRnc || 'Formal',
          status: 'Relatório Inicial',
          cliente: form.cliente || DEFAULT_CLIENTE,
          dataOcorrencia: form.dataOcorrencia || new Date().toISOString().split('T')[0],
          dataOficializacao: form.dataOficializacao || new Date().toISOString().split('T')[0],
          codOcorrenciaCliente: form.codOcorrenciaCliente || '',
          impactoCliente: form.impactoCliente || '',
          detalhamentoOcorrencia: form.detalhamentoOcorrencia || '',
          classificacaoSetor: form.classificacaoSetor || form.fmds || 'SOLDA 2 - CEL. TOYOTA',
          setorDeteccao: form.setorDeteccao || 'Linha de Produção',
          turno: form.turno || getTurnoPorHorario(),
          produto: form.produto || '',
          componente: form.componente || '',
          finalComponente: form.finalComponente || 'Peça Final',
          quantidadeAfetada: Number(form.quantidadeAfetada) || 1,
          modoFalha: form.modoFalha || '',
          descricaoProblema: form.descricaoProblema || form.modoFalha || '',
          descricaoCompleta: form.descricaoCompleta || form.descricaoProblema || '',
          caracteristicaSeguranca: form.caracteristicaSeguranca || 'Não',
          coProduto: form.coProduto || 'Não',
          carryOver: form.carryOver || 'Não',
          reincidente: form.reincidente || 'NÃO',
          gravidade: form.gravidade || 'Média',
          possivelDetectar: form.possivelDetectar || 'Sim',
          posto: form.posto || 'POSTO 01',
          fmds: form.fmds || 'SOLDA GERAL',
          documentoRastreabilidade: form.documentoRastreabilidade || 'Etiqueta SAP',
          codigoRastreabilidade: form.codigoRastreabilidade || '',
          protcliente: form.codigoRastreabilidade ? 'Sim' : 'Não',
          abrir8D: 'Sim',
          detector: currentUser.nome,
          reDetector: currentUser.reAcesso,
          fotoPecaNg: form.fotoPecaNg || '',
          fotoPecaOk: form.fotoPecaOk || '',
          acoesContencao: form.acoesContencao || '',
          dataContencao: form.dataContencao || '',
          qtdInspecionada: Number(form.qtdInspecionada) || 0,
          qtdSuspeita: Number(form.qtdSuspeita) || 0,
          qtdBloqueada: Number(form.qtdBloqueada) || 0,
          oQueFazer: form.oQueFazer || '',
          comoFazer: form.comoFazer || '',
          porQueFazer: form.porQueFazer || '',
          quemFara: form.quemFara || '',
          quandoFara: form.quandoFara || '',
          ondeFara: form.ondeFara || ''
        };

        const novaRnc = spStore.addRNC(payload);
        setNotification({ 
          type: 'success', 
          message: `Relatório Inicial criado com sucesso! Código: ${novaRnc.field1 || `RNC #${novaRnc.id}`}` 
        });
      }

      setTimeout(() => {
        onNavigate('lista-8d');
      }, 900);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erro ao salvar: ${err.message || 'Falha desconhecida'}` });
    }
  };

  const clientBadge = form.cliente ? getClientBadgeInfo(form.cliente) : null;
  const isPecaSelecionada = Boolean(form.produto && form.produto.trim());

  return (
    <div className="w-full flex flex-col gap-5 pb-24 animate-in fade-in duration-150">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold shadow-lg border ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 p-1 text-slate-400 hover:text-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Foto */}
      {previewFoto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 flex flex-col gap-3 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-display font-bold text-slate-900">{previewFoto.titulo}</h3>
              <button 
                type="button"
                onClick={() => setPreviewFoto(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full max-h-[75vh] flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden">
              <img 
                src={previewFoto.url} 
                alt={previewFoto.titulo} 
                className="max-h-[72vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR: CONTEXTO, TÍTULO E AÇÕES (LARGURA TOTAL) */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => onNavigate('lista-8d')}
            className="btn-secondary h-9 px-3 text-xs"
            title="Voltar para a lista de ocorrências"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-display font-semibold uppercase tracking-wider text-[#0b5796] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 shadow-2xs">
                {edicao ? 'Edição da Ocorrência' : 'Novo Lançamento'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Etapa 1: Relatório Inicial
              </span>
            </div>
            <h1 className="text-base sm:text-2xl font-display font-bold text-slate-900 mt-0.5">
              {edicao ? `Ocorrência: ${form.field1 || `RNC #${form.id}`}` : 'Relatório Inicial de Não Conformidade'}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Preenchimento inicial de fábrica. A equipe da Qualidade complementará a contenção e rastreabilidade posteriormente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button 
            type="button"
            onClick={() => onNavigate('lista-8d')}
            className="btn-secondary h-9 px-3.5 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="btn-primary h-9 px-4 text-xs font-semibold shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span className="font-display">
              {edicao ? 'Salvar Alterações' : 'Emitir Relatório Inicial'}
            </span>
          </button>
        </div>
      </div>

      {/* FORMULÁRIO RESPONSIVO DE LARGURA TOTAL */}
      <form onSubmit={handleSave} className="w-full flex flex-col gap-5">
        
        {/* =========================================================================
            CARD 1: DADOS GERAIS DA NÃO CONFORMIDADE & MONTADORA
            ========================================================================= */}
        <div className="w-full card-saas p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0b5796] flex items-center justify-center font-bold">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-slate-900">
                  1. Dados Gerais & Montadora
                </h2>
                <p className="text-xs text-slate-500">
                  Identificação do cliente montadora, classificação da ocorrência e dados de emissão.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              Chão de Fábrica
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Cliente / Montadora (Inicia vazio para o usuário escolher) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Cliente (Montadora) <strong className="text-rose-500">*</strong></span>
                {clientBadge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${clientBadge.bg} ${clientBadge.color}`}>
                    {form.cliente}
                  </span>
                )}
              </label>
              <select
                value={form.cliente || ''}
                onChange={e => handleClienteChange(e.target.value)}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.cliente ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                <option value="">-- Selecione a Montadora --</option>
                {CLIENTES_LIST.map(cli => (
                  <option key={cli} value={cli}>{cli}</option>
                ))}
              </select>
              {errors.cliente && <span className="text-[11px] text-rose-500 font-medium">{errors.cliente}</span>}
            </div>

            {/* Tipo de Ocorrência (Inicia vazio para o usuário escolher) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Tipo de Ocorrência <strong className="text-rose-500">*</strong>
              </label>
              <select
                value={form.tipoRnc || ''}
                onChange={e => {
                  clearFieldError('tipoRnc');
                  setForm(prev => ({ ...prev, tipoRnc: e.target.value as TipoRNC }));
                }}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.tipoRnc ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                <option value="">-- Selecione o Tipo --</option>
                <option value="Formal">Formal (Reclamação Oficial do Cliente)</option>
                <option value="Informal">Informal (Alerta / Contato da Montadora)</option>
                <option value="Interno">Interno (Detecção Interna na Linha de Produção)</option>
              </select>
              {errors.tipoRnc && <span className="text-[11px] text-rose-500 font-medium">{errors.tipoRnc}</span>}
            </div>

            {/* Data da Ocorrência (Vem data de hoje por padrão, editável) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Data da Ocorrência <strong className="text-rose-500">*</strong>
              </label>
              <input
                type="date"
                value={form.dataOcorrencia || ''}
                onChange={e => {
                  clearFieldError('dataOcorrencia');
                  setForm(prev => ({ ...prev, dataOcorrencia: e.target.value }));
                }}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.dataOcorrencia ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              />
              {errors.dataOcorrencia && <span className="text-[11px] text-rose-500 font-medium">{errors.dataOcorrencia}</span>}
            </div>

            {/* Turno de Detecção (Calculado automaticamente pelo horário atual) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Turno de Detecção</span>
                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                  Horário atual
                </span>
              </label>
              <select
                value={form.turno || '1º Turno'}
                onChange={e => setForm(prev => ({ ...prev, turno: e.target.value as any }))}
                className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
              >
                <option value="1º Turno">1º Turno (06:00 - 14:40)</option>
                <option value="2º Turno">2º Turno (14:40 - 23:15)</option>
                <option value="3º Turno">3º Turno (23:15 - 06:00)</option>
                <option value="Central">Turno Central / Administrativo</option>
              </select>
            </div>

            {/* Setor de Detecção (Inicia vazio para o usuário preencher) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Setor de Detecção
              </label>
              <input
                type="text"
                value={form.setorDeteccao || ''}
                onChange={e => setForm(prev => ({ ...prev, setorDeteccao: e.target.value }))}
                placeholder="Ex: Linha de Solda, Estamparia..."
                className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
              />
            </div>
          </div>

          {/* CAMPOS CONDICIONAIS PELO TIPO DE OCORRÊNCIA */}
          {form.tipoRnc && (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3 animate-in fade-in duration-200">
              {form.tipoRnc === 'Formal' && (
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0b5796]">
                    <FileText className="w-4 h-4" />
                    <span>Dados Complementares do Registro Formal (Portal do Cliente / Montadora)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Código / ID no Portal do Cliente
                      </label>
                      <input
                        type="text"
                        value={form.codOcorrenciaCliente || ''}
                        onChange={e => setForm(prev => ({ ...prev, codOcorrenciaCliente: e.target.value }))}
                        placeholder="Ex: RECL-2026-VW-019 ou Q-NOTIF-TOYOTA"
                        className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Data de Oficialização no Portal
                      </label>
                      <input
                        type="date"
                        value={form.dataOficializacao || ''}
                        onChange={e => setForm(prev => ({ ...prev, dataOficializacao: e.target.value }))}
                        className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Impacto na Linha da Montadora
                      </label>
                      <select
                        value={form.impactoCliente || ''}
                        onChange={e => setForm(prev => ({ ...prev, impactoCliente: e.target.value }))}
                        className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none"
                      >
                        <option value="">-- Selecione o Impacto --</option>
                        {IMPACTOS_CLIENTE_LIST.map(imp => (
                          <option key={imp} value={imp}>{imp}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Detalhamento / Informações Adicionais do Cliente
                    </label>
                    <textarea
                      rows={2}
                      value={form.detalhamentoOcorrencia || ''}
                      onChange={e => setForm(prev => ({ ...prev, detalhamentoOcorrencia: e.target.value }))}
                      placeholder="Informações transmitidas pelo analista do cliente ou engenheiro residente da montadora..."
                      className="w-full p-2.5 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none resize-y"
                    />
                  </div>
                </div>
              )}

              {form.tipoRnc === 'Informal' && (
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Registro Informal / Alerta Preventivo da Montadora</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Grau / Impacto do Alerta
                      </label>
                      <select
                        value={form.impactoCliente || ''}
                        onChange={e => setForm(prev => ({ ...prev, impactoCliente: e.target.value }))}
                        className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none"
                      >
                        <option value="">-- Selecione o Impacto --</option>
                        {IMPACTOS_CLIENTE_LIST.map(imp => (
                          <option key={imp} value={imp}>{imp}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Contato / Informante no Cliente
                      </label>
                      <input
                        type="text"
                        value={form.detalhamentoOcorrencia || ''}
                        onChange={e => setForm(prev => ({ ...prev, detalhamentoOcorrencia: e.target.value }))}
                        placeholder="Ex: Alerta enviado via WhatsApp pelo engenheiro de campo..."
                        className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.tipoRnc === 'Interno' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-700">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>Ocorrência Interna de Fábrica:</strong> identificada na linha de estamparia, solda ou inspeção antes do envio ao cliente. Prioridade para contenção imediata no posto.</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                    Contenção Interna
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            CARD 2: IDENTIFICAÇÃO DA PEÇA & POSTO (AUTOPREENCHIMENTO PROEPS)
            ========================================================================= */}
        <div className="w-full card-saas p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-slate-900">
                  2. Peça, Posto & FMDS (Autopreenchimento ProEPS)
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione o produto. As informações cadastradas de posto de trabalho e área FMDS serão preenchidas automaticamente.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-lg border border-emerald-200/70 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Base colpecasgerais_AA3 ativa</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {/* Produto / Conjunto (Peça Final) - Ocupa 2 colunas */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Produto / Conjunto (Peça Final) <strong className="text-rose-500">*</strong></span>
                {form.cliente ? (
                  <span className="text-[11px] text-slate-500">
                    {produtosDoCliente.length} peças cadastradas para {form.cliente}
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-600 font-medium">
                    Selecione a Montadora primeiro
                  </span>
                )}
              </label>
              <select
                disabled={!form.cliente}
                value={form.produto || ''}
                onChange={e => handlePecaChange(e.target.value)}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  !form.cliente ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' :
                  errors.produto ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                {!form.cliente ? (
                  <option value="">-- Selecione a Montadora primeiro no Passo 1 --</option>
                ) : (
                  <>
                    <option value="">-- Selecione o Produto / Conjunto --</option>
                    {produtosDoCliente.map(p => (
                      <option key={`${p.identificacao}-${p.codCliText}`} value={p.codCliText || p.material}>
                        {p.codCliText ? `${p.codCliText} - ` : ''}{p.descricao} (SAP: {p.material})
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.produto && <span className="text-[11px] text-rose-500 font-medium">{errors.produto}</span>}
            </div>

            {/* Tipo de Componente */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Tipo de Componente
              </label>
              <select
                disabled={!isPecaSelecionada}
                value={form.finalComponente || 'Peça Final'}
                onChange={e => {
                  const val = e.target.value as any;
                  setForm(prev => ({
                    ...prev,
                    finalComponente: val,
                    componente: val === 'Peça Final' 
                      ? (pecasCatalogo.find(p => p.codCliText === prev.produto || p.material === prev.produto)?.descricao || prev.componente)
                      : prev.componente
                  }));
                }}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  !isPecaSelecionada ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                <option value="Peça Final">Peça Final (Conjunto Completo)</option>
                <option value="Peça Final + Componente">Peça Final + Componente</option>
                <option value="Componente">Componente Isolado</option>
                <option value="SubComponente + Componente">SubComponente + Componente</option>
              </select>
            </div>

            {/* Componente / Descrição da Peça */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Componente</span>
                {isPecaSelecionada && (
                  <span className="text-[10px] font-medium text-emerald-700">
                    {form.finalComponente === 'Peça Final' ? 'Conjunto' : 'Subcomponente'}
                  </span>
                )}
              </label>
              {!isPecaSelecionada ? (
                <input
                  type="text"
                  disabled
                  placeholder="Aguardando seleção da peça..."
                  className="w-full h-10 px-3 bg-slate-50 text-slate-400 text-xs sm:text-sm rounded-xl border border-slate-200 cursor-not-allowed outline-none"
                />
              ) : form.finalComponente === 'Peça Final' ? (
                <input
                  type="text"
                  value={form.componente || ''}
                  onChange={e => setForm(prev => ({ ...prev, componente: e.target.value }))}
                  className="w-full h-10 px-3 bg-slate-50 text-slate-800 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] outline-none"
                  placeholder="Nome do componente"
                />
              ) : (
                <select
                  value={form.componente || ''}
                  onChange={e => handleComponenteChange(e.target.value)}
                  className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
                >
                  <option value="">-- Selecione o subcomponente --</option>
                  {componentesDoProduto.map(c => (
                    <option key={`${c.identificacao}-${c.codCliText}`} value={c.descricao || c.componente}>
                      {c.codCliText ? `${c.codCliText} - ` : ''}{c.descricao}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Posto de Trabalho (Preenchido após seleção da peça) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Posto de Trabalho Cadastrado</span>
                {isPecaSelecionada && form.posto && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    ✓ Autopreenchido
                  </span>
                )}
              </label>
              {!isPecaSelecionada ? (
                <input
                  type="text"
                  disabled
                  placeholder="Aguardando seleção da peça..."
                  className="w-full h-10 px-3 bg-slate-50 text-slate-400 text-xs sm:text-sm rounded-xl border border-slate-200 cursor-not-allowed outline-none"
                />
              ) : (
                <select
                  value={form.posto || ''}
                  onChange={e => setForm(prev => ({ ...prev, posto: e.target.value }))}
                  className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
                >
                  {form.posto && !postosDisponiveis.includes(form.posto) && (
                    <option value={form.posto}>{form.posto}</option>
                  )}
                  {postosDisponiveis.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Área FMDS / Setor Fabril (Preenchido após seleção da peça) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Área FMDS / Setor Fabril</span>
                {isPecaSelecionada && form.fmds && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    ✓ Autopreenchido
                  </span>
                )}
              </label>
              {!isPecaSelecionada ? (
                <input
                  type="text"
                  disabled
                  placeholder="Aguardando seleção da peça..."
                  className="w-full h-10 px-3 bg-slate-50 text-slate-400 text-xs sm:text-sm rounded-xl border border-slate-200 cursor-not-allowed outline-none"
                />
              ) : (
                <select
                  value={form.fmds || ''}
                  onChange={e => setForm(prev => ({ 
                    ...prev, 
                    fmds: e.target.value,
                    classificacaoSetor: e.target.value 
                  }))}
                  className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
                >
                  {form.fmds && !fmdsDisponiveis.includes(form.fmds) && (
                    <option value={form.fmds}>{form.fmds}</option>
                  )}
                  {fmdsDisponiveis.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              )}
            </div>

            {/* LINHA DE BADGES DE ATRIBUTOS DA PEÇA (CARRY OVER, CO-PRODUTO, SEGURANÇA) */}
            <div className="flex flex-wrap items-center gap-3 pt-2 md:col-span-2 lg:col-span-3 xl:col-span-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mr-1">Atributos da Peça:</span>
              
              {/* Carry Over */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 bg-slate-50/50 text-xs font-semibold shadow-2xs">
                <span className="text-slate-500">Carry Over:</span>
                <span className={`font-bold ${
                  !isPecaSelecionada ? 'text-slate-400' :
                  form.carryOver === 'Sim' ? 'text-amber-700' : 'text-slate-700'
                }`}>
                  {isPecaSelecionada ? (form.carryOver || 'Não') : '-'}
                </span>
              </div>

              {/* Co-produto (Espelho) */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 bg-slate-50/50 text-xs font-semibold shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-slate-500">Co-produto (Espelho):</span>
                <span className={`font-bold ${
                  !isPecaSelecionada ? 'text-slate-400' :
                  form.coProduto === 'Sim' ? 'text-purple-700' : 'text-slate-700'
                }`}>
                  {isPecaSelecionada ? (form.coProduto || 'Não') : '-'}
                </span>
              </div>

              {/* Peça de Segurança (FMEA) */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-2xs ${
                isPecaSelecionada && form.caracteristicaSeguranca === 'Sim'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-slate-50/50 border-slate-200/80 text-slate-700'
              }`}>
                {isPecaSelecionada && form.caracteristicaSeguranca === 'Sim' ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Peça de Segurança (FMEA):</span>
                <span className="font-bold">
                  {isPecaSelecionada ? (form.caracteristicaSeguranca || 'Não') : '-'}
                </span>
              </div>

              {/* Reincidente Toggle */}
              <div className="flex items-center gap-2.5 ml-auto pl-2">
                <span className="text-xs font-semibold text-slate-700">Reincidente:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="reincidente"
                      value="NÃO"
                      checked={form.reincidente !== 'SIM'}
                      onChange={() => setForm(prev => ({ ...prev, reincidente: 'NÃO' }))}
                      className="text-[#0b5796] focus:ring-[#0b5796]"
                    />
                    <span>Não</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="reincidente"
                      value="SIM"
                      checked={form.reincidente === 'SIM'}
                      onChange={() => setForm(prev => ({ ...prev, reincidente: 'SIM' }))}
                      className="text-[#0b5796] focus:ring-[#0b5796]"
                    />
                    <span className="text-amber-800 font-bold">Sim</span>
                  </label>
                </div>

                {isPecaSelecionada && historicoReincidencias.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarHistorico(!mostrarHistorico)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
                  >
                    <History className="w-3 h-3 text-amber-600" />
                    <span>{historicoReincidencias.length} anterior(es)</span>
                    {mostrarHistorico ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* GAVETA RETRÁTIL DE HISTÓRICO DE REINCIDÊNCIAS (ESPELHA GALLERY1 DO POWER APPS) */}
            {isPecaSelecionada && (form.reincidente === 'SIM' || mostrarHistorico) && (
              <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 p-4 rounded-xl bg-amber-50/40 border border-amber-200 flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-bold text-amber-950">
                      Histórico de Reincidências Registradas para esta Peça / Modo de Falha
                    </span>
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {historicoReincidencias.length} registro(s)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700/80">
                    Espelho Gallery1 • Regra: Left(produto,9) / Left(componente,9)
                  </span>
                </div>

                {historicoReincidencias.length === 0 ? (
                  <p className="text-xs text-amber-800 italic py-1">
                    Nenhuma ocorrência anterior foi encontrada no histórico para este produto/componente.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {historicoReincidencias.map(item => (
                      <div 
                        key={item.id} 
                        className="p-3 bg-white rounded-lg border border-amber-200/80 shadow-2xs flex flex-col gap-1.5 hover:border-amber-400 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">
                            {item.field1 || `RNC #${item.id}`}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.dataOcorrencia}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-medium line-clamp-1">
                          {item.modoFalha || item.classificacaoSetor || 'Modo não especificado'}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {item.descricaoProblema || item.descricaoCompleta || 'Sem descrição cadastrada'}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <span className={`font-semibold ${
                            item.status === 'Concluído' ? 'text-emerald-600' : 'text-blue-600'
                          }`}>
                            {item.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => onNavigate('detalhes-8d', { id: item.id })}
                            className="text-[#0b5796] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                          >
                            <span>Ver RNC</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* =========================================================================
            CARD 3: DESCRIÇÃO DO DEFEITO, QUANTIDADE & RASTREABILIDADE
            ========================================================================= */}
        <div className="w-full card-saas p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-slate-900">
                  3. Descrição do Defeito & Quantidade
                </h2>
                <p className="text-xs text-slate-500">
                  Descreva o problema encontrado na linha ou apontado pelo cliente.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/60">
              Obrigatório
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Classificação / Modo de Falha Padronizado (Choices do SharePoint) */}
            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Classificação do Defeito <strong className="text-rose-500">*</strong></span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                  Modo de Falha
                </span>
              </label>
              <select
                value={form.modoFalha || ''}
                onChange={e => {
                  clearFieldError('descricaoProblema');
                  const novoModo = e.target.value;
                  setForm(prev => ({ 
                    ...prev, 
                    modoFalha: novoModo,
                    descricaoProblema: prev.descricaoProblema ? prev.descricaoProblema : novoModo
                  }));
                }}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.descricaoProblema && !form.modoFalha ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                <option value="">-- Selecione o Modo de Falha --</option>
                {MODOS_FALHA_LIST.map(modo => (
                  <option key={modo} value={modo}>{modo}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400">
                Padrão corporativo de defeitos Gestamp
              </span>
            </div>

            {/* Descrição Detalhada do Defeito */}
            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Detalhamento Técnico da Não Conformidade <strong className="text-rose-500">*</strong></span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {(form.descricaoProblema || '').length} caracteres
                </span>
              </label>
              <textarea
                rows={3}
                value={form.descricaoProblema || ''}
                onChange={e => {
                  clearFieldError('descricaoProblema');
                  setForm(prev => ({ ...prev, descricaoProblema: e.target.value }));
                }}
                placeholder="Ex: Falta de solda a ponto no reforço lateral esquerdo; trinca na borda de repuxo do painel; rebarba excessiva na furação..."
                className={`w-full p-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all resize-y ${
                  errors.descricaoProblema ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              />
              {errors.descricaoProblema && <span className="text-[11px] text-rose-500 font-medium">{errors.descricaoProblema}</span>}
            </div>

            {/* Quantidade Afetada & Rastreabilidade */}
            <div className="flex flex-col gap-3 md:col-span-2 lg:col-span-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Quantidade Não Conforme <strong className="text-rose-500">*</strong>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.quantidadeAfetada ?? ''}
                  onChange={e => {
                    clearFieldError('quantidadeAfetada');
                    const val = e.target.value;
                    setForm(prev => ({ ...prev, quantidadeAfetada: val === '' ? ('' as any) : Math.max(1, parseInt(val) || 1) }));
                  }}
                  placeholder="Ex: 1, 5, 10..."
                  className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                    errors.quantidadeAfetada ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                  }`}
                />
                {errors.quantidadeAfetada && <span className="text-[11px] text-rose-500 font-medium">{errors.quantidadeAfetada}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Código da Etiqueta SAP / Lote
                </label>
                <input
                  type="text"
                  value={form.codigoRastreabilidade || ''}
                  onChange={e => setForm(prev => ({ 
                    ...prev, 
                    codigoRastreabilidade: e.target.value,
                    protcliente: e.target.value ? 'Sim' : prev.protcliente
                  }))}
                  placeholder="Ex: ETQ-884102 ou 202610-01"
                  className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 4: EVIDÊNCIAS FOTOGRÁFICAS (FOTO PEÇA NG & FOTO PEÇA OK)
            ========================================================================= */}
        <div className="w-full card-saas p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-slate-900">
                  4. Evidências Fotográficas
                </h2>
                <p className="text-xs text-slate-500">
                  Fotografia da peça não conforme (NG) e padrão de referência (OK).
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              Até 10MB por imagem
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Foto Peça NG (Não Conforme) */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-rose-200/80 bg-rose-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Peça Não Conforme (NG)
                </span>
                {form.fotoPecaNg && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto('fotoPecaNg')}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              {form.fotoPecaNg ? (
                <div className="relative group rounded-xl overflow-hidden border border-rose-200 bg-white h-48 flex items-center justify-center">
                  <img
                    src={form.fotoPecaNg}
                    alt="Peça NG"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFoto({ url: form.fotoPecaNg!, titulo: 'Foto da Peça Não Conforme (NG)' })}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputNgRef.current?.click()}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Trocar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputNgRef.current?.click()}
                  className="h-48 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white/70 hover:bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center p-4"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-rose-900 block">
                      Clique para anexar foto da peça defeituosa
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG ou WEBP
                    </span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputNgRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileUpload(e, 'fotoPecaNg')}
              />
            </div>

            {/* Foto Peça OK (Padrão de Referência) */}
            <div className="flex flex-col gap-2 p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Padrão Aceitável / Peça Boa (OK)
                </span>
                {form.fotoPecaOk && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto('fotoPecaOk')}
                    className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              {form.fotoPecaOk ? (
                <div className="relative group rounded-xl overflow-hidden border border-emerald-200 bg-white h-48 flex items-center justify-center">
                  <img
                    src={form.fotoPecaOk}
                    alt="Peça OK"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFoto({ url: form.fotoPecaOk!, titulo: 'Foto do Padrão de Referência (OK)' })}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputOkRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Trocar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputOkRef.current?.click()}
                  className="h-48 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white/70 hover:bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center p-4"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-emerald-900 block">
                      Clique para anexar foto do padrão de peça OK
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Opcional - Referência para auditoria
                    </span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputOkRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileUpload(e, 'fotoPecaOk')}
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 5: EMISSOR / DETECTOR CONECTADO (RASTREABILIDADE)
            ========================================================================= */}
        <div className="w-full card-saas p-4 bg-gradient-to-r from-blue-50/60 via-white to-slate-50/60 border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0b5796] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-display font-bold text-slate-900">
                  {currentUser.nome}
                </span>
                <span className="text-[10px] font-bold text-[#0b5796] bg-blue-100/80 px-2 py-0.5 rounded-full">
                  RE: {currentUser.reAcesso}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Detector registrado • Perfil: {currentUser.perfil} • {currentUser.cargo || 'Operação / Inspeção'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/70">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Assinatura Digital de Detecção Ativa</span>
          </div>
        </div>

        {/* =========================================================================
            SEÇÃO EXPANSÍVEL: COMPLEMENTO DA QUALIDADE (APENAS SE EDICAO === TRUE)
            ========================================================================= */}
        {edicao && (
          <div className="w-full card-saas border-indigo-200/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setQualidadeExpandida(!qualidadeExpandida)}
              className="w-full p-4 bg-indigo-50/40 hover:bg-indigo-50/70 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-indigo-950">
                    Complemento da Qualidade (Ações de Contenção & Rastreabilidade)
                  </h3>
                  <p className="text-xs text-indigo-800/80">
                    Ações de contenção imediatas, estoques bloqueados e plano de ação.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-indigo-800 font-semibold text-xs">
                <span>{qualidadeExpandida ? 'Recolher' : 'Expandir'}</span>
                {qualidadeExpandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {qualidadeExpandida && (
              <div className="p-5 flex flex-col gap-4 border-t border-indigo-100 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Gravidade do Defeito</label>
                    <select
                      value={form.gravidade || 'Média'}
                      onChange={e => setForm(prev => ({ ...prev, gravidade: e.target.value }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    >
                      {GRAVIDADE_LIST.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Possível Detectar na Origem?</label>
                    <select
                      value={form.possivelDetectar || 'Sim'}
                      onChange={e => setForm(prev => ({ ...prev, possivelDetectar: e.target.value }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    >
                      <option value="Sim">Sim (Falha de Inspeção / Padrão)</option>
                      <option value="Não">Não (Defeito Latente / Oculto)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Data de Aplicação da Contenção</label>
                    <input
                      type="date"
                      value={form.dataContencao || ''}
                      onChange={e => setForm(prev => ({ ...prev, dataContencao: e.target.value }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Qtd Inspecionada</label>
                    <input
                      type="number"
                      value={form.qtdInspecionada || 0}
                      onChange={e => setForm(prev => ({ ...prev, qtdInspecionada: Number(e.target.value) }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Qtd Suspeita</label>
                    <input
                      type="number"
                      value={form.qtdSuspeita || 0}
                      onChange={e => setForm(prev => ({ ...prev, qtdSuspeita: Number(e.target.value) }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Qtd Bloqueada</label>
                    <input
                      type="number"
                      value={form.qtdBloqueada || 0}
                      onChange={e => setForm(prev => ({ ...prev, qtdBloqueada: Number(e.target.value) }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ações de Contenção Imediata</label>
                  <textarea
                    rows={2}
                    value={form.acoesContencao || ''}
                    onChange={e => setForm(prev => ({ ...prev, acoesContencao: e.target.value }))}
                    placeholder="Descreva as ações de contenção adotadas na linha / cliente (bloqueio de estoques, retrabalho, inspeção 100%)..."
                    className="w-full p-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none resize-y"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. BARRA INFERIOR DE BOTÕES (LARGURA TOTAL) */}
        <div className="w-full flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={() => onNavigate('lista-8d')}
            className="btn-secondary h-10 px-4 text-xs font-semibold"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="btn-primary h-11 px-6 text-xs sm:text-sm font-semibold shadow-sm hover:shadow flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span className="font-display">
              {edicao ? 'Salvar Alterações da Ocorrência' : 'Emitir Relatório Inicial (NCC)'}
            </span>
          </button>
        </div>

      </form>
    </div>
  );
};

export default Registro8DView;
