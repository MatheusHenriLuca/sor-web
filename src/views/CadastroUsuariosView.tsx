import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  CheckCircle2, 
  Search, 
  X,
  ShieldCheck,
  Building,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { UsuarioQualidade, ColaboradorBaseAtivos, UserRole } from '../types';
import { spStore } from '../services/sharepointService';

interface CadastroUsuariosViewProps {
  onNavigate: (screen: any) => void;
  currentUser: UsuarioQualidade;
}

export const CadastroUsuariosView: React.FC<CadastroUsuariosViewProps> = ({ onNavigate, currentUser }) => {
  const [users, setUsers] = useState<UsuarioQualidade[]>([]);
  const [baseAtivos, setBaseAtivos] = useState<ColaboradorBaseAtivos[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / New state
  const [form, setForm] = useState<Partial<UsuarioQualidade>>({
    nome: '',
    reAcesso: undefined,
    perfil: 'Inspqual',
    cargo: '',
    email: ''
  });

  const loadData = () => {
    setUsers(spStore.getUsuarios());
    setBaseAtivos(spStore.getBaseAtivos());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectColaborador = (numPessoal: number) => {
    const colab = baseAtivos.find(a => a.numPessoal === numPessoal);
    if (colab) {
      setForm(prev => ({
        ...prev,
        nome: colab.nome,
        reAcesso: colab.numPessoal,
        cargo: colab.posicao,
        email: `${colab.nome.toLowerCase().replace(/\s+/g, '.')}@br.gestamp.com`
      }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.reAcesso) {
      setNotification({ type: 'error', message: 'Nome e RE são obrigatórios!' });
      return;
    }

    spStore.saveUsuario(form);
    setNotification({ type: 'success', message: 'Usuário salvo com sucesso!' });
    setModalOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (deleteId) {
      spStore.deleteUsuario(deleteId);
      setNotification({ type: 'success', message: 'Usuário removido com sucesso.' });
      setDeleteId(null);
      loadData();
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
      case 'Adminqual':
        return 'bg-[#7c3aed] text-white';
      case 'Liderqual':
        return 'bg-[#0f6cbd] text-white';
      case 'Inspqual':
        return 'bg-[#059669] text-white';
      case 'Processos':
        return 'bg-[#d97706] text-white';
      case 'Produção':
        return 'bg-[#dc2626] text-white';
      default:
        return 'bg-[#616161] text-white';
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(u.reAcesso).includes(searchTerm) ||
    (u.cargo || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            onClick={() => onNavigate('dashboard')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#616161] hover:text-[#242424] hover:bg-[#edebe9] transition-colors"
            title="Voltar ao Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-8 h-8 rounded-md bg-[#e0e7ff] text-[#4338ca] flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#242424] tracking-tight">
              Gestão de Usuários & Perfis
            </h1>
            <p className="text-xs text-[#616161]">
              Controle de acesso por papel (RBAC) integrado ao SharePoint
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => {
              setForm({ nome: '', reAcesso: undefined, perfil: 'Inspqual', cargo: '', email: '' });
              setModalOpen(true);
            }}
            className="btn-fluent-primary"
          >
            <Plus size={15} />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Search Bar Planner Style */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a8886]" />
          <input 
            type="text"
            className="w-full h-8 pl-8 pr-7 rounded-md border border-[#e1dfdd] bg-white text-xs text-[#242424] placeholder:text-[#8a8886] focus:border-[#0f6cbd] focus:outline-none transition-colors"
            placeholder="Buscar por nome, cargo ou RE..."
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
          {filteredUsers.length} de {users.length} usuários
        </span>
      </div>

      {/* Tabela Planner Style */}
      <div className="bg-white rounded-lg border border-[#edebe9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#edebe9] bg-[#faf9f8] text-[11px] font-semibold text-[#616161]">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Nome Completo</th>
                <th className="py-2.5 px-4">Matrícula (RE)</th>
                <th className="py-2.5 px-4">Cargo / Posição</th>
                <th className="py-2.5 px-4">Perfil RBAC</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edebe9] text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#8a8886] text-xs">
                    Nenhum colaborador encontrado para o termo pesquisado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const initials = getInitials(u.nome);
                  const badgeColor = getBadgeColor(u.perfil);
                  return (
                    <tr key={u.id || idx} className="hover:bg-[#f3f2f1] transition-colors group">
                      <td className="py-2 px-4 text-center">
                        <div className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[11px] ${badgeColor}`}>
                          {initials}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-semibold text-[#242424]">{u.nome}</div>
                        <div className="text-[11px] text-[#616161] font-normal">{u.email || 'Sem e-mail'}</div>
                      </td>
                      <td className="py-2 px-4 font-mono font-medium text-[#242424]">
                        {u.reAcesso}
                      </td>
                      <td className="py-2 px-4 text-[#616161]">
                        {u.cargo || 'Não especificado'}
                      </td>
                      <td className="py-2 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#f3f2f1] text-[#242424] border border-[#e1dfdd]">
                          {u.perfil}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button"
                            onClick={() => {
                              setForm(u);
                              setModalOpen(true);
                            }}
                            className="w-7 h-7 rounded flex items-center justify-center text-[#616161] hover:text-[#0f6cbd] hover:bg-[#edebe9] transition-colors"
                            title="Editar usuário"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setDeleteId(u.id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-[#616161] hover:text-[#dc2626] hover:bg-[#edebe9] transition-colors"
                            title="Remover usuário"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição Planner */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#edebe9] flex items-center justify-between bg-[#faf9f8]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#0f6cbd]" />
                <h3 className="font-bold text-[#242424] text-sm">
                  {form.id ? 'Editar Permissões de Usuário' : 'Novo Usuário de Qualidade'}
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
              
              {/* Seleção rápida pela Base de Ativos */}
              <div className="p-2.5 bg-[#f8f9fa] rounded-md border border-[#e1dfdd]">
                <label className="block text-[11px] font-semibold text-[#616161] mb-1">
                  Preenchimento Automático via Base Geral ({baseAtivos.length})
                </label>
                <select 
                  className="w-full h-8 px-2 rounded border border-[#e1dfdd] bg-white text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                  onChange={e => handleSelectColaborador(Number(e.target.value))}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione um colaborador da lista...</option>
                  {baseAtivos.slice(0, 100).map(a => (
                    <option key={a.numPessoal} value={a.numPessoal}>
                      {a.numPessoal} - {a.nome} ({a.posicao})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do colaborador"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                    Matrícula (RE) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] font-mono text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                    value={form.reAcesso || ''}
                    onChange={e => setForm({ ...form, reAcesso: Number(e.target.value) })}
                    placeholder="Ex: 88123"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                    Perfil RBAC <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    className="w-full h-8 px-2 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none bg-white"
                    value={form.perfil}
                    onChange={e => setForm({ ...form, perfil: e.target.value as UserRole })}
                  >
                    <option value="Admin">Admin (Acesso Total)</option>
                    <option value="Adminqual">Adminqual (Engenharia)</option>
                    <option value="Liderqual">Liderqual (Líder da Qualidade)</option>
                    <option value="Inspqual">Inspqual (Inspetor)</option>
                    <option value="Processos">Processos (Eng. Processos)</option>
                    <option value="Produção">Produção (Supervisão)</option>
                    <option value="User">User (Operador)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#242424] mb-1">Cargo / Posição</label>
                <input 
                  type="text"
                  className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                  value={form.cargo}
                  onChange={e => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Ex: Analista da Qualidade"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#242424] mb-1">E-mail Corporativo</label>
                <input 
                  type="email"
                  className="w-full h-8 px-2.5 rounded border border-[#e1dfdd] text-xs text-[#242424] focus:border-[#0f6cbd] focus:outline-none"
                  value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="nome.sobrenome@br.gestamp.com"
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
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Planner */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#edebe9] shadow-xl w-full max-w-sm overflow-hidden p-5 text-center">
            <div className="w-10 h-10 rounded-full bg-[#fef2f2] text-[#dc2626] flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="font-bold text-[#242424] text-sm">Remover Usuário?</h3>
            <p className="text-xs text-[#616161] mt-1 mb-5">
              Tem certeza que deseja remover este colaborador da lista de permissões da qualidade?
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

export default CadastroUsuariosView;
