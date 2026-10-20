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
    <div className="w-full max-w-7xl mx-auto pb-16 px-4 sm:px-6">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-14 right-6 z-50">
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-lg border ${
            notification.type === 'success' 
              ? 'bg-[#edfdf3] text-[#0f7b3a] border-[#b8e8c8]' 
              : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-inherit opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Header Planner Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-5 border-b border-[#e1dfdd] mb-5">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => rncId ? onNavigate('detalhes-8d', { rncId: selectedRncId }) : onNavigate('lista-8d')}
            className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-semibold text-[#616161] hover:text-[#242424] hover:bg-[#edebe9] transition-colors cursor-pointer border border-[#e1dfdd] bg-white shadow-xs"
            title={rncId ? "Voltar para Detalhes da Ocorrência" : "Voltar para a Lista"}
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </button>
          <div className="w-8 h-8 rounded-md bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center">
            <Barcode size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#242424] tracking-tight">
              Rastreabilidade & Controle de Produção
            </h1>
            <p className="text-xs text-[#616161]">
              Auditoria de lotes, etiquetas vivas e estoque retido em cabeceiras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#616161] font-medium hidden sm:inline">RNC Ativa:</span>
          <select 
            className="h-8 px-2.5 rounded-md border border-[#e1dfdd] bg-white text-xs font-mono text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
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

      {/* Card Novo Rastreio - Planner Compact */}
      <div className="bg-white rounded-lg border border-[#edebe9] p-4 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-[#edebe9]">
          <Plus size={15} className="text-[#0f6cbd]" />
          <h2 className="text-xs font-bold text-[#242424] uppercase tracking-wide">
            Nova Solicitação de Rastreamento no SAP
          </h2>
        </div>

        <form onSubmit={handleCadastrarRastreio} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-semibold text-[#242424] mb-1">
              Código do Componente
            </label>
            <input 
              type="text" 
              className="w-full h-8 px-2.5 rounded-md border border-[#e1dfdd] bg-white text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none font-mono" 
              value={novoComp} 
              onChange={e => setNovoComp(e.target.value)}
              placeholder="Ex: 53201-0D120"
              required
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-semibold text-[#242424] mb-1">
              Código do Lote SAP (Mín. 5 Dígitos) <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              className="w-full h-8 px-2.5 rounded-md border border-[#e1dfdd] bg-white text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none font-mono font-bold" 
              value={novoLote} 
              onChange={e => setNovoLote(e.target.value)}
              placeholder="Ex: 9842105"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <button 
              type="submit" 
              className="w-full btn-fluent-primary"
            >
              <Barcode size={15} />
              <span>Rastrear no SAP</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pill Filter Tabs - Exactly matching Planner */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <button 
          type="button"
          onClick={() => setActiveTab('lotes')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeTab === 'lotes'
              ? 'bg-[#ffffff] text-[#0f6cbd] border border-[#0f6cbd] font-semibold shadow-sm'
              : 'text-[#616161] hover:bg-[#edebe9] hover:text-[#242424]'
          }`}
        >
          1. Lotes SAP ({lotes.length})
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('etiquetas')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeTab === 'etiquetas'
              ? 'bg-[#ffffff] text-[#0f6cbd] border border-[#0f6cbd] font-semibold shadow-sm'
              : 'text-[#616161] hover:bg-[#edebe9] hover:text-[#242424]'
          }`}
        >
          2. Etiquetas Vivas ({etiquetas.length})
        </button>

        <button 
          type="button"
          onClick={() => setActiveTab('cabeceiras')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            activeTab === 'cabeceiras'
              ? 'bg-[#ffffff] text-[#0f6cbd] border border-[#0f6cbd] font-semibold shadow-sm'
              : 'text-[#616161] hover:bg-[#edebe9] hover:text-[#242424]'
          }`}
        >
          3. Cabeceiras & Estoque ({cabeceiras.length})
        </button>
      </div>

      {/* Tabela Planner Style */}
      <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
        
        {/* TAB 1: LOTES SAP */}
        {activeTab === 'lotes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#edebe9] bg-[#faf9f8] text-[11px] font-semibold text-[#616161]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Sequência</th>
                  <th className="py-2.5 px-4">Produto / Material</th>
                  <th className="py-2.5 px-4">Lote Identificado</th>
                  <th className="py-2.5 px-4">Quantidade</th>
                  <th className="py-2.5 px-4">Data Fabricação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9] text-xs">
                {lotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[#8a8886]">
                      Nenhum lote rastreado para este ID de ocorrência.
                    </td>
                  </tr>
                ) : (
                  lotes.map((l, i) => (
                    <tr key={i} className="hover:bg-[#f3f2f1] transition-colors">
                      <td className="py-2 px-4 text-center">
                        <div className="w-7 h-7 rounded bg-[#f3f2f1] text-[#4f46e5] flex items-center justify-center font-bold text-[10px]">
                          LT
                        </div>
                      </td>
                      <td className="py-2 px-4 font-mono text-[#616161]">
                        {l.seqRel}
                      </td>
                      <td className="py-2 px-4 font-semibold text-[#242424]">
                        {l.produto}
                      </td>
                      <td className="py-2 px-4 font-mono font-bold text-[#0f6cbd]">
                        {l.lote}
                      </td>
                      <td className="py-2 px-4 font-medium text-[#242424]">
                        {l.qtd} pçs
                      </td>
                      <td className="py-2 px-4 text-[#616161] font-mono">
                        {l.data}
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
                <tr className="border-b border-[#edebe9] bg-[#faf9f8] text-[11px] font-semibold text-[#616161]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Etiqueta SAP</th>
                  <th className="py-2.5 px-4">Produto</th>
                  <th className="py-2.5 px-4">Lote</th>
                  <th className="py-2.5 px-4">Depósito</th>
                  <th className="py-2.5 px-4">Qtd</th>
                  <th className="py-2.5 px-4">Status no SAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9] text-xs">
                {etiquetas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[#8a8886]">
                      Nenhuma etiqueta viva encontrada no depósito.
                    </td>
                  </tr>
                ) : (
                  etiquetas.map((e, i) => (
                    <tr key={i} className="hover:bg-[#f3f2f1] transition-colors">
                      <td className="py-2 px-4 text-center">
                        <div className="w-7 h-7 rounded bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center font-bold text-[10px]">
                          ET
                        </div>
                      </td>
                      <td className="py-2 px-4 font-mono font-bold text-[#242424]">
                        {e.etiquetasap}
                      </td>
                      <td className="py-2 px-4 font-semibold text-[#242424]">
                        {e.produto}
                      </td>
                      <td className="py-2 px-4 font-mono text-[#616161]">
                        {e.lote}
                      </td>
                      <td className="py-2 px-4 text-[#616161]">
                        {e.deposito}
                      </td>
                      <td className="py-2 px-4 font-medium text-[#242424]">
                        {e.qtd} pçs
                      </td>
                      <td className="py-2 px-4">
                        {e.statusBloqueio === 'bloq' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]">
                            <Lock size={10} />
                            BLOQUEADA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#edfdf3] text-[#0f7b3a] border border-[#b8e8c8]">
                            <Unlock size={10} />
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
                <tr className="border-b border-[#edebe9] bg-[#faf9f8] text-[11px] font-semibold text-[#616161]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Material</th>
                  <th className="py-2.5 px-4">Lote</th>
                  <th className="py-2.5 px-4">Quantidade</th>
                  <th className="py-2.5 px-4">Posição / Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9] text-xs">
                {cabeceiras.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#8a8886]">
                      Nenhum estoque de cabeceira retido.
                    </td>
                  </tr>
                ) : (
                  cabeceiras.map((c, i) => (
                    <tr key={i} className="hover:bg-[#f3f2f1] transition-colors">
                      <td className="py-2 px-4 text-center">
                        <div className="w-7 h-7 rounded bg-[#fffbeb] text-[#b45309] flex items-center justify-center font-bold text-[10px]">
                          CB
                        </div>
                      </td>
                      <td className="py-2 px-4 font-semibold text-[#242424]">
                        {c.produto}
                      </td>
                      <td className="py-2 px-4 font-mono text-[#616161]">
                        {c.lote}
                      </td>
                      <td className="py-2 px-4 font-medium text-[#242424]">
                        {c.qtd} pçs
                      </td>
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#fffbeb] text-[#92400e] border border-[#fde68a]">
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
