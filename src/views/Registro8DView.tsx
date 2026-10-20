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
  ChevronUp
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade, PecaCatalogo, TipoRNC } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, DEFAULT_CLIENTE, getClientBadgeInfo } from '../constants/clientes';
import { ImageWithFallback } from '../components/ImageWithFallback';

interface Registro8DViewProps {
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
  rncId?: number;
  edicao?: boolean;
}

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

  const fileInputNgRef = useRef<HTMLInputElement>(null);
  const fileInputOkRef = useRef<HTMLInputElement>(null);

  // Form State - Inicializado estritamente limpo para novo apontamento
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
      // Novo apontamento: reset limpo e aplicação do autopreenchimento da primeira peça do cliente padrão
      const produtosIniciais = spStore.getProdutosPorCliente(DEFAULT_CLIENTE);
      if (produtosIniciais.length > 0) {
        const prod = produtosIniciais[0];
        const componentes = spStore.getComponentesPorProduto(prod.codCliText);
        setForm({
          tipoRnc: 'Formal',
          status: 'Relatório Inicial',
          cliente: DEFAULT_CLIENTE,
          dataOcorrencia: new Date().toISOString().split('T')[0],
          dataOficializacao: new Date().toISOString().split('T')[0],
          classificacaoSetor: prod.fmds || 'SOLDA 2 - CEL. TOYOTA',
          setorDeteccao: 'Linha de Solda Robotizada',
          turno: '1º Turno',
          produto: prod.codCliText || prod.material,
          componente: prod.descricao || (componentes[0] ? componentes[0].descricao : ''),
          finalComponente: 'Peça Final',
          quantidadeAfetada: 1,
          descricaoProblema: '',
          descricaoCompleta: '',
          caracteristicaSeguranca: 'Não',
          coProduto: 'Não',
          carryOver: prod.carryOver === 'Sim' ? 'Sim' : 'Não',
          reincidente: 'NÃO',
          posto: prod.posto,
          fmds: prod.fmds,
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
    }
  }, [edicao, rncId, currentUser]);

  const produtosDoCliente = useMemo(() => {
    return spStore.getProdutosPorCliente(form.cliente || DEFAULT_CLIENTE);
  }, [form.cliente]);

  const componentesDoProduto = useMemo(() => {
    return spStore.getComponentesPorProduto(form.produto || '');
  }, [form.produto]);

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

  // Regra ProEPS: Troca de Cliente atualiza lista de peças e complementa Posto/FMDS
  const handleClienteChange = (novoCliente: string) => {
    clearFieldError('cliente');
    const produtos = spStore.getProdutosPorCliente(novoCliente);
    const primeiroProd = produtos[0];
    const componentes = primeiroProd ? spStore.getComponentesPorProduto(primeiroProd.codCliText) : [];

    setForm(prev => ({
      ...prev,
      cliente: novoCliente,
      produto: primeiroProd ? (primeiroProd.codCliText || primeiroProd.material) : '',
      componente: primeiroProd ? primeiroProd.descricao : '',
      finalComponente: 'Peça Final',
      posto: primeiroProd ? primeiroProd.posto : '',
      fmds: primeiroProd ? primeiroProd.fmds : '',
      classificacaoSetor: primeiroProd ? primeiroProd.fmds : prev.classificacaoSetor,
      carryOver: primeiroProd?.carryOver === 'Sim' ? 'Sim' : 'Não'
    }));
  };

  // Regra ProEPS: Troca de Peça/Produto autocompleta Posto, FMDS, Componente e CarryOver
  const handlePecaChange = (codCliTextOuMaterial: string) => {
    clearFieldError('produto');
    const selecionada = pecasCatalogo.find(
      p => p.codCliText === codCliTextOuMaterial || p.material === codCliTextOuMaterial
    );

    if (selecionada) {
      setForm(prev => ({
        ...prev,
        produto: selecionada.codCliText || selecionada.material,
        componente: selecionada.descricao || selecionada.componente || '',
        finalComponente: 'Peça Final',
        posto: selecionada.posto || prev.posto,
        fmds: selecionada.fmds || prev.fmds,
        classificacaoSetor: selecionada.fmds || prev.classificacaoSetor,
        carryOver: selecionada.carryOver === 'Sim' ? 'Sim' : 'Não'
      }));
    }
  };

  // Regra ProEPS: Troca do Tipo de Componente ou seleção de Componente Específico
  const handleComponenteChange = (novoComponente: string) => {
    const compObj = pecasCatalogo.find(
      p => p.componente === novoComponente || p.descricao === novoComponente || p.codCliText === novoComponente
    );

    setForm(prev => ({
      ...prev,
      componente: novoComponente,
      posto: compObj?.posto || prev.posto,
      fmds: compObj?.fmds || prev.fmds
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
      newErrors.tipoRnc = 'Selecione o Tipo de Ocorrência.';
    }
    if (!form.dataOcorrencia || !form.dataOcorrencia.trim()) {
      newErrors.dataOcorrencia = 'Informe a data da ocorrência.';
    }
    if (!form.produto || !form.produto.trim()) {
      newErrors.produto = 'Selecione a Peça / Conjunto da ocorrência.';
    }
    if (!form.descricaoProblema || form.descricaoProblema.trim().length < 3) {
      newErrors.descricaoProblema = 'Descreva o defeito ou modo de falha (mínimo de 3 caracteres).';
    }
    if (form.quantidadeAfetada === undefined || form.quantidadeAfetada === null || Number(form.quantidadeAfetada) <= 0) {
      newErrors.quantidadeAfetada = 'Informe uma quantidade válida de peças afetadas (maior que zero).';
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
          dataOficializacao: new Date().toISOString().split('T')[0],
          classificacaoSetor: form.classificacaoSetor || form.fmds || 'SOLDA 2 - CEL. TOYOTA',
          setorDeteccao: form.setorDeteccao || 'Linha de Solda Robotizada',
          turno: form.turno || '1º Turno',
          produto: form.produto || '',
          componente: form.componente || '',
          finalComponente: form.finalComponente || 'Peça Final',
          quantidadeAfetada: Number(form.quantidadeAfetada) || 1,
          descricaoProblema: form.descricaoProblema || '',
          descricaoCompleta: form.descricaoCompleta || form.descricaoProblema || '',
          caracteristicaSeguranca: form.caracteristicaSeguranca || 'Não',
          coProduto: form.coProduto || 'Não',
          carryOver: form.carryOver || 'Não',
          reincidente: form.reincidente || 'NÃO',
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

  const clientBadge = getClientBadgeInfo(form.cliente || DEFAULT_CLIENTE);

  return (
    <div className="w-full max-w-5xl flex flex-col gap-5 pb-24 animate-in fade-in duration-150">
      
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 flex flex-col gap-3 shadow-2xl animate-in zoom-in-95">
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
            <div className="w-full max-h-[70vh] flex items-center justify-center bg-slate-950 rounded-xl overflow-hidden">
              <img 
                src={previewFoto.url} 
                alt={previewFoto.titulo} 
                className="max-h-[68vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR: CONTEXTO, TÍTULO E AÇÕES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-slate-200/80">
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
              Preenchimento inicial de fábrica. A equipe da Qualidade complementará a contenção e análise 8D posteriormente.
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

      {/* FORMULÁRIO UNIFICADO DO RELATÓRIO INICIAL */}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        
        {/* =========================================================================
            CARD 1: DADOS GERAIS DA NÃO CONFORMIDADE & MONTADORA
            ========================================================================= */}
        <div className="card-saas p-5 flex flex-col gap-4">
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
                  Identificação do cliente montadora, classificação da ocorrência e data de detecção.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
              Chão de Fábrica
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cliente / Montadora */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Cliente (Montadora) <strong className="text-rose-500">*</strong></span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${clientBadge.bg} ${clientBadge.color}`}>
                  {form.cliente}
                </span>
              </label>
              <select
                value={form.cliente}
                onChange={e => handleClienteChange(e.target.value)}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.cliente ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                {CLIENTES_LIST.map(cli => (
                  <option key={cli} value={cli}>{cli}</option>
                ))}
              </select>
              {errors.cliente && <span className="text-[11px] text-rose-500 font-medium">{errors.cliente}</span>}
            </div>

            {/* Tipo de Ocorrência */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Tipo de Ocorrência <strong className="text-rose-500">*</strong>
              </label>
              <select
                value={form.tipoRnc}
                onChange={e => {
                  clearFieldError('tipoRnc');
                  setForm(prev => ({ ...prev, tipoRnc: e.target.value as TipoRNC }));
                }}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.tipoRnc ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                <option value="Formal">Formal (Reclamação Oficial do Cliente)</option>
                <option value="Informal">Informal (Alerta / Contato da Montadora)</option>
                <option value="Interno">Interno (Detecção Interna na Linha de Produção)</option>
              </select>
              {errors.tipoRnc && <span className="text-[11px] text-rose-500 font-medium">{errors.tipoRnc}</span>}
            </div>

            {/* Data da Ocorrência */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Data da Ocorrência <strong className="text-rose-500">*</strong>
              </label>
              <input
                type="date"
                value={form.dataOcorrencia}
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

            {/* Turno de Detecção */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Turno de Detecção
              </label>
              <select
                value={form.turno}
                onChange={e => setForm(prev => ({ ...prev, turno: e.target.value as any }))}
                className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
              >
                <option value="1º Turno">1º Turno (06:00 - 14:40)</option>
                <option value="2º Turno">2º Turno (14:40 - 23:15)</option>
                <option value="3º Turno">3º Turno (23:15 - 06:00)</option>
                <option value="Central">Turno Central / Administrativo</option>
              </select>
            </div>

            {/* Setor de Detecção */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                Setor de Detecção
              </label>
              <input
                type="text"
                value={form.setorDeteccao || ''}
                onChange={e => setForm(prev => ({ ...prev, setorDeteccao: e.target.value }))}
                placeholder="Ex: Linha de Solda Robotizada, Célula Manual, Estamparia, Expedição..."
                className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 2: IDENTIFICAÇÃO DA PEÇA & POSTO (AUTOPREENCHIMENTO PROEPS)
            ========================================================================= */}
        <div className="card-saas p-5 flex flex-col gap-4">
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
                  Ao escolher o produto, o posto cadastrado e a área FMDS são preenchidos automaticamente conforme o ProEPS.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-semibold rounded-lg border border-emerald-200/70 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Base colpecasgerais_AA3 ativa</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Produto / Conjunto (Peça Final) */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Produto / Conjunto (Peça Final) <strong className="text-rose-500">*</strong></span>
                <span className="text-[11px] text-slate-500">
                  {produtosDoCliente.length} itens disponíveis para {form.cliente}
                </span>
              </label>
              <select
                value={form.produto}
                onChange={e => handlePecaChange(e.target.value)}
                className={`w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border outline-none transition-all ${
                  errors.produto ? 'border-rose-500 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15'
                }`}
              >
                <option value="">-- Selecione o produto / conjunto --</option>
                {produtosDoCliente.map(p => (
                  <option key={`${p.identificacao}-${p.codCliText}`} value={p.codCliText || p.material}>
                    {p.codCliText ? `${p.codCliText} - ` : ''}{p.descricao} (SAP: {p.material})
                  </option>
                ))}
              </select>
              {errors.produto && <span className="text-[11px] text-rose-500 font-medium">{errors.produto}</span>}
            </div>

            {/* Tipo de Componente */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Tipo de Componente
              </label>
              <select
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
                className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-[#0b5796] focus:ring-2 focus:ring-[#0b5796]/15 outline-none transition-all"
              >
                <option value="Peça Final">Peça Final (Conjunto Completo)</option>
                <option value="Peça Final + Componente">Peça Final + Componente Específico</option>
                <option value="Componente">Componente Isolado</option>
                <option value="SubComponente + Componente">SubComponente + Componente</option>
              </select>
            </div>

            {/* Componente Específico / Subcomponente */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Componente
              </label>
              {form.finalComponente === 'Peça Final' ? (
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

            {/* Posto de Trabalho (Autopreenchido com opção de ajuste) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Posto de Trabalho Cadastrado</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                  Autopreenchido
                </span>
              </label>
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
            </div>

            {/* Área FMDS / Setor Fabril (Autopreenchido) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Área FMDS / Setor Fabril</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                  Autopreenchido
                </span>
              </label>
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
            </div>

            {/* Carry Over & Reincidente */}
            <div className="flex items-center gap-6 pt-1 sm:col-span-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Carry Over:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                  form.carryOver === 'Sim' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}>
                  {form.carryOver || 'Não'}
                </span>
              </div>

              <div className="flex items-center gap-2">
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
                    <span className="text-amber-800 font-semibold">Sim</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 3: DESCRIÇÃO DO DEFEITO, QUANTIDADE & RASTREABILIDADE
            ========================================================================= */}
        <div className="card-saas p-5 flex flex-col gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Descrição do Defeito / Modo de Falha */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Modo de Falha / Descrição da Não Conformidade <strong className="text-rose-500">*</strong></span>
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
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Quantidade Não Conforme <strong className="text-rose-500">*</strong>
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.quantidadeAfetada ?? 1}
                  onChange={e => {
                    clearFieldError('quantidadeAfetada');
                    setForm(prev => ({ ...prev, quantidadeAfetada: Math.max(1, parseInt(e.target.value) || 1) }));
                  }}
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
        <div className="card-saas p-5 flex flex-col gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="relative group rounded-xl overflow-hidden border border-rose-200 bg-white h-44 flex items-center justify-center">
                  <img
                    src={form.fotoPecaNg}
                    alt="Peça NG"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFoto({ url: form.fotoPecaNg!, titulo: 'Foto da Peça Não Conforme (NG)' })}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputNgRef.current?.click()}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Trocar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputNgRef.current?.click()}
                  className="h-44 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-white/70 hover:bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center p-4"
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
                <div className="relative group rounded-xl overflow-hidden border border-emerald-200 bg-white h-44 flex items-center justify-center">
                  <img
                    src={form.fotoPecaOk}
                    alt="Peça OK"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewFoto({ url: form.fotoPecaOk!, titulo: 'Foto do Padrão de Referência (OK)' })}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputOkRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Trocar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputOkRef.current?.click()}
                  className="h-44 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white/70 hover:bg-white flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center p-4"
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
        <div className="card-saas p-4 bg-gradient-to-r from-blue-50/60 via-white to-slate-50/60 border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <div className="card-saas border-indigo-200/70 overflow-hidden">
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
                    Complemento da Qualidade (Contenção D3 & 8D)
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
                    <label className="text-xs font-semibold text-slate-700">Qtd Inspecionada (D3)</label>
                    <input
                      type="number"
                      value={form.qtdInspecionada || 0}
                      onChange={e => setForm(prev => ({ ...prev, qtdInspecionada: Number(e.target.value) }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Qtd Suspeita (D3)</label>
                    <input
                      type="number"
                      value={form.qtdSuspeita || 0}
                      onChange={e => setForm(prev => ({ ...prev, qtdSuspeita: Number(e.target.value) }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">Qtd Bloqueada (D3)</label>
                    <input
                      type="number"
                      value={form.qtdBloqueada || 0}
                      onChange={e => setForm(prev => ({ ...prev, qtdBloqueada: Number(e.target.value) }))}
                      className="w-full h-10 px-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ações de Contenção Imediata (D3)</label>
                  <textarea
                    rows={2}
                    value={form.acoesContencao || ''}
                    onChange={e => setForm(prev => ({ ...prev, acoesContencao: e.target.value }))}
                    placeholder="Descreva as ações de contenção adotadas na linha / cliente..."
                    className="w-full p-3 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none resize-y"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. BARRA INFERIOR DE BOTÕES */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
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
