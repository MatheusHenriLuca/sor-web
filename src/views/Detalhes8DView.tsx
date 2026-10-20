import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade, RegistroTreinamento } from '../types';
import { spStore } from '../services/sharepointService';
import { ImageWithFallback } from '../components/ImageWithFallback';

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

  // Estados dos formulários em modais
  const [alertaPostos, setAlertaPostos] = useState('');
  const [treinRe, setTreinRe] = useState<string>('');
  const [obsConclusao, setObsConclusao] = useState('');

  const reloadData = () => {
    const item = spStore.getRNCById(rncId);
    setRnc(item);
    setTreinamentos(spStore.getTreinamentos(rncId));
  };

  useEffect(() => {
    reloadData();
  }, [rncId]);

  if (!rnc) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-[#e2e8f0] text-center space-y-4 shadow-sm">
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

  const isProtecaoAtiva = rnc.protcliente && rnc.protcliente !== 'Não';

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-150 pb-16">
      
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

      {/* 1. CABEÇALHO UNIFICADO DO REGISTRO (ÁREAS A, B, C, D COM HIERARQUIA E RESPIRO) */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        
        {/* Bloco A — Identificação da Ocorrência (Número, Status, Tipo e Metadados com Amplo Respiro) */}
        <div className="flex flex-col gap-3 pb-4 border-b border-[#f1f5f9]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button 
              type="button"
              onClick={() => onNavigate('lista-8d')}
              className="btn-secondary h-9 px-3 text-xs font-semibold shrink-0 gap-1.5"
              title="Voltar para a Lista de Ocorrências"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Principal com Semântica Suave WCAG 2.2 */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                rnc.status === 'Concluído' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : rnc.status === 'Em Andamento' 
                  ? 'bg-amber-50 text-amber-900 border-amber-200' 
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  rnc.status === 'Concluído' ? 'bg-emerald-500' : rnc.status === 'Em Andamento' ? 'bg-amber-500' : 'bg-sky-500'
                }`} />
                {rnc.status}
              </span>

              {/* Tipo da Ocorrência */}
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {rnc.tipoRnc}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight font-mono-numbers">
              {rnc.field1 || `RNC #${rnc.id}`}
            </h1>

            {/* Metadados Secundários: Montadora, Peça, Setor */}
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
          </div>
        </div>

        {/* Bloco B — Barra de Ações da Ocorrência (Grupo Visual Próprio com Espaçamento Uniforme) */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              type="button"
              onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
              className="btn-secondary h-9 px-3.5 text-xs font-medium gap-2"
              title="Gerar Ficha A4 em PDF"
            >
              <Printer className="w-4 h-4 text-[#64748b]" />
              <span>Imprimir A4</span>
            </button>

            <button 
              type="button"
              onClick={() => onNavigate('rastreabilidade', { rncId: rnc.id })}
              className="btn-secondary h-9 px-3.5 text-xs font-semibold text-[#4338ca] hover:bg-indigo-50 hover:border-indigo-200 gap-2"
              title="Ver lotes SAP e histórico de rastreabilidade desta ocorrência"
            >
              <Barcode className="w-4 h-4 text-[#4338ca]" />
              <span>Rastrear SAP</span>
            </button>

            {!isOperator && (
              <>
                <button 
                  type="button"
                  onClick={() => onNavigate('registro-8d', { edicao: true, rncId: rnc.id })}
                  className="btn-secondary h-9 px-3.5 text-xs font-medium gap-2"
                >
                  <Edit3 className="w-4 h-4 text-[#64748b]" />
                  <span>Editar</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setModalAlertaOpen(true)}
                  className="btn-secondary h-9 px-3.5 text-xs font-medium gap-2"
                >
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>Alerta</span>
                </button>

                <button 
                  type="button"
                  onClick={() => setModalTreinOpen(true)}
                  className="btn-secondary h-9 px-3.5 text-xs font-medium gap-2"
                >
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>Treinamento</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {isLiderOrAbove && rnc.status !== 'Concluído' && (
              <button 
                type="button"
                onClick={() => setModalConcluirOpen(true)}
                className="btn-primary h-9 px-4 text-xs font-bold gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Concluir RNC</span>
              </button>
            )}

            {isAdminOrQual && (
              <button 
                type="button"
                onClick={() => setModalDeleteOpen(true)}
                className="btn-icon h-9 w-9 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                title="Excluir Ocorrência"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Bloco C — Alerta de Proteção ao Cliente (Faixa Própria com Respiro Adequado) */}
        {isProtecaoAtiva && (
          <div className="alert-box-danger-prot shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-200/60 text-rose-800 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-700" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-rose-950">
                    Protocolo de Proteção ao Cliente Ativado ({rnc.protcliente})
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-700 text-white tracking-wider uppercase shrink-0">
                    Ação Imediata
                  </span>
                </div>
                <div className="text-xs text-rose-900 leading-relaxed">
                  Etiqueta SAP vinculada: <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-rose-300 text-rose-950">{rnc.codigoRastreabilidade || 'Não informada'}</code>. Triagem 100% mandatória no estoque.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bloco D — Navegação Interna da Ocorrência (Segmented Control Responsivo com Padding Confortável) */}
        <div className="pt-1 flex items-center w-full sm:w-auto">
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center p-1 bg-[#f1f5f9] border border-[#e2e8f0] rounded-xl shadow-2xs gap-1.5">
            <button
              type="button"
              onClick={() => setActiveViewMode('detalhes')}
              className={`h-10 px-4 sm:px-5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition cursor-pointer select-none ${
                activeViewMode === 'detalhes'
                  ? 'bg-white text-[#0f6cbd] shadow-xs border border-[#e2e8f0]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Detalhado (Lista Completa)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('alerta')}
              className={`h-10 px-4 sm:px-5 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition cursor-pointer select-none ${
                activeViewMode === 'alerta'
                  ? 'bg-white text-rose-700 shadow-xs border border-[#e2e8f0]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Alerta da Qualidade & Contenção</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODO 1: DETALHADO (LISTA COMPLETA - REFERÊNCIA IMAGEM 3) */}
      {/* ========================================================================= */}
      {activeViewMode === 'detalhes' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* SEÇÃO 1: HISTÓRICO & RELATO COMPLETO */}
          <div className="card-saas p-6 space-y-4">
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

            <div className="space-y-4 pt-1">
              <div className="info-tile">
                <span className="info-tile-label">
                  Descrição resumida da não conformidade
                </span>
                <div className="info-tile-value text-sm font-semibold text-[#0f172a] mt-1">
                  {rnc.descricaoProblema || 'Não Conformidade registrada na linha'}
                </div>
              </div>

              <div className="info-tile">
                <span className="info-tile-label">
                  Detalhamento do ocorrido (chão de fábrica / cliente)
                </span>
                <div className="text-xs sm:text-sm text-[#334155] leading-relaxed font-normal mt-1">
                  {rnc.descricaoCompleta || rnc.descricaoProblema || 'Nenhum detalhamento complementar informado.'}
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: DADOS DO PRODUTO & ORIGEM FABRIL (GRID 2 COLUNAS BENTO) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bloco 1: Dados do Produto & Engenharia */}
            <div className="card-saas p-6 space-y-5">
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
            <div className="card-saas p-6 space-y-5">
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

                <div className="info-tile">
                  <span className="info-tile-label">Etiqueta SAP vinculada</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono font-bold text-sm text-[#0f172a]">{rnc.codigoRastreabilidade || 'N/A'}</span>
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
                  <span className="info-tile-label">Abertura de 8D</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-0.5 ${
                    rnc.abrir8D === 'Sim' ? 'bg-blue-100 text-[#0f6cbd] border border-blue-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {rnc.abrir8D === 'Sim' ? 'Sim (8 Disciplinas)' : 'Não'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* SEÇÃO 3: CONTENÇÃO IMEDIATA & DIRETRIZES 5W2H */}
          <div className="card-saas p-6 space-y-6">
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
          <div className="card-saas p-5 space-y-4">
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
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Modo de Falha:</span>
                  <div className="font-bold text-[#0f172a] mt-0.5">{rnc.descricaoProblema || 'Deformação'}</div>
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
      {/* MODO 2: ALERTA DA QUALIDADE & CONTENÇÃO (FOCO EM IMAGENS GRANDES E CHÃO) */}
      {/* ========================================================================= */}
      {activeViewMode === 'alerta' && (
        <div className="space-y-5 animate-in fade-in">
          
          {/* Banner Chamativo de Alerta */}
          <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-white border-l-4 border-l-rose-600 border border-rose-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                  Alerta da Qualidade & Disposição Imediata (D3)
                </span>
                <div className="text-base sm:text-lg font-extrabold text-[#0f172a] mt-0.5">
                  {rnc.componente} • {rnc.produto}
                </div>
                <p className="text-xs text-[#475569] mt-0.5">
                  Divulgação mandatória nos postos da montadora <strong>{rnc.cliente}</strong> ({rnc.classificacaoSetor})
                </p>
              </div>
            </div>

            {!isOperator && (
              <button
                type="button"
                onClick={() => setModalAlertaOpen(true)}
                className="btn-primary bg-rose-700 hover:bg-rose-800 border-rose-700 text-xs shrink-0"
              >
                <Bell className="w-4 h-4" />
                <span>Registrar Divulgação</span>
              </button>
            )}
          </div>

          {/* EVIDÊNCIAS FOTOGRÁFICAS EM TAMANHO GRANDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Peça NG */}
            <div className="card-saas p-5 border-2 border-rose-300 bg-rose-50/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-extrabold uppercase bg-rose-700 text-white">
                    Defeito (NG)
                  </span>
                  <span className="font-bold text-sm text-rose-950">Peça Não Conforme</span>
                </div>
                <span className="text-xs text-rose-700 font-bold">Amostra Rejeitada</span>
              </div>

              <div className="h-80 rounded-xl bg-white border border-rose-200 overflow-hidden flex items-center justify-center p-2 shadow-xs">
                <ImageWithFallback
                  src={rnc.fotoPecaNg}
                  alt={`Peça NG: ${rnc.descricaoProblema}`}
                  variant="ng"
                  className="w-full h-full object-contain"
                  emptyLabel="Sem foto do defeito cadastrada"
                  allowZoom={true}
                  itemId={rnc.id}
                />
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-rose-200 text-xs space-y-1">
                <span className="font-bold text-rose-800 uppercase text-[11px] block">Defeito Identificado:</span>
                <div className="text-sm font-bold text-[#0f172a]">{rnc.descricaoProblema}</div>
                <div className="text-[#64748b]">Posto de Origem: <strong>{rnc.posto || 'Não especificado'}</strong></div>
              </div>
            </div>

            {/* Peça OK */}
            <div className="card-saas p-5 border-2 border-emerald-300 bg-emerald-50/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-extrabold uppercase bg-emerald-700 text-white">
                    Padrão (OK)
                  </span>
                  <span className="font-bold text-sm text-emerald-950">Peça Conforme</span>
                </div>
                <span className="text-xs text-emerald-700 font-bold">Critério Aceito</span>
              </div>

              <div className="h-80 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center p-2 shadow-xs">
                <ImageWithFallback
                  src={rnc.fotoPecaOk}
                  alt={`Peça OK: ${rnc.componente}`}
                  variant="ok"
                  className="w-full h-full object-contain"
                  emptyLabel="Sem foto padrão cadastrada"
                  allowZoom={true}
                  itemId={rnc.id}
                />
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                <span className="font-bold text-emerald-800 uppercase text-[11px] block">Critério de Liberação:</span>
                <div className="text-sm font-bold text-[#0f172a]">Livre de trincas, solda 100% contínua e conformidade dimensional.</div>
                <div className="text-[#64748b]">Inspeção visual e dimensional aprovada.</div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS (CONCLUIR, TREINAMENTO, ALERTA, EXCLUIR) */}
      {/* ========================================================================= */}

      {/* Modal Concluir */}
      {modalConcluirOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4 animate-in fade-in">
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
          <form onSubmit={handleSaveTreinamento} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4 animate-in fade-in">
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
          <form onSubmit={handleSaveAlerta} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4 animate-in fade-in">
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

      {/* Modal Excluir */}
      {modalDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4 animate-in fade-in">
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

    </div>
  );
};

export default Detalhes8DView;
