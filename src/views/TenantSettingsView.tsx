import React, { useState } from 'react';
import { 
  Palette, 
  Layers, 
  Building2, 
  MapPin, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  ArrowLeft,
  Sliders,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { compressImage } from '../utils/imageCompressor';

interface TenantSettingsViewProps {
  onNavigate: (screen: any, params?: any) => void;
}

export const TenantSettingsView: React.FC<TenantSettingsViewProps> = ({ onNavigate }) => {
  const { activeTenant, masterData, updateCustomization, updateMasterData } = useTenant();

  // Estados de Customização
  const [nomeExibicao, setNomeExibicao] = useState(activeTenant.customizacao.nomeExibicao);
  const [subtitulo, setSubtitulo] = useState(activeTenant.customizacao.subtitulo || '');
  const [corPrimaria, setCorPrimaria] = useState(activeTenant.customizacao.corPrimaria);
  const [mensagemAlerta, setMensagemAlerta] = useState(activeTenant.customizacao.mensagemAlerta || '');
  const [logoUrl, setLogoUrl] = useState(activeTenant.customizacao.logoUrl || '');

  // Estados de Cadastros Mestres
  const [activeTab, setActiveTab] = useState<'visual' | 'montadoras' | 'linhas' | 'postos' | 'defeitos'>('visual');
  const [montadoras, setMontadoras] = useState<string[]>([...masterData.montadoras]);
  const [linhas, setLinhas] = useState<string[]>([...masterData.linhasFabris]);
  const [postos, setPostos] = useState<string[]>([...masterData.postosTrabalho]);
  const [defeitos, setDefeitos] = useState<string[]>([...masterData.modosFalha]);

  const [newItemText, setNewItemText] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await compressImage(file, { maxWidth: 512, maxHeight: 512, quality: 0.85 });
      setLogoUrl(res.dataUrl);
    } catch (err) {
      console.warn('Falha ao comprimir logo:', err);
      const reader = new FileReader();
      reader.onload = ev => setLogoUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveVisual = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomization({
      nomeExibicao,
      subtitulo,
      corPrimaria,
      mensagemAlerta,
      logoUrl
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const handleAddItem = (type: 'montadoras' | 'linhas' | 'postos' | 'defeitos') => {
    if (!newItemText.trim()) return;
    const val = newItemText.trim();

    if (type === 'montadoras' && !montadoras.includes(val)) {
      const updated = [...montadoras, val];
      setMontadoras(updated);
      updateMasterData({ montadoras: updated });
    } else if (type === 'linhas' && !linhas.includes(val)) {
      const updated = [...linhas, val];
      setLinhas(updated);
      updateMasterData({ linhasFabris: updated });
    } else if (type === 'postos' && !postos.includes(val)) {
      const updated = [...postos, val];
      setPostos(updated);
      updateMasterData({ postosTrabalho: updated });
    } else if (type === 'defeitos' && !defeitos.includes(val)) {
      const updated = [...defeitos, val];
      setDefeitos(updated);
      updateMasterData({ modosFalha: updated });
    }

    setNewItemText('');
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleRemoveItem = (type: 'montadoras' | 'linhas' | 'postos' | 'defeitos', itemToRemove: string) => {
    if (type === 'montadoras') {
      const updated = montadoras.filter(i => i !== itemToRemove);
      setMontadoras(updated);
      updateMasterData({ montadoras: updated });
    } else if (type === 'linhas') {
      const updated = linhas.filter(i => i !== itemToRemove);
      setLinhas(updated);
      updateMasterData({ linhasFabris: updated });
    } else if (type === 'postos') {
      const updated = postos.filter(i => i !== itemToRemove);
      setPostos(updated);
      updateMasterData({ postosTrabalho: updated });
    } else if (type === 'defeitos') {
      const updated = defeitos.filter(i => i !== itemToRemove);
      setDefeitos(updated);
      updateMasterData({ modosFalha: updated });
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-150">
      
      {/* 1. CABEÇALHO */}
      <div className="card-saas p-4 sm:p-5 bg-white border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => onNavigate('menu-2')}
            className="btn-secondary h-8 px-2.5 text-xs font-semibold gap-1.5"
            title="Voltar ao Menu Principal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0f6cbd]" />
              <span>Personalização & Cadastros da Empresa</span>
            </h1>
            <p className="text-xs text-slate-500">
              Configure a identidade visual da sua marca e mantenha as listas padronizadas de fábrica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
            Ambiente: {activeTenant.nome}
          </span>
        </div>
      </div>

      {savedFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Alterações salvas com sucesso no ambiente da sua empresa!</span>
        </div>
      )}

      {/* 2. ABAS DE NAVEGAÇÃO INTERNA */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('visual')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'visual' ? 'bg-[#0f6cbd] text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Identidade Visual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('montadoras')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'montadoras' ? 'bg-[#0f6cbd] text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Montadoras / Clientes ({montadoras.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('linhas')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'linhas' ? 'bg-[#0f6cbd] text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Linhas Fabris ({linhas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('postos')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'postos' ? 'bg-[#0f6cbd] text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Postos de Trabalho ({postos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('defeitos')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'defeitos' ? 'bg-[#0f6cbd] text-white shadow-2xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Catálogo de Defeitos ({defeitos.length})</span>
        </button>
      </div>

      {/* 3. CONTEÚDO DA ABA */}
      
      {/* ABA 1: IDENTIDADE VISUAL */}
      {activeTab === 'visual' && (
        <div className="card-saas p-5 bg-white border-slate-200 shadow-xs flex flex-col gap-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Customização da Marca</h2>
            <p className="text-xs text-slate-500">Defina o nome exibido nos cabeçalhos, relatórios e cores do sistema</p>
          </div>

          <form onSubmit={handleSaveVisual} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome de Exibição do Sistema
              </label>
              <input 
                type="text"
                value={nomeExibicao}
                onChange={e => setNomeExibicao(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs sm:text-sm font-semibold"
                placeholder="Ex: GPM Serviços - Gestão da Qualidade"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subtítulo do Cabeçalho
              </label>
              <input 
                type="text"
                value={subtitulo}
                onChange={e => setSubtitulo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                placeholder="Ex: Sistema Integrado 8D & RNC"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cor Tema Primária (Marca)
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="color"
                  value={corPrimaria}
                  onChange={e => setCorPrimaria(e.target.value)}
                  className="w-10 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                />
                <input 
                  type="text"
                  value={corPrimaria}
                  onChange={e => setCorPrimaria(e.target.value)}
                  className="w-24 px-2 py-1.5 rounded border border-slate-300 text-xs font-mono font-bold"
                />
                <div 
                  className="px-3 py-1 rounded text-white text-xs font-bold shadow-2xs"
                  style={{ backgroundColor: corPrimaria }}
                >
                  Exemplo
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Logotipo da Empresa (PNG, SVG ou WebP)
              </label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="relative group w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1.5 overflow-hidden">
                    <img src={logoUrl} alt="Logo Empresa" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remover Logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{logoUrl ? 'Substituir Logotipo' : 'Carregar Imagem do Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                O logo é exibido no topo do sistema, no Alerta da Qualidade e nos relatórios 8D exportados.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mensagem Padrão no Topo do Alerta da Qualidade
              </label>
              <input 
                type="text"
                value={mensagemAlerta}
                onChange={e => setMensagemAlerta(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 text-xs"
                placeholder="Ex: Atenção: Instrução de Contenção Operacional Ativa"
              />
            </div>

            <div className="sm:col-span-2 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 px-4 text-xs gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Configurações Visuais</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 2: CADASTROS MESTRES (LISTA DINÂMICA) */}
      {activeTab !== 'visual' && (
        <div className="card-saas p-5 bg-white border-slate-200 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 capitalize">
                {activeTab === 'montadoras' ? 'Montadoras / Clientes Homologados' :
                 activeTab === 'linhas' ? 'Linhas e Áreas Fabris da Empresa' :
                 activeTab === 'postos' ? 'Postos de Trabalho e Máquinas' : 'Catálogo de Modos de Falha (Defeitos)'}
              </h2>
              <p className="text-xs text-slate-500">
                Estes itens alimentam automaticamente as caixas de seleção nos formulários de cadastro de RNC e Alerta
              </p>
            </div>

            {/* Inserir Novo Item */}
            <div className="flex items-center gap-2">
              <input 
                type="text"
                placeholder="Digitar novo item..."
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem(activeTab as any);
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddItem(activeTab as any)}
                className="btn-primary h-7 px-3 text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Grid de Itens Cadastrados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
            {(activeTab === 'montadoras' ? montadoras :
              activeTab === 'linhas' ? linhas :
              activeTab === 'postos' ? postos : defeitos).map(item => (
              <div 
                key={item}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(activeTab as any, item)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Remover item"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
