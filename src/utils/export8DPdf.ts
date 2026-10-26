import { jsPDF } from 'jspdf';
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
import { formatDateBR, formatDateTimeExact, build8DDigitalSignatures } from './date';
import { formatOccurrenceId, normalizeDisplayText } from './formatText';

export interface Export8DPdfParams {
  rnc: RNCRecord;
  id8d: string;
  formalDisplayId: string;
  codigoPeca9: string;
  meta?: EightDMetadata;
  entrevista?: Entrevista8DRecord;
  henkaten?: HenkatenRecord;
  causes: IshikawaCauseItem[];
  ngCauses: IshikawaCauseItem[];
  acoes3D: ActionPlanItem[];
  acoes5D: ActionPlanItem[];
  acoes6D: ActionPlanItem[];
  acoes7D: ActionPlanItem[];
  allActions: ActionPlanItem[];
  lotesSAP: LoteSAPParsed[];
  treinamentos: RegistroTreinamento[];
  brandColor: string;
  brandName: string;
  brandLogo?: string;
  brandSubtitle: string;
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
}

function hexToRgb(hex: string, fallback: [number, number, number] = [11, 87, 150]): [number, number, number] {
  const clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
  }
  return fallback;
}

function resolveRawImageUrl(rawSrc?: string, itemId?: number | string): string {
  if (!rawSrc || !rawSrc.trim()) return '';
  const trimmed = rawSrc.trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const fileName = parsed.fileName || parsed.originalImageName || '';
      const serverRelativeUrl = parsed.serverRelativeUrl || parsed.serverUrl;
      if (serverRelativeUrl) {
        return serverRelativeUrl.startsWith('http')
          ? serverRelativeUrl
          : `https://gitservices.sharepoint.com${serverRelativeUrl}`;
      }
      if (fileName) {
        const id = itemId || '';
        return `https://gitservices.sharepoint.com/sites/QualityGate/Lists/Resumo%20dos%20Incidentes%20de%20qualidade/Attachments/${id}/${fileName}`;
      }
    } catch {
      return '';
    }
  }
  return trimmed;
}

async function loadImageAsDataUrl(rawSrc?: string, itemId?: number | string): Promise<LoadedImage | null> {
  const url = resolveRawImageUrl(rawSrc, itemId);
  if (!url) return null;

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = window.setTimeout(() => {
      resolve(null);
    }, 3500);

    img.onload = () => {
      window.clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1000;
        let w = img.naturalWidth || img.width || 400;
        let h = img.naturalHeight || img.height || 300;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve({ dataUrl, width: w, height: h, format: 'JPEG' });
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };

    img.src = url;
  });
}

interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'bold';
  textColor?: [number, number, number];
}

/**
 * Gera e baixa o PDF completo do Relatório 8D (1D a 8D) com paginação inteligente:
 * - Nunca corta linhas de tabela, ações, cards de 5 Porquês ou blocos no meio entre uma página e outra.
 * - Nunca deixa um título de seção (1D..8D ou subtítulo) órfão no fim da página sem o primeiro item.
 * - Repete automaticamente o cabeçalho da tabela quando uma lista de ações/lotes continua na página seguinte.
 */
