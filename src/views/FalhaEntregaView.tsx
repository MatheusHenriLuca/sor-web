import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  Search,
  Calendar,
  Layers,
  Clock
} from 'lucide-react';
import { FalhaEntregaRecord, UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, DEFAULT_CLIENTE, getClientBadgeInfo } from '../constants/clientes';

interface FalhaEntregaViewProps {
  onNavigate: (screen: any) => void;
  currentUser: UsuarioQualidade;
}

export const FalhaEntregaView: React.FC<FalhaEntregaViewProps> = ({ onNavigate, currentUser }) => {
  const [falhas, setFalhas] = useState<FalhaEntregaRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Novo registro state
  const [form, setForm] = useState<Partial<FalhaEntregaRecord>>({
    data: new Date().toISOString().split('T')[0],
    cliente: DEFAULT_CLIENTE,
    produto: 'COROLLA',
    turno: '1º Turno',
    qtdFalha: 1,
    motivoFalha: 'Atraso Logístico no Envio',
    areaFmds: 'FMDS 01',
    observacao: ''
  });

  const loadData = () => {
    setFalhas(spStore.getFalhasEntrega());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    spStore.saveFalhaEntrega(form);
    setNotification({ type: 'success', message: 'Falha de entrega cadastrada com sucesso!' });
    setModalOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (deleteId) {
      spStore.deleteFalhaEntrega(deleteId);
      setNotification({ type: 'success', message: 'Registro de falha excluído com sucesso.' });
      setDeleteId(null);
      loadData();
    }
  };

  const getClientBadge = (cliente: string) => {
    return getClientBadgeInfo(cliente);
  };

  const filteredFalhas = falhas.filter(f => 
    (f.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.produto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.motivoFalha || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.areaFmds || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPecas = falhas.reduce((acc, curr) => acc + (curr.qtdFalha || 0), 0);

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
            onClick={() => onNavigate('menu-2')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#616161] hover:text-[#242424] hover:bg-[#edebe9] transition-colors"
            title="Voltar à Visão Geral"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-8 h-8 rounded-md bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center">
            <Truck size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#242424] tracking-tight">
              Gestão de Falhas de Entrega
            </h1>
            <p className="text-xs text-[#616161]">
              Registro e rastreabilidade logística de expedição e montadoras
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn-fluent-primary"
        >
          <Plus size={15} />
          <span>Registrar Falha de Entrega</span>
        </button>
      </div>

      {/* KPI Stats Strip - Microsoft Planner Style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-lg border border-[#edebe9] p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">
            Total Ocorrências
          </span>
          <div className="text-xl font-bold text-[#242424] mt-1 font-mono">
            {falhas.length}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#edebe9] p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">
            Peças Não Entregues
          </span>
          <div className="text-xl font-bold text-[#dc2626] mt-1 font-mono">
            {totalPecas}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#edebe9] p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">
            Status Operacional
          </span>
          <div className="text-xs font-semibold text-[#0f7b3a] mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0f7b3a]" />
            Monitoramento Ativo
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#edebe9] p-3.5 shadow-sm">
          <span className="text-[11px] font-semibold text-[#616161] uppercase tracking-wider">
            Repositório SharePoint
          </span>
          <div className="text-xs font-medium text-[#242424] mt-2 truncate">
            Lista_Falha_de_Entrega
          </div>
        </div>
      </div>

      {/* Search Input Planner Style */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a8886]" />
          <input 
            type="text"
            className="w-full h-8 pl-8 pr-7 rounded-md border border-[#e1dfdd] bg-white text-xs text-[#242424] placeholder:text-[#8a8886] focus:border-[#0f6cbd] focus:outline-none transition-colors"
            placeholder="Buscar por cliente, motivo ou FMDS..."
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
          {filteredFalhas.length} registros encontrados
        </span>
      </div>

      {/* Tabela Planner Style */}
      <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edebe9] bg-[#faf9f8] text-[11px] font-semibold text-[#616161]">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Data</th>
                <th className="py-2.5 px-4">Cliente (Montadora)</th>
                <th className="py-2.5 px-4">Produto / Veículo</th>
                <th className="py-2.5 px-4">Turno</th>
                <th className="py-2.5 px-4 text-center">Qtd Falha</th>
                <th className="py-2.5 px-4">Motivo da Falha</th>
                <th className="py-2.5 px-4">Área / FMDS</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edebe9] text-xs">
              {filteredFalhas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-[#8a8886]">
                    Nenhuma falha de entrega localizada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredFalhas.map(f => {
                  const badge = getClientBadge(f.cliente || '');
                  return (
                    <tr key={f.id} className="hover:bg-[#f3f2f1] transition-colors group">
                      <td className="py-2 px-4 text-center">
                        <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] ${badge.color}`}>
                          {badge.code}
                        </div>
                      </td>
                      <td className="py-2 px-4 font-mono text-[#616161]">
                        {f.data}
                      </td>
                      <td className="py-2 px-4 font-semibold text-[#242424]">
                        {f.cliente}
                      </td>
                      <td className="py-2 px-4 text-[#242424]">
                        {f.produto}
                      </td>
                      <td className="py-2 px-4 text-[#616161]">
                        {f.turno}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                          {f.qtdFalha} pçs
                        </span>
                      </td>
                      <td className="py-2 px-4 text-[#242424]">
                        {f.motivoFalha}
                      </td>
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#f3f2f1] text-[#242424] border border-[#e1dfdd]">
                          {f.areaFmds}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button 
                          type="button"
                          onClick={() => setDeleteId(f.id)}
                          className="w-7 h-7 rounded inline-flex items-center justify-center text-[#616161] hover:text-[#dc2626] hover:bg-[#edebe9] transition-colors opacity-70 group-hover:opacity-100"
                          title="Excluir ocorrência"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Novo Registro Planner */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#edebe9] flex items-center justify-between bg-[#faf9f8]">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-[#0f6cbd]" />
                <h3 className="font-bold text-[#242424] text-sm">
                  Registrar Nova Falha de Entrega
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="w-7 h-7 rounded flex items-center justify-center text-[#616161] hover:text-[#242424] hover:bg-[#edebe9]"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">Data da Falha</label>
                  <input 
                    type="date"
                    className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none font-mono"
                    value={form.data}
                    onChange={e => setForm(prev => ({ ...prev, data: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">Turno</label>
                  <select 
                    className="w-full h-8 px-2 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none bg-white"
                    value={form.turno}
                    onChange={e => setForm(prev => ({ ...prev, turno: e.target.value }))}
                  >
                    <option value="1º Turno">1º Turno</option>
                    <option value="2º Turno">2º Turno</option>
                    <option value="3º Turno">3º Turno</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">Cliente</label>
                  <select 
                    className="w-full h-8 px-2 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none bg-white"
                    value={form.cliente}
                    onChange={e => setForm(prev => ({ ...prev, cliente: e.target.value }))}
                  >
                    {CLIENTES_LIST.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">Produto / Veículo</label>
                  <input 
                    type="text"
                    className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                    value={form.produto}
                    onChange={e => setForm(prev => ({ ...prev, produto: e.target.value }))}
                    placeholder="Ex: COROLLA, YARIS"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">Qtd. Afetada</label>
                  <input 
                    type="number"
                    min="1"
                    className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs font-mono font-bold text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                    value={form.qtdFalha}
                    onChange={e => setForm(prev => ({ ...prev, qtdFalha: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">Área / FMDS</label>
                  <input 
                    type="text"
                    className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                    value={form.areaFmds}
                    onChange={e => setForm(prev => ({ ...prev, areaFmds: e.target.value }))}
                    placeholder="Ex: FMDS 01, Expedição"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#242424] mb-1">Motivo da Falha</label>
                <input 
                  type="text"
                  className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                  value={form.motivoFalha}
                  onChange={e => setForm(prev => ({ ...prev, motivoFalha: e.target.value }))}
                  placeholder="Ex: Atraso Logístico, Divergência de Quantidade..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edebe9] mt-4">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="btn-fluent-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="btn-fluent-primary"
                >
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Planner */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-sm overflow-hidden p-5 text-center">
            <div className="w-10 h-10 rounded-full bg-[#fef2f2] text-[#dc2626] flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="font-bold text-[#242424] text-sm">Excluir Registro?</h3>
            <p className="text-xs text-[#616161] mt-1 mb-5">
              Tem certeza de que deseja remover permanentemente este registro de falha de entrega?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button 
                type="button" 
                onClick={() => setDeleteId(null)}
                className="btn-fluent-secondary"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleDelete}
                className="inline-flex items-center justify-center h-8 px-3.5 rounded text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FalhaEntregaView;
