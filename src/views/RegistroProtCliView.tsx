import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Barcode, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Check, 
  Info 
} from 'lucide-react';
import { UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { CLIENTES_LIST, DEFAULT_CLIENTE } from '../constants/clientes';

interface RegistroProtCliViewProps {
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
}

export const RegistroProtCliView: React.FC<RegistroProtCliViewProps> = ({ onNavigate, currentUser }) => {
  const [etiquetaSap, setEtiquetaSap] = useState('');
  const [cliente, setCliente] = useState<string>(DEFAULT_CLIENTE);
  const [produto, setProduto] = useState('53201-0D120');
  const [componente, setComponente] = useState('PAINEL DIANTEIRO');
  const [descricao, setDescricao] = useState('');
  const [qtd, setQtd] = useState(1);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEtiqueta = etiquetaSap.trim();
    if (trimmedEtiqueta.length !== 9 || !/^\d+$/.test(trimmedEtiqueta)) {
      setNotification({
        type: 'error',
        message: 'A Etiqueta SAP deve conter exatamente 9 Dígitos numéricos!'
      });
      return;
    }

    if (!descricao.trim()) {
      setNotification({
        type: 'error',
        message: 'A descrição da não conformidade é obrigatória!'
      });
      return;
    }

    spStore.saveRNC({
      cliente,
      produto,
      componente,
      tipoRnc: 'Formal',
      status: 'Relatório Inicial',
      descricaoProblema: descricao,
      quantidadeAfetada: qtd,
      documentoRastreabilidade: 'Etiqueta SAP',
      codigoRastreabilidade: trimmedEtiqueta,
      protcliente: 'Sim',
      detector: currentUser.nome,
      reDetector: currentUser.reAcesso
    });

    setNotification({
      type: 'success',
      message: `Proteção ao Cliente registrada com sucesso para a etiqueta SAP ${trimmedEtiqueta}!`
    });

    setTimeout(() => {
      onNavigate('lista-8d', { tipo: 'protcliente' });
    }, 1200);
  };

  const produtosDoCliente = spStore.getProdutosPorCliente(cliente);
  const componentesDoProduto = spStore.getComponentesPorProduto(produto);

  const handleClienteChange = (novoCliente: string) => {
    setCliente(novoCliente);
    const produtos = spStore.getProdutosPorCliente(novoCliente);
    if (produtos.length > 0) {
      setProduto(produtos[0].codCliText || produtos[0].material);
      const comps = spStore.getComponentesPorProduto(produtos[0].codCliText || produtos[0].material);
      setComponente(comps[0] ? (comps[0].componente || comps[0].descricao) : produtos[0].descricao);
    }
  };

  const handleProdutoChange = (novoProd: string) => {
    setProduto(novoProd);
    const comps = spStore.getComponentesPorProduto(novoProd);
    if (comps.length > 0) {
      setComponente(comps[0].componente || comps[0].descricao);
    }
  };

  const isValidSap = etiquetaSap.length === 9 && /^\d+$/.test(etiquetaSap);

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 pb-16">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
              : 'bg-rose-50 text-rose-800 border border-rose-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75 p-1">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 1. CABEÇALHO DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => onNavigate('menu-2')}
            className="btn-secondary h-[38px] px-3.5 text-xs font-semibold"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Registro de Proteção ao Cliente
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Protocolo de triagem 100% e contenção imediata em montadora (Gestamp).
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleSubmit}
          className="btn-primary h-[38px] px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 border-rose-600 self-end sm:self-auto shadow-sm"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Salvar e Acionar</span>
        </button>
      </div>

      {/* 2. FORMULÁRIO (Card Limpo SaaS B2B) */}
      <div className="card-saas p-6 flex flex-col gap-6">
        
        {/* Campo Crítico: Validação de Etiqueta SAP 9 Dígitos */}
        <div className={`p-4 rounded-xl border transition-all ${
          isValidSap 
            ? 'bg-emerald-50/60 border-emerald-300' 
            : 'bg-rose-50/60 border-rose-300'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-slate-500" />
              <span>Etiqueta SAP (Exatamente 9 Dígitos Numéricos)</span>
              <span className="text-rose-600 font-bold">*</span>
            </label>

            <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 ${
              isValidSap 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {isValidSap ? <Check size={14} /> : null}
              <span>{etiquetaSap.length}/9 dígitos</span>
            </span>
          </div>

          <input 
            type="text"
            maxLength={9}
            className={`w-full h-11 px-4 rounded-lg border font-mono font-bold text-center tracking-[0.25em] text-lg focus:outline-none transition shadow-inner ${
              isValidSap 
                ? 'border-emerald-400 bg-white text-emerald-700 focus:ring-2 focus:ring-emerald-500/20' 
                : 'border-rose-400 bg-white text-rose-700 focus:ring-2 focus:ring-rose-500/20'
            }`}
            placeholder="000000000"
            value={etiquetaSap}
            onChange={e => setEtiquetaSap(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />

          <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Padrão Gestamp: Apenas números de série/etiqueta SAP com 9 posições numéricas são aceitos para bloqueio imediato na fábrica.</span>
          </p>
        </div>

        {/* Campos Básicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Cliente (Montadora) <span className="text-rose-500">*</span>
            </label>
            <select 
              className="form-input text-xs"
              value={cliente} 
              onChange={e => handleClienteChange(e.target.value)}
            >
              {CLIENTES_LIST.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quantidade de Peças Afetadas
            </label>
            <input 
              type="number"
              min="1"
              className="form-input font-mono font-bold text-xs"
              value={qtd}
              onChange={e => setQtd(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Produto / Conjunto (colpecasgerais_AA3) <span className="text-rose-500">*</span>
          </label>
          <select 
            className="form-input font-mono text-xs"
            value={produto} 
            onChange={e => handleProdutoChange(e.target.value)}
          >
            {produtosDoCliente.map(p => (
              <option key={p.identificacao} value={p.codCliText}>
                {p.codCliText} • {p.descricao} (SAP: {p.material})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Componente Afetado
          </label>
          {componentesDoProduto.length > 0 ? (
            <select 
              className="form-input text-xs"
              value={componente}
              onChange={e => setComponente(e.target.value)}
            >
              {componentesDoProduto.map(c => (
                <option key={c.identificacao} value={c.componente || c.descricao}>
                  {c.componente || c.descricao} {c.carryOver === 'Sim' ? '★ [Carry-Over]' : ''}
                </option>
              ))}
            </select>
          ) : (
            <input 
              type="text"
              className="form-input text-xs"
              value={componente}
              onChange={e => setComponente(e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Motivo do Alerta / Defeito no Cliente <span className="text-rose-500">*</span>
          </label>
          <textarea 
            rows={3}
            className="form-input text-xs min-h-[90px] py-2.5"
            placeholder="Descreva detalhadamente o sintoma identificado na linha da montadora..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            required
          />
        </div>

        {/* Rodapé do Form */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Registrador: <strong className="text-slate-800">{currentUser.nome}</strong> (RE: {currentUser.reAcesso})
          </span>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button 
              type="button" 
              className="btn-secondary h-[38px] px-4 text-xs font-semibold"
              onClick={() => onNavigate('menu-2')}
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              className="btn-primary h-[38px] px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 border-rose-600 shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Salvar Proteção</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default RegistroProtCliView;
