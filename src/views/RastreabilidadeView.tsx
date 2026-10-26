import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Barcode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  GitBranch,
  List,
  Edit3,
  Printer
} from 'lucide-react';
import { RNCRecord, LoteSAPParsed, UsuarioQualidade } from '../types';
import { spStore } from '../services/sharepointService';
import { formatDateBR } from '../utils/date';
import { formatOccurrenceId, normalizeDisplayText } from '../utils/formatText';

interface RastreabilidadeViewProps {
  rncId?: number;
  onNavigate: (screen: any, params?: any) => void;
  currentUser: UsuarioQualidade;
}

export const RastreabilidadeView: React.FC<RastreabilidadeViewProps> = ({
  rncId,
  onNavigate,
  currentUser
}) => {
  const allRncs = useMemo(() => spStore.getRNCs(), []);
  const [selectedRncId, setSelectedRncId] = useState<number | undefined>(
    rncId || (allRncs.length > 0 ? allRncs[0].id : undefined)
  );
  const [rnc, setRnc] = useState<RNCRecord | undefined>(undefined);
  const [lotesSAP, setLotesSAP] = useState<LoteSAPParsed[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formLote, setFormLote] = useState({
    lote: '',
    estoque: '',
    qtdVerificada: '',
    qtdNg: '0'
  });

  useEffect(() => {
    if (rncId) {
      setSelectedRncId(rncId);
    }
  }, [rncId]);

  const loadData = (targetId?: number) => {
    const idToLoad = targetId ?? selectedRncId;
    if (!idToLoad) {
      setRnc(undefined);
      setLotesSAP([]);
      return;
    }
    const found = spStore.getRNCById(idToLoad);
    setRnc(found);
    setLotesSAP(spStore.getLotesSAP(idToLoad));
  };

  useEffect(() => {
    loadData(selectedRncId);
  }, [selectedRncId]);

  const pecaAutomatica = useMemo(
    () => normalizeDisplayText(rnc?.produto || rnc?.componente || 'Peça da Ocorrência'),
    [rnc?.produto, rnc?.componente]
  );

  const qtdVerificadaNum = Math.max(0, Number(formLote.qtdVerificada) || 0);
  const qtdNgNum = Math.min(qtdVerificadaNum, Math.max(0, Number(formLote.qtdNg) || 0));
  const qtdOkCalc = Math.max(0, qtdVerificadaNum - qtdNgNum);

  const handleSaveLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rnc) {
      setNotification({
        type: 'error',
        message: 'Selecione uma ocorrência para registrar o lote verificado.'
      });
      return;
    }

    if (!formLote.lote.trim() || !formLote.estoque.trim() || qtdVerificadaNum <= 0) {
      setNotification({
        type: 'error',
        message: 'Informe o Lote de Produção, o Nome do Estoque e a Quantidade de Peças Verificadas.'
      });
      return;
    }

    spStore.addLoteSAP({
      idRnc: rnc.id,
      seqRel: String(lotesSAP.length + 1),
      produto: pecaAutomatica,
      lote: formLote.lote.trim(),
      estoque: formLote.estoque.trim(),
      qtd: qtdVerificadaNum,
      qtdVerificada: qtdVerificadaNum,
      qtdNg: qtdNgNum,
      qtdOk: qtdOkCalc,
      data: new Date().toISOString().split('T')[0],
      responsavel: currentUser.nome
    });

    setFormLote({
      lote: '',
      estoque: '',
      qtdVerificada: '',
      qtdNg: '0'
    });

    setNotification({
      type: 'success',
      message: 'Lote de rastreabilidade e contenção registrado com sucesso! Os dados já estão sincronizados com o 3º D do 8D.'
    });
    loadData(rnc.id);
  };

  const handleRemoveLote = (idOrIdx: number) => {
    if (!rnc) return;
    spStore.deleteLoteSAP(idOrIdx, rnc.id);
    setNotification({
      type: 'success',
      message: 'Registro de lote removido com sucesso.'
    });
    loadData(rnc.id);
  };

  const totalVerificadas = useMemo(
    () => lotesSAP.reduce((acc, l) => acc + Number(l.qtdVerificada ?? l.qtd ?? 0), 0),
    [lotesSAP]
  );
  const totalOk = useMemo(
    () =>
      lotesSAP.reduce(
        (acc, l) =>
          acc + Number(l.qtdOk ?? Math.max(0, Number(l.qtdVerificada ?? l.qtd ?? 0) - Number(l.qtdNg ?? 0))),
        0
      ),
    [lotesSAP]
  );
  const totalNg = useMemo(
    () => lotesSAP.reduce((acc, l) => acc + Number(l.qtdNg ?? 0), 0),
    [lotesSAP]
  );

  const isFormal = rnc?.tipoRnc === 'Formal';
  const codigoClienteOuFormal = rnc && isFormal
    ? (rnc.codOcorrenciaCliente?.trim() || (
        rnc.field1 &&
        !['RNC #' + rnc.id, 'RNC-' + rnc.id, 'RNC ' + rnc.id, '#' + rnc.id, String(rnc.id)].includes(rnc.field1.trim())
          ? rnc.field1.trim()
          : null
      ))
    : null;

  const isOperator = currentUser.perfil === 'User';

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150 pb-12">
      {/* Notificação */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CABEÇALHO UNIFICADO & EXECUTIVO DA OCORRÊNCIA (Padrão idêntico à tela de Detalhes) */}
      <div className="card-saas p-4 sm:p-5 flex flex-col gap-4 shadow-xs bg-white border-slate-200 rounded-2xl">
        {/* Linha 1: Navegação + Identificador + Badges de Status + Seletor / Ações */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() =>
                rnc ? onNavigate('detalhes-8d', { rncId: rnc.id }) : onNavigate('lista-8d')
              }
              className="btn-secondary h-9 px-3.5 text-xs font-semibold shrink-0 gap-1.5 shadow-2xs hover:bg-slate-50 inline-flex items-center justify-center"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Voltar</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            {rnc && (
              <>
                <span
                  className="h-9 inline-flex items-center px-3 rounded-lg text-xs sm:text-sm font-bold bg-blue-50 text-[#0b5796] border border-blue-200 font-mono shrink-0 shadow-2xs"
                  title={formatOccurrenceId(rnc.id, codigoClienteOuFormal)}
                >
                  {formatOccurrenceId(rnc.id, codigoClienteOuFormal)}
                </span>

                <span
                  className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-bold border shrink-0 ${
                    rnc.status === 'Concluído'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : rnc.status === 'Em Andamento'
                      ? 'bg-amber-50 text-amber-950 border-amber-300'
                      : 'bg-sky-50 text-sky-950 border-sky-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      rnc.status === 'Concluído'
                        ? 'bg-emerald-600'
                        : rnc.status === 'Em Andamento'
                        ? 'bg-amber-500 ring-2 ring-amber-200'
                        : 'bg-sky-600'
                    }`}
                  />
                  {rnc.status}
                </span>

                <span className="h-9 inline-flex items-center px-3 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                  {rnc.tipoRnc || 'Formal'}
                </span>

                <span
                  className={`h-9 inline-flex items-center px-3 rounded-lg text-xs font-bold border shrink-0 ${
                    rnc.abrir8D === 'Sim'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  8D - {rnc.abrir8D === 'Sim' ? 'Sim' : 'Não'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {allRncs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Ocorrência:</span>
                <select
                  value={selectedRncId || ''}
                  onChange={e => setSelectedRncId(Number(e.target.value))}
                  className="form-select h-9 text-xs font-bold py-1.5 px-3 rounded-lg border-slate-200 bg-slate-50 text-slate-900"
                >
                  {allRncs.map(item => (
                    <option key={item.id} value={item.id}>
                      {formatOccurrenceId(item.id, item.codOcorrenciaCliente || item.field1)} — {normalizeDisplayText(item.produto || item.componente)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rnc && !isOperator && (
              <button
                type="button"
                onClick={() => onNavigate('registro-8d', { edicao: true, rncId: rnc.id, fromScreen: 'rastreabilidade' })}
                className="btn-secondary h-9 px-3 text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Editar</span>
              </button>
            )}

            {rnc && (
              <button
                type="button"
                onClick={() => onNavigate('impressao-8d', { rncId: rnc.id })}
                className="btn-secondary h-9 px-3 text-xs font-semibold gap-1.5 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Ver relatório de 8D</span>
              </button>
            )}
          </div>
        </div>

        {/* Linha 2: Segmented Control de Modos de Visualização (Padronizado com Detalhes8DView) */}
        {rnc && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span>Modo de Exibição:</span>
            </div>

            <div className="flex flex-wrap items-center p-1 bg-slate-100 border border-slate-200 rounded-xl gap-1.5 w-full sm:w-auto self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onNavigate('detalhes-8d', { rncId: rnc.id, initialViewMode: 'detalhes' })}
                className="h-8 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer select-none text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 flex-1 sm:flex-initial"
              >
                <List className="w-3.5 h-3.5" />
                <span>Relatório Detalhado</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('detalhes-8d', { rncId: rnc.id, initialViewMode: 'alerta' })}
                className="h-8 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer select-none text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 flex-1 sm:flex-initial"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Alerta Qualidade / Disposição</span>
              </button>

              {rnc.abrir8D === 'Sim' && (
                <button
                  type="button"
                  onClick={() => onNavigate('detalhes-8d', { rncId: rnc.id, initialViewMode: 'metodologia8d' })}
                  className="h-8 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer select-none text-slate-600 hover:text-purple-700 hover:bg-slate-200/60 flex-1 sm:flex-initial"
                >
                  <GitBranch className="w-3.5 h-3.5 text-purple-600" />
                  <span>Metodologia 8D (1D - 8D)</span>
                </button>
              )}

              <button
                type="button"
                className="h-8 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer select-none bg-white text-indigo-700 shadow-sm border border-indigo-200 flex-1 sm:flex-initial"
              >
                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Rastreabilidade e Contenção</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Principal: Rastreabilidade e Contenção (Idêntico ao 3º D do 8D, sem Ações de Contenção) */}
      {!rnc ? (
        <div className="card-saas p-8 border-slate-200 bg-white text-center text-xs text-slate-500">
          Nenhuma ocorrência selecionada ou cadastrada para registrar lotes de rastreabilidade.
        </div>
      ) : (
        <div className="card-saas p-5 border-slate-200 bg-white shadow-2xs flex flex-col gap-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Barcode className="w-4 h-4 text-[#0b5796]" />
                  <span>Rastreabilidade e Contenção</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#0b5796] border border-blue-200">
                  {formatOccurrenceId(rnc.id, rnc.codOcorrenciaCliente || rnc.field1)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Data, responsável logado e peça da ocorrência são preenchidos automaticamente. Informe o total verificado e as peças NG para cálculo automático das peças OK.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Verificadas: <strong className="font-mono text-slate-900">{totalVerificadas}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                OK: <strong className="font-mono">{totalOk}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                NG: <strong className="font-mono">{totalNg}</strong>
              </span>
            </div>
          </div>

          {/* Formulário de Apontamento de Lote */}
          <form onSubmit={handleSaveLote} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3.5">
            {/* Linha 1: Campos Automáticos (Data, Quem está logado, Peça da Ocorrência) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Data da Verificação (Automático)</span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {formatDateBR(new Date().toISOString().split('T')[0])}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Responsável Logado (Automático)</span>
                <span className="font-bold text-slate-900 text-xs truncate">
                  {currentUser.nome}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase text-blue-700">Peça da Ocorrência (Automático)</span>
                <span className="font-mono font-bold text-[#0b5796] text-xs truncate" title={pecaAutomatica}>
                  {pecaAutomatica}
                </span>
              </div>
            </div>

            {/* Linha 2: Campos Preenchidos pelo Usuário + Cálculo Automático OK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div className="lg:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Lote de Produção *</label>
                <input
                  type="text"
                  required
                  value={formLote.lote}
                  onChange={e => setFormLote({ ...formLote, lote: e.target.value })}
                  placeholder="Ex: LOTE-28926"
                  className="form-input w-full text-xs py-2 px-2.5 border-slate-200 rounded-lg bg-white font-mono font-bold"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Estoque / Local *</label>
                <input
                  type="text"
                  required
                  value={formLote.estoque}
                  onChange={e => setFormLote({ ...formLote, estoque: e.target.value })}
                  placeholder="Ex: Almoxarifado, Expedição, Linha..."
                  className="form-input w-full text-xs py-2 px-2.5 border-slate-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Verificado *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formLote.qtdVerificada}
                  onChange={e => setFormLote({ ...formLote, qtdVerificada: e.target.value })}
                  placeholder="Ex: 200"
                  className="form-input w-full text-xs py-2 px-2.5 border-slate-200 rounded-lg bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-700 mb-1">Peças NG *</label>
                <input
                  type="number"
                  min={0}
                  max={qtdVerificadaNum || undefined}
                  required
                  value={formLote.qtdNg}
                  onChange={e => setFormLote({ ...formLote, qtdNg: e.target.value })}
                  placeholder="0"
                  className="form-input w-full text-xs py-2 px-2.5 border-rose-200 rounded-lg bg-rose-50/40 text-rose-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-700 mb-1">Peças OK (Auto)</label>
                <div className="h-[34px] px-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 font-mono font-extrabold text-xs flex items-center justify-between">
                  <span>{qtdOkCalc}</span>
                  <span className="text-[10px] font-sans font-semibold text-emerald-700">pçs OK</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Cálculo automático: <strong>Total ({qtdVerificadaNum}) − NG ({qtdNgNum}) = {qtdOkCalc} OK</strong>
              </span>
              <button
                type="submit"
                className="btn-primary bg-[#0b5796] hover:bg-[#09477d] h-8 px-4 text-xs font-bold text-white gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Lote Verificado</span>
              </button>
            </div>
          </form>

          {/* Tabela de Lotes Verificados */}
          {lotesSAP.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 italic">
              Nenhum lote verificado registrado ainda para esta ocorrência. Preencha o formulário acima para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Peça</th>
                    <th className="py-2.5 px-3">Lote de Produção</th>
                    <th className="py-2.5 px-3">Estoque / Local</th>
                    <th className="py-2.5 px-3 text-right">Total Verificado</th>
                    <th className="py-2.5 px-3 text-right">Qtd OK</th>
                    <th className="py-2.5 px-3 text-right">Qtd NG</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lotesSAP.map((l, i) => {
                    const total = Number(l.qtdVerificada ?? l.qtd ?? 0);
                    const ng = Number(l.qtdNg ?? 0);
                    const ok = l.qtdOk !== undefined ? Number(l.qtdOk) : Math.max(0, total - ng);
                    return (
                      <tr key={l.id || i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-600">{formatDateBR(l.data)}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{l.responsavel || currentUser.nome}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{l.produto}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{l.lote}</td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{l.estoque || 'Estoque Geral'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{total}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">{ok}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 bg-rose-50/40">{ng}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveLote(l.id || i)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Remover registro de lote"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
