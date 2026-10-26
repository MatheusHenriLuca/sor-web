/**
 * Utilitários para Padronização Global de Datas - Gestamp SOR
 * Formato Padrão de Exibição: DD/MM/AA (ex: 05/10/26)
 * Preserva valores originais para ordenação, filtros e persistência.
 */

export function formatDateBR(
  dateInput: string | Date | null | undefined, 
  options: { includeTime?: boolean } = {}
): string {
  if (!dateInput) return '-';

  try {
    const str = String(dateInput).trim();
    if (!str) return '-';

    // Se já estiver no formato DD/MM/AA ou DD/MM/YYYY
    const brDateMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}:\d{2}))?/);
    if (brDateMatch) {
      const [, day, month, year, time] = brDateMatch;
      const shortYear = year.length === 4 ? year.slice(-2) : year;
      if (options.includeTime && time) {
        return `${day}/${month}/${shortYear} ${time}`;
      }
      return `${day}/${month}/${shortYear}`;
    }

    // Se estiver no formato ISO YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss
    const isoDateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/);
    if (isoDateMatch) {
      const [, year, month, day, time] = isoDateMatch;
      const shortYear = year.slice(-2);
      if (options.includeTime && time) {
        return `${day}/${month}/${shortYear} ${time}`;
      }
      return `${day}/${month}/${shortYear}`;
    }

    // Fallback utilizando objeto Date
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const shortYear = String(d.getFullYear()).slice(-2);

    if (options.includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${shortYear} ${hours}:${minutes}`;
    }

    return `${day}/${month}/${shortYear}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formata data e hora exata no padrão DD/MM/AA às HH:mm.
 * Se o valor salvo tiver apenas a data (YYYY-MM-DD ou DD/MM/AA), utiliza o horário exato informado ou fallback determinístico.
 */
export function formatDateTimeExact(
  dateTimeInput: string | Date | null | undefined,
  fallbackTime = '08:30'
): string {
  if (!dateTimeInput) return '-';

  try {
    if (dateTimeInput instanceof Date) {
      if (isNaN(dateTimeInput.getTime())) return '-';
      const day = String(dateTimeInput.getDate()).padStart(2, '0');
      const month = String(dateTimeInput.getMonth() + 1).padStart(2, '0');
      const shortYear = String(dateTimeInput.getFullYear()).slice(-2);
      const hours = String(dateTimeInput.getHours()).padStart(2, '0');
      const minutes = String(dateTimeInput.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${shortYear} às ${hours}:${minutes}`;
    }

    const str = String(dateTimeInput).trim();
    if (!str) return '-';

    // Caso já esteja no formato DD/MM/AA às HH:mm ou DD/MM/AA HH:mm
    const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{2,4})(?:\s*(?:às|as|-|•)?\s*(\d{2}:\d{2}))?/i);
    if (brMatch) {
      const [, day, month, year, time] = brMatch;
      const shortYear = year.length === 4 ? year.slice(-2) : year;
      return `${day}/${month}/${shortYear} às ${time || fallbackTime}`;
    }

    // Caso esteja no formato ISO YYYY-MM-DDTHH:mm:ssZ ou YYYY-MM-DD HH:mm
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/);
    if (isoMatch) {
      const [, year, month, day, time] = isoMatch;
      const shortYear = year.slice(-2);
      if (time && str.includes('T') && str.endsWith('Z')) {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          const localDay = String(parsed.getDate()).padStart(2, '0');
          const localMonth = String(parsed.getMonth() + 1).padStart(2, '0');
          const localYear = String(parsed.getFullYear()).slice(-2);
          const localHours = String(parsed.getHours()).padStart(2, '0');
          const localMinutes = String(parsed.getMinutes()).padStart(2, '0');
          return `${localDay}/${localMonth}/${localYear} às ${localHours}:${localMinutes}`;
        }
      }
      return `${day}/${month}/${shortYear} às ${time || fallbackTime}`;
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const shortYear = String(d.getFullYear()).slice(-2);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${shortYear} às ${hours}:${minutes}`;
    }

    return str;
  } catch {
    return String(dateTimeInput);
  }
}

/**
 * Gera um hash curto determinístico para compor o selo de assinatura digital de cada etapa
 */
export function computeDigitalSignatureCode(stagePrefix: string, rncId: number, signerName: string, timestampStr: string): string {
  const payload = `${stagePrefix}|${rncId}|${(signerName || '').trim().toUpperCase()}|${(timestampStr || '').trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `${stagePrefix}-${String(rncId).padStart(3, '0')}-${hex.slice(0, 6)}`;
}

export interface EightDDigitalSignatureItem {
  stageKey: 'abertura' | 'analise' | 'validacao';
  stageTitle: string;
  roleTitle: string;
  signerName: string;
  signerRoleOrSector: string;
  exactDateTime: string;
  scopeDescription: string;
  signatureCode: string;
  statusBadge: string;
  isSigned: boolean;
  isPendingReview?: boolean;
}

/**
 * Verifica se o usuário possui perfil de Admin da Qualidade (único autorizado a aprovar finalmente um 8D).
 */
export function isUserAdminQualidade8D(user?: {
  perfil?: string;
  papel?: string;
  perfisPorApp?: { plano_acao?: string; rnc?: string; oitod?: string };
} | null): boolean {
  if (!user) return false;
  if (user.papel === 'super_admin') return true;
  // Se a matriz por aplicativo estiver definida e o usuário não for legado Adminqual/Admin sem matriz customizada
  if (user.perfisPorApp?.oitod === 'Admin') return true;
  if (
    !user.perfisPorApp &&
    (user.perfil === 'Admin' || user.perfil === 'Adminqual' || user.papel === 'admin_empresa')
  ) {
    return true;
  }
  // Mesmo com perfisPorApp gerados por default, Adminqual e Admin são Admins da Qualidade (a menos que rebaixados explicitamente)
  if (
    (user.perfil === 'Adminqual' || user.perfil === 'Admin' || user.papel === 'admin_empresa') &&
    user.perfisPorApp?.oitod !== 'Sem Acesso' &&
    user.perfisPorApp?.oitod !== 'Usuário Comum'
  ) {
    return true;
  }
  return false;
}

export function build8DDigitalSignatures(params: {
  rnc: {
    id: number;
    tipoRnc?: string;
    turno?: string;
    detector?: string;
    reDetector?: number;
    setorDeteccao?: string;
    classificacaoSetor?: string;
    quemFara?: string;
    dataOcorrencia?: string;
    dataHoraAbertura?: string;
    dataContencao?: string;
    dataConclusao?: string;
    responsavelConclusao?: string;
    status?: string;
  };
  meta?: {
    id8d?: string;
    participantes_8d?: string;
    validar_8d?: string;
    responsavel_analise_8d?: string;
    cargo_analise_8d?: string;
    data_hora_analise_8d?: string;
    data_aprovacao?: string;
    data_hora_aprovacao?: string;
    aprovado_por?: string;
    cargo_aprovador?: string;
    re_aprovador?: number;
    solicitado_revisao_por?: string;
    data_solicitacao_revisao?: string;
  };
  hasAnalysisActivity: boolean;
  normalizeText: (val?: string | null) => string;
}): [EightDDigitalSignatureItem, EightDDigitalSignatureItem, EightDDigitalSignatureItem] {
  const { rnc, meta, hasAnalysisActivity, normalizeText } = params;

  // 1. Horário exato da Abertura (baseado em dataHoraAbertura ou turno da ocorrência)
  const turnoStr = (rnc.turno || '').toLowerCase();
  const defaultOpeningHour = turnoStr.includes('2')
    ? '15:20'
    : turnoStr.includes('3')
    ? '22:45'
    : '08:15';
  const aberturaName = normalizeText(rnc.detector || 'Inspetor da Qualidade');
  const aberturaSector = rnc.reDetector
    ? `RE: ${rnc.reDetector} • ${normalizeText(rnc.setorDeteccao || 'Qualidade')}`
    : `Setor: ${normalizeText(rnc.setorDeteccao || 'Inspeção / Qualidade')}`;
  const aberturaDateTime = formatDateTimeExact(rnc.dataHoraAbertura || rnc.dataOcorrencia, defaultOpeningHour);
  const aberturaSigCode = computeDigitalSignatureCode('1D-ABERT', rnc.id, aberturaName, aberturaDateTime);

  const sigAbertura: EightDDigitalSignatureItem = {
    stageKey: 'abertura',
    stageTitle: '1º D — ABERTURA DA OCORRÊNCIA',
    roleTitle: 'Responsável pela Abertura',
    signerName: aberturaName,
    signerRoleOrSector: aberturaSector,
    exactDateTime: aberturaDateTime,
    scopeDescription: `Dados exclusivos da Abertura #${rnc.id} (${rnc.tipoRnc || 'Formal'})`,
    signatureCode: aberturaSigCode,
    statusBadge: 'ASSINADO DIGITALMENTE (ABERTURA)',
    isSigned: true
  };

  // 2. Assinatura Digital da Análise Técnica / Engenharia (2º D a 7º D)
  const firstParticipant = (meta?.participantes_8d || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)[0];
  const analiseName = normalizeText(
    meta?.responsavel_analise_8d || firstParticipant || rnc.quemFara || rnc.detector || 'Engenharia de Processo'
  );
  const analiseSector = normalizeText(
    meta?.cargo_analise_8d || rnc.classificacaoSetor || 'Liderança / Engenharia de Processo'
  );
  const analiseRawDate = meta?.data_hora_analise_8d || rnc.dataContencao || rnc.dataOcorrencia;
  const analiseDateTime = hasAnalysisActivity
    ? formatDateTimeExact(analiseRawDate, '11:35')
    : 'Aguardando Registro da Análise';
  const analiseSigCode = hasAnalysisActivity
    ? computeDigitalSignatureCode('2D7D-ANALISE', rnc.id, analiseName, analiseDateTime)
    : 'PENDENTE';

  const sigAnalise: EightDDigitalSignatureItem = {
    stageKey: 'analise',
    stageTitle: '2º D A 7º D — ANÁLISE TÉCNICA 8D',
    roleTitle: 'Liderança / Engenharia de Processo',
    signerName: analiseName,
    signerRoleOrSector: analiseSector,
    exactDateTime: analiseDateTime,
    scopeDescription: 'Participação na Análise de Causa Raiz e Plano 8D',
    signatureCode: analiseSigCode,
    statusBadge: hasAnalysisActivity
      ? 'ASSINADO DIGITALMENTE (ANÁLISE 8D)'
      : 'AGUARDANDO CONCLUSÃO DA ANÁLISE',
    isSigned: hasAnalysisActivity
  };

  // 3. Assinatura Digital da Validação Final 8D (8º D — Exclusivo Admin da Qualidade)
  const is8DAprovado = meta?.validar_8d === 'Aprovado' || rnc.status === 'Concluído';
  const is8DEmRevisao = meta?.validar_8d === 'Reprovado';

  const aprovadorName = is8DAprovado
    ? normalizeText(meta?.aprovado_por || rnc.responsavelConclusao || 'Admin da Qualidade')
    : is8DEmRevisao
    ? normalizeText(meta?.solicitado_revisao_por || 'Admin da Qualidade')
    : 'Aguardando Admin da Qualidade';

  const aprovadorRole = is8DAprovado
    ? meta?.re_aprovador
      ? `Perfil: Admin da Qualidade • RE: ${meta.re_aprovador}`
      : `Perfil: ${meta?.cargo_aprovador || 'Admin da Qualidade'}`
    : is8DEmRevisao
    ? 'Revisão Solicitada pelo Admin da Qualidade'
    : 'Exclusivo: Perfil Admin da Qualidade';

  const validacaoRawDate = is8DAprovado
    ? meta?.data_hora_aprovacao || meta?.data_aprovacao || rnc.dataConclusao || rnc.dataOcorrencia
    : is8DEmRevisao
    ? meta?.data_solicitacao_revisao
    : undefined;

  const validacaoDateTime =
    is8DAprovado && validacaoRawDate
      ? formatDateTimeExact(validacaoRawDate, '16:42')
      : is8DEmRevisao && validacaoRawDate
      ? formatDateTimeExact(validacaoRawDate, '16:10')
      : 'Aguardando Aprovação Final';

  const validacaoSigCode = is8DAprovado
    ? computeDigitalSignatureCode('8D-QUAL', rnc.id, aprovadorName, validacaoDateTime)
    : is8DEmRevisao
    ? computeDigitalSignatureCode('8D-REV', rnc.id, aprovadorName, validacaoDateTime)
    : 'PENDENTE';

  const sigValidacao: EightDDigitalSignatureItem = {
    stageKey: 'validacao',
    stageTitle: '8º D — VALIDAÇÃO FINAL (QUALIDADE)',
    roleTitle: 'Aprovação Final (Admin da Qualidade)',
    signerName: aprovadorName,
    signerRoleOrSector: aprovadorRole,
    exactDateTime: validacaoDateTime,
    scopeDescription: 'Homologação e Aprovação Final do Relatório 8D',
    signatureCode: validacaoSigCode,
    statusBadge: is8DAprovado
      ? 'ASSINADO DIGITALMENTE (ADMIN QUALIDADE)'
      : is8DEmRevisao
      ? 'REVISÃO SOLICITADA (ADMIN QUALIDADE)'
      : 'AGUARDANDO ASSINATURA (ADMIN QUALIDADE)',
    isSigned: is8DAprovado,
    isPendingReview: is8DEmRevisao
  };

  return [sigAbertura, sigAnalise, sigValidacao];
}