export async function exportRelatorio8DPdf(params: Export8DPdfParams): Promise<void> {
  const {
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
    brandColor,
    brandName,
    brandLogo,
    brandSubtitle
  } = params;

  const [logoImg, okImg, ngImg] = await Promise.all([
    loadImageAsDataUrl(brandLogo),
    loadImageAsDataUrl(rnc.fotoPecaOk, rnc.id),
    loadImageAsDataUrl(rnc.fotoPecaNg, rnc.id)
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_X = 10;
  const CONTENT_W = PAGE_W - MARGIN_X * 2; // 190mm
  const TOP_START_Y = 10;
  const BOTTOM_LIMIT_Y = PAGE_H - 13; // 284mm (reserva rodapé)

  const brandRgb = hexToRgb(brandColor, [11, 87, 150]);
  const navyRgb: [number, number, number] = [15, 41, 66];

  let y = TOP_START_Y;

  const is8DAprovado = meta?.validar_8d === 'Aprovado' || rnc.status === 'Concluído';
  const is8DEmRevisao = meta?.validar_8d === 'Reprovado';

  // Helper para desenhar cabeçalho compacto em páginas de continuação (Página 2+)
  const drawContinuationHeader = () => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_X, TOP_START_Y, CONTENT_W, 8, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
    doc.text(`${brandName} — Relatório Oficial de 8D`, MARGIN_X + 3, TOP_START_Y + 5.2);

    doc.setTextColor(51, 65, 85);
    doc.text(
      `${formalDisplayId}  •  Código 8D: ${id8d}  •  Peça: ${codigoPeca9 || '-'}`,
      PAGE_W - MARGIN_X - 3,
      TOP_START_Y + 5.2,
      { align: 'right' }
    );

    y = TOP_START_Y + 11.5;
  };

  const addNewPage = () => {
    doc.addPage();
    drawContinuationHeader();
  };

  // Garante que um bloco de altura `neededHeight` caiba inteiro na página atual; se não couber, avança de página
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > BOTTOM_LIMIT_Y) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Desenha a barra de título de uma Disciplina (1º D a 8º D), garantindo espaço para o cabeçalho + primeiro bloco
  const drawDisciplineHeader = (title: string, rightBadge: string, minFirstBlockHeight = 26) => {
    const headerH = 8.5;
    ensureSpace(headerH + minFirstBlockHeight);

    doc.setFillColor(navyRgb[0], navyRgb[1], navyRgb[2]);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, headerH, 1.8, 1.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, MARGIN_X + 3.5, y + 5.6);

    if (rightBadge) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(186, 230, 253);
      doc.text(rightBadge, PAGE_W - MARGIN_X - 3.5, y + 5.6, { align: 'right' });
    }

    y += headerH + 2.5;
  };

  // Desenha subtítulo de seção garantindo espaço para o subtítulo + primeira linha/card
  const drawSubSectionTitle = (title: string, minFollowingHeight = 16) => {
    const titleH = 5.5;
    ensureSpace(titleH + minFollowingHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(title.toUpperCase(), MARGIN_X + 1, y + 4);
    y += titleH;
  };

  // Renderizador de Tabelas Paginadas (NUNCA corta uma linha no meio e repete o cabeçalho se mudar de página)
  const drawPaginatedTable = (
    columns: TableColumn[],
    rows: string[][],
    options?: {
      rowBgCallback?: (rowIndex: number) => [number, number, number] | null;
      cellStyleCallback?: (
        rowIndex: number,
        colIndex: number
      ) => { textColor?: [number, number, number]; fontStyle?: 'normal' | 'bold' } | null;
      continuationLabel?: string;
    }
  ) => {
    const headerFontSize = 7.5;
    const bodyFontSize = 7.5;
    const lineH = 3.6;
    const cellPadX = 2;
    const cellPadY = 2.2;

    // Calcula altura do cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(headerFontSize);
    let maxHeaderLines = 1;
    const headerWrapped = columns.map(col => {
      const lines = doc.splitTextToSize(col.header, col.width - cellPadX * 2) as string[];
      if (lines.length > maxHeaderLines) maxHeaderLines = lines.length;
      return lines;
    });
    const headerH = maxHeaderLines * lineH + cellPadY * 2;

    // Pré-calcula a primeira linha para nunca deixar o cabeçalho da tabela sozinho no fim da página
    const measureRow = (row: string[]) => {
      let maxLines = 1;
      const wrappedCells = row.map((cellText, colIdx) => {
        const col = columns[colIdx];
        const safeText = String(cellText ?? '-').trim() || '-';
        doc.setFont('helvetica', col.fontStyle || 'normal');
        doc.setFontSize(bodyFontSize);
        const lines = doc.splitTextToSize(safeText, col.width - cellPadX * 2) as string[];
        if (lines.length > maxLines) maxLines = lines.length;
        return lines;
      });
      const rowH = maxLines * lineH + cellPadY * 2;
      return { wrappedCells, rowH };
    };

    const firstRowHeight = rows.length > 0 ? measureRow(rows[0]).rowH : 8;
    ensureSpace(headerH + firstRowHeight);

    const drawHeaderRow = (isContinuation = false) => {
      if (isContinuation && options?.continuationLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`${options.continuationLabel} (Continuação)`, MARGIN_X + 1, y + 3.5);
        y += 5;
      }

      let curX = MARGIN_X;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(MARGIN_X, y, CONTENT_W, headerH, 'FD');

      columns.forEach((col, i) => {
        doc.setDrawColor(203, 213, 225);
        doc.rect(curX, y, col.width, headerH, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(headerFontSize);
        doc.setTextColor(51, 65, 85);

        const lines = headerWrapped[i];
        lines.forEach((line, lIdx) => {
          const textY = y + cellPadY + 2.7 + lIdx * lineH;
          if (col.align === 'center') {
            doc.text(line, curX + col.width / 2, textY, { align: 'center' });
          } else if (col.align === 'right') {
            doc.text(line, curX + col.width - cellPadX, textY, { align: 'right' });
          } else {
            doc.text(line, curX + cellPadX, textY);
          }
        });
        curX += col.width;
      });

      y += headerH;
    };

    drawHeaderRow(false);

    rows.forEach((row, rIdx) => {
      const { wrappedCells, rowH } = measureRow(row);

      // Se a linha inteira não cabe no espaço restante da página, joga a linha inteira para a próxima página
      if (y + rowH > BOTTOM_LIMIT_Y) {
        addNewPage();
        drawHeaderRow(true);
      }

      const customBg = options?.rowBgCallback ? options.rowBgCallback(rIdx) : null;
      const bg: [number, number, number] = customBg || (rIdx % 2 === 1 ? [248, 250, 252] : [255, 255, 255]);

      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(203, 213, 225);
      doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'FD');

      let curX = MARGIN_X;
      columns.forEach((col, cIdx) => {
        doc.setDrawColor(203, 213, 225);
        doc.rect(curX, y, col.width, rowH, 'S');

        const customCell = options?.cellStyleCallback ? options.cellStyleCallback(rIdx, cIdx) : null;
        const fontStyle = customCell?.fontStyle || col.fontStyle || 'normal';
        const textColor = customCell?.textColor || col.textColor || [15, 23, 42];

        doc.setFont('helvetica', fontStyle);
        doc.setFontSize(bodyFontSize);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);

        const lines = wrappedCells[cIdx];
        lines.forEach((line, lIdx) => {
          const textY = y + cellPadY + 2.7 + lIdx * lineH;
          if (col.align === 'center') {
            doc.text(line, curX + col.width / 2, textY, { align: 'center' });
          } else if (col.align === 'right') {
            doc.text(line, curX + col.width - cellPadX, textY, { align: 'right' });
          } else {
            doc.text(line, curX + cellPadX, textY);
          }
        });

        curX += col.width;
      });

      y += rowH;
    });

    y += 3.5;
  };

  // =========================================================================
  // CABEÇALHO PRINCIPAL DO RELATÓRIO 8D
  // =========================================================================
  const topHeaderH = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, y + topHeaderH, PAGE_W - MARGIN_X, y + topHeaderH);
  doc.setLineWidth(0.2);

  let titleStartX = MARGIN_X;
  if (logoImg) {
    const ratio = Math.min(28 / logoImg.width, 13 / logoImg.height);
    const w = logoImg.width * ratio;
    const h = logoImg.height * ratio;
    doc.addImage(logoImg.dataUrl, logoImg.format, MARGIN_X, y + 1.5, w, h);
    titleStartX = MARGIN_X + w + 3.5;
  } else {
    doc.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
    doc.roundedRect(MARGIN_X, y + 2, 28, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(brandName.substring(0, 12), MARGIN_X + 14, y + 8.8, { align: 'center' });
    titleStartX = MARGIN_X + 31.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.text('Relatório Oficial de Resolução de Problemas — Metodologia 8D', titleStartX, y + 6.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(brandSubtitle, titleStartX, y + 12);

  // Badge de Status & ID à direita
  const statusLabel = is8DAprovado ? '8D APROVADO' : is8DEmRevisao ? 'EM REVISÃO' : '8D EM ANDAMENTO';
  const statusBg: [number, number, number] = is8DAprovado
    ? [209, 250, 229]
    : is8DEmRevisao
    ? [254, 243, 199]
    : [219, 234, 254];
  const statusText: [number, number, number] = is8DAprovado
    ? [6, 95, 70]
    : is8DEmRevisao
    ? [146, 64, 14]
    : [30, 64, 175];

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  doc.roundedRect(PAGE_W - MARGIN_X - 31, y + 1.5, 31, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.text(statusLabel, PAGE_W - MARGIN_X - 15.5, y + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.text(formalDisplayId, PAGE_W - MARGIN_X - 33, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Código 8D: ${id8d}  •  Abertura: ${formatDateBR(rnc.dataOcorrencia)}`,
    PAGE_W - MARGIN_X,
    y + 13,
    { align: 'right' }
  );

  y += topHeaderH + 4;

  // =========================================================================
  // 1º D — DESCRIÇÃO COMPLETA DA OCORRÊNCIA
  // =========================================================================
  drawDisciplineHeader(
    '1º D — DESCRIÇÃO COMPLETA DA OCORRÊNCIA (CLIENTE, PROCESSO, 5W2H E EVIDÊNCIAS)',
    `Tipo: ${rnc.tipoRnc || 'Formal'} • Status: ${rnc.status}`,
    40
  );

  // Bloco 1.1: Grid 4x3 de Identificação (atômico)
  const infoFields = [
    [
      { label: 'Cliente:', value: normalizeDisplayText(rnc.cliente || '-') },
      { label: 'Setor Responsável:', value: normalizeDisplayText(rnc.classificacaoSetor || '-') },
      {
        label: 'Data Abertura & Turno:',
        value: `${formatDateBR(rnc.dataOcorrencia)} • ${normalizeDisplayText(rnc.turno || '1º Turno')}`
      },
      { label: 'Data Final Contenção:', value: formatDateBR(rnc.dataContencao || rnc.dataOcorrencia) }
    ],
    [
      { label: 'Veículo / Produto:', value: normalizeDisplayText(rnc.produto || '-') },
      {
        label: `Cód. Peça (${normalizeDisplayText(rnc.finalComponente || 'Peça Final')}):`,
        value: codigoPeca9 || '-'
      },
      { label: 'Componente:', value: normalizeDisplayText(rnc.componente || '-') },
      {
        label: 'Posto / Linha:',
        value: `${normalizeDisplayText(rnc.posto || 'Geral')}${rnc.fmds ? ` • ${normalizeDisplayText(rnc.fmds)}` : ''}`
      }
    ],
    [
      {
        label: 'Qtd. Afetada & Falha:',
        value: `${rnc.quantidadeAfetada || 1} pç(s) — ${normalizeDisplayText(rnc.modoFalha || rnc.descricaoProblema || '-')}`
      },
      { label: 'Local de Detecção:', value: normalizeDisplayText(rnc.setorDeteccao || '-') },
      { label: 'Impacto no Cliente:', value: normalizeDisplayText(rnc.impactoCliente || '-') },
      {
        label: 'Segurança / Reincidente:',
        value: `Seg.: ${rnc.caracteristicaSeguranca || 'Não'} | Reinc.: ${rnc.reincidente || 'NÃO'}`
      }
    ]
  ];

  const colW4 = CONTENT_W / 4;
  const gridRowH = 11;
  const totalGridH = infoFields.length * gridRowH + 2;
  ensureSpace(totalGridH);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, totalGridH, 2, 2, 'FD');

  infoFields.forEach((rowItems, rIdx) => {
    const rowY = y + 2 + rIdx * gridRowH;
    rowItems.forEach((cell, cIdx) => {
      const cellX = MARGIN_X + 3 + cIdx * colW4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(cell.label, cellX, rowY + 3);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      const valLines = doc.splitTextToSize(String(cell.value || '-'), colW4 - 5) as string[];
      doc.text(valLines.slice(0, 2), cellX, rowY + 6.8);
    });
  });

  y += totalGridH + 3;

  // Bloco 1.2: Detalhamento da Ocorrência (atômico)
  const relatoText = normalizeDisplayText(
    rnc.detalhamentoOcorrencia || rnc.descricaoCompleta || rnc.descricaoProblema || 'Não informado.'
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const relatoLines = doc.splitTextToSize(relatoText, CONTENT_W - 6) as string[];
  const relatoBoxH = Math.max(14, 7 + relatoLines.length * 3.8);
  ensureSpace(relatoBoxH);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, relatoBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DETALHAMENTO DA OCORRÊNCIA (RELATO COMPLETO DO PROBLEMA):', MARGIN_X + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(relatoLines, MARGIN_X + 3, y + 8.8);

  y += relatoBoxH + 3;

  // Bloco 1.3: Diretrizes 5W2H (atômico)
  const w2hRows = [
    [
      { label: '5W2H — O Que Fazer?', value: normalizeDisplayText(rnc.oQueFazer || '-') },
      { label: '5W2H — Como Fazer?', value: normalizeDisplayText(rnc.comoFazer || '-') },
      { label: '5W2H — Por Que Fazer?', value: normalizeDisplayText(rnc.porQueFazer || '-') }
    ],
    [
      {
        label: '5W2H — Quando / Onde / Quem:',
        value: `${normalizeDisplayText(rnc.quandoFara || formatDateBR(rnc.dataOcorrencia))} • ${normalizeDisplayText(
          rnc.ondeFara || 'Quarentena'
        )} • ${normalizeDisplayText(rnc.quemFara || rnc.detector || '-')}`
      },
      {
        label: 'Detecção Interna & Gravidade:',
        value: `Possível: ${normalizeDisplayText(rnc.possivelDetectar || 'Sim')} (${normalizeDisplayText(
          rnc.tipoDeteccao || 'Visual'
        )}) • Grav.: ${normalizeDisplayText(rnc.gravidade || '-')}`
      },
      {
        label: 'Doc. / Cód. Rastreabilidade:',
        value: `${normalizeDisplayText(rnc.documentoRastreabilidade || 'Etiqueta SAP')}: ${
          rnc.codigoRastreabilidade || '-'
        }`
      }
    ]
  ];

  const colW3 = CONTENT_W / 3;
  const w2hBoxH = 23;
  ensureSpace(w2hBoxH);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, w2hBoxH, 2, 2, 'FD');

  w2hRows.forEach((rItems, rIdx) => {
    const rY = y + 2 + rIdx * 10.5;
    rItems.forEach((cell, cIdx) => {
      const cX = MARGIN_X + 3 + cIdx * colW3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(cell.label, cX, rY + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(String(cell.value || '-'), colW3 - 5) as string[];
      doc.text(lines.slice(0, 2), cX, rY + 6.6);
    });
  });

  y += w2hBoxH + 3;

  // Bloco 1.4: Fotos OK vs NG (atômico — nunca quebra ao meio)
  const photoBoxH = 52;
  ensureSpace(photoBoxH);

  const halfW = (CONTENT_W - 4) / 2;

  // Card Foto OK
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN_X, y, halfW, photoBoxH, 2, 2, 'FD');
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(MARGIN_X, y, halfW, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('Foto da Peça OK (Padrão Conforme)', MARGIN_X + halfW / 2, y + 4.5, { align: 'center' });

  if (okImg) {
    const availW = halfW - 6;
    const availH = photoBoxH - 10;
    const ratio = Math.min(availW / okImg.width, availH / okImg.height);
    const drawW = okImg.width * ratio;
    const drawH = okImg.height * ratio;
    const imgX = MARGIN_X + (halfW - drawW) / 2;
    const imgY = y + 7.5 + (availH - drawH) / 2;
    doc.addImage(okImg.dataUrl, okImg.format, imgX, imgY, drawW, drawH);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text('Padrão Aprovado (OK)', MARGIN_X + halfW / 2, y + 26, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      rnc.fotoPecaOk ? 'Evidência vinculada no repositório corporativo' : 'Sem foto padrão cadastrada',
      MARGIN_X + halfW / 2,
      y + 31,
      { align: 'center' }
    );
  }

  // Card Foto NG
  const ngX = MARGIN_X + halfW + 4;
  doc.setDrawColor(244, 63, 94);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(ngX, y, halfW, photoBoxH, 2, 2, 'FD');
  doc.setFillColor(225, 29, 72);
  doc.roundedRect(ngX, y, halfW, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('Foto da Peça NG (Evidência Não Conforme)', ngX + halfW / 2, y + 4.5, { align: 'center' });

  if (ngImg) {
    const availW = halfW - 6;
    const availH = photoBoxH - 10;
    const ratio = Math.min(availW / ngImg.width, availH / ngImg.height);
    const drawW = ngImg.width * ratio;
    const drawH = ngImg.height * ratio;
    const imgX = ngX + (halfW - drawW) / 2;
    const imgY = y + 7.5 + (availH - drawH) / 2;
    doc.addImage(ngImg.dataUrl, ngImg.format, imgX, imgY, drawW, drawH);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(225, 29, 72);
    doc.text('Evidência Não Conforme (NG)', ngX + halfW / 2, y + 26, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      rnc.fotoPecaNg ? 'Evidência vinculada no repositório corporativo' : 'Sem foto do defeito cadastrada',
      ngX + halfW / 2,
      y + 31,
      { align: 'center' }
    );
  }

  y += photoBoxH + 5;

  // =========================================================================
  // 2º D — EQUIPE MULTIDISCIPLINAR
  // =========================================================================
  const participantes8DList = (meta?.participantes_8d || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const participantesAtendimentoList = (rnc.participantesAtendimento || rnc.detector || '')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  const eqText =
    participantes8DList.length > 0
      ? participantes8DList.join('  •  ')
      : 'Nenhum integrante formalmente vinculado no 2D.';
  const eqAtendText =
    participantesAtendimentoList.length > 0
      ? `Participantes do Atendimento Inicial (1D): ${participantesAtendimentoList
          .map(p => normalizeDisplayText(p))
          .join(' • ')}`
      : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const eqLines = doc.splitTextToSize(eqText, CONTENT_W - 8) as string[];
  const eqAtendLines = eqAtendText ? (doc.splitTextToSize(eqAtendText, CONTENT_W - 8) as string[]) : [];
  const box2DH = 10 + eqLines.length * 4 + (eqAtendLines.length > 0 ? 4 + eqAtendLines.length * 3.8 : 0);

  drawDisciplineHeader(
    '2º D — EQUIPE MULTIDISCIPLINAR DE INVESTIGAÇÃO 8D',
    `${participantes8DList.length} integrante(s) no 8D`,
    box2DH
  );

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, box2DH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('INTEGRANTES DO GRUPO DE INVESTIGAÇÃO 8D:', MARGIN_X + 3.5, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.text(eqLines, MARGIN_X + 3.5, y + 9.2);

  if (eqAtendLines.length > 0) {
    const subY = y + 9.2 + eqLines.length * 4 + 1.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(71, 85, 105);
    doc.text(eqAtendLines, MARGIN_X + 3.5, subY);
  }

  y += box2DH + 5;

  // =========================================================================
  // 3º D — AÇÕES DE CONTENÇÃO IMEDIATA & TRIAGEM DE LOTES
  // =========================================================================
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

  drawDisciplineHeader(
    '3º D — AÇÕES DE CONTENÇÃO IMEDIATA & TRIAGEM DE LOTES DE ESTOQUE',
    `${lotesSAP.length} lote(s) • ${acoes3D.length} ação(ões) de contenção`,
    22
  );

  // Cards de Resumo da Triagem (atômico)
  const kpiH = 14;
  ensureSpace(kpiH + 4);
  const kpiW = (CONTENT_W - 6) / 3;

  // KPI 1: Total Verificado
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, kpiW, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Total de Peças Verificadas', MARGIN_X + kpiW / 2, y + 4.8, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(String(totalVerificadoLotes), MARGIN_X + kpiW / 2, y + 11, { align: 'center' });

  // KPI 2: Total OK
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(MARGIN_X + kpiW + 3, y, kpiW, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text('Qtd. Peças OK (Liberadas)', MARGIN_X + kpiW + 3 + kpiW / 2, y + 4.8, { align: 'center' });
  doc.setFontSize(11);
  doc.text(String(totalOkLotes), MARGIN_X + kpiW + 3 + kpiW / 2, y + 11, { align: 'center' });

  // KPI 3: Total NG
  doc.setFillColor(255, 241, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(MARGIN_X + (kpiW + 3) * 2, y, kpiW, kpiH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(159, 18, 57);
  doc.text('Qtd. Peças NG (Bloqueadas)', MARGIN_X + (kpiW + 3) * 2 + kpiW / 2, y + 4.8, { align: 'center' });
  doc.setFontSize(11);
  doc.text(String(totalNgLotes), MARGIN_X + (kpiW + 3) * 2 + kpiW / 2, y + 11, { align: 'center' });

  y += kpiH + 3.5;

  // 3D.1 — Tabela de Lotes
  drawSubSectionTitle('3D.1 — Registro de Rastreabilidade e Triagem de Lotes nos Estoques:', 15);
  if (lotesSAP.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum lote registrado no 3D.', MARGIN_X + 2, y + 3.5);
    y += 7;
  } else {
    const loteCols: TableColumn[] = [
      { header: 'Data', width: 20, align: 'center' },
      { header: 'Responsável', width: 34 },
      { header: 'Peça', width: 24 },
      { header: 'Lote', width: 24, fontStyle: 'bold' },
      { header: 'Estoque / Local', width: 34 },
      { header: 'Verif.', width: 18, align: 'right', fontStyle: 'bold' },
      { header: 'OK', width: 18, align: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
      { header: 'NG', width: 18, align: 'right', fontStyle: 'bold', textColor: [190, 18, 60] }
    ];
    const loteRows = lotesSAP.map(l => {
      const tot = Number(l.qtdVerificada ?? l.qtd ?? 0);
      const ng = Number(l.qtdNg ?? 0);
      const ok = l.qtdOk !== undefined ? Number(l.qtdOk) : Math.max(0, tot - ng);
      return [
        formatDateBR(l.data),
        l.responsavel || '-',
        l.produto || '-',
        l.lote || '-',
        l.estoque || 'Estoque Geral',
        String(tot),
        String(ok),
        String(ng)
      ];
    });
    drawPaginatedTable(loteCols, loteRows, { continuationLabel: '3D.1 — Triagem de Lotes' });
  }

  // 3D.2 — Tabela de Ações de Contenção
  drawSubSectionTitle('3D.2 — Ações de Contenção Vinculadas ao Plano:', 15);
  if (acoes3D.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma ação de contenção cadastrada no 3D.', MARGIN_X + 2, y + 3.5);
    y += 7;
  } else {
    const cols3D: TableColumn[] = [
      { header: 'Contramedida de Contenção', width: 64, fontStyle: 'bold' },
      { header: 'Responsável', width: 32 },
      { header: 'Prazo / Conclusão', width: 32, align: 'center' },
      { header: 'Evidência', width: 42 },
      { header: 'Status', width: 20, align: 'center', fontStyle: 'bold' }
    ];
    const rows3D = acoes3D.map(a => [
      a.contra_medida || '-',
      a.responsavel_acao || '-',
      `${formatDateBR(a.data_planejada)}${a.data_conclusao ? `\nConcl.: ${formatDateBR(a.data_conclusao)}` : ''}`,
      a.comentarios_evidencia || '-',
      a.status || 'Em andamento'
    ]);
    drawPaginatedTable(cols3D, rows3D, { continuationLabel: '3D.2 — Ações de Contenção' });
  }

  y += 2;

  // =========================================================================
  // 4º D — INVESTIGAÇÃO DE CAUSA RAIZ (GEMBA, HENKATEN, ISHIKAWA E 5 PORQUÊS)
  // =========================================================================
  drawDisciplineHeader(
    '4º D — INVESTIGAÇÃO DE CAUSA RAIZ (GEMBA, HENKATEN, ISHIKAWA 6M E 5 PORQUÊS)',
    `${causes.length} hipótese(s) • ${ngCauses.length} causa(s) NG confirmada(s)`,
    28
  );

  // 4D.1 — Gemba (2x2 cards, cada par de linhas medido atomicamente)
  drawSubSectionTitle('4D.1 — Investigação Gemba (Verificação In Loco no Chão de Fábrica):', 20);
  const gembaPairs = [
    [
      { title: '1. Avaliação Gemba (Chão de Fábrica):', text: entrevista?.gemba || 'Não registrado.' },
      { title: '2. Entrevistas com Operadores / Liderança:', text: entrevista?.entrevista || 'Não registrado.' }
    ],
    [
      { title: '3. Simulação / Reprodução do Defeito:', text: entrevista?.simulacao || 'Não registrado.' },
      { title: '4. Rastreabilidade no Posto (Gemba):', text: entrevista?.rastreabilidade || 'Não registrado.' }
    ]
  ];

  gembaPairs.forEach(pair => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const leftLines = doc.splitTextToSize(pair[0].text, halfW - 6) as string[];
    const rightLines = doc.splitTextToSize(pair[1].text, halfW - 6) as string[];
    const maxL = Math.max(leftLines.length, rightLines.length, 1);
    const pairH = Math.max(13, 7.5 + maxL * 3.6);

    ensureSpace(pairH + 2);

    pair.forEach((card, idx) => {
      const cX = idx === 0 ? MARGIN_X : MARGIN_X + halfW + 4;
      const lines = idx === 0 ? leftLines : rightLines;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(cX, y, halfW, pairH, 1.8, 1.8, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(card.title, cX + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(lines, cX + 3, y + 8.5);
    });

    y += pairH + 2.5;
  });

  y += 1.5;

  // 4D.2 — Henkaten (6M em 2 linhas de 3 colunas, cada linha atômica)
  drawSubSectionTitle('4D.2 — Mapeamento Henkaten (Pontos de Mudança nos 6M):', 18);
  const henkatenRows = [
    [
      { label: 'Máquina', flag: henkaten?.maqhkt || 'Não', obs: henkaten?.maq_comentarios },
      { label: 'Mão de Obra', flag: henkaten?.mohkt || 'Não', obs: henkaten?.mo_comentarios },
      { label: 'Método', flag: henkaten?.methkt || 'Não', obs: henkaten?.met_comentarios }
    ],
    [
      { label: 'Material', flag: henkaten?.mathkt || 'Não', obs: henkaten?.mat_comentarios },
      { label: 'Medição', flag: henkaten?.medhkt || 'Não', obs: henkaten?.med_comentarios },
      { label: 'Meio Ambiente', flag: henkaten?.mambhkt || 'Não', obs: henkaten?.mamb_comentarios }
    ]
  ];

  const hktCardW = (CONTENT_W - 6) / 3;
  henkatenRows.forEach(rowGroup => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const wrappedGroup = rowGroup.map(
      item => doc.splitTextToSize(item.obs || 'Sem alterações registradas.', hktCardW - 5) as string[]
    );
    const maxL = Math.max(...wrappedGroup.map(l => l.length), 1);
    const cardH = Math.max(13, 7.5 + maxL * 3.5);

    ensureSpace(cardH + 2);

    rowGroup.forEach((item, idx) => {
      const cX = MARGIN_X + idx * (hktCardW + 3);
      const isSim = item.flag === 'Sim';
      doc.setFillColor(isSim ? 255 : 248, isSim ? 241 : 250, isSim ? 242 : 252);
      doc.setDrawColor(isSim ? 253 : 203, isSim ? 164 : 213, isSim ? 175 : 225);
      doc.roundedRect(cX, y, hktCardW, cardH, 1.8, 1.8, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(item.label, cX + 2.5, y + 4.6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(isSim ? 190 : 71, isSim ? 18 : 85, isSim ? 60 : 105);
      doc.text(`Mudança: ${item.flag}`, cX + hktCardW - 2.5, y + 4.6, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);
      doc.text(wrappedGroup[idx], cX + 2.5, y + 8.5);
    });

    y += cardH + 2.5;
  });

  y += 1.5;

  // 4D.3 — Tabela de Hipóteses de Ishikawa
  drawSubSectionTitle('4D.3 — Diagrama de Ishikawa (Hipóteses Levantadas nos 6M):', 16);
  if (causes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma hipótese cadastrada no Ishikawa.', MARGIN_X + 2, y + 3.5);
    y += 7;
  } else {
    const ishCols: TableColumn[] = [
      { header: 'Fator 6M', width: 32, fontStyle: 'bold' },
      { header: 'Eixo', width: 28 },
      { header: 'Descrição da Hipótese Levantada', width: 92 },
      { header: 'Classificação', width: 38, align: 'center', fontStyle: 'bold' }
    ];
    const ishRows = causes.map(c => [
      c.seisms || '-',
      c.ocnd || '-',
      c.descricao_causa || '-',
      c.okng === 'NG' ? 'NG (Causa Provável)' : 'OK (Descartada)'
    ]);
    drawPaginatedTable(ishCols, ishRows, {
      continuationLabel: '4D.3 — Hipóteses de Ishikawa (6M)',
      rowBgCallback: rIdx => (causes[rIdx]?.okng === 'NG' ? [255, 241, 242] : null),
      cellStyleCallback: (rIdx, cIdx) => {
        if (cIdx === 3) {
          const isNg = causes[rIdx]?.okng === 'NG';
          return {
            fontStyle: 'bold',
            textColor: isNg ? [159, 18, 57] : [6, 95, 70]
          };
        }
        return null;
      }
    });
  }

  // 4D.4 — Cards dos 5 Porquês (cada hipótese NG é um card atômico completo)
  drawSubSectionTitle('4D.4 — Investigação dos 5 Porquês e Causas-Raiz Confirmadas:', 22);
  if (ngCauses.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma hipótese NG para investigação dos 5 Porquês.', MARGIN_X + 2, y + 3.5);
    y += 7;
  } else {
    const pqW = (CONTENT_W - 6 - 8) / 5; // 5 colunas dentro do card
    ngCauses.forEach((c, idx) => {
      const pqs = [c.umpq || '-', c.doispq || '-', c.trespq || '-', c.quatropq || '-', c.cincopq || '-'];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const wrappedPqs = pqs.map(txt => doc.splitTextToSize(txt, pqW - 3) as string[]);
      const maxPqLines = Math.max(...wrappedPqs.map(l => l.length), 1);
      const pqBoxH = Math.max(13, 6.5 + maxPqLines * 3.4);
      const cardTotalH = 9.5 + pqBoxH + 3;

      // Garante que o Card inteiro dos 5 Porquês caiba na página sem quebrar ao meio
      ensureSpace(cardTotalH);

      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(252, 211, 77);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, cardTotalH, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(15, 23, 42);
      const titleStr = `Hipótese NG #${idx + 1} [${c.seisms} • ${c.ocnd}]: ${c.descricao_causa}`;
      const titleTrunc = (doc.splitTextToSize(titleStr, CONTENT_W - 42) as string[])[0] || titleStr;
      doc.text(titleTrunc, MARGIN_X + 3, y + 5.5);

      doc.setFillColor(254, 226, 226);
      doc.roundedRect(PAGE_W - MARGIN_X - 35, y + 1.8, 32, 5, 1, 1, 'F');
      doc.setFontSize(6.5);
      doc.setTextColor(159, 18, 57);
      doc.text('CAUSA CONFIRMADA', PAGE_W - MARGIN_X - 19, y + 5.1, { align: 'center' });

      const pqStartY = y + 8.5;
      const labels = ['1º Porquê:', '2º Porquê:', '3º Porquê:', '4º Porquê:', '5º Porquê (Causa Raiz):'];
      wrappedPqs.forEach((lines, pIdx) => {
        const pX = MARGIN_X + 3 + pIdx * (pqW + 2);
        const isFifth = pIdx === 4;
        doc.setFillColor(isFifth ? 254 : 255, isFifth ? 243 : 255, isFifth ? 199 : 255);
        doc.setDrawColor(isFifth ? 245 : 226, isFifth ? 158 : 232, isFifth ? 11 : 240);
        doc.roundedRect(pX, pqStartY, pqW, pqBoxH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(isFifth ? 120 : 100, isFifth ? 53 : 116, isFifth ? 15 : 139);
        doc.text(labels[pIdx], pX + 1.8, pqStartY + 3.8);

        doc.setFont('helvetica', isFifth ? 'bold' : 'normal');
        doc.setFontSize(7);
        doc.setTextColor(isFifth ? 120 : 15, isFifth ? 53 : 23, isFifth ? 15 : 42);
        doc.text(lines, pX + 1.8, pqStartY + 7.5);
      });

      y += cardTotalH + 3;
    });
  }

  y += 2;

  // =========================================================================
  // 5º D — AÇÕES CORRETIVAS PERMANENTES
  // =========================================================================
  drawDisciplineHeader(
    '5º D — AÇÕES CORRETIVAS PERMANENTES (ATUAÇÃO NAS CAUSAS-RAIZ DO 4º D)',
    `${acoes5D.length} ação(ões) corretiva(s)`,
    20
  );

  if (acoes5D.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma ação corretiva registrada no 5D.', MARGIN_X + 2, y + 4);
    y += 8;
  } else {
    const cols5D: TableColumn[] = [
      { header: 'Causa Raiz Tratada (4D)', width: 42 },
      { header: 'Contramedida Corretiva (5D)', width: 50, fontStyle: 'bold' },
      { header: 'Responsável', width: 26 },
      { header: 'Prazo / Conclusão', width: 25, align: 'center' },
      { header: 'Evidência & Validação', width: 29 },
      { header: 'Status', width: 18, align: 'center', fontStyle: 'bold' }
    ];
    const rows5D = acoes5D.map(a => [
      a.causa || '-',
      a.contra_medida || '-',
      a.responsavel_acao || '-',
      `Plan: ${formatDateBR(a.data_planejada)}${a.data_conclusao ? `\nReal: ${formatDateBR(a.data_conclusao)}` : ''}`,
      `${a.comentarios_evidencia || '-'}${
        a.comentarios_validacao ? `\nParecer: ${a.comentarios_validacao}` : ''
      }`,
      a.status || 'Em andamento'
    ]);
    drawPaginatedTable(cols5D, rows5D, { continuationLabel: '5º D — Ações Corretivas Permanentes' });
  }

  // =========================================================================
  // 6º D — AVALIAÇÃO DE ABRANGÊNCIA (YOKOTEN) E POKA-YOKE
  // =========================================================================
  const hasYokotenAction = acoes6D.some(a => a.yokoten === 'SIM');
  const hasPokaYokeAction = acoes6D.some(a => a.poka_yoke === 'SIM');

  drawDisciplineHeader(
    '6º D — AVALIAÇÃO DE ABRANGÊNCIA (YOKOTEN) E DISPOSITIVOS À PROVA DE ERRO (POKA-YOKE)',
    `${acoes6D.length} ação(ões) no 6D`,
    22
  );

  // Matriz explícita do 6D (atômica)
  const mat6DH = 14;
  ensureSpace(mat6DH + 3);

  const yokoStatus = hasYokotenAction
    ? 'APLICÁVEL (IMPLEMENTADO)'
    : meta?.yokoten_na
    ? 'AVALIADO: NÃO APLICÁVEL (N/A)'
    : 'EM AVALIAÇÃO';
  const pokaStatus = hasPokaYokeAction
    ? 'APLICÁVEL (IMPLEMENTADO)'
    : meta?.pokayoke_na
    ? 'AVALIADO: NÃO APLICÁVEL (N/A)'
    : 'EM AVALIAÇÃO';

  [
    {
      title: 'AVALIAÇÃO 6D.1 — ABRANGÊNCIA (YOKOTEN):',
      sub: 'Expansão da contramedida para linhas/produtos similares',
      status: yokoStatus,
      active: hasYokotenAction
    },
    {
      title: 'AVALIAÇÃO 6D.2 — DISPOSITIVO POKA-YOKE:',
      sub: 'Bloqueio físico/lógico contra geração ou passagem de falha',
      status: pokaStatus,
      active: hasPokaYokeAction
    }
  ].forEach((box, idx) => {
    const bX = idx === 0 ? MARGIN_X : MARGIN_X + halfW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(bX, y, halfW, mat6DH, 1.8, 1.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(51, 65, 85);
    doc.text(box.title, bX + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(box.sub, bX + 3, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(box.active ? 6 : 71, box.active ? 95 : 85, box.active ? 70 : 105);
    doc.text(box.status, bX + halfW - 3, y + 5, { align: 'right' });
  });

  y += mat6DH + 3.5;

  if (acoes6D.length > 0) {
    const cols6D: TableColumn[] = [
      { header: 'Escopo 6D', width: 28, fontStyle: 'bold' },
      { header: 'Ação de Abrangência / Poka-Yoke', width: 58, fontStyle: 'bold' },
      { header: 'Responsável', width: 28 },
      { header: 'Prazo / Conclusão', width: 26, align: 'center' },
      { header: 'Evidência', width: 32 },
      { header: 'Status', width: 18, align: 'center', fontStyle: 'bold' }
    ];
    const rows6D = acoes6D.map(a => [
      `${a.yokoten === 'SIM' ? 'Yokoten ' : ''}${a.poka_yoke === 'SIM' ? 'Poka-Yoke' : ''}`.trim() || '6D',
      a.contra_medida || '-',
      a.responsavel_acao || '-',
      `${formatDateBR(a.data_planejada)}${a.data_conclusao ? `\n(${formatDateBR(a.data_conclusao)})` : ''}`,
      a.comentarios_evidencia || '-',
      a.status || 'Em andamento'
    ]);
    drawPaginatedTable(cols6D, rows6D, { continuationLabel: '6º D — Ações de Yokoten / Poka-Yoke' });
  }

  // =========================================================================
  // 7º D — PREVENÇÃO SISTÊMICA E ATUALIZAÇÃO DOCUMENTAL (FMEA, PADRÃO E LPA)
  // =========================================================================
  const acoes7DFmea = acoes7D.filter(a => (a.oData_8d_7d || 'FMEA') === 'FMEA');
  const acoes7DPadrao = acoes7D.filter(a => a.oData_8d_7d === 'Trabalho Padronizado');
  const acoes7DLpa = acoes7D.filter(a => a.oData_8d_7d === 'Auditoria Escalonada');

  drawDisciplineHeader(
    '7º D — PREVENÇÃO SISTÊMICA E ATUALIZAÇÃO DOCUMENTAL (FMEA, PADRÃO E LPA)',
    `${acoes7D.length} ação(ões) preventiva(s)`,
    22
  );

  const eixos7D = [
    { title: '1. FMEA (PFMEA / Controle)', list: acoes7DFmea },
    { title: '2. Trabalho Padronizado', list: acoes7DPadrao },
    { title: '3. Auditoria Escalonada (LPA)', list: acoes7DLpa }
  ];

  const eixoW = (CONTENT_W - 6) / 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const eixosWrapped = eixos7D.map(e =>
    e.list.length > 0
      ? (doc.splitTextToSize(e.list.map(x => x.contra_medida).join('; '), eixoW - 5) as string[])
      : ['Sem alteração necessária neste eixo.']
  );
  const maxEixoL = Math.max(...eixosWrapped.map(l => l.length), 1);
  const eixoBoxH = Math.max(13, 7.5 + maxEixoL * 3.5);

  ensureSpace(eixoBoxH + 3);

  eixos7D.forEach((eixo, idx) => {
    const eX = MARGIN_X + idx * (eixoW + 3);
    const hasUpd = eixo.list.length > 0;
    doc.setFillColor(hasUpd ? 239 : 248, hasUpd ? 246 : 250, hasUpd ? 255 : 252);
    doc.setDrawColor(hasUpd ? 147 : 203, hasUpd ? 197 : 213, hasUpd ? 253 : 225);
    doc.roundedRect(eX, y, eixoW, eixoBoxH, 1.8, 1.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(eixo.title, eX + 2.5, y + 4.6);

    doc.setFontSize(6.5);
    doc.setTextColor(
      hasUpd ? brandRgb[0] : 100,
      hasUpd ? brandRgb[1] : 116,
      hasUpd ? brandRgb[2] : 139
    );
    doc.text(hasUpd ? `${eixo.list.length} Atualiz.` : 'Sem Alteração', eX + eixoW - 2.5, y + 4.6, {
      align: 'right'
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(eixosWrapped[idx], eX + 2.5, y + 8.5);
  });

  y += eixoBoxH + 3.5;

  if (acoes7D.length > 0) {
    const cols7D: TableColumn[] = [
      { header: 'Eixo 7D Atualizado', width: 34, fontStyle: 'bold', textColor: brandRgb },
      { header: 'Ação Preventiva / Documento Revisado', width: 54, fontStyle: 'bold' },
      { header: 'Responsável', width: 28 },
      { header: 'Prazo / Conclusão', width: 26, align: 'center' },
      { header: 'Evidência', width: 30 },
      { header: 'Status', width: 18, align: 'center', fontStyle: 'bold' }
    ];
    const rows7D = acoes7D.map(a => [
      a.oData_8d_7d || 'FMEA',
      a.contra_medida || '-',
      a.responsavel_acao || '-',
      `${formatDateBR(a.data_planejada)}${a.data_conclusao ? `\n(${formatDateBR(a.data_conclusao)})` : ''}`,
      a.comentarios_evidencia || '-',
      a.status || 'Em andamento'
    ]);
    drawPaginatedTable(cols7D, rows7D, { continuationLabel: '7º D — Ações Preventivas e Documentais' });
  }

  // =========================================================================
  // 8º D — VALIDAÇÃO FINAL DAS AÇÕES E PARECER DE FECHAMENTO DO 8D (BLOCO ATÔMICO)
  // =========================================================================
  const revEtapasList = (['4D', '5D', '6D', '7D'] as const)
    .map(et => ({
      et,
      com:
        et === '4D'
          ? meta?.comentarios_revisao_4d
          : et === '5D'
          ? meta?.comentarios_revisao_5d
          : et === '6D'
          ? meta?.comentarios_revisao_6d
          : meta?.comentarios_revisao_7d
    }))
    .filter(item => Boolean(item.com && item.com.trim()));

  const hasRevisoesCiclo = Boolean(
    (meta?.motivo_revisao_8d && meta.motivo_revisao_8d.trim()) || revEtapasList.length > 0
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  const motivoRevLines =
    meta?.motivo_revisao_8d && meta.motivo_revisao_8d.trim()
      ? (doc.splitTextToSize(`Solicitação de Revisão: ${meta.motivo_revisao_8d.trim()}`, CONTENT_W - 8) as string[])
      : [];

  const revColW = (CONTENT_W - 7 - 6) / 4;
  doc.setFontSize(6.8);
  const revEtapasWrapped = revEtapasList.map(item => ({
    et: item.et,
    lines: doc.splitTextToSize(`${item.et} Revisado: ${item.com}`, revColW - 4) as string[]
  }));
  const maxRevCardLines = revEtapasWrapped.length > 0 ? Math.max(...revEtapasWrapped.map(r => r.lines.length), 1) : 0;
  const revSubCardsH = revEtapasWrapped.length > 0 ? Math.max(9.5, 4 + maxRevCardLines * 3.3) : 0;
  const revisoesBoxH = hasRevisoesCiclo
    ? 8 + (motivoRevLines.length > 0 ? motivoRevLines.length * 3.5 + 2 : 0) + (revSubCardsH > 0 ? revSubCardsH + 2.5 : 0)
    : 0;

  const parecerTexto =
    meta?.comentarios_validacao ||
    (is8DAprovado
      ? 'Todas as contramedidas do Plano de Ação (3D, 5D, 6D e 7D) foram validadas com evidências objetivas e demonstraram eficácia.'
      : 'Aguardando conclusão e validação final de todas as ações do plano.');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const parecerLines = doc.splitTextToSize(parecerTexto, CONTENT_W - 8) as string[];
  const hasFooterDateLine = Boolean(
    meta?.data_aprovacao || meta?.data_hora_aprovacao || is8DAprovado || (is8DEmRevisao && meta?.data_solicitacao_revisao)
  );
  const parecerBoxH = Math.max(16, 8.5 + parecerLines.length * 3.8 + (hasFooterDateLine ? 7.5 : 1.5));

  const signaturesBlockH = 38;
  const total8DHeight =
    (revisoesBoxH > 0 ? revisoesBoxH + 3 : 0) + parecerBoxH + 4 + signaturesBlockH;

  drawDisciplineHeader(
    '8º D — VALIDAÇÃO FINAL DAS AÇÕES E PARECER DE FECHAMENTO DO 8D',
    `${allActions.filter(a => a.status === 'Validado').length}/${allActions.length} Ações Validadas`,
    Math.min(total8DHeight, 95)
  );

  // 8D.1: Card de Registro de Revisões Técnicas Realizadas no Ciclo (4D a 7D)
  if (hasRevisoesCiclo) {
    ensureSpace(revisoesBoxH + 3);
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(MARGIN_X, y, CONTENT_W, revisoesBoxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(12, 74, 110);
    doc.text('REGISTRO DE REVISÕES TÉCNICAS REALIZADAS NO CICLO (4D A 7D):', MARGIN_X + 3.5, y + 4.8);

    let revInnerY = y + 8.5;
    if (motivoRevLines.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      doc.text(motivoRevLines, MARGIN_X + 3.5, revInnerY);
      revInnerY += motivoRevLines.length * 3.5 + 1.5;
    }

    if (revEtapasWrapped.length > 0) {
      revEtapasWrapped.forEach((item, idx) => {
        const rX = MARGIN_X + 3.5 + idx * (revColW + 2);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(186, 230, 253);
        doc.roundedRect(rX, revInnerY - 2, revColW, revSubCardsH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(12, 74, 110);
        doc.text(item.lines, rX + 2, revInnerY + 1.8);
      });
    }

    y += revisoesBoxH + 3;
  }

  // 8D.2: Parecer Final de Validação do Relatório 8D (com Data e Responsável na linha abaixo da mensagem)
  ensureSpace(parecerBoxH + 4);

  const pBg: [number, number, number] = is8DAprovado
    ? [236, 253, 245]
    : is8DEmRevisao
    ? [255, 251, 235]
    : [248, 250, 252];
  const pBorder: [number, number, number] = is8DAprovado
    ? [110, 231, 183]
    : is8DEmRevisao
    ? [252, 211, 77]
    : [203, 213, 225];

  doc.setFillColor(pBg[0], pBg[1], pBg[2]);
  doc.setDrawColor(pBorder[0], pBorder[1], pBorder[2]);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, parecerBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 23, 42);
  const parecerStatusLabel = is8DAprovado
    ? 'APROVADO INTEGRALMENTE'
    : is8DEmRevisao
    ? 'REVISÃO SOLICITADA'
    : 'EM VALIDAÇÃO';
  doc.text(`PARECER FINAL DE VALIDAÇÃO DO RELATÓRIO 8D: ${parecerStatusLabel}`, MARGIN_X + 3.5, y + 5.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(30, 41, 59);
  doc.text(parecerLines, MARGIN_X + 3.5, y + 9.8);

  if (hasFooterDateLine) {
    const lineDividerY = y + 8 + parecerLines.length * 3.8;
    doc.setDrawColor(pBorder[0], pBorder[1], pBorder[2]);
    doc.line(MARGIN_X + 3.5, lineDividerY, PAGE_W - MARGIN_X - 3.5, lineDividerY);

    const footerDateStr = is8DAprovado
      ? formatDateTimeExact(
          meta?.data_hora_aprovacao || meta?.data_aprovacao || rnc.dataConclusao || rnc.dataOcorrencia,
          '16:42'
        )
      : formatDateTimeExact(meta?.data_solicitacao_revisao, '16:10');

    const footerRespStr = normalizeDisplayText(
      is8DAprovado
        ? meta?.aprovado_por || rnc.responsavelConclusao || rnc.detector || 'Admin da Qualidade'
        : meta?.solicitado_revisao_por || meta?.aprovado_por || 'Admin da Qualidade'
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(is8DAprovado ? 6 : 71, is8DAprovado ? 95 : 85, is8DAprovado ? 70 : 105);
    doc.text(
      `Data/Hora: ${footerDateStr}   •   Responsável (Admin da Qualidade): ${footerRespStr}`,
      MARGIN_X + 3.5,
      lineDividerY + 4.3
    );
  }

  y += parecerBoxH + 4;

  // 8D.3: Cards de Assinaturas Digitais Eletrônicas com Carimbo de Data e Hora Exata por Etapa
  ensureSpace(signaturesBlockH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'REGISTRO DE ASSINATURAS DIGITAIS ELETRÔNICAS DO CICLO 8D (CARIMBO DE TEMPO OFICIAL):',
    MARGIN_X,
    y + 3.5
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(100, 116, 139);
  doc.text('Autenticidade Eletrônica Auditável', PAGE_W - MARGIN_X, y + 3.5, { align: 'right' });

  y += 5.2;

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

  const sigCardGap = 3;
  const sigCardW = (CONTENT_W - sigCardGap * 2) / 3;
  const sigCardH = 31;

  digitalSigs.forEach((sig, idx) => {
    const sX = MARGIN_X + idx * (sigCardW + sigCardGap);

    if (sig.isSigned) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(110, 231, 183);
    } else if (sig.isPendingReview) {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(252, 211, 77);
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
    }
    doc.roundedRect(sX, y, sigCardW, sigCardH, 1.8, 1.8, 'FD');

    // Cabeçalho da Etapa + Selo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(51, 65, 85);
    doc.text(sig.stageTitle, sX + 2.2, y + 4.1);

    const badgeText = sig.isSigned ? 'ASSINADO' : sig.isPendingReview ? 'EM REVISÃO' : 'PENDENTE';
    const badgeW = doc.getTextWidth(badgeText) + 3;
    if (sig.isSigned) {
      doc.setFillColor(5, 150, 105);
    } else if (sig.isPendingReview) {
      doc.setFillColor(245, 158, 11);
    } else {
      doc.setFillColor(203, 213, 225);
    }
    doc.roundedRect(sX + sigCardW - badgeW - 2, y + 1.4, badgeW, 3.8, 0.8, 0.8, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(sig.isSigned ? 255 : 15, sig.isSigned ? 255 : 23, sig.isSigned ? 255 : 42);
    doc.text(badgeText, sX + sigCardW - 2 - badgeW / 2, y + 3.9, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(sX + 2, y + 5.6, sX + sigCardW - 2, y + 5.6);

    // Papel + Nome do Responsável + Setor/Perfil
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(`${sig.roleTitle}:`, sX + 2.2, y + 8.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    const signerTrunc = (doc.splitTextToSize(sig.signerName, sigCardW - 4.4) as string[])[0] || sig.signerName;
    doc.text(signerTrunc, sX + 2.2, y + 12.3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(71, 85, 105);
    const roleTrunc = (doc.splitTextToSize(sig.signerRoleOrSector, sigCardW - 4.4) as string[])[0] || sig.signerRoleOrSector;
    doc.text(roleTrunc, sX + 2.2, y + 15.6);

    // Carimbo Exato de Data e Hora
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(sX + 2, y + 17.2, sigCardW - 4, 4.8, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.4);
    doc.setTextColor(15, 23, 42);
    doc.text(`Momento: ${sig.exactDateTime}`, sX + 3.5, y + 20.5);

    // Escopo exclusivo da etapa + Código da Assinatura Digital
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    doc.setTextColor(100, 116, 139);
    const scopeTrunc = (doc.splitTextToSize(sig.scopeDescription, sigCardW - 4.4) as string[])[0] || sig.scopeDescription;
    doc.text(scopeTrunc, sX + 2.2, y + 25.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
    doc.text(`Selo Digital: ${sig.signatureCode}`, sX + 2.2, y + 28.8);
  });

  y += sigCardH + 3;

  // =========================================================================
  // NUMERAÇÃO DE PÁGINAS EM TODAS AS FOLHAS A4
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN_X, PAGE_H - 9.5, PAGE_W - MARGIN_X, PAGE_H - 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${brandName} • Relatório Oficial de 8D (${formalDisplayId})`,
      MARGIN_X,
      PAGE_H - 5.5
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${p} de ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - 5.5, { align: 'right' });
  }

  const safeFileId = formalDisplayId.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Relatorio_8D_${safeFileId}.pdf`);
}

/**
 * Gera e baixa a Ficha de Alerta da Qualidade (1 Página A4)
 */
export async function exportFichaAlertaPdf(params: Export8DPdfParams): Promise<void> {
  const { rnc, formalDisplayId, treinamentos, brandColor, brandName, brandLogo, brandSubtitle } = params;

  const [logoImg, okImg, ngImg] = await Promise.all([
    loadImageAsDataUrl(brandLogo),
    loadImageAsDataUrl(rnc.fotoPecaOk, rnc.id),
    loadImageAsDataUrl(rnc.fotoPecaNg, rnc.id)
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_X = 12;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const brandRgb = hexToRgb(brandColor, [11, 87, 150]);

  let y = 12;

  // Header
  doc.setDrawColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, y + 15, PAGE_W - MARGIN_X, y + 15);
  doc.setLineWidth(0.2);

  let titleX = MARGIN_X;
  if (logoImg) {
    const ratio = Math.min(26 / logoImg.width, 12 / logoImg.height);
    const w = logoImg.width * ratio;
    const h = logoImg.height * ratio;
    doc.addImage(logoImg.dataUrl, logoImg.format, MARGIN_X, y + 1, w, h);
    titleX = MARGIN_X + w + 3.5;
  } else {
    doc.setFillColor(brandRgb[0], brandRgb[1], brandRgb[2]);
    doc.roundedRect(MARGIN_X, y + 1.5, 26, 10, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(brandName.substring(0, 12), MARGIN_X + 13, y + 7.8, { align: 'center' });
    titleX = MARGIN_X + 29.5;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(brandRgb[0], brandRgb[1], brandRgb[2]);
  doc.text('Alerta da Qualidade & Rastreabilidade', titleX, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(brandSubtitle, titleX, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72);
  doc.text(
    formatOccurrenceId(rnc.id, rnc.codOcorrenciaCliente || rnc.field1),
    PAGE_W - MARGIN_X,
    y + 6.5,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Data: ${formatDateBR(rnc.dataOcorrencia)}`, PAGE_W - MARGIN_X, y + 11.5, { align: 'right' });

  y += 19;

  // Grid de informações gerais
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 18, 1.5, 1.5, 'FD');

  const colW = CONTENT_W / 4;
  const infoRow1 = [
    ['ID / Ocorrência:', formatOccurrenceId(rnc.id, rnc.codOcorrenciaCliente || rnc.field1)],
    ['Cliente:', rnc.cliente || '-'],
    ['Veículo / Projeto:', rnc.produto || '-'],
    ['Componente:', rnc.componente || '-']
  ];
  const infoRow2 = [
    ['Setor:', rnc.classificacaoSetor || '-'],
    ['Posto:', rnc.posto || 'N/A'],
    ['Turno:', rnc.turno || '-'],
    ['Qtd. Afetada:', `${rnc.quantidadeAfetada || 1} pçs`]
  ];

  infoRow1.forEach((pair, i) => {
    const cX = MARGIN_X + 2.5 + i * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(pair[0], cX, y + 5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(pair[1]).substring(0, 22), cX, y + 8.5);
  });

  infoRow2.forEach((pair, i) => {
    const cX = MARGIN_X + 2.5 + i * colW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(pair[0], cX, y + 12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(pair[1]).substring(0, 22), cX, y + 16);
  });

  y += 22;

  // Fotos NG vs OK
  const halfW = (CONTENT_W - 4) / 2;
  const photoH = 62;

  // Peça NG
  doc.setDrawColor(244, 63, 94);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN_X, y, halfW, photoH, 1.8, 1.8, 'FD');
  doc.setFillColor(225, 29, 72);
  doc.roundedRect(MARGIN_X, y, halfW, 6.5, 1.8, 1.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Peça Não Conforme (Defeito Registrado)', MARGIN_X + halfW / 2, y + 4.5, { align: 'center' });

  if (ngImg) {
    const availW = halfW - 6;
    const availH = photoH - 22;
    const ratio = Math.min(availW / ngImg.width, availH / ngImg.height);
    const drawW = ngImg.width * ratio;
    const drawH = ngImg.height * ratio;
    doc.addImage(
      ngImg.dataUrl,
      ngImg.format,
      MARGIN_X + (halfW - drawW) / 2,
      y + 8 + (availH - drawH) / 2,
      drawW,
      drawH
    );
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(225, 29, 72);
    doc.text('Sem foto do defeito cadastrada', MARGIN_X + halfW / 2, y + 28, { align: 'center' });
  }

  doc.setFillColor(255, 241, 242);
  doc.rect(MARGIN_X + 0.3, y + photoH - 13, halfW - 0.6, 12.7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(159, 18, 57);
  doc.text('Sintoma / Falha:', MARGIN_X + 2.5, y + photoH - 8.8);
  doc.setFont('helvetica', 'normal');
  const ngDesc = (doc.splitTextToSize(rnc.descricaoProblema || 'Defeito não detalhado', halfW - 5) as string[]).slice(
    0,
    2
  );
  doc.text(ngDesc, MARGIN_X + 2.5, y + photoH - 5);

  // Peça OK
  const okX = MARGIN_X + halfW + 4;
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(okX, y, halfW, photoH, 1.8, 1.8, 'FD');
  doc.setFillColor(5, 150, 105);
  doc.roundedRect(okX, y, halfW, 6.5, 1.8, 1.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Peça Conforme (Padrão Aprovado)', okX + halfW / 2, y + 4.5, { align: 'center' });

  if (okImg) {
    const availW = halfW - 6;
    const availH = photoH - 22;
    const ratio = Math.min(availW / okImg.width, availH / okImg.height);
    const drawW = okImg.width * ratio;
    const drawH = okImg.height * ratio;
    doc.addImage(
      okImg.dataUrl,
      okImg.format,
      okX + (halfW - drawW) / 2,
      y + 8 + (availH - drawH) / 2,
      drawW,
      drawH
    );
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text('Sem foto padrão cadastrada', okX + halfW / 2, y + 28, { align: 'center' });
  }

  doc.setFillColor(236, 253, 245);
  doc.rect(okX + 0.3, y + photoH - 13, halfW - 0.6, 12.7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text('Critério de Aceitação:', okX + 2.5, y + photoH - 8.8);
  doc.setFont('helvetica', 'normal');
  const okDesc = (
    doc.splitTextToSize(
      'Livre de rebarbas, trincas, solda com fusão 100% e conformidade geométrica.',
      halfW - 5
    ) as string[]
  ).slice(0, 2);
  doc.text(okDesc, okX + 2.5, y + photoH - 5);

  y += photoH + 4;

  // Ações de Contenção
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 14, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(9, 33, 98);
  doc.text('AÇÕES DE CONTENÇÃO IMEDIATA (3D):', MARGIN_X + 3, y + 4.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  const contLines = (
    doc.splitTextToSize(
      rnc.acoesContencao || 'Retenção preventiva de estoque, triagem 100% e inspeção com torquímetro / gabarito.',
      CONTENT_W - 6
    ) as string[]
  ).slice(0, 2);
  doc.text(contLines, MARGIN_X + 3, y + 9);

  y += 18;

  // Tabela de Operadores Treinados (14 linhas)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(9, 33, 98);
  doc.text('REGISTRO DE OPERADORES TREINADOS NO POSTO (DISSEMINAÇÃO DO ALERTA):', MARGIN_X, y + 3.5);
  y += 5;

  const tCols = [
    { header: 'RE', width: 24 },
    { header: 'NOME DO OPERADOR', width: 92 },
    { header: 'DATA', width: 28 },
    { header: 'VISTO DO COLABORADOR', width: 42 }
  ];

  doc.setFillColor(9, 33, 98);
  doc.rect(MARGIN_X, y, CONTENT_W, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(255, 255, 255);

  let cx = MARGIN_X;
  tCols.forEach(c => {
    doc.text(c.header, cx + 2, y + 4.5);
    cx += c.width;
  });
  y += 6.5;

  const padded = [...treinamentos];
  while (padded.length < 14) {
    padded.push({
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

  const rowH = 6.2;
  padded.slice(0, 14).forEach((t, idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'FD');

    let rx = MARGIN_X;
    tCols.forEach((c, cIdx) => {
      doc.rect(rx, y, c.width, rowH, 'S');
      doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      const val =
        cIdx === 0
          ? t.re > 0
            ? String(t.re)
            : ''
          : cIdx === 1
          ? t.nomeColaborador || ''
          : cIdx === 2
          ? formatDateBR(t.dataTreinamento)
          : '';
      if (val) {
        doc.text(val, rx + 2, y + 4.3);
      }
      rx += c.width;
    });

    y += rowH;
  });

  // Assinaturas no rodapé
  const sigY = PAGE_H - 18;
  const sigW = CONTENT_W / 3;
  [
    'Emitente / Inspetor da Qualidade',
    'Supervisor / Líder de Produção',
    'Engenharia da Qualidade'
  ].forEach((label, idx) => {
    const sx = MARGIN_X + idx * sigW;
    doc.setDrawColor(148, 163, 184);
    doc.line(sx + 6, sigY, sx + sigW - 6, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(label, sx + sigW / 2, sigY + 4.5, { align: 'center' });
  });

  const safeFileId = formalDisplayId.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Ficha_Alerta_${safeFileId}.pdf`);
}
