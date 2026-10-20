import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  X,
  CreditCard,
  Building
} from 'lucide-react';
import { RNCRecord, UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { getClientBadgeInfo } from '../constants/clientes';

interface PagamentoProtCliViewProps {
  onNavigate: (screen: any) => void;
  currentUser: UsuarioQualidade;
}

export const PagamentoProtCliView: React.FC<PagamentoProtCliViewProps> = ({ onNavigate, currentUser }) => {
  const [aprovados, setAprovados] = useState<RNCRecord[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    const list = spStore.getRNCs().filter(r => r.protcliente === 'Aprovado');
    setAprovados(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLiquidarLote = () => {
    // Espelha fielmente Icon8.OnSelect do Power Apps:
    // ForAll(Gallery_Lista_Protecao_ao_Cliente.AllItems, Patch('Resumo dos Incidentes...', ThisRecord, {protcliente: "Registro Pago", data_pagamento: Today() - 1}))
    const count = spStore.liquidarProtecoesCliente();
    setNotification({
      type: 'success',
      message: `${count} registro(s) liquidado(s) com sucesso como 'Registro Pago' no SharePoint!`
    });
    loadData();
  };

  const getClientBadge = (cliente: string) => {
    return getClientBadgeInfo(cliente);
  };

  const filteredAprovados = aprovados.filter(r => 
    (r.field1 || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.codigoRastreabilidade || '').includes(searchTerm) ||
    (r.componente || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <CheckCircle2 size={16} />
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
            onClick={() => onNavigate('menu-2')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#616161] hover:text-[#242424] hover:bg-[#edebe9] transition-colors"
            title="Voltar à Visão Geral"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-8 h-8 rounded-md bg-[#e6f4ea] text-[#137333] flex items-center justify-center">
            <DollarSign size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#242424] tracking-tight">
              Liquidação de Pagamentos: Proteção ao Cliente
            </h1>
            <p className="text-xs text-[#616161]">
              Autorização e baixa financeira de RNCs com proteção aprovada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={loadData}
            className="btn-fluent-secondary"
            title="Recarregar dados"
          >
            <RefreshCw size={13} />
            <span>Atualizar</span>
          </button>

          {aprovados.length > 0 && (
            <button 
              type="button"
              onClick={handleLiquidarLote}
              className="btn-fluent-primary bg-[#0f7b3a] hover:bg-[#0c632e] border-[#0f7b3a]"
            >
              <CheckCircle2 size={15} />
              <span>Liquidar Todos ({aprovados.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input Planner Style */}
      {aprovados.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a8886]" />
            <input 
              type="text"
              className="w-full h-8 pl-8 pr-7 rounded-md border border-[#e1dfdd] bg-white text-xs text-[#242424] placeholder:text-[#8a8886] focus:border-[#0f6cbd] focus:outline-none transition-colors"
              placeholder="Buscar RNC, cliente ou SAP..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a8886] hover:text-[#242424]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <span className="text-xs text-[#616161] font-medium hidden sm:inline">
            {filteredAprovados.length} de {aprovados.length} registros pendentes
          </span>
        </div>
      )}

      {/* Main Table or Empty State Planner Style */}
      <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
        {aprovados.length === 0 ? (
          <div className="py-16 text-center text-[#616161]">
            <div className="w-12 h-12 rounded-full bg-[#e6f4ea] text-[#137333] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-[#242424]">Nenhum pagamento pendente</h3>
            <p className="text-xs text-[#616161] mt-1 max-w-sm mx-auto">
              Todas as proteções ao cliente autorizadas já foram liquidadas e registradas como &apos;Registro Pago&apos;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#edebe9] bg-[#faf9f8] text-[11px] font-semibold text-[#616161]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Código RNC</th>
                  <th className="py-2.5 px-4">Data Ocorrência</th>
                  <th className="py-2.5 px-4">Cliente (Montadora)</th>
                  <th className="py-2.5 px-4">Peça / Componente</th>
                  <th className="py-2.5 px-4">Etiqueta SAP (9 Dígitos)</th>
                  <th className="py-2.5 px-4">Status Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edebe9] text-xs">
                {filteredAprovados.map(r => {
                  const badge = getClientBadge(r.cliente || '');
                  return (
                    <tr key={r.id} className="hover:bg-[#f3f2f1] transition-colors">
                      <td className="py-2 px-4 text-center">
                        <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] ${badge.color}`}>
                          {badge.code}
                        </div>
                      </td>
                      <td className="py-2 px-4 font-mono font-bold text-[#0f6cbd]">
                        {r.field1 || `RNC-${r.id}`}
                      </td>
                      <td className="py-2 px-4 font-mono text-[#616161]">
                        {r.dataOcorrencia}
                      </td>
                      <td className="py-2 px-4 font-semibold text-[#242424]">
                        {r.cliente}
                      </td>
                      <td className="py-2 px-4 text-[#242424]">
                        {r.componente}
                      </td>
                      <td className="py-2 px-4">
                        <span className="font-mono font-bold text-[#242424] bg-[#f3f2f1] px-2 py-0.5 rounded border border-[#e1dfdd] text-[11px]">
                          {r.codigoRastreabilidade || 'N/A'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#edfdf3] text-[#0f7b3a] border border-[#b8e8c8]">
                          {r.protcliente}
                        </span>
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
  );
};

export default PagamentoProtCliView;
