import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Clock,
  FileText,
  Download,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  RNCRecord,
  RegistroTreinamento,
  EightDMetadata,
  IshikawaCauseItem,
  ActionPlanItem,
  HenkatenRecord,
  Entrevista8DRecord,
  LoteSAPParsed
} from '../types';
import { spStore } from '../services/sharepointService';
import { tenantService } from '../services/tenantService';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { formatDateBR, formatDateTimeExact, build8DDigitalSignatures } from '../utils/date';
import { formatOccurrenceId, normalizeDisplayText } from '../utils/formatText';
import { exportRelatorio8DPdf, exportFichaAlertaPdf } from '../utils/export8DPdf';

interface DetalhesImpressaoViewProps {
  rncId: number;
  onNavigate: (screen: any, params?: any) => void;
  fromScreen?: string;
}

export const DetalhesImpressaoView: React.FC<DetalhesImpressaoViewProps> = ({
  rncId,
  onNavigate,
  fromScreen
}) => {
  const [rnc, setRnc] = useState<RNCRecord | undefined>(undefined);
  const [treinamentos, setTreinamentos] = useState<RegistroTreinamento[]>([]);
  const [reportMode, setReportMode] = useState<'relatorio8d' | 'fichaAlerta'>('relatorio8d');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const activeTenant = tenantService.getActiveTenant();
  const brandColor = activeTenant.customizacao.cor_primaria || '#0b5796';
  const brandName = activeTenant.customizacao.nome_exibicao || activeTenant.nome;
  const brandLogo = activeTenant.customizacao.logo_url;
  const brandSubtitle =
    activeTenant.customizacao.subtitulo_relatorio ||
    `${activeTenant.nome.toUpperCase()} • ENGENHARIA & QUALIDADE ASSEGURADA (IATF 16949)`;

  useEffect(() => {
    const item = spStore.getRNCById(rncId);
    setRnc(item);
    const treins = spStore.getTreinamentos(rncId);
    setTreinamentos(treins);
    if (item && item.abrir8D !== 'Sim' && fromScreen !== 'repositorio-8d') {
      setReportMode('fichaAlerta');
    } else {
      setReportMode('relatorio8d');
    }
  }, [rncId, fromScreen]);

  const id8d = useMemo(() => {
    if (!rnc) return '';
    return `${rnc.tipoRnc === 'Formal' ? 'C' : 'I'} - ${rnc.id}`;
  }, [rnc]);

  const meta: EightDMetadata | undefined = useMemo(() => {
    if (!id8d) return undefined;
    return spStore.getEightDMetadata(id8d);
  }, [id8d]);

  const entrevista: Entrevista8DRecord | undefined = useMemo(() => {
    if (!id8d) return undefined;
    return spStore.getEntrevista8D(id8d);
  }, [id8d]);

  const henkaten: HenkatenRecord | undefined = useMemo(() => {
    if (!id8d) return undefined;
    return spStore.getHenkaten(id8d);
  }, [id8d]);

  const causes: IshikawaCauseItem[] = useMemo(() => {
    if (!id8d) return [];
    return spStore.getIshikawaCauses(id8d);
  }, [id8d]);

  const allActions: ActionPlanItem[] = useMemo(() => {
    if (!id8d) return [];
    return spStore.getActionItems({ id_programa_acoes: id8d });
  }, [id8d]);

  const lotesSAP: LoteSAPParsed[] = useMemo(() => {
    if (!rnc) return [];
    return spStore.getLotesSAP(rnc.id);
  }, [rnc]);

  if (!rnc) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center">
        <h2 className="text-xl font-black text-slate-900">Ocorrência não encontrada</h2>
        <button
          className="mt-4 px-5 py-2.5 rounded-xl bg-[#092162] text-white font-bold text-sm"
          onClick={() => onNavigate(fromScreen === 'repositorio-8d' ? 'repositorio-8d' : 'lista-8d')}
        >
          Voltar
        </button>
      </div>
    );
  }

  const codigoClienteOuFormal =
    rnc.tipoRnc === 'Formal'
      ? rnc.codOcorrenciaCliente?.trim() ||
        (rnc.field1 &&
        !['RNC #' + rnc.id, 'RNC-' + rnc.id, 'RNC ' + rnc.id, '#' + rnc.id, String(rnc.id)].includes(
          rnc.field1.trim()
        )
          ? rnc.field1.trim()
          : null)
      : null;

  const formalDisplayId = formatOccurrenceId(rnc.id, codigoClienteOuFormal);
  const codigoPeca9 = (rnc.componente || rnc.produto || '').trim().substring(0, 9);

  // Separação das Ações por Disciplina 8D
  const acoes3D = allActions.filter(
    a => a.etapa_8d === '3D' || (!a.etapa_8d && a.tipo_acao === 'CONTENÇÃO')
  );
  const acoes5D = allActions.filter(
    a =>
      a.etapa_8d === '5D' ||
      (!a.etapa_8d && a.tipo_acao === 'CORRETIVA' && a.yokoten !== 'SIM' && a.poka_yoke !== 'SIM')
  );
  const acoes6D = allActions.filter(
    a =>
      a.etapa_8d === '6D' ||
      (!a.etapa_8d && a.tipo_acao === 'CORRETIVA' && (a.yokoten === 'SIM' || a.poka_yoke === 'SIM'))
  );
  const acoes7D = allActions.filter(
    a => a.etapa_8d === '7D' || (!a.etapa_8d && (a.tipo_acao === 'PREVENTIVA' || Boolean(a.oData_8d_7d)))
  );

  const ngCauses = causes.filter(c => c.okng === 'NG');
  const participantes8DList = (meta?.participantes_8d || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const participantesAtendimentoList = (rnc.participantesAtendimento || rnc.detector || '')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  const totalVerificadoLotes =
    lotesSAP.length > 0
      ? lotesSAP.reduce((acc, l) => acc + Number(l.qtdVerificada ?? l.qtd ?? 0), 0)
      : rnc.qtdInspecionada || rnc.qtdSuspeita || rnc.quantidadeAfetada || 1;
  const totalNgLotes =
    lotesSAP.length > 0
      ? lotesSAP.reduce((acc, l) => acc + Number(l.qtdNg ?? 0), 0)
      : rnc.qtdBloqueada || 0;
  const totalOkLotes =
    lotesSAP.length > 0
      ? lotesSAP.reduce(
          (acc, l) =>
            acc +
            Number(l.qtdOk ?? Math.max(0, Number(l.qtdVerificada ?? l.qtd ?? 0) - Number(l.qtdNg ?? 0))),
          0
        )
      : Math.max(0, totalVerificadoLotes - totalNgLotes);

  // Avaliação do 6D
  const hasYokotenAction = acoes6D.some(a => a.yokoten === 'SIM');
  const hasPokaYokeAction = acoes6D.some(a => a.poka_yoke === 'SIM');

  // Avaliação do 7D por Eixo
  const acoes7DFmea = acoes7D.filter(a => (a.oData_8d_7d || 'FMEA') === 'FMEA');
  const acoes7DPadrao = acoes7D.filter(a => a.oData_8d_7d === 'Trabalho Padronizado');
  const acoes7DLpa = acoes7D.filter(a => a.oData_8d_7d === 'Auditoria Escalonada');

  const is8DAprovado = meta?.validar_8d === 'Aprovado' || rnc.status === 'Concluído';
  const is8DEmRevisao = meta?.validar_8d === 'Reprovado';

  // Regra de Paginação da Ficha de Alerta (14 linhas)
  const rowsNeeded = 14;
  const paddedTreinamentos = [...treinamentos];
  while (paddedTreinamentos.length < rowsNeeded) {
    paddedTreinamentos.push({
      id: Math.random(),
      idRnc: rnc.id,
      re: 0,
      nomeColaborador: '',
      produto: '',
      defeito: '',
      dataTreinamento: '',
      responsavel: ''
    });
  }

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setExportSuccessMsg(null);
    try {
      const payload = {
        rnc,
        id8d,
        formalDisplayId,
        codigoPeca9,
        meta,
        entrevista,
        henkaten,
        causes,
        ngCauses,
        acoes3D,
        acoes5D,
        acoes6D,
        acoes7D,
        allActions,
        lotesSAP,
        treinamentos,
        brandColor,
        brandName,
        brandLogo,
        brandSubtitle
      };

      if (reportMode === 'relatorio8d') {
        await exportRelatorio8DPdf(payload);
        setExportSuccessMsg('PDF do Relatório de 8D exportado!');
      } else {
        await exportFichaAlertaPdf(payload);
        setExportSuccessMsg('PDF da Ficha de Alerta exportado!');
      }
      window.setTimeout(() => {
        setExportSuccessMsg(null);
      }, 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 pb-16 animate-in fade-in duration-150">
      {/* Barra Superior de Ações e Seletor de Documento (Oculto na impressão/PDF) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (fromScreen === 'repositorio-8d') {
                onNavigate('repositorio-8d');
              } else {
                onNavigate('detalhes-8d', { rncId: rnc.id });
              }
            }}
            className="btn-secondary h-9 px-3.5 text-xs font-semibold gap-1.5"
          >
            <ArrowLeft size={15} />
            <span>
              {fromScreen === 'repositorio-8d'
                ? 'Voltar para o Repositório 8D'
                : 'Voltar para Detalhes da Ocorrência'}
            </span>
          </button>

          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => setReportMode('relatorio8d')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'relatorio8d'
                  ? 'bg-white text-[#0b5796] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório de 8D Completo (1D a 8D)</span>
            </button>

            <button
              type="button"
              onClick={() => setReportMode('fichaAlerta')}
              className={`h-7 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportMode === 'fichaAlerta'
                  ? 'bg-white text-[#0b5796] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Ficha de Alerta do Posto (1 Página)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {exportSuccessMsg && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {exportSuccessMsg}
            </span>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="btn-primary h-9 px-4 text-xs font-bold gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: brandColor }}
          >
            {isExportingPdf ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Gerando PDF paginado...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <Printer size={14} />
                <span>
                  {reportMode === 'relatorio8d'
                    ? 'Exportar PDF / Imprimir Relatório de 8D'
                    : 'Exportar PDF / Imprimir Ficha de Alerta A4'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODO 1: RELATÓRIO DE 8D COMPLETO (1D A 8D) — FLUIDO E ADAPTÁVEL AO CONTEÚDO
          ========================================================================= */}
      {reportMode === 'relatorio8d' ? (
        <div
          className="pdf-page-sheet bg-white border border-slate-200 shadow-lg rounded-2xl mx-auto text-slate-900 w-full p-5 sm:p-8 flex flex-col gap-6"
          style={{
            maxWidth: '1040px'
          }}
        >
          {/* Cabeçalho Institucional do Relatório de 8D */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 pb-4 pdf-keep-together"
            style={{ borderColor: brandColor }}
          >
            <div className="flex items-center gap-3.5">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  className="h-11 w-auto max-w-[160px] object-contain"
                />
              ) : (
                <div
                  className="text-white px-4 py-2 font-extrabold text-sm rounded-lg tracking-tight shrink-0"
                  style={{ backgroundColor: brandColor }}
                >
                  {brandName}
                </div>
              )}
              <div>
                <h2 className="text-base sm:text-lg font-extrabold leading-tight" style={{ color: brandColor }}>
                  Relatório Oficial de Resolução de Problemas — Metodologia 8D
                </h2>
                <span className="text-xs text-slate-500 font-semibold block mt-0.5">
                  {brandSubtitle}
                </span>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="flex items-center sm:justify-end gap-2">
                <span className="text-sm sm:text-base font-black text-[#0b5796] font-mono">{formalDisplayId}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${
                    is8DAprovado
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : is8DEmRevisao
                      ? 'bg-amber-100 text-amber-950 border-amber-400'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  {is8DAprovado ? '8D APROVADO' : is8DEmRevisao ? 'EM REVISÃO' : '8D EM ANDAMENTO'}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1">
                Código 8D: <strong className="font-mono text-slate-800">{id8d}</strong> • Data de Abertura:{' '}
                <strong className="text-slate-800">{formatDateBR(rnc.dataOcorrencia)}</strong>
              </div>
            </div>
          </div>

          {/* =====================================================================
              1º D — DESCRIÇÃO COMPLETA DA OCORRÊNCIA
              ===================================================================== */}
          <section className="flex flex-col">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>1º D — DESCRIÇÃO COMPLETA DA OCORRÊNCIA (CLIENTE, PROCESSO, 5W2H E EVIDÊNCIAS)</span>
              <span className="text-xs font-mono text-sky-200">
                Tipo: {rnc.tipoRnc || 'Formal'} • Status: {rnc.status}
              </span>
            </div>

            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 flex flex-col gap-4 bg-white">
              {/* Bloco 1.1: Identificação Geral */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs pdf-keep-together">
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Cliente:</span>
                  <strong className="text-slate-900 text-sm">{normalizeDisplayText(rnc.cliente || '-')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Setor Responsável:</span>
                  <strong className="text-slate-900 text-sm">{normalizeDisplayText(rnc.classificacaoSetor || '-')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Data Abertura &amp; Turno:</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {formatDateBR(rnc.dataOcorrencia)} • {normalizeDisplayText(rnc.turno || '1º Turno')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Data Final Contenção:</span>
                  <strong className="text-slate-900 font-mono text-sm">
                    {formatDateBR(rnc.dataContencao || rnc.dataOcorrencia)}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Veículo / Produto:</span>
                  <strong className="text-slate-900">{normalizeDisplayText(rnc.produto || '-')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">
                    Código Peça ({normalizeDisplayText(rnc.finalComponente || 'Peça Final')}):
                  </span>
                  <strong className="text-slate-900 font-mono">{codigoPeca9 || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Componente:</span>
                  <strong className="text-slate-900 font-mono">{normalizeDisplayText(rnc.componente || '-')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Posto / Linha:</span>
                  <strong className="text-slate-900">
                    {normalizeDisplayText(rnc.posto || 'Geral')} {rnc.fmds ? `• ${normalizeDisplayText(rnc.fmds)}` : ''}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Qtd. Afetada &amp; Modo de Falha:</span>
                  <strong className="text-rose-700">
                    {rnc.quantidadeAfetada || 1} pç(s) — {normalizeDisplayText(rnc.modoFalha || rnc.descricaoProblema || '-')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Local de Detecção:</span>
                  <strong className="text-slate-900">{normalizeDisplayText(rnc.setorDeteccao || '-')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Impacto no Cliente:</span>
                  <strong className="text-slate-900">{normalizeDisplayText(rnc.impactoCliente || '-')}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block mb-0.5">Peça de Segurança / Reincidente:</span>
                  <strong className={rnc.caracteristicaSeguranca === 'Sim' ? 'text-rose-700' : 'text-slate-900'}>
                    Segurança: {rnc.caracteristicaSeguranca || 'Não'} | Reinc.: {rnc.reincidente || 'NÃO'}
                  </strong>
                </div>
              </div>

              {/* Bloco 1.2: Detalhamento da Ocorrência */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm pdf-keep-together">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Detalhamento da Ocorrência (Relato Completo do Problema):
                </span>
                <p className="font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
                  {normalizeDisplayText(
                    rnc.detalhamentoOcorrencia || rnc.descricaoCompleta || rnc.descricaoProblema || 'Não informado.'
                  )}
                </p>
              </div>

              {/* Bloco 1.3: Diretrizes 5W2H e Disposição Interna */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs pdf-keep-together">
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">5W2H — O Que Fazer?</span>
                  <span className="font-semibold text-slate-900">{normalizeDisplayText(rnc.oQueFazer || '-')}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">5W2H — Como Fazer?</span>
                  <span className="font-semibold text-slate-900">{normalizeDisplayText(rnc.comoFazer || '-')}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">5W2H — Por Que Fazer?</span>
                  <span className="font-semibold text-slate-900">{normalizeDisplayText(rnc.porQueFazer || '-')}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">5W2H — Quando / Onde / Quem:</span>
                  <span className="font-semibold text-slate-900">
                    {normalizeDisplayText(rnc.quandoFara || formatDateBR(rnc.dataOcorrencia))} •{' '}
                    {normalizeDisplayText(rnc.ondeFara || 'Quarentena')} •{' '}
                    {normalizeDisplayText(rnc.quemFara || rnc.detector || '-')}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Detecção Interna &amp; Gravidade:</span>
                  <span className="font-semibold text-slate-900">
                    Possível: {normalizeDisplayText(rnc.possivelDetectar || 'Sim')} ({normalizeDisplayText(rnc.tipoDeteccao || 'Visual')}) • Grav.:{' '}
                    {normalizeDisplayText(rnc.gravidade || '-')}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5">Doc. / Cód. Rastreabilidade:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {normalizeDisplayText(rnc.documentoRastreabilidade || 'Etiqueta SAP')}: {rnc.codigoRastreabilidade || '-'}
                  </span>
                </div>
              </div>

              {/* Bloco 1.4: Fotos OK vs NG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 pdf-keep-together">
                <div className="border-2 border-emerald-500 rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-emerald-600 text-white px-3 py-1.5 font-bold text-xs text-center">
                    Foto da Peça OK (Padrão Conforme)
                  </div>
                  <div className="h-52 sm:h-60 bg-slate-50 flex items-center justify-center p-2">
                    <ImageWithFallback
                      src={rnc.fotoPecaOk}
                      alt="Peça OK"
                      variant="ok"
                      className="w-full h-full object-contain"
                      emptyLabel="Sem foto padrão cadastrada"
                      allowZoom={false}
                    />
                  </div>
                </div>

                <div className="border-2 border-rose-500 rounded-xl overflow-hidden flex flex-col">
                  <div className="bg-rose-600 text-white px-3 py-1.5 font-bold text-xs text-center">
                    Foto da Peça NG (Evidência Não Conforme)
                  </div>
                  <div className="h-52 sm:h-60 bg-slate-50 flex items-center justify-center p-2">
                    <ImageWithFallback
                      src={rnc.fotoPecaNg}
                      alt="Peça NG"
                      variant="ng"
                      className="w-full h-full object-contain"
                      emptyLabel="Sem foto do defeito cadastrada"
                      allowZoom={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =====================================================================
              2º D — EQUIPE MULTIDISCIPLINAR
              ===================================================================== */}
          <section className="flex flex-col pdf-keep-together">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>2º D — EQUIPE MULTIDISCIPLINAR DE INVESTIGAÇÃO 8D</span>
              <span className="text-xs font-mono text-sky-200">
                {participantes8DList.length} integrante(s) no 8D
              </span>
            </div>
            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white flex flex-col gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase block mb-2">
                  Integrantes do Grupo de Investigação 8D:
                </span>
                {participantes8DList.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">Nenhum integrante formalmente vinculado no 2D.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {participantes8DList.map((nome, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-blue-50 text-[#0b5796] border border-blue-200 font-bold text-xs"
                      >
                        {nome}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {participantesAtendimentoList.length > 0 && (
                <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-600">
                  <strong>Participantes do Atendimento Inicial (1D):</strong>{' '}
                  {participantesAtendimentoList.map(p => normalizeDisplayText(p)).join(' • ')}
                </div>
              )}
            </div>
          </section>

          {/* =====================================================================
              3º D — AÇÕES DE CONTENÇÃO IMEDIATA & TRIAGEM DE LOTES
              ===================================================================== */}
          <section className="flex flex-col">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>3º D — AÇÕES DE CONTENÇÃO IMEDIATA &amp; TRIAGEM DE LOTES DE ESTOQUE</span>
              <span className="text-xs font-mono text-sky-200">
                {lotesSAP.length} lote(s) • {acoes3D.length} ação(ões) de contenção
              </span>
            </div>
            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white flex flex-col gap-4">
              {/* Resumo numérico da triagem */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pdf-keep-together">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 block">Total de Peças Verificadas</span>
                  <strong className="text-lg font-black font-mono text-slate-900 mt-0.5 block">{totalVerificadoLotes}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 block">Qtd. Peças OK (Liberadas)</span>
                  <strong className="text-lg font-black font-mono text-emerald-800 mt-0.5 block">{totalOkLotes}</strong>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-xs font-bold text-rose-800 block">Qtd. Peças NG (Bloqueadas)</span>
                  <strong className="text-lg font-black font-mono text-rose-800 mt-0.5 block">{totalNgLotes}</strong>
                </div>
              </div>

              {/* Tabela de Lotes Verificados */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase block pdf-section-header">
                  3D.1 — Registro de Rastreabilidade e Triagem de Lotes nos Estoques:
                </span>
                {lotesSAP.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">Nenhum lote registrado no 3D.</p>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border border-slate-300">
                        <th className="py-2 px-2.5 border border-slate-300">Data</th>
                        <th className="py-2 px-2.5 border border-slate-300">Responsável</th>
                        <th className="py-2 px-2.5 border border-slate-300">Peça</th>
                        <th className="py-2 px-2.5 border border-slate-300">Lote</th>
                        <th className="py-2 px-2.5 border border-slate-300">Estoque / Local</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-right">Verificadas</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-right">OK</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-right">NG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotesSAP.map((l, idx) => {
                        const tot = Number(l.qtdVerificada ?? l.qtd ?? 0);
                        const ng = Number(l.qtdNg ?? 0);
                        const ok = l.qtdOk !== undefined ? Number(l.qtdOk) : Math.max(0, tot - ng);
                        return (
                          <tr key={l.id || idx} className="border border-slate-300 pdf-keep-together">
                            <td className="py-2 px-2.5 border border-slate-300 font-mono">{formatDateBR(l.data)}</td>
                            <td className="py-2 px-2.5 border border-slate-300">{l.responsavel || '-'}</td>
                            <td className="py-2 px-2.5 border border-slate-300 font-mono">{l.produto}</td>
                            <td className="py-2 px-2.5 border border-slate-300 font-mono font-bold">{l.lote}</td>
                            <td className="py-2 px-2.5 border border-slate-300">{l.estoque || 'Estoque Geral'}</td>
                            <td className="py-2 px-2.5 border border-slate-300 text-right font-mono font-bold">{tot}</td>
                            <td className="py-2 px-2.5 border border-slate-300 text-right font-mono font-bold text-emerald-700">{ok}</td>
                            <td className="py-2 px-2.5 border border-slate-300 text-right font-mono font-bold text-rose-700">{ng}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Tabela de Ações de Contenção 3D */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase block pdf-section-header">
                  3D.2 — Ações de Contenção Vinculadas ao Plano:
                </span>
                {acoes3D.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">Nenhuma ação de contenção cadastrada no 3D.</p>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border border-slate-300">
                        <th className="py-2 px-2.5 border border-slate-300">Contramedida de Contenção</th>
                        <th className="py-2 px-2.5 border border-slate-300">Responsável</th>
                        <th className="py-2 px-2.5 border border-slate-300">Prazo / Conclusão</th>
                        <th className="py-2 px-2.5 border border-slate-300">Evidência</th>
                        <th className="py-2 px-2.5 border border-slate-300 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acoes3D.map(a => (
                        <tr key={a.id} className="border border-slate-300 pdf-keep-together">
                          <td className="py-2 px-2.5 border border-slate-300 font-semibold">{a.contra_medida}</td>
                          <td className="py-2 px-2.5 border border-slate-300">{a.responsavel_acao}</td>
                          <td className="py-2 px-2.5 border border-slate-300 font-mono">
                            {formatDateBR(a.data_planejada)}
                            {a.data_conclusao ? ` (Concl.: ${formatDateBR(a.data_conclusao)})` : ''}
                          </td>
                          <td className="py-2 px-2.5 border border-slate-300">{a.comentarios_evidencia || '-'}</td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center font-bold">{a.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* =====================================================================
              4º D — INVESTIGAÇÃO DE CAUSA RAIZ (GEMBA, HENKATEN, ISHIKAWA E 5 PORQUÊS)
              ===================================================================== */}
          <section className="flex flex-col">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>4º D — INVESTIGAÇÃO DE CAUSA RAIZ (GEMBA, HENKATEN, ISHIKAWA 6M E 5 PORQUÊS)</span>
              <span className="text-xs font-mono text-sky-200">
                {causes.length} hipótese(s) • {ngCauses.length} causa(s) NG confirmada(s)
              </span>
            </div>

            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white flex flex-col gap-5">
              {/* 4D.1: GEMBA */}
              <div className="flex flex-col gap-2 pdf-keep-together">
                <span className="text-xs font-bold text-slate-700 uppercase block">
                  4D.1 — Investigação Gemba (Verificação In Loco no Chão de Fábrica):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-1">1. Avaliação Gemba (Chão de Fábrica):</span>
                    <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                      {entrevista?.gemba || 'Não registrado.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-1">2. Entrevistas com Operadores / Liderança:</span>
                    <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                      {entrevista?.entrevista || 'Não registrado.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-1">3. Simulação / Reprodução do Defeito:</span>
                    <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                      {entrevista?.simulacao || 'Não registrado.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-600 block mb-1">4. Rastreabilidade no Posto (Gemba):</span>
                    <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                      {entrevista?.rastreabilidade || 'Não registrado.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4D.2: HENKATEN (6M) */}
              <div className="flex flex-col gap-2 pdf-keep-together">
                <span className="text-xs font-bold text-slate-700 uppercase block">
                  4D.2 — Mapeamento Henkaten (Pontos de Mudança nos 6M):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { label: 'Máquina', flag: henkaten?.maqhkt || 'Não', obs: henkaten?.maq_comentarios },
                    { label: 'Mão de Obra', flag: henkaten?.mohkt || 'Não', obs: henkaten?.mo_comentarios },
                    { label: 'Método', flag: henkaten?.methkt || 'Não', obs: henkaten?.met_comentarios },
                    { label: 'Material', flag: henkaten?.mathkt || 'Não', obs: henkaten?.mat_comentarios },
                    { label: 'Medição', flag: henkaten?.medhkt || 'Não', obs: henkaten?.med_comentarios },
                    { label: 'Meio Ambiente', flag: henkaten?.mambhkt || 'Não', obs: henkaten?.mamb_comentarios }
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`p-3 rounded-xl border ${
                        item.flag === 'Sim' ? 'bg-rose-50/60 border-rose-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-slate-900">{item.label}</strong>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            item.flag === 'Sim' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Mudança: {item.flag}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{item.obs || 'Sem alterações registradas.'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4D.3: DIAGRAMA DE ISHIKAWA (6M) */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase block pdf-section-header">
                  4D.3 — Diagrama de Ishikawa (Hipóteses Levantadas nos 6M):
                </span>
                {causes.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">Nenhuma hipótese cadastrada no Ishikawa.</p>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border border-slate-300">
                        <th className="py-2 px-2.5 border border-slate-300 w-32">Fator 6M</th>
                        <th className="py-2 px-2.5 border border-slate-300 w-32">Eixo</th>
                        <th className="py-2 px-2.5 border border-slate-300">Descrição da Hipótese Levantada</th>
                        <th className="py-2 px-2.5 border border-slate-300 w-40 text-center">Classificação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {causes.map(c => (
                        <tr
                          key={c.id}
                          className={`border border-slate-300 pdf-keep-together ${
                            c.okng === 'NG' ? 'bg-rose-50/40' : 'bg-white'
                          }`}
                        >
                          <td className="py-2 px-2.5 border border-slate-300 font-bold">{c.seisms}</td>
                          <td className="py-2 px-2.5 border border-slate-300">{c.ocnd}</td>
                          <td className="py-2 px-2.5 border border-slate-300 font-medium">{c.descricao_causa}</td>
                          <td className="py-2 px-2.5 border border-slate-300 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                                c.okng === 'NG'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {c.okng === 'NG' ? 'NG (Causa Provável)' : 'OK (Descartada)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* 4D.4: ANÁLISE DOS 5 PORQUÊS (CAUSAS RAÍZES CONFIRMADAS) */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase block pdf-section-header">
                  4D.4 — Investigação dos 5 Porquês e Causas-Raiz Confirmadas:
                </span>
                {ngCauses.length === 0 ? (
                  <p className="text-slate-400 italic text-xs">Nenhuma hipótese NG para investigação dos 5 Porquês.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {ngCauses.map((c, idx) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/40 flex flex-col gap-2.5 pdf-keep-together"
                      >
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2 gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            Hipótese NG #{idx + 1} [{c.seisms} • {c.ocnd}]: {c.descricao_causa}
                          </span>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                            CAUSA CONFIRMADA
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <strong className="text-slate-500 block text-[10px] mb-0.5">1º Porquê:</strong>
                            <span className="leading-relaxed">{c.umpq || '-'}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <strong className="text-slate-500 block text-[10px] mb-0.5">2º Porquê:</strong>
                            <span className="leading-relaxed">{c.doispq || '-'}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <strong className="text-slate-500 block text-[10px] mb-0.5">3º Porquê:</strong>
                            <span className="leading-relaxed">{c.trespq || '-'}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                            <strong className="text-slate-500 block text-[10px] mb-0.5">4º Porquê:</strong>
                            <span className="leading-relaxed">{c.quatropq || '-'}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-400">
                            <strong className="text-amber-950 block text-[10px] mb-0.5">5º Porquê (Causa Raiz):</strong>
                            <span className="font-bold text-amber-950 leading-relaxed">{c.cincopq || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* =====================================================================
              5º D — AÇÕES CORRETIVAS PERMANENTES
              ===================================================================== */}
          <section className="flex flex-col">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>5º D — AÇÕES CORRETIVAS PERMANENTES (ATUAÇÃO NAS CAUSAS-RAIZ DO 4º D)</span>
              <span className="text-xs font-mono text-sky-200">{acoes5D.length} ação(ões) corretiva(s)</span>
            </div>
            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white">
              {acoes5D.length === 0 ? (
                <p className="text-slate-400 italic text-xs">Nenhuma ação corretiva registrada no 5D.</p>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border border-slate-300">
                      <th className="py-2 px-2.5 border border-slate-300">Causa Raiz Tratada (4D)</th>
                      <th className="py-2 px-2.5 border border-slate-300">Contramedida Corretiva (5D)</th>
                      <th className="py-2 px-2.5 border border-slate-300">Responsável</th>
                      <th className="py-2 px-2.5 border border-slate-300">Prazo / Conclusão</th>
                      <th className="py-2 px-2.5 border border-slate-300">Evidência &amp; Validação</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acoes5D.map(a => (
                      <tr key={a.id} className="border border-slate-300 pdf-keep-together">
                        <td className="py-2.5 px-2.5 border border-slate-300 font-medium text-slate-700">{a.causa || '-'}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300 font-bold text-slate-900">{a.contra_medida}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300">{a.responsavel_acao}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300 font-mono">
                          Plan: {formatDateBR(a.data_planejada)}
                          {a.data_conclusao ? (
                            <span className="block text-emerald-700">Real: {formatDateBR(a.data_conclusao)}</span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-300">
                          <div>{a.comentarios_evidencia || '-'}</div>
                          {a.comentarios_validacao && (
                            <div className="text-[11px] text-emerald-800 font-semibold mt-1">
                              Parecer Qualidade: {a.comentarios_validacao}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-300 text-center font-bold">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* =====================================================================
              6º D — AVALIAÇÃO DE ABRANGÊNCIA (YOKOTEN) E POKA-YOKE
              ===================================================================== */}
          <section className="flex flex-col">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>6º D — AVALIAÇÃO DE ABRANGÊNCIA (YOKOTEN) E DISPOSITIVOS À PROVA DE ERRO (POKA-YOKE)</span>
              <span className="text-xs font-mono text-sky-200">{acoes6D.length} ação(ões) no 6D</span>
            </div>
            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white flex flex-col gap-4">
              {/* Matriz explícita do que foi avaliado no 6º D */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pdf-keep-together">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase block">
                      Avaliação 6D.1 — Abrangência (Yokoten):
                    </span>
                    <span className="text-slate-600 font-medium text-xs block mt-0.5">
                      Expansão da contramedida para produtos/linhas similares
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold border shrink-0 ${
                      hasYokotenAction
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : meta?.yokoten_na
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {hasYokotenAction
                      ? 'APLICÁVEL (IMPLEMENTADO)'
                      : meta?.yokoten_na
                      ? 'AVALIADO: NÃO APLICÁVEL (N/A)'
                      : 'EM AVALIAÇÃO'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-700 uppercase block">
                      Avaliação 6D.2 — Dispositivo Poka-Yoke:
                    </span>
                    <span className="text-slate-600 font-medium text-xs block mt-0.5">
                      Bloqueio físico/lógico contra geração ou passagem de falha
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold border shrink-0 ${
                      hasPokaYokeAction
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : meta?.pokayoke_na
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {hasPokaYokeAction
                      ? 'APLICÁVEL (IMPLEMENTADO)'
                      : meta?.pokayoke_na
                      ? 'AVALIADO: NÃO APLICÁVEL (N/A)'
                      : 'EM AVALIAÇÃO'}
                  </span>
                </div>
              </div>

              {acoes6D.length > 0 && (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border border-slate-300">
                      <th className="py-2 px-2.5 border border-slate-300">Escopo 6D</th>
                      <th className="py-2 px-2.5 border border-slate-300">Ação de Abrangência / Poka-Yoke</th>
                      <th className="py-2 px-2.5 border border-slate-300">Responsável</th>
                      <th className="py-2 px-2.5 border border-slate-300">Prazo / Conclusão</th>
                      <th className="py-2 px-2.5 border border-slate-300">Evidência</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acoes6D.map(a => (
                      <tr key={a.id} className="border border-slate-300 pdf-keep-together">
                        <td className="py-2.5 px-2.5 border border-slate-300 font-bold">
                          {a.yokoten === 'SIM' ? 'Yokoten ' : ''}
                          {a.poka_yoke === 'SIM' ? 'Poka-Yoke' : ''}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-300 font-semibold">{a.contra_medida}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300">{a.responsavel_acao}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300 font-mono">
                          {formatDateBR(a.data_planejada)}
                          {a.data_conclusao ? ` (${formatDateBR(a.data_conclusao)})` : ''}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-300">{a.comentarios_evidencia || '-'}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300 text-center font-bold">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* =====================================================================
              7º D — PREVENÇÃO SISTÊMICA E ATUALIZAÇÃO DOCUMENTAL (FMEA, PADRÃO E LPA)
              ===================================================================== */}
          <section className="flex flex-col">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>7º D — PREVENÇÃO SISTÊMICA E ATUALIZAÇÃO DOCUMENTAL (FMEA, PADRÃO E LPA)</span>
              <span className="text-xs font-mono text-sky-200">{acoes7D.length} ação(ões) preventiva(s)</span>
            </div>
            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white flex flex-col gap-4">
              {/* Resumo dos 3 Eixos Avaliados/Alterados no 7º D */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pdf-keep-together">
                {[
                  { title: '1. FMEA (PFMEA / Plano de Controle)', list: acoes7DFmea },
                  { title: '2. Trabalho Padronizado (Instrução)', list: acoes7DPadrao },
                  { title: '3. Auditoria Escalonada (LPA)', list: acoes7DLpa }
                ].map(eixo => (
                  <div
                    key={eixo.title}
                    className={`p-3 rounded-xl border ${
                      eixo.list.length > 0 ? 'bg-blue-50/50 border-blue-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-slate-900 text-xs">{eixo.title}</strong>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          eixo.list.length > 0 ? 'bg-[#0b5796] text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {eixo.list.length > 0 ? `${eixo.list.length} Atualização(ões)` : 'Sem Alteração'}
                      </span>
                    </div>
                    {eixo.list.length > 0 && (
                      <p className="text-xs text-slate-700 mt-1.5 font-medium leading-relaxed">
                        {eixo.list.map(x => x.contra_medida).join('; ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {acoes7D.length > 0 && (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border border-slate-300">
                      <th className="py-2 px-2.5 border border-slate-300">Eixo 7D Atualizado</th>
                      <th className="py-2 px-2.5 border border-slate-300">Ação Preventiva / Documento Revisado</th>
                      <th className="py-2 px-2.5 border border-slate-300">Responsável</th>
                      <th className="py-2 px-2.5 border border-slate-300">Prazo / Conclusão</th>
                      <th className="py-2 px-2.5 border border-slate-300">Evidência</th>
                      <th className="py-2 px-2.5 border border-slate-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acoes7D.map(a => (
                      <tr key={a.id} className="border border-slate-300 pdf-keep-together">
                        <td className="py-2.5 px-2.5 border border-slate-300 font-bold text-[#0b5796]">
                          {a.oData_8d_7d || 'FMEA'}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-300 font-semibold">{a.contra_medida}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300">{a.responsavel_acao}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300 font-mono">
                          {formatDateBR(a.data_planejada)}
                          {a.data_conclusao ? ` (${formatDateBR(a.data_conclusao)})` : ''}
                        </td>
                        <td className="py-2.5 px-2.5 border border-slate-300">{a.comentarios_evidencia || '-'}</td>
                        <td className="py-2.5 px-2.5 border border-slate-300 text-center font-bold">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* =====================================================================
              8º D — VALIDAÇÃO FINAL DAS AÇÕES E PARECER DE FECHAMENTO DO 8D
              ===================================================================== */}
          <section className="flex flex-col pdf-keep-together">
            <div className="bg-[#0f2942] text-white px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm flex items-center justify-between pdf-section-header">
              <span>8º D — VALIDAÇÃO FINAL DAS AÇÕES E PARECER DE FECHAMENTO DO 8D</span>
              <span className="text-xs font-mono text-sky-200">
                {allActions.filter(a => a.status === 'Validado').length}/{allActions.length} Ações Validadas
              </span>
            </div>
            <div className="border border-t-0 border-slate-300 rounded-b-xl p-4 sm:p-5 bg-white flex flex-col gap-4">
              {/* Histórico de Revisões de Etapas (se houve revisão em 4D..7D) */}
              {(meta?.motivo_revisao_8d ||
                meta?.comentarios_revisao_4d ||
                meta?.comentarios_revisao_5d ||
                meta?.comentarios_revisao_6d ||
                meta?.comentarios_revisao_7d) && (
                <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-col gap-2">
                  <span className="text-xs font-bold text-sky-950 uppercase">
                    Registro de Revisões Técnicas Realizadas no Ciclo (4D a 7D):
                  </span>
                  {meta?.motivo_revisao_8d && (
                    <p className="text-xs text-slate-800">
                      <strong>Solicitação de Revisão:</strong> {meta.motivo_revisao_8d}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {(['4D', '5D', '6D', '7D'] as const).map(et => {
                      const com =
                        et === '4D'
                          ? meta?.comentarios_revisao_4d
                          : et === '5D'
                          ? meta?.comentarios_revisao_5d
                          : et === '6D'
                          ? meta?.comentarios_revisao_6d
                          : meta?.comentarios_revisao_7d;
                      if (!com) return null;
                      return (
                        <div key={et} className="p-2.5 rounded-lg bg-white border border-sky-200 text-xs">
                          <strong className="text-sky-900">{et} Revisado:</strong> {com}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parecer Final do 8D (com Data e Responsável na linha abaixo da mensagem) */}
              <div
                className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  is8DAprovado
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : is8DEmRevisao
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-xs sm:text-sm uppercase tracking-tight">
                    Parecer Final de Validação do Relatório 8D:{' '}
                    {is8DAprovado ? 'APROVADO INTEGRALMENTE' : is8DEmRevisao ? 'REVISÃO SOLICITADA' : 'EM VALIDAÇÃO'}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-medium leading-relaxed">
                  {meta?.comentarios_validacao ||
                    (is8DAprovado
                      ? 'Todas as contramedidas do Plano de Ação (3D, 5D, 6D e 7D) foram validadas com evidências objetivas e demonstraram eficácia.'
                      : 'Aguardando conclusão e validação final de todas as ações do plano.')}
                </p>

                {(meta?.data_aprovacao || meta?.data_hora_aprovacao || is8DAprovado || (is8DEmRevisao && meta?.data_solicitacao_revisao)) && (
                  <div
                    className={`pt-2 mt-0.5 border-t text-xs font-mono font-bold flex flex-wrap items-center gap-x-4 gap-y-1 ${
                      is8DAprovado
                        ? 'border-emerald-200/90 text-emerald-900'
                        : is8DEmRevisao
                        ? 'border-amber-200/90 text-amber-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>
                      Data/Hora:{' '}
                      {is8DAprovado
                        ? formatDateTimeExact(meta?.data_hora_aprovacao || meta?.data_aprovacao || rnc.dataConclusao || rnc.dataOcorrencia, '16:42')
                        : formatDateTimeExact(meta?.data_solicitacao_revisao, '16:10')}
                    </span>
                    <span>•</span>
                    <span>
                      Responsável (Admin da Qualidade):{' '}
                      {normalizeDisplayText(
                        is8DAprovado
                          ? meta?.aprovado_por || currentUserOrDefault(rnc)
                          : meta?.solicitado_revisao_por || meta?.aprovado_por || 'Admin da Qualidade'
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Assinaturas Digitais Eletrônicas com Carimbo de Data e Hora Exata por Etapa */}
              {(() => {
                const hasAnalysisActivity =
                  causes.length > 0 ||
                  allActions.length > 0 ||
                  lotesSAP.length > 0 ||
                  Boolean(meta?.participantes_8d && meta.participantes_8d.trim().length > 0) ||
                  Boolean(entrevista?.gemba || entrevista?.entrevista);

                const digitalSigs = build8DDigitalSignatures({
                  rnc,
                  meta,
                  hasAnalysisActivity,
                  normalizeText: normalizeDisplayText
                });

                return (
                  <div className="pt-3 mt-1 border-t border-slate-200 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#0b5796]" />
                        <span>Registro de Assinaturas Digitais Eletrônicas do Ciclo 8D (Carimbo de Tempo Oficial)</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        Autenticidade Eletrônica Auditável
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs">
                      {digitalSigs.map(sig => (
                        <div
                          key={sig.stageKey}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                            sig.isSigned
                              ? 'bg-emerald-50/40 border-emerald-300'
                              : sig.isPendingReview
                              ? 'bg-amber-50/60 border-amber-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 pb-1.5">
                              <span className="text-[10px] font-extrabold text-slate-700 uppercase">
                                {sig.stageTitle}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                  sig.isSigned
                                    ? 'bg-emerald-600 text-white'
                                    : sig.isPendingReview
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {sig.isSigned ? 'Assinado Digitalmente' : sig.isPendingReview ? 'Em Revisão' : 'Pendente'}
                              </span>
                            </div>

                            <div className="mt-0.5">
                              <span className="text-[10px] font-bold text-slate-500 block">{sig.roleTitle}:</span>
                              <strong className="text-xs font-extrabold text-slate-900 block leading-snug">
                                {sig.signerName}
                              </strong>
                              <span className="text-[11px] font-medium text-slate-600 block">
                                {sig.signerRoleOrSector}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-800 bg-white/90 px-2 py-1 rounded border border-slate-200">
                              <Clock className="w-3 h-3 text-[#0b5796] shrink-0" />
                              <span>Momento: {sig.exactDateTime}</span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-200/80 flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-500 font-medium leading-tight">
                              {sig.scopeDescription}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#0b5796]">
                              Selo Digital: {sig.signatureCode}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      ) : (
        /* =========================================================================
           MODO 2: FICHA DE ALERTA DA QUALIDADE (POSTO DE TRABALHO — 1 PÁGINA A4)
           ========================================================================= */
        <div
          className="pdf-page-sheet bg-white border border-slate-300 shadow-xl rounded-md mx-auto text-slate-900 overflow-hidden w-full"
          style={{
            padding: '12mm',
            maxWidth: '980px',
            fontSize: '11px',
            lineHeight: 1.3
          }}
        >
          {/* Header White-Label da Empresa */}
          <div
            className="flex items-center justify-between border-b-2 pb-2.5 mb-3"
            style={{ borderColor: brandColor }}
          >
            <div className="flex items-center gap-3">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  referrerPolicy="no-referrer"
                  className="h-9 w-auto max-w-[140px] object-contain"
                />
              ) : (
                <div
                  className="text-white px-3.5 py-1.5 font-bold text-sm rounded"
                  style={{ backgroundColor: brandColor }}
                >
                  {brandName}
                </div>
              )}
              <div>
                <h2 className="text-base font-bold leading-tight" style={{ color: brandColor }}>
                  Alerta da Qualidade &amp; Rastreabilidade
                </h2>
                <span className="text-xs text-slate-500 font-semibold">{brandSubtitle}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-rose-600 font-mono">
                {formatOccurrenceId(rnc.id, rnc.codOcorrenciaCliente || rnc.field1)}
              </div>
              <div className="text-xs text-slate-500 font-medium">Data: {formatDateBR(rnc.dataOcorrencia)}</div>
            </div>
          </div>

          {/* Informações Gerais */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 border border-slate-200 mb-3 rounded text-xs">
            <div>
              <strong className="text-slate-500">ID / Ocorrência:</strong>{' '}
              <span className="font-bold text-blue-700 font-mono">
                {formatOccurrenceId(rnc.id, rnc.codOcorrenciaCliente || rnc.field1)}
              </span>
            </div>
            <div>
              <strong className="text-slate-500">Cliente:</strong> <span className="font-bold">{rnc.cliente}</span>
            </div>
            <div>
              <strong className="text-slate-500">Veículo / Projeto:</strong>{' '}
              <span className="font-bold">{rnc.produto}</span>
            </div>
            <div>
              <strong className="text-slate-500">Componente:</strong> <span className="font-bold">{rnc.componente}</span>
            </div>
            <div>
              <strong className="text-slate-500">Setor:</strong>{' '}
              <span className="font-bold">{rnc.classificacaoSetor}</span>
            </div>
            <div>
              <strong className="text-slate-500">Posto:</strong> <span>{rnc.posto || 'N/A'}</span>
            </div>
            <div>
              <strong className="text-slate-500">Turno:</strong> <span>{rnc.turno}</span>
            </div>
            <div>
              <strong className="text-slate-500">Qtd. Afetada:</strong>{' '}
              <span className="font-bold">{rnc.quantidadeAfetada} pçs</span>
            </div>
          </div>

          {/* Comparativo de Fotos OK vs NG */}
          <div className="grid grid-cols-2 gap-3 mb-3 pdf-keep-together">
            <div className="border-2 border-rose-500 rounded overflow-hidden flex flex-col">
              <div className="bg-rose-600 text-white px-2.5 py-1 font-bold text-xs text-center">
                Peça Não Conforme (Defeito Registrado)
              </div>
              <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                <ImageWithFallback
                  src={rnc.fotoPecaNg}
                  alt="Peça NG"
                  variant="ng"
                  className="w-full h-full object-contain"
                  emptyLabel="Sem foto do defeito cadastrada"
                  allowZoom={false}
                />
              </div>
              <div className="p-2 bg-rose-50 text-rose-950 font-bold text-xs min-h-[38px] border-t border-rose-200">
                <span className="text-xs font-bold text-rose-700 block">Sintoma / Falha:</span>
                {rnc.descricaoProblema || 'Defeito não detalhado'}
              </div>
            </div>

            <div className="border-2 border-emerald-500 rounded overflow-hidden flex flex-col">
              <div className="bg-emerald-600 text-white px-2.5 py-1 font-bold text-xs text-center">
                Peça Conforme (Padrão Aprovado)
              </div>
              <div className="h-44 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                <ImageWithFallback
                  src={rnc.fotoPecaOk}
                  alt="Peça OK"
                  variant="ok"
                  className="w-full h-full object-contain"
                  emptyLabel="Sem foto padrão cadastrada"
                  allowZoom={false}
                />
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-950 font-bold text-xs min-h-[38px] border-t border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block">Critério de Aceitação:</span>
                Livre de rebarbas, trincas, solda com fusão 100% e conformidade geométrica.
              </div>
            </div>
          </div>

          {/* Ações de Contenção */}
          <div className="border border-slate-200 p-2.5 mb-3 bg-slate-50 rounded">
            <div className="font-black text-[#092162] text-xs mb-1">AÇÕES DE CONTENÇÃO IMEDIATA (3D):</div>
            <p className="text-slate-800 text-xs m-0">
              {rnc.acoesContencao ||
                'Retenção preventiva de estoque, triagem 100% e inspeção com torquímetro / gabarito.'}
            </p>
          </div>

          {/* Tabela de Colaboradores Treinados */}
          <div className="mb-3">
            <div className="font-black text-[#092162] text-xs mb-1">
              REGISTRO DE OPERADORES TREINADOS NO POSTO (DISSEMINAÇÃO DO ALERTA):
            </div>
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-[#092162] text-white">
                  <th className="p-1.5 border border-[#092162] w-16 text-center">RE</th>
                  <th className="p-1.5 border border-[#092162]">NOME DO OPERADOR</th>
                  <th className="p-1.5 border border-[#092162] w-24 text-center">DATA</th>
                  <th className="p-1.5 border border-[#092162] w-36 text-center">VISTO DO COLABORADOR</th>
                </tr>
              </thead>
              <tbody>
                {paddedTreinamentos.map((t, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="p-1 border border-slate-300 font-mono font-bold text-center">
                      {t.re > 0 ? t.re : ''}
                    </td>
                    <td className="p-1 border border-slate-300 font-medium">{t.nomeColaborador}</td>
                    <td className="p-1 border border-slate-300 font-mono text-center">
                      {formatDateBR(t.dataTreinamento)}
                    </td>
                    <td className="p-1 border border-slate-300"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer com Assinaturas */}
          <div className="grid grid-cols-3 gap-6 pt-3 border-t border-slate-300 text-center text-[10px] text-slate-600">
            <div>
              <div className="border-t border-slate-400 w-4/5 mx-auto mb-1" />
              <span className="font-bold">Emitente / Inspetor da Qualidade</span>
            </div>
            <div>
              <div className="border-t border-slate-400 w-4/5 mx-auto mb-1" />
              <span className="font-bold">Supervisor / Líder de Produção</span>
            </div>
            <div>
              <div className="border-t border-slate-400 w-4/5 mx-auto mb-1" />
              <span className="font-bold">Engenharia da Qualidade</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function currentUserOrDefault(rnc: RNCRecord): string {
  return rnc.responsavelConclusao || rnc.detector || 'Qualidade';
}

export default DetalhesImpressaoView;
