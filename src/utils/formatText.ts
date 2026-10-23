// ============================================================================
// UTILITÁRIO DE PADRONIZAÇÃO TIPOGRÁFICA & CAPITALIZAÇÃO CORPORATIVA
// Garante consistência visual (Title Case / Sentence Case) em todo o sistema,
// preservando siglas técnicas automotivas e códigos de engenharia/peças.
// ============================================================================

const PRESERVED_ACRONYMS = new Set([
  'RNC', 'SAP', 'JIT', 'CNC', 'FMDS', 'TDB', 'TDI', 'KDB', 'KDS', 'KDL',
  'GPA', 'GSN', 'MBB', 'VW', 'GM', 'RH', 'LH', 'M6', 'M8', 'M10', 'M12',
  '8D', '5W2H', 'NG', 'OK', 'CLP', 'CMM', 'FMEA', 'MIG', 'MAG', 'ABB',
  'KLT', 'EOL', 'LPP', 'DCO', 'WIP', 'NF', 'SP', 'ABC', 'BR', 'OEM',
  'ISO', 'IEC', 'ZT411', 'RPS-02', 'OP-20', 'HR-V', 'HB20', 'T-CROSS',
  'CC/SC', '3B', '5B', '80A', '2500T', '1200T', '800T', 'RE', 'ID', 'TI'
]);

const LOWERCASE_CONNECTORS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos',
  'para', 'por', 'com', 'sem', 'ao', 'aos', 'à', 'às', 'pelo', 'pela', 'sob'
]);

/**
 * Verifica se um token é um código alfanumérico de peça/rastreio (ex: 57011-02230, U005000B6, 2G0.803.101.C)
 */
function isTechnicalCode(word: string): boolean {
  const clean = word.replace(/^[([{]+|[)\]}.,;:]+$/g, '');
  if (!clean) return false;
  if (PRESERVED_ACRONYMS.has(clean.toUpperCase())) return true;
  // Se contém dígitos misturados com letras/hífens/pontos (ex: 53201-0D120, B643033, GM-LOG-1192)
  if (/\d/.test(clean) && /[A-Za-z]/.test(clean)) return true;
  // Siglas com barra como MIG/MAG ou CC/SC
  if (/^[A-Z0-9]{2,4}\/[A-Z0-9]{2,4}$/i.test(clean)) return true;
  return false;
}

/**
 * Formata um texto que esteja todo em MAIÚSCULAS ou todo em minúsculas para
 * Title Case corporativo limpo, preservando siglas e códigos de peça.
 */
export function normalizeDisplayText(input: string | undefined | null): string {
  if (!input) return '';
  const trimmed = String(input).trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  // Casos curtos diretos
  const upper = trimmed.toUpperCase();
  if (upper === 'NÃO' || upper === 'NAO') return 'Não';
  if (upper === 'SIM') return 'Sim';
  if (PRESERVED_ACRONYMS.has(upper)) return upper;

  // Tratamento especial para E-COAT
  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (!letters) return trimmed;

  const isAllUpper = letters === letters.toUpperCase() && letters.length > 2;
  const isAllLower = letters === letters.toLowerCase();

  // Verifica também se uma frase mista tem palavras longas gritando em CAIXA ALTA (ex: "Ponto de SOLDA Pegou fora Dedevido a PEÇA AMASSADA")
  const hasShoutingWords = trimmed.split(' ').some(w => {
    const cleanW = w.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    return (
      cleanW.length >= 4 &&
      cleanW === cleanW.toUpperCase() &&
      !PRESERVED_ACRONYMS.has(cleanW.toUpperCase()) &&
      !isTechnicalCode(w)
    );
  });

  if (!isAllUpper && !isAllLower && !hasShoutingWords) {
    return trimmed;
  }

  const tokens = trimmed.split(' ');
  return tokens
    .map((token, idx) => {
      // Preserva pontuação ao redor (ex: "(CROSS)" -> "(" + "Cross" + ")")
      const match = token.match(/^([([{]*)(.*?)([)\]}.,;:]*)$/);
      if (!match) return token;
      const [, prefix, core, suffix] = match;
      if (!core) return token;

      const coreUpper = core.toUpperCase();
      if (coreUpper === 'E-COAT') return `${prefix}E-Coat${suffix}`;
      if (coreUpper === 'C/PORCA') return `${prefix}c/ Porca${suffix}`;
      if (coreUpper === 'C/') return `${prefix}c/${suffix}`;
      if (coreUpper === 'S/') return `${prefix}s/${suffix}`;
      if (coreUpper === 'CEL.') return `${prefix}Cél.${suffix}`;

      if (PRESERVED_ACRONYMS.has(coreUpper) || isTechnicalCode(core)) {
        return `${prefix}${coreUpper}${suffix}`;
      }

      const coreLower = core.toLowerCase();
      if (idx > 0 && LOWERCASE_CONNECTORS.has(coreLower) && !prefix) {
        return `${prefix}${coreLower}${suffix}`;
      }

      // Se possui barra (ex: "Quarentena/RETRABALHO" ou "PEÇA/COMPONENTE")
      if (coreLower.includes('/')) {
        const subParts = core.split('/').map(sp => {
          const spUp = sp.toUpperCase();
          if (PRESERVED_ACRONYMS.has(spUp) || isTechnicalCode(sp)) return spUp;
          const spLow = sp.toLowerCase();
          return spLow.charAt(0).toUpperCase() + spLow.slice(1);
        });
        return `${prefix}${subParts.join('/')}${suffix}`;
      }

      return `${prefix}${coreLower.charAt(0).toUpperCase() + coreLower.slice(1)}${suffix}`;
    })
    .join(' ');
}

/**
 * Formata o identificador da ocorrência no padrão corporativo solicitado:
 * "ID:10" ou "ID:10 - GM-LOG-1192" quando houver código do cliente associado.
 */
export function formatOccurrenceId(id: number | string | undefined | null, clientCode?: string | null): string {
  if (id === undefined || id === null || id === '') return '';
  const cleanId = String(id).replace(/[^0-9]/g, '') || String(id);
  const cleanCode = clientCode ? String(clientCode).trim() : '';

  const isRedundant = !cleanCode || 
    cleanCode === cleanId || 
    cleanCode.toUpperCase() === `RNC #${cleanId}` ||
    cleanCode.toUpperCase() === `RNC-${cleanId}` ||
    cleanCode.toUpperCase() === `RNC ${cleanId}` ||
    cleanCode.toUpperCase() === `#${cleanId}` ||
    cleanCode.toUpperCase() === `ID:${cleanId}` ||
    cleanCode.toUpperCase() === `ID: ${cleanId}` ||
    (cleanCode.toUpperCase().startsWith('RNC-') && cleanCode.endsWith(cleanId.padStart(4, '0')));

  if (!isRedundant) {
    return `ID:${cleanId} - ${cleanCode}`;
  }
  return `ID:${cleanId}`;
}

