import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  Barcode, 
  Layers, 
  Clock, 
  ChevronRight, 
  List, 
  Info, 
  MapPin, 
  Wrench, 
  Check, 
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertCircle,
  History,
  Eye,
  Calendar
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade, RegistroTreinamento } from '../types';
import { spStore } from '../services/sharepointService';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { RncDetalhesModal } from '../components/RncDetalhesModal';

interface Detalhes8DViewProps {
  rncId: number;
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
}

export const Detalhes8DView: React.FC<Detalhes8DViewProps> = ({ 
  rncId, 
  onNavigate, 
  currentUser 
}) => {
  const [rnc, setRnc] = useState<RNCRecord | undefined>(undefined);
  const [treinamentos, setTreinamentos] = useState<RegistroTreinamento[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Modo de visualização: Detalhado (Lista Completa) vs Alerta da Qualidade
  const [activeViewMode, setActiveViewMode] = useState<'detalhes' | 'alerta'>('detalhes');

  // Modais
  const [modalAlertaOpen, setModalAlertaOpen] = useState(false);
  const [modalTreinOpen, setModalTreinOpen] = useState(false);
  const [modalConcluirOpen, setModalConcluirOpen] = useState(false);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [modalAvaliacaoOpen, setModalAvaliacaoOpen] = useState(false);
  const [rncPopupVisualizar, setRncPopupVisualizar] = useState<RNCRecord | null>(null);

  // Estados dos formulários em modais
  const [alertaPostos, setAlertaPostos] = useState('');
  const [treinRe, setTreinRe] = useState<string>('');
  const [obsConclusao, setObsConclusao] = useState('');

  // Estados da Avaliação da Qualidade (Produção / Cliente)
  const [evalCriticidade, setEvalCriticidade] = useState<'A' | 'B' | 'C'>('A');
  const [evalAbrirRnc, setEvalAbrirRnc] = useState<string>('Sim - Realizar Análise / Contenção / Rastreabilidade');
  const [evalComentario, setEvalComentario] = useState<string>('');

  const reloadData = () => {
    const item = spStore.getRNCById(rncId);
    setRnc(item);
    setTreinamentos(spStore.getTreinamentos(rncId));
    if (item) {
      if (item.criticidade === 'A' || item.criticidade === 'B' || item.criticidade === 'C') {
        setEvalCriticidade(item.criticidade);
      }
      if (item.abrirRnc) {
        setEvalAbrirRnc(item.abrirRnc);
      }
      if (item.comentarioGestor) {
        setEvalComentario(item.comentarioGestor);
      }
    }
  };

  useEffect(() => {
    reloadData();
  }, [rncId]);

  // Histórico de reincidências para a mesma peça e modo de falha desta RNC (ordenado da mais recente para mais antiga)
  const historicoReincidencias = useMemo(() => {
    if (!rnc) return [];
    const defeito = rnc.modoFalha || rnc.descricaoProblema;
    if (!defeito || (!rnc.produto && !rnc.componente)) return [];
    return spStore.getHistoricoReincidencias(
      rnc.produto, 
      defeito, 
      rnc.id, 
      rnc.componente
    ).sort((a, b) => {
      const dateA = a.dataOcorrencia || '';
      const dateB = b.dataOcorrencia || '';
      if (dateB !== dateA) return dateB.localeCompare(dateA);
      return (b.id || 0) - (a.id || 0);
    });
  }, [rnc]);

  if (!rnc) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-[#e2e8f0] text-center flex flex-col gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0f172a]">Ocorrência não encontrada</h2>
        <p className="text-xs text-[#64748b]">O registro RNC #{rncId} não foi localizado na base de dados.</p>
        <button 
          className="btn-primary"
          onClick={() => onNavigate('lista-8d')}
        >
          Voltar para a Lista
        </button>
      </div>
    );
  }

  const role = currentUser.perfil;
  const isAdminOrQual = role === 'Admin' || role === 'Adminqual';
  const isLiderOrAbove = isAdminOrQual || role === 'Liderqual';
  const isOperator = role === 'User';

  const handleConfirmConcluir = () => {
    const res = spStore.concluirRNC(rnc.id, currentUser.nome, obsConclusao);
    if (!res.success) {
      setNotification({ type: 'error', message: res.message });
      setModalConcluirOpen(false);
      return;
    }

    setNotification({ type: 'success', message: res.message });
    setModalConcluirOpen(false);
    reloadData();
  };

  const handleSaveTreinamento = (e: React.FormEvent) => {
    e.preventDefault();
    const reNum = Number(treinRe);
    if (!reNum || isNaN(reNum)) {
      setNotification({ type: 'error', message: 'Informe uma matrícula (RE) numérica válida!' });
      return;
    }

    const res = spStore.addTreinamento(rnc.id, reNum, currentUser.nome);
    if (!res.success) {
      setNotification({ type: 'error', message: res.message });
      return;
    }

    setNotification({ type: 'success', message: res.message });
    setModalTreinOpen(false);
    setTreinRe('');
    reloadData();
  };

  const handleSaveAlerta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertaPostos.trim()) {
      setNotification({ type: 'error', message: 'Informe os postos de divulgação!' });
      return;
    }

    spStore.addAlerta({
      idRnc: rnc.id,
      produto: rnc.produto,
      componente: rnc.componente,
      defeito: rnc.descricaoProblema || 'Alerta de Qualidade',
      dataDivulgacao: new Date().toISOString().split('T')[0],
      responsavel: currentUser.nome,
      postosDivulgados: alertaPostos.trim()
    });
    setNotification({ type: 'success', message: 'Alerta de qualidade registrado com sucesso!' });
    setModalAlertaOpen(false);
    setAlertaPostos('');
    reloadData();
  };

  const handleConfirmDelete = () => {
    spStore.deleteRNCCascade(rnc.id);
    setNotification({ type: 'success', message: 'Ocorrência excluída com sucesso.' });
    setModalDeleteOpen(false);
    setTimeout(() => {
      onNavigate('lista-8d');
    }, 1000);
  };

  const handleAprovarAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalComentario.trim()) {
      setNotification({ type: 'warning', message: 'Favor preencher o feedback / parecer técnico do aprovador da Qualidade.' });
      return;
    }
    const isAbrirRncSim = evalAbrirRnc.startsWith('Sim');
    const newStatus = isAbrirRncSim ? 'Relatório Inicial' : 'Concluído';
    const updated = spStore.saveRNC({
      id: rnc.id,
      protcliente: 'Aprovado',
      status: newStatus,
      criticidade: evalCriticidade,
      abrirRnc: evalAbrirRnc,
      comentarioGestor: evalComentario.trim()
    });
    setRnc(updated);
    setModalAvaliacaoOpen(false);
    setNotification({
      type: 'success',
      message: isAbrirRncSim 
        ? 'Avaliação aprovada! Ocorrência liberada para preenchimento de contenção e rastreabilidade pela equipe de Qualidade.' 
        : 'Avaliação aprovada! Registro concluído diretamente com sucesso.'
    });
    reloadData();
  };

  const handleReprovarAvaliacao = () => {
    if (!evalComentario.trim()) {
      setNotification({ type: 'warning', message: 'Favor preencher o motivo da reprovação no parecer do aprovador.' });
      return;
    }
    const updated = spStore.saveRNC({
      id: rnc.id,
      protcliente: 'Reprovado',
      status: 'Reprovado',
      criticidade: evalCriticidade,
      abrirRnc: 'Não - Não realizar Análise / Contenção / Rastreabilidade',
      comentarioGestor: evalComentario.trim()
    });
    setRnc(updated);
    setModalAvaliacaoOpen(false);
    setNotification({ type: 'warning', message: 'Ocorrência do Programa Produção / Cliente reprovada.' });
    reloadData();
  };

  const isProtecaoAtiva = rnc.protcliente && rnc.protcliente !== 'Não';

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150 pb-16">
      
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

      {/* 1. CABEÇALHO UNIFICADO & COMPACTO DA OCORRÊNCIA (MELHOR APROVEITAMENTO DE ESPAÇO) */}
      <div className="card-saas p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs bg-white border-slate-200">
        
        {/* Linha 1: Navegação + Identificador + Badges + Barra de Ações Rápidas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              type="button"
              onClick={() => onNavigate('lista-8d')}
              className="btn-secondary h-8 px-2.5 text-xs font-semibold shrink-0 gap-1.5"
              title="Voltar para a Lista de Ocorrências"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight font-mono-numbers">
              {rnc.field1 || `RNC #${rnc.id}`}
            </h1>

            {/* Status Principal com Semântica Suave */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${
              rnc.status === 'Concluído' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : rnc.status === 'Em Andamento' 
                ? 'bg-amber-50 text-amber-900 border-amber-200' 
                : 'bg-sky-50 text-sky-800 border-sky-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                rnc.status === 'Concluído' ? 'bg-emerald-500' : rnc.status === 'Em Andamento' ? 'bg-amber-500' : 'bg-sky-500'
              }`} />
              {rnc.status}
            </span>

            {/* Tipo da Ocorrência */}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
              {rnc.tipoRnc}
            </span>
          </div>

          {/* Barra de Ações Rápidas (Compacta h-8) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              type="button"
              onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
              className="btn-secondary h-8 px-2.5 text-xs font-medium gap-1.5"
              title="Gerar Ficha A4 em PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#64748b]" />
              <span className="hidden sm:inline">Imprimir A4</span>
            </button>

            <button 
              type="button"
              onClick={() => onNavigate('rastreabilidade', { rncId: rnc.id })}
              className="btn-secondary h-8 px-2.5 text-xs font-semibold text-[#4338ca] hover:bg-indigo-50 hover:border-indigo-200 gap-1.5"
              title="Ver lotes SAP e histórico de rastreabilidade desta ocorrência"
            >
              <Barcode className="w-3.5 h-3.5 text-[#4338ca]" />
              <span className="hidden sm:inline">Rastrear SAP</span>
            </button>

            {isProtecaoAtiva && (
              <button 
                type="button"
                onClick={() => setModalAvaliacaoOpen(true)}
                className="btn-secondary h-8 px-2.5 text-xs font-bold gap-1.5 text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 transition shadow-2xs"
                title="Avaliação da Qualidade para ocorrências do chão de fábrica"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Avaliação Qualidade</span>
              </button>
            )}

            {!isOperator && (
              <>
                <button 
                  type="button"
                  onClick={() => onNavigate('registro-8d', { edicao: true, rncId: rnc.id })}
                  className="btn-secondary h-8 px-2.5 text-xs font-medium gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#64748b]" />
                  <span>Editar</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setModalAlertaOpen(true)}
                  className="btn-secondary h-8 px-2.5 text-xs font-medium gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Alerta</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setModalTreinOpen(true)}
                  className="btn-secondary h-8 px-2.5 text-xs font-medium gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden sm:inline">Treinamento</span>
                </button>
              </>
            )}

            {isLiderOrAbove && rnc.status !== 'Concluído' && (
              <button 
                type="button"
                onClick={() => setModalConcluirOpen(true)}
                className="btn-primary h-8 px-3 text-xs font-bold gap-1.5 ml-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Concluir RNC</span>
              </button>
            )}

            {isAdminOrQual && (
              <button 
                type="button"
                onClick={() => setModalDeleteOpen(true)}
                className="btn-icon h-8 w-8 text-rose-600 hover:bg-rose-50 hover:border-rose-300 ml-0.5"
                title="Excluir Ocorrência"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: Metadados Secundários (Esquerda) + Segmented Tabs (Direita) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748b]">
            <span className="flex items-center gap-1.5">
              <span className="text-[#94a3b8]">Montadora:</span>
              <strong className="text-[#0f172a] font-semibold">{rnc.cliente || 'Não informada'}</strong>
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[#94a3b8]">Peça:</span>
              <strong className="text-[#0f172a] font-semibold">{rnc.produto || rnc.componente}</strong>
            </span>
            {rnc.classificacaoSetor && (
              <>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#94a3b8]">Setor:</span>
                  <strong className="text-[#0f172a] font-semibold">{rnc.classificacaoSetor}</strong>
                </span>
              </>
            )}
          </div>

          {/* Segmented Control Responsivo e Compacto (h-8) */}
          <div className="flex items-center p-0.5 bg-[#f1f5f9] border border-[#e2e8f0] rounded-lg gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveViewMode('detalhes')}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                activeViewMode === 'detalhes'
                  ? 'bg-white text-[#0f6cbd] shadow-2xs border border-[#e2e8f0]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Detalhado</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('alerta')}
              className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer select-none ${
                activeViewMode === 'alerta'
                  ? 'bg-white text-rose-700 shadow-2xs border border-[#e2e8f0]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Alerta Qualidade / Disposição</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('rastreabilidade', { rncId: rnc.id })}
              className="h-7 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer select-none text-[#64748b] hover:text-[#0f172a]"
              title="Abrir tela de Rastreabilidade desta ocorrência"
            >
              <Barcode className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rastrear</span>
            </button>
          </div>
        </div>

        {/* Notificação Suave de Programa Produção / Cliente (Quando Ativo) */}
        {isProtecaoAtiva && (
          <div className="rounded-xl p-3 bg-emerald-50/90 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-1">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <div className="text-xs text-emerald-900 leading-snug">
                <strong>Programa Produção / Cliente:</strong> Etiqueta SAP <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-950">{rnc.codigoRastreabilidade || 'Não informada'}</code>. Detecção no chão de fábrica.
              </div>
            </div>
            {isLiderOrAbove && (
              <button
                type="button"
                onClick={() => setModalAvaliacaoOpen(true)}
                className="btn-primary h-7 px-3 text-xs font-bold shrink-0 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {rnc.protcliente === 'Sim' ? 'Avaliar Ocorrência' : 'Revisar Avaliação'}
              </button>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODO 1: DETALHADO (LISTA COMPLETA - REFERÊNCIA IMAGEM 3) */}
      {/* ========================================================================= */}
      {activeViewMode === 'detalhes' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          
          {/* SEÇÃO 1: HISTÓRICO & RELATO COMPLETO */}
          <div className="card-saas p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#0f6cbd]" />
                <h2 className="text-sm sm:text-base font-bold text-[#0f172a]">
                  Histórico & Relato Completo da Ocorrência
                </h2>
              </div>
              <div className="text-xs text-[#64748b] font-mono">
                Data: {rnc.dataOcorrencia} • Turno: {rnc.turno || '1º Turno'}
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-1">
              <div className="info-tile">
                <span className="info-tile-label flex items-center justify-between">
                  <span>Modo de Falha (Defeito)</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Defeito Selecionado
                  </span>
                </span>
                <div className="info-tile-value text-sm font-bold text-[#0f172a] mt-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{rnc.modoFalha || rnc.descricaoProblema || 'Não especificado'}</span>
                </div>
              </div>

              <div className="info-tile">
                <span className="info-tile-label flex items-center justify-between">
                  <span>Detalhamento Técnico da Não Conformidade</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Descrição Complementar
                  </span>
                </span>
                <div className="text-xs sm:text-sm text-[#334155] leading-relaxed font-medium mt-1">
                  {rnc.descricaoProblema || rnc.descricaoCompleta || 'Nenhum detalhamento livre informado.'}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO HISTÓRICO DE REINCIDÊNCIAS (MESMA PEÇA / MODO DE FALHA) */}
          <div className="card-saas p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a] flex items-center gap-2">
                    <span>Histórico de Reincidências Registradas</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      {historicoReincidencias.length} registro(s)
                    </span>
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Ocorrências da mesma peça com o defeito <strong>"{rnc.modoFalha || rnc.descricaoProblema}"</strong> ordenadas da mais recente para a mais antiga.
                  </p>
                </div>
              </div>
            </div>

            {historicoReincidencias.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center flex items-center justify-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Nenhuma outra ocorrência anterior foi encontrada no histórico para esta peça com este defeito. (Primeira Ocorrência / Não Reincidente).</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                {historicoReincidencias.map((item, idx) => (
                  <div 
                    key={item.id || idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                          {item.field1 || `RNC #${item.id}`}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{item.dataOcorrencia}</span>
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.modoFalha || item.descricaoProblema || 'Defeito registrado'}
                          </span>
                          {item.classificacaoSetor && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded hidden md:inline">
                              {item.classificacaoSetor}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.cliente} • {item.produto || item.componente} {item.posto ? `• Posto: ${item.posto}` : ''} • Qtd: {item.quantidadeAfetada || 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.status === 'Concluído' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : item.status === 'Em Andamento' 
                          ? 'bg-amber-50 text-amber-900 border-amber-200' 
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        {item.status || 'Em Andamento'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setRncPopupVisualizar(item)}
                        className="btn-secondary h-8 px-3 text-xs font-bold text-[#0b5796] hover:bg-blue-50 border-blue-200 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Visualizar detalhes em pop-up rápido"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#0b5796]" />
                        <span>Ver RNC</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 2: DADOS DO PRODUTO & ORIGEM FABRIL (GRID 2 COLUNAS BENTO) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bloco 1: Dados do Produto & Engenharia */}
            <div className="card-saas p-6 flex flex-col gap-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f5f9]">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0f6cbd] flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a]">
                    Dados do Produto & Engenharia
                  </h3>
                  <p className="text-xs text-[#64748b]">Informações de catálogo e tolerância técnica</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="info-tile">
                  <span className="info-tile-label">Montadora</span>
                  <span className="info-tile-value">{rnc.cliente || 'Não informada'}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Veículo / Código SAP</span>
                  <span className="info-tile-value font-mono">{rnc.codigoRastreabilidade || 'N/A'}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Tipo de Peça Rastreada</span>
                  <span className="info-tile-value font-medium">{rnc.finalComponente || 'Produto Final'}</span>
                </div>

                <div className="sm:col-span-2 info-tile">
                  <span className="info-tile-label">Componente afetado</span>
                  <span className="info-tile-value">{rnc.componente || rnc.produto}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Quantidade afetada</span>
                  <span className="info-tile-value font-mono">{rnc.quantidadeAfetada || 1} peça(s)</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Classificação da RNC</span>
                  <span className="info-tile-value">{rnc.tipoRnc}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Item de segurança</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-0.5 ${
                    rnc.caracteristicaSeguranca === 'Sim' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rnc.caracteristicaSeguranca === 'Sim' ? 'Sim (Crítico)' : 'Não'}
                  </span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Reincidência</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-0.5 ${
                    rnc.reincidente === 'SIM' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rnc.reincidente || 'Não'}
                  </span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Co-produto</span>
                  <span className="info-tile-value text-xs font-medium">{rnc.coProduto || 'Não'}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Carry over</span>
                  <span className="info-tile-value text-xs font-medium">{rnc.carryOver || 'Não'}</span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Origem Fabril & Detecção */}
            <div className="card-saas p-6 flex flex-col gap-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#f1f5f9]">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0f6cbd] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a]">
                    Origem Fabril & Detecção
                  </h3>
                  <p className="text-xs text-[#64748b]">Local de ocorrência na planta e rastreabilidade SAP</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="sm:col-span-2 info-tile">
                  <span className="info-tile-label">Setor fabril</span>
                  <span className="info-tile-value">{rnc.classificacaoSetor || 'N/A'}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Posto cadastrado</span>
                  <span className="info-tile-value">{rnc.posto || 'Não especificado'}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Área / FMDS</span>
                  <span className="info-tile-value">{rnc.fmds || 'N/A'}</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Data e turno</span>
                  <span className="info-tile-value font-mono">{rnc.dataOcorrencia} ({rnc.turno})</span>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Detector / RE</span>
                  <span className="info-tile-value">{rnc.detector || 'N/A'}</span>
                </div>

                {rnc.setorDeteccao && (
                  <div className="info-tile">
                    <span className="info-tile-label">Setor de Detecção (Chão de Fábrica)</span>
                    <span className="info-tile-value font-semibold text-amber-800">{rnc.setorDeteccao}</span>
                  </div>
                )}

                {rnc.participantesAtendimento && (
                  <div className="sm:col-span-2 info-tile">
                    <span className="info-tile-label">Participantes do Atendimento</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {rnc.participantesAtendimento.split(';').map((p, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {p.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="info-tile sm:col-span-2">
                  <span className="info-tile-label">Documento para Rastreabilidade</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-800">
                        {rnc.documentoRastreabilidade || 'Etiqueta SAP'}
                      </span>
                      {rnc.documentoRastreabilidade === 'Não Informado' ? (
                        <span className="text-[11px] font-mono text-slate-600 mt-0.5">
                          Período de Lote: {rnc.dataInicioRastreabilidade || 'N/A'} até {rnc.dataFimRastreabilidade || 'N/A'}
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-[#0f172a] mt-0.5">
                          Código: {rnc.codigoRastreabilidade || 'N/A'}
                        </span>
                      )}
                    </div>
                    {rnc.codigoRastreabilidade && (
                      <button
                        type="button"
                        onClick={() => onNavigate('rastreabilidade', { rncId: rnc.id })}
                        className="text-[11px] text-[#0f6cbd] font-bold hover:underline cursor-pointer"
                      >
                        Ver lotes SAP
                      </button>
                    )}
                  </div>
                </div>

                <div className="info-tile">
                  <span className="info-tile-label">Abertura de RNC</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-0.5 ${
                    rnc.abrir8D === 'Sim' ? 'bg-blue-100 text-[#0f6cbd] border border-blue-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rnc.abrir8D === 'Sim' ? 'Sim (Análise & Contenção)' : 'Não'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* SEÇÃO 3: CONTENÇÃO IMEDIATA & DIRETRIZES 5W2H */}
          <div className="card-saas p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a]">
                    Contenção Imediata & Diretrizes 5W2H
                  </h3>
                  <p className="text-xs text-[#64748b]">Ações de triagem e bloqueio para não evasão do defeito</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewMode('alerta')}
                className="text-xs font-semibold text-[#0f6cbd] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver modo alerta com fotos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Banner de Ações Adotadas com Espaçamento Adequado */}
            <div className="alert-box-warning">
              <span className="font-bold text-amber-950 block text-xs mb-1.5">
                Ações de contenção adotadas:
              </span>
              <p className="leading-relaxed text-sm font-semibold text-amber-950">
                {rnc.acoesContencao || 'Nenhuma ação de contenção informada.'}
              </p>
            </div>

            {/* Contadores de Contenção com Respiro e Alinhamento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
                <span className="text-xs font-semibold text-[#64748b] block">Inspecionadas</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0f172a] mt-1.5 block">
                  {rnc.qtdInspecionada || 0}
                </span>
                <span className="text-xs text-[#94a3b8] block mt-1">Total verificado</span>
              </div>
              <div className="p-5 bg-rose-50/70 rounded-xl border border-rose-200">
                <span className="text-xs font-semibold text-rose-800 block">Bloqueadas</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-800 mt-1.5 block">
                  {rnc.qtdBloqueada || 0}
                </span>
                <span className="text-xs text-rose-700/70 block mt-1">Retidas na fábrica</span>
              </div>
              <div className="p-5 bg-amber-50/70 rounded-xl border border-amber-200">
                <span className="text-xs font-semibold text-amber-800 block">Suspeitas</span>
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-800 mt-1.5 block">
                  {rnc.qtdSuspeita || 0}
                </span>
                <span className="text-xs text-amber-700/70 block mt-1">Em quarentena</span>
              </div>
            </div>

            {/* Detalhamento 5W2H em Grid Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#f1f5f9] text-xs">
              <div className="info-tile p-4 sm:p-5">
                <span className="info-tile-label">O quê (What)</span>
                <div className="font-semibold text-sm text-[#0f172a] mt-1">{rnc.oQueFazer || 'N/A'}</div>
              </div>
              <div className="info-tile p-4 sm:p-5">
                <span className="info-tile-label">Como (How)</span>
                <div className="font-semibold text-sm text-[#0f172a] mt-1">{rnc.comoFazer || 'N/A'}</div>
              </div>
              <div className="info-tile p-4 sm:p-5">
                <span className="info-tile-label">Por quê (Why)</span>
                <div className="font-semibold text-sm text-[#0f172a] mt-1">{rnc.porQueFazer || 'Garantir a não evasão do defeito para o cliente.'}</div>
              </div>
              <div className="info-tile p-4 sm:p-5">
                <span className="info-tile-label">Quem (Who)</span>
                <div className="font-semibold text-sm text-[#0f172a] mt-1">{rnc.quemFara || rnc.detector || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: EVIDÊNCIAS FOTOGRÁFICAS REGISTRADAS (NG x OK COM FOTOS REAIS) */}
          <div className="card-saas p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0f6cbd]" />
                <h3 className="text-sm font-bold text-[#0f172a]">
                  Evidências Fotográficas Registradas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewMode('alerta')}
                className="text-xs text-rose-700 hover:underline font-bold flex items-center gap-1"
              >
                <span>Abrir no Alerta da Qualidade</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Card Peça NG (Defeito) */}
              <div className="rounded-xl border-2 border-rose-300 bg-rose-50/30 overflow-hidden flex flex-col p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-rose-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-700 text-white shadow-2xs">
                      Defeito (NG)
                    </span>
                    <span className="font-bold text-xs text-rose-950">Peça Não Conforme</span>
                  </div>
                  <span className="text-[11px] text-rose-700 font-semibold">Evidência</span>
                </div>

                <div className="h-64 rounded-xl bg-white border border-rose-200 overflow-hidden flex items-center justify-center p-2 mb-3 shadow-2xs">
                  <ImageWithFallback
                    src={rnc.fotoPecaNg}
                    alt={`Peça NG: ${rnc.descricaoProblema || rnc.componente}`}
                    variant="ng"
                    className="w-full h-full object-contain"
                    emptyLabel="Sem foto do defeito registrada"
                    showExternalLink={true}
                    allowZoom={true}
                    itemId={rnc.id}
                  />
                </div>

                <div className="text-xs text-[#334155] bg-white p-3 rounded-lg border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Modo de Falha / Defeito:</span>
                  <div className="font-bold text-[#0f172a] mt-0.5">{rnc.modoFalha || rnc.descricaoProblema || 'Não especificado'}</div>
                </div>
              </div>

              {/* Card Peça OK (Padrão) */}
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/30 overflow-hidden flex flex-col p-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-700 text-white shadow-2xs">
                      Padrão (OK)
                    </span>
                    <span className="font-bold text-xs text-emerald-950">Peça Conforme</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold">Critério Aprovado</span>
                </div>

                <div className="h-64 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center p-2 mb-3 shadow-2xs">
                  <ImageWithFallback
                    src={rnc.fotoPecaOk}
                    alt={`Peça OK: ${rnc.componente}`}
                    variant="ok"
                    className="w-full h-full object-contain"
                    emptyLabel="Sem foto de padrão registrada"
                    showExternalLink={true}
                    allowZoom={true}
                    itemId={rnc.id}
                  />
                </div>

                <div className="text-xs text-[#334155] bg-white p-3 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Critério de Liberação:</span>
                  <div className="font-bold text-[#0f172a] mt-0.5">Livre de trincas, solda contínua e conformidade dimensional.</div>
                </div>
              </div>

            </div>
          </div>

          {/* SEÇÃO 5: OPERADORES TREINADOS NESTA OCORRÊNCIA */}
          <div className="card-saas p-0 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#0f6cbd]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0f172a]">
                  Operadores Treinados nesta Ocorrência ({treinamentos.length})
                </h3>
              </div>
              {!isOperator && (
                <button
                  type="button"
                  onClick={() => setModalTreinOpen(true)}
                  className="btn-secondary h-8 px-3 text-xs"
                >
                  <span>+ Novo Treinamento</span>
                </button>
              )}
            </div>

            {treinamentos.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748b]">
                Nenhum operador registrado até o momento. Clique em "+ Novo Treinamento" para registrar a capacitação da equipe.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] font-semibold">
                      <th className="py-3 px-5">Operador</th>
                      <th className="py-3 px-5">RE</th>
                      <th className="py-3 px-5">Data</th>
                      <th className="py-3 px-5">Instrutor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {treinamentos.map(t => (
                      <tr key={t.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="py-3 px-5 font-bold text-[#0f172a]">{t.nomeColaborador || (t as any).nomeOperador}</td>
                        <td className="py-3 px-5 font-mono text-[#64748b]">{t.re}</td>
                        <td className="py-3 px-5 font-mono text-[#64748b]">{t.dataTreinamento}</td>
                        <td className="py-3 px-5 text-[#334155]">{t.responsavel || (t as any).instrutor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODO 2: ALERTA DA QUALIDADE & DISPOSIÇÃO (REFERÊNCIA TELAS POWER APPS)   */}
      {/* ========================================================================= */}
      {activeViewMode === 'alerta' && (
        <div className="flex flex-col gap-5 animate-in fade-in">
          
          {/* Faixa Compacta de Status da Contenção e Ações do Alerta */}
          <div className="bg-gradient-to-r from-rose-50 via-amber-50/40 to-white border border-rose-200/90 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-rose-800 uppercase tracking-wide">
                  Instrução de Contenção Ativa
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="font-semibold text-slate-800">
                  {rnc.modoFalha || rnc.descricaoProblema || 'Não conformidade'}
                </span>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <span className="text-slate-500">
                  Posto: <strong className="text-slate-700">{rnc.posto || 'Geral'}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {!isOperator && (
                <button
                  type="button"
                  onClick={() => setModalAlertaOpen(true)}
                  className="btn-primary bg-rose-700 hover:bg-rose-800 border-rose-700 text-xs h-7 px-2.5 gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Registrar Divulgação</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
                className="btn-secondary text-xs h-7 px-2.5 gap-1.5"
                title="Imprimir Alerta de Qualidade"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimir Alerta</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              PAINEL UNIFICADO DO ALERTA DE QUALIDADE (CONTAINER ÚNICO)
              1. Topo: Informações do Produto (Linha, Posto, Defeito, Quantidade e Peça)
              2. Centro: 3 Fotos Alinhadas na Mesma Linha (Foto OK, Foto NG, Foto Auxiliar)
              3. Base: Toda a Contenção, Disposição Interna e Plano 5W2H (O que fazer)
              ========================================================================= */}
          <div className="card-saas p-4 sm:p-5 border-slate-200 flex flex-col gap-5 shadow-xs bg-white">

            {/* 1. TOPO: INFORMAÇÕES DO PRODUTO & OCORRÊNCIA */}
            <div className="flex flex-col gap-3 pb-4 border-b border-slate-100">
              
              {/* Cabeçalho do Bloco com Produto e Badge de Volume */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold shrink-0">
                    <Info className="w-4 h-4 text-[#0b5796]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Informações do Produto & Identificação
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight font-mono-numbers">
                      {rnc.produto || rnc.componente || 'Produto Não Especificado'}
                    </h3>
                  </div>
                </div>

                {/* Quantidade em Destaque */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200 text-right flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Quantidade Afetada:</span>
                    <span className="text-sm font-extrabold text-amber-950 font-mono-numbers">
                      {rnc.quantidadeAfetada || 1} Peça(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* GRID 4 COLUNAS: LINHA, POSTO, DEFEITO E QUANTIDADE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                
                {/* 1. LINHA / ÁREA FABRIL */}
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Linha / Área:
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={rnc.fmds || rnc.classificacaoSetor || 'Não especificada'}>
                    {rnc.fmds || rnc.classificacaoSetor || 'Área Fabril'}
                  </span>
                </div>

                {/* 2. POSTO DE TRABALHO */}
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0b5796]" />
                    Posto:
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={rnc.posto || 'Geral'}>
                    {rnc.posto || 'Não especificado'}
                  </span>
                </div>

                {/* 3. DEFEITO IDENTIFICADO */}
                <div className="p-2.5 bg-rose-50/70 rounded-xl border border-rose-200 flex flex-col gap-0.5 sm:col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Defeito Identificado:
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-rose-950 truncate" title={rnc.modoFalha || rnc.descricaoProblema || 'Não especificado'}>
                    {rnc.modoFalha || rnc.descricaoProblema || 'Não especificado'}
                  </span>
                </div>

                {/* 4. QUANTIDADE DE PEÇAS */}
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-amber-700" />
                    Quantidade de Peças:
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-950 font-mono-numbers">
                    {rnc.quantidadeAfetada || 1} Peça(s)
                  </span>
                </div>

              </div>

            </div>

            {/* 2. CENTRO: AS TRÊS FOTOS NA MESMA LINHA */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#0b5796]" />
                  Padrões Visuais & Registros Fotográficos
                </span>
                <span className="text-[10px] text-slate-400">
                  Clique nas fotos para ampliar
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                
                {/* FOTO 1: PEÇA OK (PADRÃO CONFORME) */}
                <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/30 overflow-hidden shadow-xs flex flex-col">
                  <div className="bg-emerald-600 px-3 py-1.5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Foto da peça OK:</span>
                    </div>
                    <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded font-semibold text-emerald-100">
                      Padrão
                    </span>
                  </div>
                  <div className="h-56 sm:h-64 bg-white flex items-center justify-center p-2 relative group overflow-hidden">
                    <ImageWithFallback
                      src={rnc.fotoPecaOk}
                      alt="Peça OK Padrão"
                      variant="ok"
                      className="w-full h-full object-contain"
                      emptyLabel="Sem foto do padrão OK"
                      allowZoom={true}
                      itemId={rnc.id}
                    />
                  </div>
                  <div className="p-2 bg-emerald-50/80 border-t border-emerald-200 text-center">
                    <span className="text-[11px] font-bold text-emerald-800">
                      Peça Conforme (Critério de Liberação)
                    </span>
                  </div>
                </div>

                {/* FOTO 2: PEÇA NG (DEFEITO REJEITADO) */}
                <div className="rounded-2xl border-2 border-rose-500 bg-rose-50/30 overflow-hidden shadow-xs flex flex-col">
                  <div className="bg-rose-600 px-3 py-1.5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      <span>Foto da peça NG:</span>
                    </div>
                    <span className="text-[10px] bg-rose-700/80 px-1.5 py-0.5 rounded font-semibold text-rose-100">
                      Defeito
                    </span>
                  </div>
                  <div className="h-56 sm:h-64 bg-white flex items-center justify-center p-2 relative group overflow-hidden">
                    <ImageWithFallback
                      src={rnc.fotoPecaNg}
                      alt="Peça NG Não Conforme"
                      variant="ng"
                      className="w-full h-full object-contain"
                      emptyLabel="Sem foto da peça NG"
                      allowZoom={true}
                      itemId={rnc.id}
                    />
                  </div>
                  <div className="p-2 bg-rose-50/80 border-t border-rose-200 text-center">
                    <span className="text-[11px] font-bold text-rose-800">
                      Amostra Rejeitada / Não Conforme
                    </span>
                  </div>
                </div>

                {/* FOTO 3: FOTO AUXILIAR (RETRABALHO / SELEÇÃO) */}
                <div className="rounded-2xl border-2 border-sky-400 bg-sky-50/30 overflow-hidden shadow-xs flex flex-col">
                  <div className="bg-[#0b5796] px-3 py-1.5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span>Foto Auxiliar:</span>
                    </div>
                    <span className="text-[10px] bg-sky-800/80 px-1.5 py-0.5 rounded font-semibold text-sky-100">
                      Retrabalho / Seleção
                    </span>
                  </div>
                  <div className="h-56 sm:h-64 bg-white flex items-center justify-center p-2 relative group overflow-hidden">
                    <ImageWithFallback
                      src={rnc.fotoAuxiliar}
                      alt="Foto auxiliar de retrabalho / seleção"
                      className="w-full h-full object-contain"
                      emptyLabel="Sem foto auxiliar"
                      allowZoom={true}
                      itemId={rnc.id}
                    />
                  </div>
                  <div className="p-2 bg-sky-50/80 border-t border-sky-200 text-center">
                    <span className="text-[11px] font-bold text-sky-900">
                      Instrução Operacional / Seleção
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* 3. BASE: CONTENÇÃO, DISPOSIÇÃO & PLANO DE AÇÃO (O QUE FAZER) */}
            <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
              
              {/* Grid de 2 Colunas para Disposição e Plano 5W2H */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5 items-stretch">
                
                {/* COLUNA ESQUERDA: DISPOSIÇÃO INTERNA & AÇÕES DE CONTENÇÃO */}
                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Disposição Interna & Ações Imediatas
                      </h4>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Contenção */}
                    <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/80 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#0b5796] uppercase flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#0b5796]" />
                        Contenção:
                      </span>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {rnc.acoesContencao || 'Nenhuma ação de contenção registrada.'}
                      </div>
                    </div>

                    {/* Recomendações / Providências */}
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-700" />
                        Recomendações / Providências:
                      </span>
                      <div className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {rnc.recomendacoesProvidencias || 'Nenhuma recomendação técnica informada.'}
                      </div>
                    </div>

                    {/* Descrição do Problema */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Descrição do problema:
                      </span>
                      <div className="text-xs text-slate-800 font-medium leading-relaxed">
                        {rnc.descricaoProblemaInterno || rnc.descricaoProblema || 'Não especificada.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: PLANO 5W2H (O QUE FAZER, COMO FAZER, PORQUE FAZER, ETC.) */}
                <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                        <ShieldAlert className="w-4 h-4 text-[#0b5796]" />
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Plano 5W2H da Contenção
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Instrução Operacional
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* O que fazer? */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        O que fazer?
                      </span>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                        {rnc.oQueFazer || 'Não informado'}
                      </div>
                    </div>

                    {/* Como fazer? */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Como fazer?
                      </span>
                      <div className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {rnc.comoFazer || 'Não informado'}
                      </div>
                    </div>

                    {/* Porque fazer? */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Porque fazer?
                      </span>
                      <div className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {rnc.porQueFazer || 'Não informado'}
                      </div>
                    </div>

                    {/* Quando, Onde e Responsável */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-600" />
                          Quando fazer?
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {rnc.quandoFara || rnc.dataContencao || 'Imediato'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          Onde fazer?
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {rnc.ondeFara || 'Posto de Trabalho'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Users className="w-3 h-3 text-indigo-600" />
                          Equipe responsável:
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate" title={rnc.quemFara || rnc.participantesAtendimento}>
                          {rnc.quemFara || rnc.participantesAtendimento || 'Qualidade / Produção'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* SEÇÃO INFERIOR: OPERADORES TREINADOS NESTA CONTENÇÃO */}
          <div className="card-saas p-0 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#e2e8f0] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#0f6cbd]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0f172a]">
                  Registro de Treinamento da Equipe na Contenção ({treinamentos.length})
                </h3>
              </div>
              {!isOperator && (
                <button
                  type="button"
                  onClick={() => setModalTreinOpen(true)}
                  className="btn-secondary h-8 px-3 text-xs"
                >
                  <span>+ Novo Treinamento</span>
                </button>
              )}
            </div>

            {treinamentos.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748b]">
                Nenhum operador registrado no treinamento desta contenção até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] font-semibold">
                      <th className="py-3 px-5">Operador</th>
                      <th className="py-3 px-5">RE</th>
                      <th className="py-3 px-5">Data</th>
                      <th className="py-3 px-5">Instrutor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {treinamentos.map(t => (
                      <tr key={t.id} className="hover:bg-[#f8fafc] transition-colors">
                        <td className="py-3 px-5 font-bold text-[#0f172a]">{t.nomeColaborador || (t as any).nomeOperador}</td>
                        <td className="py-3 px-5 font-mono text-[#64748b]">{t.re}</td>
                        <td className="py-3 px-5 font-mono text-[#64748b]">{t.dataTreinamento}</td>
                        <td className="py-3 px-5 text-[#334155]">{t.responsavel || (t as any).instrutor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS (CONCLUIR, TREINAMENTO, ALERTA, EXCLUIR) */}
      {/* ========================================================================= */}

      {/* Modal Concluir */}
      {modalConcluirOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Concluir Ocorrência</h3>
                <p className="text-xs text-[#64748b]">Aprovar eficácia e finalizar tratativas</p>
              </div>
            </div>
            <div>
              <label className="form-label">Parecer Final de Eficácia</label>
              <textarea 
                rows={3} 
                className="form-input" 
                placeholder="Descreva a comprovação da eficácia das ações..."
                value={obsConclusao}
                onChange={e => setObsConclusao(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button 
                type="button" 
                onClick={() => setModalConcluirOpen(false)} 
                className="btn-secondary h-9 px-4 text-xs"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmConcluir} 
                className="btn-primary h-9 px-4 text-xs bg-emerald-700 hover:bg-emerald-800 border-emerald-700"
              >
                Confirmar Conclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Treinamento */}
      {modalTreinOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveTreinamento} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0f6cbd] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Registrar Treinamento</h3>
                <p className="text-xs text-[#64748b]">Capacitação de operador nesta ocorrência</p>
              </div>
            </div>
            <div>
              <label className="form-label">Matrícula (RE do Colaborador) *</label>
              <input 
                type="number"
                required
                className="form-input font-mono font-bold"
                placeholder="Ex: 10423"
                value={treinRe}
                onChange={e => setTreinRe(e.target.value)}
              />
              <span className="text-[11px] text-[#64748b] mt-1 block">
                O nome e função serão preenchidos automaticamente a partir da base de ativos.
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button 
                type="button" 
                onClick={() => setModalTreinOpen(false)} 
                className="btn-secondary h-9 px-4 text-xs"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary h-9 px-4 text-xs"
              >
                Salvar Treinamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Alerta */}
      {modalAlertaOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveAlerta} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0f172a]">Divulgar Alerta da Qualidade</h3>
                <p className="text-xs text-[#64748b]">Registro de divulgação nos postos de trabalho</p>
              </div>
            </div>
            <div>
              <label className="form-label">Postos de Divulgação *</label>
              <input 
                type="text"
                required
                className="form-input"
                placeholder="Ex: B643033 - ROBÔ 33, Inspeção Final"
                value={alertaPostos}
                onChange={e => setAlertaPostos(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button 
                type="button" 
                onClick={() => setModalAlertaOpen(false)} 
                className="btn-secondary h-9 px-4 text-xs"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-primary h-9 px-4 text-xs bg-amber-700 hover:bg-amber-800 border-amber-700"
              >
                Registrar Divulgação
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Avaliação da Qualidade (Produção / Cliente) */}
      {modalAvaliacaoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#e2e8f0] flex flex-col overflow-hidden animate-in fade-in my-auto max-h-[90vh]">
            
            {/* Header Modal com Gradiente Verde */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Classificação Proteção ao Cliente</h3>
                  <p className="text-xs text-emerald-100">Avaliação técnica da Qualidade para peças reportadas na fábrica</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalAvaliacaoOpen(false)}
                className="w-8 h-8 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <form onSubmit={handleAprovarAvaliacao} className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-xs sm:text-sm">
              
              {/* Resumo da Ocorrência Registrada pelo Operador */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex gap-3.5 items-start">
                {rnc.fotoPecaNg ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 shadow-2xs">
                    <img src={rnc.fotoPecaNg} alt="Peça NG" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-emerald-100/60 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                    SAP
                  </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#0f172a] text-sm truncate">
                      {rnc.field1 || `RNC #${rnc.id}`} • {rnc.componente || rnc.produto}
                    </span>
                    <span className="font-mono text-xs font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                      SAP: {rnc.codigoRastreabilidade || 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748b]">
                    <strong>Detector:</strong> {rnc.detector || 'Operador da Linha'} • <strong>Montadora:</strong> {rnc.cliente} • <strong>Qtd:</strong> {rnc.quantidadeAfetada} pç
                  </div>
                  <div className="text-xs text-[#334155] italic bg-white p-2 rounded border border-slate-200 mt-1">
                    "{rnc.descricaoProblema || 'Não Conformidade registrada na linha'}"
                  </div>
                </div>
              </div>

              {/* 1. Seleção de Criticidade (A, B, C) */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">1</span>
                  <span>Criticidade da detecção *</span>
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Opção A */}
                  <label 
                    onClick={() => {
                      setEvalCriticidade('A');
                      setEvalAbrirRnc('Sim - Realizar Análise / Contenção / Rastreabilidade');
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                      evalCriticidade === 'A' 
                        ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="criticidade" 
                      value="A" 
                      checked={evalCriticidade === 'A'} 
                      onChange={() => {
                        setEvalCriticidade('A');
                        setEvalAbrirRnc('Sim - Realizar Análise / Contenção / Rastreabilidade');
                      }}
                      className="mt-1 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-900 text-xs sm:text-sm">A • Crítico (Impacto Direto no Cliente)</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">RNC Mandatória</span>
                      </div>
                      <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                        Peças com defeitos que <strong>não são detectadas</strong> em nenhuma etapa posterior do nosso processo, com grande impacto no cliente (parada de linha ou perda de montagem).
                      </p>
                    </div>
                  </label>

                  {/* Opção B */}
                  <label 
                    onClick={() => setEvalCriticidade('B')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                      evalCriticidade === 'B' 
                        ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="criticidade" 
                      value="B" 
                      checked={evalCriticidade === 'B'} 
                      onChange={() => setEvalCriticidade('B')}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-amber-950 text-xs sm:text-sm">B • Médio (Gerado pelo Processo)</span>
                      <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                        Peças geradas pelo processo com impacto no cliente, porém passíveis de contenção e retrabalho interno controlado.
                      </p>
                    </div>
                  </label>

                  {/* Opção C */}
                  <label 
                    onClick={() => setEvalCriticidade('C')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                      evalCriticidade === 'C' 
                        ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="criticidade" 
                      value="C" 
                      checked={evalCriticidade === 'C'} 
                      onChange={() => setEvalCriticidade('C')}
                      className="mt-1 text-slate-700 focus:ring-slate-500"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">C • Baixo (Fora do Processo / Leve)</span>
                      <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">
                        Desvios gerados fora do processo padrão ou com baixo impacto no cliente.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Decisão de Abertura de RNC Completa */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">2</span>
                  <span>Abrir RNC e Tratativa? *</span>
                </label>

                {evalCriticidade === 'A' ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span><strong>Bloqueado em 'Sim':</strong> Para Criticidade A, a abertura da RNC e contenção é mandatória pelas diretrizes de qualidade.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label 
                      onClick={() => setEvalAbrirRnc('Sim - Realizar Análise / Contenção / Rastreabilidade')}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-2.5 ${
                        evalAbrirRnc.startsWith('Sim')
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 font-bold text-blue-900'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="abrirRnc" 
                        value="Sim" 
                        checked={evalAbrirRnc.startsWith('Sim')} 
                        onChange={() => setEvalAbrirRnc('Sim - Realizar Análise / Contenção / Rastreabilidade')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="text-xs">
                        <strong>Sim</strong> • Realizar Análise / Contenção
                        <span className="block text-[11px] font-normal text-slate-500 mt-0.5">Envia para complementação de contenção e rastreabilidade</span>
                      </div>
                    </label>

                    <label 
                      onClick={() => setEvalAbrirRnc('Não - Não realizar Análise / Contenção / Rastreabilidade')}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-2.5 ${
                        evalAbrirRnc.startsWith('Não')
                          ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 font-bold text-slate-900'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="abrirRnc" 
                        value="Não" 
                        checked={evalAbrirRnc.startsWith('Não')} 
                        onChange={() => setEvalAbrirRnc('Não - Não realizar Análise / Contenção / Rastreabilidade')}
                        className="text-slate-600 focus:ring-slate-500"
                      />
                      <div className="text-xs">
                        <strong>Não</strong> • Concluir Diretamente
                        <span className="block text-[11px] font-normal text-slate-500 mt-0.5">Aprova o apontamento e fecha o registro</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* 3. Feedback / Parecer do Aprovador */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-[#0f172a] text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">3</span>
                  <span>Feedback do Gestor / Parecer da Qualidade *</span>
                </label>
                <textarea 
                  required
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 transition"
                  placeholder="Insira as orientações técnicas para a linha, confirmação do lote contido ou justifique a decisão tomada..."
                  value={evalComentario}
                  onChange={e => setEvalComentario(e.target.value)}
                />
              </div>

              {/* Rodapé de Ações do Modal */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button 
                  type="button"
                  onClick={handleReprovarAvaliacao}
                  className="btn-secondary h-9 px-3.5 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50"
                  title="Reprovar este apontamento da produção"
                >
                  <X className="w-4 h-4 mr-1 text-rose-600 inline" />
                  Reprovar Registro
                </button>

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setModalAvaliacaoOpen(false)} 
                    className="btn-secondary h-9 px-4 text-xs font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary h-9 px-5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 border-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprovar Avaliação</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
      {modalDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-900">Confirmar Exclusão</h3>
                <p className="text-xs text-[#64748b]">Esta operação é irreversível</p>
              </div>
            </div>
            <p className="text-xs text-[#475569]">
              Deseja realmente excluir a ocorrência <strong>{rnc.field1 || `RNC #${rnc.id}`}</strong>? Todos os alertas e treinamentos vinculados também serão removidos.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button 
                type="button" 
                onClick={() => setModalDeleteOpen(false)} 
                className="btn-secondary h-9 px-4 text-xs"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDelete} 
                className="btn-danger h-9 px-4 text-xs"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL POP-UP DE VISUALIZAÇÃO RÁPIDA DE RNC DO HISTÓRICO */}
      {rncPopupVisualizar && (
        <RncDetalhesModal
          rnc={rncPopupVisualizar}
          onClose={() => setRncPopupVisualizar(null)}
          onOpenFullPage={id => {
            setRncPopupVisualizar(null);
            onNavigate('detalhes-8d', { rncId: id });
          }}
        />
      )}

    </div>
  );
};

export default Detalhes8DView;
