import React, { useState } from 'react';
import { 
  Barcode, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Archive, 
  Tag, 
  Lock, 
  Unlock,
  ArrowLeft,
  X,
  FileText
} from 'lucide-react';
import { RastreabilidadeItem, EtiquetaVivaParsed, LoteSAPParsed, RastCabeceiraParsed, UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { formatDateBR } from '../utils/date';

interface RastreabilidadeViewProps {
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
  rncId?: number;
}

export const RastreabilidadeView: React.FC<RastreabilidadeViewProps> = ({ onNavigate, currentUser, rncId }) => {
  const rncs = spStore.getRNCs();
  const initialRncId = rncId && rncs.some(r => r.id === rncId) ? rncId : (rncs[0]?.id || 101);
  const [selectedRncId, setSelectedRncId] = useState<number>(initialRncId);
  const [activeTab, setActiveTab] = useState<'lotes' | 'etiquetas' | 'cabeceiras'>('lotes');
  const [novoLote, setNovoLote] = useState('');
  const currentRnc = rncs.find(r => r.id === selectedRncId);
  const [novoComp, setNovoComp] = useState(currentRnc?.componente || '53201-0D120');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const lotes = spStore.getLotesSAP(selectedRncId);
  const etiquetas = spStore.getEtiquetasVivas(selectedRncId);
  const cabeceiras = spStore.getRastCabeceiras(selectedRncId);

  const handleCadastrarRastreio = (e: React.FormEvent) => {
    e.preventDefault();

    // REGRA DO POWER APPS: Código do lote deve conter pelo menos 5 dígitos
    const trimmedLote = novoLote.trim();
    if (trimmedLote.length < 5) {
      setNotification({
        type: 'error',
        message: 'O código do lote deve conter pelo menos 5 dígitos numéricos!'
      });
      return;
    }

    spStore.addRastreabilidade({
      idRnc: selectedRncId,
      codComp: novoComp,
      codRastreabilidade: trimmedLote,
      docRastreabilidade: 'Etiqueta SAP',
      seqRelacionada: Math.floor(10000000 + Math.random() * 90000000),
      dataHora: new Date().toISOString().replace('T', ' ').slice(0, 16),
      comando: 'rp',
      statusGeral: 'R',
      statusVerif: 'OK'
    });

    setNotification({
      type: 'success',
      message: `Lote SAP ${trimmedLote} rastreado e integrado com sucesso!`
    });
    setNovoLote('');
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-16 animate-in fade-in duration-150">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-6 z-50">
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-inherit opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => rncId ? onNavigate('detalhes-8d', { rncId: selectedRncId }) : onNavigate('lista-8d')}
            className="btn-secondary h-9 px-3 text-xs font-semibold"
            title={rncId ? "Voltar para Detalhes da Ocorrência" : "Voltar para a Lista"}
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100 shadow-xs">
            <Barcode size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold text-[#0f172a] tracking-tight">
              Rastreabilidade & Controle de Produção
            </h1>
            <p className="text-xs text-[#64748b]">
              Auditoria de lotes, etiquetas vivas e estoque retido em cabeceiras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-[#64748b] font-medium hidden sm:inline">RNC Ativa:</span>
          <select 
            className="form-input !h-9 text-xs font-mono"
            value={selectedRncId}
            onChange={e => setSelectedRncId(Number(e.target.value))}
          >
            {rncs.slice(0, 50).map(r => (
              <option key={r.id} value={r.id}>
                {r.field1 || `RNC-${r.id}`} ({r.cliente})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Novo Rastreio */}
      <div className="card-saas p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#e2e8f0]">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0f6cbd] flex items-center justify-center border border-blue-100">
            <Plus size={15} />
          </div>
          <h2 className="text-xs font-display font-bold text-[#0f172a] uppercase tracking-wide">
            Nova Solicitação de Rastreamento no SAP
          </h2>
        </div>

        <form onSubmit={handleCadastrarRastreio} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          <div className="sm:col-span-5">
            <label className="form-label block mb-1">
              Código do Componente
            </label>
            <input 
              type="text" 
              className="form-input text-xs font-mono" 
              value={novoComp} 
              onChange={e => setNovoComp(e.target.value)}
              placeholder="Ex: 53201-0D120"
              required
            />
          </div>

          <div className="sm:col-span-4">
            <label className="form-label block mb-1">
              Código do Lote SAP (Mín. 5 Dígitos) <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              className="form-input text-xs font-mono font-bold" 
              value={novoLote} 
              onChange={e => setNovoLote(e.target.value)}
              placeholder="Ex: 9842105"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <button 
              type="submit" 
              className="btn-primary w-full h-9 text-xs font-semibold"
            >
              <Barcode size={15} />
              <span>Rastrear no SAP</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pill Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button 
          type="button"
          onClick={() => setActiveTab('lotes')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'lotes'
              ? 'bg-blue-50/90 text-[#0b5796] border-[#0f6cbd]/40 shadow-xs'
              : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-slate-50 hover:text-[#0f172a]'
          }`}
        >
          1. Lotes SAP ({lotes.length})
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('etiquetas')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'etiquetas'
              ? 'bg-blue-50/90 text-[#0b5796] border-[#0f6cbd]/40 shadow-xs'
              : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-slate-50 hover:text-[#0f172a]'
          }`}
        >
          2. Etiquetas Vivas ({etiquetas.length})
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('cabeceiras')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
            activeTab === 'cabeceiras'
              ? 'bg-blue-50/90 text-[#0b5796] border-[#0f6cbd]/40 shadow-xs'
              : 'bg-white text-[#64748b] border-[#e2e8f0] hover:bg-slate-50 hover:text-[#0f172a]'
          }`}
        >
          3. Cabeceiras & Estoque ({cabeceiras.length})
        </button>
      </div>

      {/* Tabela SaaS */}
      <div className="card-saas overflow-hidden">
        
        {/* TAB 1: LOTES SAP */}
        {activeTab === 'lotes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]/90 text-xs font-display font-semibold text-[#64748b]">
                  <th className="py-3 px-4 w-12 text-center font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Sequência</th>
                  <th className="py-3 px-4 font-semibold">Produto / Material</th>
                  <th className="py-3 px-4 font-semibold">Lote Identificado</th>
                  <th className="py-3 px-4 font-semibold">Quantidade</th>
                  <th className="py-3 px-4 font-semibold">Data Fabricação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-xs">
                {lotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#64748b]">
                      Nenhum lote rastreado para este ID de ocorrência.
                    </td>
                  </tr>
                ) : (
                  lotes.map((l, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px] border border-indigo-100">
                          LT
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748b]">
                        {l.seqRel}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0f172a]">
                        {l.produto}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0f6cbd]">
                        {l.lote}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0f172a]">
                        {l.qtd} pçs
                      </td>
                      <td className="py-3 px-4 text-[#64748b] font-mono">
                        {formatDateBR(l.data)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: ETIQUETAS VIVAS */}
        {activeTab === 'etiquetas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]/90 text-xs font-display font-semibold text-[#64748b]">
                  <th className="py-3 px-4 w-12 text-center font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Etiqueta SAP</th>
                  <th className="py-3 px-4 font-semibold">Produto</th>
                  <th className="py-3 px-4 font-semibold">Lote</th>
                  <th className="py-3 px-4 font-semibold">Depósito</th>
                  <th className="py-3 px-4 font-semibold">Qtd</th>
                  <th className="py-3 px-4 font-semibold">Status no SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-xs">
                {etiquetas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-[#64748b]">
                      Nenhuma etiqueta viva encontrada no depósito.
                    </td>
                  </tr>
                ) : (
                  etiquetas.map((e, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-[10px] border border-blue-100">
                          ET
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#0f172a]">
                        {e.etiquetasap}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0f172a]">
                        {e.produto}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748b]">
                        {e.lote}
                      </td>
                      <td className="py-3 px-4 text-[#64748b]">
                        {e.deposito}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0f172a]">
                        {e.qtd} pçs
                      </td>
                      <td className="py-3 px-4">
                        {e.statusBloqueio === 'bloq' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <Lock size={11} />
                            BLOQUEADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Unlock size={11} />
                            LIBERADA
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CABECEIRAS */}
        {activeTab === 'cabeceiras' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]/90 text-xs font-display font-semibold text-[#64748b]">
                  <th className="py-3 px-4 w-12 text-center font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Material</th>
                  <th className="py-3 px-4 font-semibold">Lote</th>
                  <th className="py-3 px-4 font-semibold">Quantidade</th>
                  <th className="py-3 px-4 font-semibold">Posição / Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9] text-xs">
                {cabeceiras.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#64748b]">
                      Nenhum estoque de cabeceira retido.
                    </td>
                  </tr>
                ) : (
                  cabeceiras.map((c, i) => (
                    <tr key={i} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-[10px] border border-amber-200">
                          CB
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0f172a]">
                        {c.produto}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#64748b]">
                        {c.lote}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0f172a]">
                        {c.qtd} pçs
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {c.estoque}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};

export default RastreabilidadeView;
