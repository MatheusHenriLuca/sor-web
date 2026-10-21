import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Users, 
  HardDrive, 
  FileText, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Lock, 
  Unlock, 
  Trash2, 
  Search,
  ArrowRight,
  ShieldCheck,
  Palette,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Tenant, TenantStatus } from '../types';
import { tenantStore } from '../services/tenantStore';
import { useTenant } from '../context/TenantContext';

interface SuperAdminViewProps {
  onNavigate: (screen: any, params?: any) => void;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ onNavigate }) => {
  const { impersonateTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>(() => tenantStore.getTenants());
  const [searchTerm, setSearchTerm] = useState('');
  const [modalNewOpen, setModalNewOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulário de Nova Empresa
  const [formNome, setFormNome] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCor, setFormCor] = useState('#0f6cbd');
  const [formMaxUsuarios, setFormMaxUsuarios] = useState(20);
  const [formAdminNome, setFormAdminNome] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');

  const refreshList = () => {
    setTenants(tenantStore.getTenants());
  };

  // Auto-gerar slug a partir do nome
  const handleNomeChange = (val: string) => {
    setFormNome(val);
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setFormSlug(slug);
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim() || !formSlug.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Nome e slug da empresa são obrigatórios.' });
      return;
    }

    // Verificar se slug já existe
    if (tenantStore.getTenantBySlug(formSlug)) {
      setFeedbackMsg({ type: 'error', text: `O slug "${formSlug}" já está em uso por outra empresa.` });
      return;
    }

    try {
      const created = tenantStore.createTenant({
        nome: formNome.trim(),
        slug: formSlug.trim(),
        cnpjContato: formCnpj.trim() || undefined,
        emailContato: formEmail.trim() || undefined,
        telefoneContato: formTelefone.trim() || undefined,
        status: 'ativo',
        customizacao: {
          nomeExibicao: `${formNome.trim()} - Qualidade`,
          subtitulo: 'Portal de Ocorrências RNC & 8D',
          corPrimaria: formCor,
          corSecundaria: '#0b5796',
          mensagemAlerta: `Atenção: Instrução de Contenção ${formNome.trim()} Ativa`
        },
        limites: {
          maxUsuarios: Number(formMaxUsuarios) || 20,
          maxStorageMb: 1000,
          modulosHabilitados: {
            rnc8D: true,
            alertaQualidade: true,
            rastreabilidade: true,
            protecaoCliente: true,
            falhaEntrega: true,
            matrizTreinamentos: true
          }
        }
      });

      setFeedbackMsg({ 
        type: 'success', 
        text: `Empresa "${created.nome}" cadastrada com sucesso! URL de acesso: /${created.slug}` 
      });

      // Resetar form e fechar modal
      setFormNome('');
      setFormSlug('');
      setFormCnpj('');
      setFormEmail('');
      setFormTelefone('');
      setFormAdminNome('');
      setFormAdminEmail('');
      setModalNewOpen(false);
      refreshList();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Erro ao criar empresa: ${err.message}` });
    }
  };

  const handleToggleStatus = (tenant: Tenant) => {
    const newStatus: TenantStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo';
    tenantStore.setTenantStatus(tenant.id, newStatus);
    refreshList();
    setFeedbackMsg({ 
      type: 'success', 
      text: `Status da empresa "${tenant.nome}" alterado para ${newStatus.toUpperCase()}.` 
    });
  };

  const handleDelete = (tenant: Tenant) => {
    if (confirm(`Tem certeza que deseja remover a empresa "${tenant.nome}"? Todos os dados isolados serão apagados.`)) {
      tenantStore.deleteTenant(tenant.id);
      refreshList();
      setFeedbackMsg({ type: 'success', text: `Empresa "${tenant.nome}" removida.` });
    }
  };

  const handleImpersonate = (tenant: Tenant) => {
    impersonateTenant(tenant.id);
    onNavigate('menu-2');
  };

  // Filtragem
  const filteredTenants = tenants.filter(t => 
    t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cnpjContato?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Totais
  const totalEmpresas = tenants.length;
  const empresasAtivas = tenants.filter(t => t.status === 'ativo').length;
  const totalRncs = tenants.reduce((acc, t) => acc + (t.stats?.totalRncs || 0), 0);
  const totalStorageMb = tenants.reduce((acc, t) => acc + (t.stats?.storageUsadoMb || 0), 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* 1. CABEÇALHO DO SUPER ADMIN */}
      <div className="card-saas p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-slate-700 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Super Administrador
                </span>
                <span className="text-xs text-slate-400">Plataforma SaaS Multi-Tenant</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Console Central de Gestão de Empresas
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Gerencie clientes cadastrados, controle limites de uso, configure identidade visual e acerte acessos com isolamento estrito.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setModalNewOpen(true)}
              className="btn-primary bg-blue-600 hover:bg-blue-500 border-blue-500 text-white font-bold h-9 px-4 text-xs gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Empresa</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMsg && (
          <div className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            feedbackMsg.type === 'success' ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200' : 'bg-rose-950/60 border-rose-500 text-rose-200'
          }`}>
            <span>{feedbackMsg.text}</span>
            <button type="button" onClick={() => setFeedbackMsg(null)} className="text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. CARDS DE INDICADORES GLOBAIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/60">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Total de Empresas
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono-numbers">
              {totalEmpresas}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              {empresasAtivas} ativas no sistema
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Empresas Ativas
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono-numbers">
              {empresasAtivas}
            </span>
            <span className="text-[10px] text-slate-400">
              {totalEmpresas - empresasAtivas} em implantação/suspensas
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Total de RNCs Abertas
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono-numbers">
              {totalRncs}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Base isolada por RLS
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              Armazenamento Fotos
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono-numbers">
              {totalStorageMb.toFixed(1)} <span className="text-xs text-slate-400">MB</span>
            </span>
            <span className="text-[10px] text-slate-400">
              WebP Otimizado (Free Tier: 1.000 MB)
            </span>
          </div>
        </div>
      </div>

      {/* 3. LISTAGEM DE EMPRESAS CADASTRADAS */}
      <div className="card-saas p-4 sm:p-5 bg-white border-slate-200 shadow-xs flex flex-col gap-4">
        
        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por nome, slug ou CNPJ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Exibindo <strong>{filteredTenants.length}</strong> de <strong>{tenants.length}</strong> empresas</span>
            <button 
              type="button" 
              onClick={refreshList}
              className="btn-icon h-7 w-7 text-slate-500 hover:text-slate-800"
              title="Atualizar lista"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabela de Empresas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Empresa / Razão Social</th>
                <th className="py-2.5 px-3">Slug (URL)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Identidade Visual</th>
                <th className="py-2.5 px-3 text-center">RNCs</th>
                <th className="py-2.5 px-3 text-center">Usuários</th>
                <th className="py-2.5 px-3 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Nome da Empresa */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs"
                        style={{ backgroundColor: tenant.customizacao?.corPrimaria || '#0f6cbd' }}
                      >
                        {tenant.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                          {tenant.nome}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {tenant.cnpjContato || 'CNPJ não informado'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Slug / Link de Acesso */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-mono text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px] text-blue-700 font-semibold">
                        /{tenant.slug}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      tenant.status === 'ativo'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : tenant.status === 'suspenso'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        tenant.status === 'ativo' ? 'bg-emerald-500' : tenant.status === 'suspenso' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      {tenant.status.toUpperCase()}
                    </span>
                  </td>

                  {/* Identidade Visual */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" 
                        style={{ backgroundColor: tenant.customizacao?.corPrimaria || '#0f6cbd' }} 
                        title={`Cor Primária: ${tenant.customizacao?.corPrimaria}`}
                      />
                      <span className="text-[11px] text-slate-600 truncate max-w-[150px]">
                        {tenant.customizacao?.nomeExibicao || tenant.nome}
                      </span>
                    </div>
                  </td>

                  {/* Total RNCs */}
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                    {tenant.stats?.totalRncs || 0}
                  </td>

                  {/* Total Usuários */}
                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {tenant.stats?.totalUsuarios || 1} / {tenant.limites.maxUsuarios}
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      
                      {/* Botão Acessar como a Empresa (Impersonate) */}
                      <button
                        type="button"
                        onClick={() => handleImpersonate(tenant)}
                        className="btn-secondary h-7 px-2 text-[11px] font-bold text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 gap-1"
                        title="Simular visualização desta empresa como suporte"
                      >
                        <Eye className="w-3 h-3 text-[#0f6cbd]" />
                        <span>Acessar</span>
                      </button>

                      {/* Alternar Status (Suspender / Reativar) */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(tenant)}
                        className={`btn-icon h-7 w-7 ${
                          tenant.status === 'ativo' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={tenant.status === 'ativo' ? 'Suspender Empresa' : 'Reativar Empresa'}
                      >
                        {tenant.status === 'ativo' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Excluir (Não permitido no tenant piloto) */}
                      {tenant.slug !== 'gpm-servicos' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(tenant)}
                          className="btn-icon h-7 w-7 text-rose-600 hover:bg-rose-50"
                          title="Remover Empresa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: CADASTRAR NOVA EMPRESA */}
      {modalNewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div 
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cadastrar Nova Empresa (Tenant)</h3>
                  <p className="text-xs text-slate-500">Crie o ambiente isolado para o novo cliente da plataforma</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setModalNewOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTenant} className="p-5 flex flex-col gap-4 text-xs sm:text-sm overflow-y-auto max-h-[80vh]">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Empresa / Razão Social *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Indústria Metalúrgica Alvorada"
                    value={formNome}
                    onChange={e => handleNomeChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slug na URL (Identificador) *
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 overflow-hidden">
                    <span className="text-xs text-slate-400 pl-2.5 font-mono">/</span>
                    <input 
                      type="text" 
                      required
                      placeholder="alvorada-metal"
                      value={formSlug}
                      onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="w-full px-2 py-2 bg-transparent focus:outline-none text-xs font-mono font-bold text-blue-700"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">Usado no link: app.seusaas.com/{formSlug || 'slug'}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CNPJ ou Identificador Fiscal
                  </label>
                  <input 
                    type="text" 
                    placeholder="00.000.000/0001-00"
                    value={formCnpj}
                    onChange={e => setFormCnpj(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail de Contato / Cobrança
                  </label>
                  <input 
                    type="email" 
                    placeholder="contato@empresa.com.br"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telefone de Contato
                  </label>
                  <input 
                    type="text" 
                    placeholder="(11) 99999-9999"
                    value={formTelefone}
                    onChange={e => setFormTelefone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cor Tema Principal
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={formCor}
                      onChange={e => setFormCor(e.target.value)}
                      className="w-10 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input 
                      type="text" 
                      value={formCor}
                      onChange={e => setFormCor(e.target.value)}
                      className="w-24 px-2 py-1.5 rounded border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Limite de Usuários Ativos
                  </label>
                  <input 
                    type="number" 
                    min={1}
                    max={1000}
                    value={formMaxUsuarios}
                    onChange={e => setFormMaxUsuarios(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNewOpen(false)}
                  className="btn-secondary h-8 px-3 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 px-4 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Empresa</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
