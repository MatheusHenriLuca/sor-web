import { 
  RNCRecord, 
  UsuarioQualidade, 
  ColaboradorBaseAtivos, 
  PecaCatalogo, 
  RastreabilidadeItem,
  EtiquetaVivaParsed,
  LoteSAPParsed,
  RastCabeceiraParsed,
  RegistroTreinamento,
  AlertaQualidadeRegistro,
  Abrir8DRecord,
  SharePointConfig,
  UserRole,
  ListFiltersState
} from '../types';
import { spDirect } from './sharepointDirectService';
import { DEFAULT_CLIENTE } from '../constants/clientes';
import { tenantService, PILOT_TENANT_ID, normalizeRncRecordCasing } from './tenantService';
import { normalizeDisplayText, formatOccurrenceId } from '../utils/formatText';

function normalizePecaCasing(p: PecaCatalogo): PecaCatalogo {
  return {
    ...p,
    descricao: normalizeDisplayText(p.descricao),
    cliente: normalizeDisplayText(p.cliente),
    cliente1: normalizeDisplayText(p.cliente1),
    posto: normalizeDisplayText(p.posto),
    fmds: normalizeDisplayText(p.fmds),
    componente: p.componente ? normalizeDisplayText(p.componente) : p.componente,
    carryOver: normalizeDisplayText(p.carryOver),
    coProduto: (p.coProduto ? normalizeDisplayText(p.coProduto) : p.coProduto) as 'Sim' | 'Não' | undefined,
    caracteristicaSeguranca: (p.caracteristicaSeguranca ? normalizeDisplayText(p.caracteristicaSeguranca) : p.caracteristicaSeguranca) as 'Sim' | 'Não' | undefined
  };
}

// ============================================================================
// CONFIGURAÇÃO DO SHAREPOINT ONLINE
// ============================================================================
export interface SharePointConnectionState {
  siteUrl: string;
  accessToken: string;
  mode: 'local' | 'sharepoint';
  lastSync?: string;
  connected: boolean;
  statusMessage?: string;
}

// ============================================================================
// DADOS DE REFERÊNCIA GESTAMP BRASIL: USUÁRIOS E PERFIS
// (Base SharePoint: 'Usuários ocorrências qualidade')
// ============================================================================
const INITIAL_USERS: UsuarioQualidade[] = [
  { id: 1, nome: "Matheus Henrique de Luca", reAcesso: 104235, perfil: "Admin", senha: "123", email: "mhsolucoes@adimin.com.br", cargo: "Diretor Executivo — MH Lean & Soluções", setor: "Qualidade & Engenharia Lean" },
  { id: 2, nome: "Carlos Eduardo Ferreira", reAcesso: 89452, perfil: "Adminqual", senha: "123", email: "ceduardo@mhleansolucoes.com.br", cargo: "Engenheiro da Qualidade Sênior", setor: "Qualidade Assegurada" },
  { id: 3, nome: "Mariana Souza Lima", reAcesso: 76512, perfil: "Liderqual", senha: "123", email: "msouza@br.gestamp.com", cargo: "Líder da Qualidade Linhas", setor: "Qualidade Linhas" },
  { id: 4, nome: "Roberto Mendes Silva", reAcesso: 64129, perfil: "Inspqual", senha: "123", email: "rmendes@br.gestamp.com", cargo: "Inspetor da Qualidade Solda", setor: "Inspeção" },
  { id: 5, nome: "André Ferreira Santos", reAcesso: 52187, perfil: "Processos", senha: "123", email: "aferreira@br.gestamp.com", cargo: "Engenheiro de Processos", setor: "Engenharia de Processos" },
  { id: 6, nome: "Juliana Santos Oliveira", reAcesso: 41290, perfil: "Produção", senha: "123", email: "jsantos@br.gestamp.com", cargo: "Supervisora de Produção", setor: "Produção Estamparia" },
  { id: 7, nome: "Marcos Vinicius Barbosa", reAcesso: 30122, perfil: "User", senha: "", email: "mvinicius@br.gestamp.com", cargo: "Operador Especializado Solda", setor: "Solda Toyota" },
  { id: 8, nome: "Felipe Almeida Castro", reAcesso: 30123, perfil: "User", senha: "", email: "falmeida@br.gestamp.com", cargo: "Operador Prensa Tandem", setor: "Estamparia Tandem" },
  { id: 9, nome: "Thiago Ramos Pinheiro", reAcesso: 30124, perfil: "User", senha: "", email: "tramos@br.gestamp.com", cargo: "Operador Célula Robotizada Honda", setor: "Solda Honda" }
];

// ============================================================================
// DADOS DE REFERÊNCIA GESTAMP BRASIL: BASE DE ATIVOS
// (Base SharePoint: 'BASE_ATIVOS' -> 'varPessoas')
// ============================================================================
const INITIAL_BASE_ATIVOS: ColaboradorBaseAtivos[] = [
  { numPessoal: 104235, nome: "Matheus Henrique de Luca", unidadeOrg: "Qualidade Corporativa", posicao: "Gerente da Qualidade" },
  { numPessoal: 98112, nome: "FERNANDO TIAGO MACIEL DE JESUS", unidadeOrg: "Qualidade Assegurada", posicao: "Analista da Qualidade" },
  { numPessoal: 89452, nome: "Carlos Eduardo Ferreira", unidadeOrg: "Qualidade Assegurada", posicao: "Engenheiro da Qualidade Sênior" },
  { numPessoal: 76512, nome: "Mariana Souza Lima", unidadeOrg: "Qualidade Linhas", posicao: "Líder de Inspeção da Qualidade" },
  { numPessoal: 64129, nome: "Roberto Mendes Silva", unidadeOrg: "Inspeção Estamparia", posicao: "Inspetor da Qualidade Solda" },
  { numPessoal: 52187, nome: "André Ferreira Santos", unidadeOrg: "Engenharia de Processos", posicao: "Engenheiro de Processos" },
  { numPessoal: 41290, nome: "Juliana Santos Oliveira", unidadeOrg: "Produção Estamparia", posicao: "Supervisora de Turno" },
  { numPessoal: 30122, nome: "Marcos Vinicius Barbosa", unidadeOrg: "Solda Toyota", posicao: "Operador de Robô Solda Ponto" },
  { numPessoal: 30123, nome: "Felipe Almeida Castro", unidadeOrg: "Estamparia Tandem", posicao: "Prensista A" },
  { numPessoal: 30124, nome: "Thiago Ramos Pinheiro", unidadeOrg: "Solda Honda", posicao: "Operador Célula Robô" },
  { numPessoal: 30125, nome: "Lucas Gabriel Duarte", unidadeOrg: "Solda Hyundai", posicao: "Inspetor de Linha" },
  { numPessoal: 30126, nome: "Diego Henrique Costa", unidadeOrg: "Solda Geral", posicao: "Operador Solda MIG" },
  { numPessoal: 30127, nome: "Rafael Augusto Souza", unidadeOrg: "Estamparia Progressiva", posicao: "Ajustador de Estampos" },
  { numPessoal: 30128, nome: "Gabriel Martins Ribeiro", unidadeOrg: "Controle da Qualidade", posicao: "Auditor de Produto" },
  { numPessoal: 30129, nome: "Alexandre Pires Lima", unidadeOrg: "Manutenção Industrial", posicao: "Técnico Mecânico" },
  { numPessoal: 30130, nome: "Vinicius Nogueira", unidadeOrg: "Logística Fabril", posicao: "Operador Empilhadeira" }
];

// ============================================================================
// DADOS DE REFERÊNCIA: CATÁLOGO GERAL DE PEÇAS GESTAMP
// (Base SharePoint: 'lista_geral_peças_aa3' -> 'colpecasgerais_AA3')
// ============================================================================
const INITIAL_PECAS: PecaCatalogo[] = [
  // --- TOYOTA (COROLLA / YARIS / COROLLA CROSS) ---
  { 
    identificacao: 1, 
    material: "10045210", 
    descricao: "PAINEL DIANTEIRO INFERIOR COMPLETO", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 04 - SOLDA PONTO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 0, 
    codCliText: "53201-0D120", 
    componente: "53201-0D120 - PAINEL DIANTEIRO", 
    carryOver: "Não",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim"
  },
  { 
    identificacao: 2, 
    material: "10045211", 
    descricao: "REFORÇO SUPERIOR PAINEL DIANTEIRO", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 04 - SOLDA PONTO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "53201-0D121", 
    componente: "53201-0D121 - REFORÇO SUPERIOR", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Não"
  },
  { 
    identificacao: 3, 
    material: "10045212", 
    descricao: "SUPORTE FIXAÇÃO TRAVA CAPÔ C/ PORCA M8", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 06 - PROJEÇÃO PORCA/PARAFUSO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "53201-0D122", 
    componente: "53201-0D122 - SUPORTE TRAVA CAPÔ", 
    carryOver: "Não",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim"
  },
  { 
    identificacao: 4, 
    material: "10045280", 
    descricao: "CONJUNTO SUPORTE RADIADOR", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 02 - PRENSA TRANSFER LINHA B", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 0, 
    codCliText: "53205-0D080", 
    componente: "53205-0D080 - SUPORTE RADIADOR", 
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não"
  },
  { 
    identificacao: 5, 
    material: "10045281", 
    descricao: "SUPORTE LATERAL RADIADOR LH", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "53205-0D081", 
    componente: "53205-0D081 - SUPORTE LH", 
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não"
  },
  { 
    identificacao: 6, 
    material: "10045300", 
    descricao: "LONGARINA DIANTEIRA COMPLETA RH (CROSS)", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 07 - GEOMETRIA SOLDA TOYOTA", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 0, 
    codCliText: "57011-02230", 
    componente: "57011-02230 - LONGARINA RH", 
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim"
  },
  { 
    identificacao: 7, 
    material: "10045301", 
    descricao: "FECHAMENTO INTERNO LONGARINA RH", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 01 - PRENSA TANDEM LINHA A", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "57011-02231", 
    componente: "57011-02231 - FECHAMENTO RH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim"
  },
  { 
    identificacao: 8, 
    material: "10045310", 
    descricao: "LONGARINA DIANTEIRA COMPLETA LH (CROSS)", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 07 - GEOMETRIA SOLDA TOYOTA", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 0, 
    codCliText: "57012-02230", 
    componente: "57012-02230 - LONGARINA LH", 
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim"
  },
  { 
    identificacao: 9, 
    material: "10045400", 
    descricao: "COLUNA CENTRAL B-PILLAR FORMADA A QUENTE", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 04 - SOLDA PONTO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 0, 
    codCliText: "61201-02380", 
    componente: "61201-02380 - COLUNA B", 
    carryOver: "Não",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim"
  },

  // --- HONDA (CITY / HR-V) ---
  { 
    identificacao: 10, 
    material: "20088100", 
    descricao: "TRAVESSA DIANTEIRA SUPERIOR", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 08 - GEOMETRIA SOLDA HONDA", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 0, 
    codCliText: "71101-T9A-M00", 
    componente: "71101-T9A-M00 - TRAVESSA SUP", 
    carryOver: "Não" 
  },
  { 
    identificacao: 11, 
    material: "20088101", 
    descricao: "SUPORTE CENTRAL DA BUZINA HONDA", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 1, 
    codCliText: "71101-T9A-M01", 
    componente: "71101-T9A-M01 - SUPORTE BUZINA", 
    carryOver: "Sim" 
  },
  { 
    identificacao: 12, 
    material: "20088200", 
    descricao: "CONJUNTO PAINEL TRASEIRO (HR-V)", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 08 - GEOMETRIA SOLDA HONDA", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 0, 
    codCliText: "65100-3W0-M00", 
    componente: "65100-3W0-M00 - PAINEL TRASEIRO", 
    carryOver: "Não" 
  },
  { 
    identificacao: 13, 
    material: "20088201", 
    descricao: "GUIA LANTERNA TRASEIRA ESQUERDA", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 1, 
    codCliText: "65100-3W0-M01", 
    componente: "65100-3W0-M01 - GUIA LANTERNA LH", 
    carryOver: "Não" 
  },
  { 
    identificacao: 14, 
    material: "20088300", 
    descricao: "CAIXA DE RODA DIANTEIRA LH", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 01 - PRENSA TANDEM LINHA A", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 0, 
    codCliText: "60610-TG0-T00", 
    componente: "60610-TG0-T00 - CX RODA LH", 
    carryOver: "Não" 
  },

  // --- HYUNDAI (HB20 / CRETA) ---
  { 
    identificacao: 15, 
    material: "30077100", 
    descricao: "LONGARINA TRASEIRA COMPLETA LH (HB20)", 
    cliente: "HYUNDAI", 
    cliente1: "HYUNDAI", 
    posto: "POSTO 09 - GEOMETRIA SOLDA HYUNDAI", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 0, 
    codCliText: "64510-1S000", 
    componente: "64510-1S000 - LONGARINA TRAS LH", 
    carryOver: "Não" 
  },
  { 
    identificacao: 16, 
    material: "30077101", 
    descricao: "REFORÇO DO GANCHO DE REBOQUE LH", 
    cliente: "HYUNDAI", 
    cliente1: "HYUNDAI", 
    posto: "POSTO 06 - PROJEÇÃO PORCA/PARAFUSO", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 1, 
    codCliText: "64510-1S001", 
    componente: "64510-1S001 - REFORÇO REBOQUE", 
    carryOver: "Sim" 
  },
  { 
    identificacao: 17, 
    material: "30077200", 
    descricao: "SUPORTE DO MÓDULO FRONTAL (CRETA)", 
    cliente: "HYUNDAI", 
    cliente1: "HYUNDAI", 
    posto: "POSTO 09 - GEOMETRIA SOLDA HYUNDAI", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 0, 
    codCliText: "64101-BV000", 
    componente: "64101-BV000 - MODULO FRONTAL", 
    carryOver: "Não" 
  },

  // --- VOLKSWAGEN (POLO / VIRTUS / NIVUS / T-CROSS) ---
  { 
    identificacao: 18, 
    material: "40099100", 
    descricao: "CAIXA DE RODA DIANTEIRA LH (POLO/NIVUS)", 
    cliente: "TDB - INDAIATUBA", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 10 - GEOMETRIA SOLDA VOLKSWAGEN", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "2G0.803.101.C", 
    componente: "2G0.803.101.C - CAIXA DE RODA LH", 
    carryOver: "Não" 
  },
  { 
    identificacao: 19, 
    material: "40099101", 
    descricao: "FLANGE DE LIGAÇÃO SUSPENSÃO LH", 
    cliente: "TDB - INDAIATUBA", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "ESTAMPARIA PROGRESSIVAS", 
    nestingLevel: 1, 
    codCliText: "2G0.803.101.01", 
    componente: "2G0.803.101.01 - FLANGE SUSP LH", 
    carryOver: "Sim" 
  },
  { 
    identificacao: 20, 
    material: "40099200", 
    descricao: "CAIXA DE RODA DIANTEIRA RH (POLO/NIVUS)", 
    cliente: "TDB - INDAIATUBA", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 10 - GEOMETRIA SOLDA VOLKSWAGEN", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "2G0.803.102.C", 
    componente: "2G0.803.102.C - CAIXA DE RODA RH", 
    carryOver: "Não" 
  },
  { 
    identificacao: 21, 
    material: "40099300", 
    descricao: "PAINEL TRANSVERSAL DIANTEIRO (VIRTUS)", 
    cliente: "TDB - INDAIATUBA", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 01 - PRENSA TANDEM LINHA A", 
    fmds: "ESTAMPARIA TANDEM", 
    nestingLevel: 0, 
    codCliText: "2G0.805.591.A", 
    componente: "2G0.805.591.A - PAINEL TRANSVERSAL", 
    carryOver: "Não" 
  },
  { 
    identificacao: 22, 
    material: "40099400", 
    descricao: "LONGARINA TRASEIRA COMPLETA (T-CROSS)", 
    cliente: "TDB - INDAIATUBA", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 10 - GEOMETRIA SOLDA VOLKSWAGEN", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "2GP.803.501", 
    componente: "2GP.803.501 - LONGARINA TRAS T-CROSS", 
    carryOver: "Não" 
  },

  // --- STELLANTIS (TORO / RENEGADE / COMPASS / COMMANDER) ---
  { 
    identificacao: 23, 
    material: "50011948", 
    descricao: "TRAVESSA SUSPENSÃO TRASEIRA (TORO)", 
    cliente: "KDB - SOROCABA", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 11 - GEOMETRIA SOLDA STELLANTIS", 
    fmds: "OUTROS", 
    nestingLevel: 0, 
    codCliText: "52012948", 
    componente: "52012948 - TRAVESSA SUSPENSÃO", 
    carryOver: "Não" 
  },
  { 
    identificacao: 24, 
    material: "50011949", 
    descricao: "BRAÇO ESTRUTURAL ESQUERDO DA SUSPENSÃO", 
    cliente: "KDB - SOROCABA", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 05 - SOLDA MIG/MAG ROBÔ ABB CÉLULA 2", 
    fmds: "OUTROS", 
    nestingLevel: 1, 
    codCliText: "52012949", 
    componente: "52012949 - BRAÇO LH", 
    carryOver: "Sim" 
  },
  { 
    identificacao: 25, 
    material: "50011950", 
    descricao: "BRAÇO ESTRUTURAL DIREITO DA SUSPENSÃO", 
    cliente: "KDB - SOROCABA", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 05 - SOLDA MIG/MAG ROBÔ ABB CÉLULA 2", 
    fmds: "OUTROS", 
    nestingLevel: 1, 
    codCliText: "52012950", 
    componente: "52012950 - BRAÇO RH", 
    carryOver: "Sim" 
  },
  { 
    identificacao: 26, 
    material: "50012812", 
    descricao: "BERÇO MOTOR E SUB-CHASSI DIANTEIRO (COMPASS)", 
    cliente: "KDB - SOROCABA", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 11 - GEOMETRIA SOLDA STELLANTIS", 
    fmds: "OUTROS", 
    nestingLevel: 0, 
    codCliText: "52044812", 
    componente: "52044812 - BERÇO MOTOR COMPASS", 
    carryOver: "Não" 
  }
];

// ============================================================================
// DADOS DE REFERÊNCIA: RNCs INICIAIS
// (Base SharePoint: 'Resumo dos Incidentes de qualidade')
// ============================================================================
const INITIAL_RNCS: RNCRecord[] = [
  {
    id: 6119,
    title: "6119",
    field1: "RNC-6119",
    tipoRnc: "Informal",
    status: "Em Andamento",
    cliente: "HYUNDAI",
    dataOcorrencia: "2026-10-19",
    dataOficializacao: "2026-10-19",
    classificacaoSetor: "Qualidade",
    setorDeteccao: "montagem",
    impactoCliente: "peça amassada, gerando montagem incorreta",
    turno: "1º Turno",
    produto: "U005000B6 - 69100-BX500 - 69100BX500 PNL ASSY-BACK COMPLETE",
    componente: "69100-BX000 - BACK COMPLETE",
    finalComponente: "Peça Final",
    quantidadeAfetada: 1,
    modoFalha: "Deformação",
    detalhamentoOcorrencia: "Ponto de SOLDA  Pegou  fora Dedevido a PEÇA AMASSADA ",
    descricaoProblema: "Ponto de SOLDA  Pegou  fora Dedevido a PEÇA AMASSADA ",
    descricaoCompleta: "Ponto de SOLDA  Pegou  fora Dedevido a PEÇA AMASSADA ",
    descricaoProblemaInterno: "PEÇA AMASSADA /DEFORMADO ",
    fotoPecaNg: "https://gitservices.sharepoint.com/sites/QualityGate/Lists/Resumo%20dos%20Incidentes%20de%20qualidade/Attachments/6119/Reserved_ImageAttachment_[32]_[Foto_x0020_da_x0020_pe_x00e7_a_x][32]_[0638902df5f44ae7a6b0cec5132c4ff7][1]_[2].jpeg",
    fotoPecaOk: "https://gitservices.sharepoint.com/sites/QualityGate/Lists/Resumo%20dos%20Incidentes%20de%20qualidade/Attachments/6119/Reserved_ImageAttachment_[30]_[Foto_x0020_pe_x00e7_a_x0020_OK][32]_[0f9d95996d23445f8c664a581162e9e7][1]_[4].jpeg",
    fotoAuxiliar: "https://gitservices.sharepoint.com/sites/QualityGate/Lists/Resumo%20dos%20Incidentes%20de%20qualidade/Attachments/6119/Reserved_ImageAttachment_[32]_[Foto_x0020_auxiliar_x0020__x0028][32]_[a763c4884f9b4b719697fea0cdd14a44][1]_[6].jpeg",
    caracteristicaSeguranca: "Não",
    coProduto: "Não",
    carryOver: "Não",
    reincidente: "SIM",
    dataReincidente: "2025-06-13",
    gravidade: "Dimensional",
    possivelDetectar: "SIM",
    tipoDeteccao: "Visual",
    posto: "B643033 - ROBÔ 33",
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI",
    acoesContencao: "INSPEÇÃO 100% NO POSTO DE TRABALHO; RETRABALHAR",
    dataContencao: "2026-10-20",
    qtdInspecionada: 1,
    qtdSuspeita: 1,
    qtdBloqueada: 1,
    oQueFazer: "Seleção Visual PEÇAS com deformação Segregar para RETRABALHO E AVISAR QUALIDADE ",
    comoFazer: "Peças DEFORMADAS RETRABALHAR COM CALIBRADOR E DESEMPENAR A REGIÃO, após RETRABALHO NECESSÁRIO PASSAR EM DCO. A QUALIDADE VALIDAR DIMENSIONAL ",
    porQueFazer: "Encontrado na montagem PEÇA AMASSADA ",
    quemFara: "LEANDRO APARECIDO POSSOMATO",
    quandoFara: "2026-10-19",
    ondeFara: "Quarentena/RETRABALHO ",
    documentoRastreabilidade: "Etiqueta SAP",
    codigoRastreabilidade: "668360689",
    protcliente: "Sim",
    abrir8D: "Não",
    detector: "LEANDRO SERAFIM DE LIMA",
    reDetector: 32,
    participantesAtendimento: "LEANDRO SERAFIM DE LIMA;PAULO HENRIQUE VICENTE;LUIS HENRIQUE CAMARGO FELICIO",
    recomendacoesProvidencias: "Orientar TODOS ENVOLVIDOS "
  },
  {
    id: 101,
    title: "101",
    field1: "RNC-2026-0101",
    tipoRnc: "Formal",
    status: "Em Andamento",
    cliente: "TDB - SOROCABA",
    dataOcorrencia: "2026-10-14",
    dataOficializacao: "2026-10-14",
    classificacaoSetor: "SOLDA 2 - CEL. TOYOTA",
    setorDeteccao: "Linha de Montagem Cliente (Indaiatuba)",
    impactoCliente: "Porca de fixação com risco de soltura na montagem do chicote",
    turno: "1º Turno",
    produto: "53201-0D120",
    componente: "53201-0D122 - SUPORTE FIXAÇÃO TRAVA CAPÔ C/ PORCA M8",
    finalComponente: "Peça Final",
    quantidadeAfetada: 18,
    modoFalha: "Falta / excesso de solda",
    descricaoProblema: "Porca M8 de fixação solta / falta de fusão na projeção da solda (Posto 04).",
    descricaoCompleta: "Identificado pelo operador da montadora no momento do encaixe do chicote e fixação do suporte.",
    fotoPecaNg: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80",
    fotoPecaOk: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=80",
    caracteristicaSeguranca: "Sim",
    coProduto: "Não",
    carryOver: "Não",
    reincidente: "SIM",
    dataReincidente: "2026-08-20",
    gravidade: "Crítica",
    possivelDetectar: "Sim - Poka Yoke de sensor de torque e corrente",
    tipoDeteccao: "Inspeção Visual / Teste Destrutivo Cinzel",
    posto: "POSTO 04 - SOLDA PONTO",
    fmds: "SOLDA 2 - CEL. TOYOTA",
    acoesContencao: "Retenção imediata dos lotes em trânsito e inspeção 100% com torquímetro calibrado.",
    dataContencao: "2026-10-14",
    qtdInspecionada: 250,
    qtdSuspeita: 42,
    qtdBloqueada: 42,
    oQueFazer: "Realizar inspeção com torquímetro em 100% dos racks no estoque avançado e armazém.",
    comoFazer: "Aplicar 35 N.m na porca com chave calibrada e marcar com tinta amarela.",
    porQueFazer: "Garantir torque mínimo de segurança especificado pelo cliente.",
    quemFara: "Roberto Mendes Silva (Inspqual)",
    quandoFara: "2026-10-14 14:00",
    ondeFara: "Galpão Gestamp & Armazém Toyota",
    documentoRastreabilidade: "Etiqueta SAP",
    codigoRastreabilidade: "984210543",
    protcliente: "Sim",
    abrir8D: "Sim",
    detector: "Carlos Eduardo Ferreira",
    reDetector: 89452
  },
  {
    id: 102,
    title: "102",
    field1: "RNC-2026-0102",
    tipoRnc: "Interno",
    status: "Relatório Inicial",
    cliente: "TDB - INDAIATUBA",
    dataOcorrencia: "2026-10-17",
    dataOficializacao: "2026-10-17",
    classificacaoSetor: "ESTAMPARIA PROGRESSIVAS",
    setorDeteccao: "Posto de Controle Visual de Estamparia",
    impactoCliente: "Risco de corte no manuseio e interferência na montagem de suspensão",
    turno: "2º Turno",
    produto: "2G0.803.101.C",
    componente: "2G0.803.101.01 - FLANGE DE LIGAÇÃO SUSPENSÃO LH",
    finalComponente: "Componente",
    quantidadeAfetada: 45,
    modoFalha: "Rebarba / Canto Vivo",
    descricaoProblema: "Rebarba excessiva na borda estampada por desgaste prematuro da punção de corte.",
    descricaoCompleta: "Verificado no início do lote pelo operador da prensa na troca de turno.",
    caracteristicaSeguranca: "Não",
    coProduto: "Sim",
    carryOver: "Sim",
    reincidente: "NÃO",
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS",
    fmds: "ESTAMPARIA PROGRESSIVAS",
    documentoRastreabilidade: "Etiqueta SAP",
    codigoRastreabilidade: "784512963",
    protcliente: "Não",
    abrir8D: "Não",
    detector: "Roberto Mendes Silva",
    reDetector: 64129
  },
  {
    id: 103,
    title: "103",
    field1: "RNC-2026-0103",
    tipoRnc: "Formal",
    status: "Concluído",
    cliente: "HONDA",
    dataOcorrencia: "2026-09-28",
    dataOficializacao: "2026-09-28",
    classificacaoSetor: "SOLDA 3 - CEL. HONDA/HYUNDAI",
    setorDeteccao: "Inspeção Final de Peça Montada",
    impactoCliente: "Impedimento de rosqueamento do parafuso M6 no cliente Honda",
    turno: "3º Turno",
    produto: "71101-T9A-M00",
    componente: "71101-T9A-M01 - SUPORTE CENTRAL DA BUZINA HONDA",
    finalComponente: "Peça Final + Componente",
    quantidadeAfetada: 6,
    modoFalha: "Respingo de Solda",
    descricaoProblema: "Respingo de solda no orifício roscado M6 impedindo roscamento do parafuso.",
    caracteristicaSeguranca: "Não",
    coProduto: "Não",
    carryOver: "Não",
    reincidente: "NÃO",
    posto: "POSTO 08 - GEOMETRIA SOLDA HONDA",
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI",
    acoesContencao: "Limpeza com macho roscador e instalação de cortina de ar anti-respingo no bico de solda.",
    dataContencao: "2026-09-29",
    documentoRastreabilidade: "Etiqueta SAP",
    codigoRastreabilidade: "561234890",
    protcliente: "Aprovado",
    dataPagamento: "2026-10-02",
    abrir8D: "Sim",
    detector: "Mariana Souza Lima",
    reDetector: 76512,
    responsavelConclusao: "Carlos Eduardo Ferreira (RE: 89452)",
    dataConclusao: "2026-10-05",
    observacoesConclusao: "Ações D1 a D8 finalizadas e validadas pela engenharia Honda."
  },
  {
    id: 5970,
    title: "5970",
    field1: "RNC-5970",
    tipoRnc: "Formal",
    status: "Em Andamento",
    cliente: "TDB - SOROCABA",
    dataOcorrencia: "2026-10-05",
    dataOficializacao: "2026-10-05",
    classificacaoSetor: "SOLDA 2 - CEL. TOYOTA",
    setorDeteccao: "Linha de Solda Toyota",
    impactoCliente: "Gap entre chapas gerando interferência no encaixe da carroceria",
    turno: "1º Turno",
    produto: "L362000B6",
    componente: "L362000B6 - SUPORTE FIXAÇÃO ESTRUTURAL",
    finalComponente: "Peça Final",
    quantidadeAfetada: 1,
    modoFalha: "Dimensional fora do especificado",
    descricaoProblema: "Gap entre chapas detectado no posto com calibrador de folga.",
    fotoPecaNg: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80",
    caracteristicaSeguranca: "Sim",
    coProduto: "Não",
    carryOver: "Não",
    reincidente: "NÃO",
    posto: "B643048 - ROBÔ 48",
    fmds: "SOLDA 2 - CEL. TOYOTA",
    documentoRastreabilidade: "Não Informado",
    abrir8D: "Sim",
    detector: "Jeferson Abner Garcia Neres",
    reDetector: 48912
  },
  {
    id: 5507,
    title: "5507",
    field1: "RNC-5507",
    tipoRnc: "Formal",
    status: "Em Andamento",
    cliente: "TDB - SOROCABA",
    dataOcorrencia: "2026-08-14",
    dataOficializacao: "2026-08-14",
    classificacaoSetor: "ESTAMPARIA TANDEM",
    setorDeteccao: "Linha Prensa Tandem",
    impactoCliente: "Trinca no raio de repuxo com perda de resistência estrutural",
    turno: "2º Turno",
    produto: "L309000B6",
    componente: "L309000B6 - REFORÇO LATERAL ESTAMPADO",
    finalComponente: "Peça Final",
    quantidadeAfetada: 12,
    modoFalha: "Trinca (Produto)",
    descricaoProblema: "Trinca longitudinal no raio de repuxo da prensa 116.",
    fotoPecaNg: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=80",
    caracteristicaSeguranca: "Não",
    coProduto: "Não",
    carryOver: "Sim",
    reincidente: "NÃO",
    posto: "B625116 - PRENSA 116",
    fmds: "ESTAMPARIA TANDEM",
    documentoRastreabilidade: "Etiqueta SAP",
    codigoRastreabilidade: "SAP-883921",
    abrir8D: "Sim",
    detector: "Carlos Eduardo Ferreira",
    reDetector: 89452
  },
  {
    id: 5470,
    title: "5470",
    field1: "RNC-5470",
    tipoRnc: "Formal",
    status: "RNC Emitida",
    cliente: "HONDA",
    dataOcorrencia: "2026-08-03",
    dataOficializacao: "2026-08-03",
    classificacaoSetor: "SOLDA 3 - CEL. HONDA/HYUNDAI",
    setorDeteccao: "Inspeção de Saída de Racks",
    impactoCliente: "Divergência de contagem de peças no lote entregue ao cliente",
    turno: "1º Turno",
    produto: "H018000B6",
    componente: "H018000B6 - TRAVESSA INFERIOR HONDA",
    finalComponente: "Peça Final",
    quantidadeAfetada: 4,
    modoFalha: "Peças a mais",
    descricaoProblema: "Divergência de contagem de peças no rack de expedição.",
    fotoPecaNg: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80",
    caracteristicaSeguranca: "Não",
    coProduto: "Não",
    carryOver: "Não",
    reincidente: "NÃO",
    posto: "B643040 - ROBÔ 40",
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI",
    documentoRastreabilidade: "Etiqueta SAP",
    codigoRastreabilidade: "SAP-441290",
    abrir8D: "Sim",
    detector: "Mariana Souza Lima",
    reDetector: 76512
  },
  {
    id: 5400,
    title: "5400",
    field1: "RNC-5400",
    tipoRnc: "Formal",
    status: "Em Andamento",
    cliente: "BOSHOKU",
    dataOcorrencia: "2026-07-30",
    dataOficializacao: "2026-07-30",
    classificacaoSetor: "ESTAMPARIA PROGRESSIVAS",
    setorDeteccao: "Estamparia Linha 82",
    impactoCliente: "Deformação do gancho impossibilitando montagem no dispositivo",
    turno: "3º Turno",
    produto: "B010000B6",
    componente: "B01000AB6",
    finalComponente: "Peça Final + Componente",
    quantidadeAfetada: 2,
    modoFalha: "Gancho deformado",
    descricaoProblema: "Deformação do gancho de ancoragem no estampo progressivo.",
    fotoPecaNg: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop&q=80",
    caracteristicaSeguranca: "Não",
    coProduto: "Sim",
    carryOver: "Não",
    reincidente: "NÃO",
    posto: "B624082 - PRENSA 82",
    fmds: "ESTAMPARIA PROGRESSIVAS",
    documentoRastreabilidade: "Não Informado",
    abrir8D: "Sim",
    detector: "Roberto Mendes Silva",
    reDetector: 64129
  }
];

const INITIAL_RASTREABILIDADES: RastreabilidadeItem[] = [
  { 
    id: 1, 
    tenant_id: PILOT_TENANT_ID,
    idRnc: 1, 
    codComp: "", 
    produto: "U005000B6", 
    tipoRastreamento: "Peça Final", 
    codRastreabilidade: "668360689", 
    docRastreabilidade: "Etiqueta SAP", 
    seqRelacionada: 1, 
    comando: "rp", 
    statusGeral: "R", 
    statusVerif: "OK", 
    dataHora: "2026-10-19",
    ocorrenciaAbrangencia: "Ocorrência",
    observacao: "",
    bloqueado: true
  },
  { id: 2, tenant_id: PILOT_TENANT_ID, idRnc: 2, codComp: "53201-0D120", produto: "53201-0D120", tipoRastreamento: "Peça Final", codRastreabilidade: "984210543", docRastreabilidade: "Etiqueta SAP", seqRelacionada: 12048592, comando: "rp", statusGeral: "R", statusVerif: "OK", dataHora: "2026-10-14 15:30", ocorrenciaAbrangencia: "Ocorrência" },
  { id: 3, tenant_id: PILOT_TENANT_ID, idRnc: 3, codComp: "2G0.803.101.C", produto: "2G0.803.101.C", tipoRastreamento: "Peça Final", codRastreabilidade: "784512963", docRastreabilidade: "Etiqueta SAP", seqRelacionada: 14092841, comando: "vp", statusGeral: "R", statusVerif: "OK", dataHora: "2026-10-17 19:10", ocorrenciaAbrangencia: "Ocorrência" }
];

const INITIAL_ETIQUETAS_VIVAS: EtiquetaVivaParsed[] = [
  { tenant_id: PILOT_TENANT_ID, idRnc: 2, seqRel: "12048592", produto: "53201-0D120", etiquetasap: "984210543", lote: "L-261014-01", qtd: 24, deposito: "DEP-01", data: "2026-10-14", bloqueio: "Qualidade", statusBloqueio: "desbloq" },
  { tenant_id: PILOT_TENANT_ID, idRnc: 2, seqRel: "12048592", produto: "53201-0D120", etiquetasap: "984210544", lote: "L-261014-02", qtd: 18, deposito: "DEP-01", data: "2026-10-14", bloqueio: "Qualidade", statusBloqueio: "desbloq" }
];

const INITIAL_LOTES_SAP: LoteSAPParsed[] = [
  { tenant_id: PILOT_TENANT_ID, idRnc: 1, seqRel: "1", produto: "U005000B6", lote: "28926", qtd: 308, data: "2026-10-16" },
  { tenant_id: PILOT_TENANT_ID, idRnc: 2, seqRel: "12048592", produto: "53201-0D120", lote: "L-261014-01", qtd: 24, data: "2026-10-14" },
  { tenant_id: PILOT_TENANT_ID, idRnc: 2, seqRel: "12048592", produto: "53201-0D120", lote: "L-261014-02", qtd: 18, data: "2026-10-14" }
];

const INITIAL_RAST_CABECEIRAS: RastCabeceiraParsed[] = [
  { tenant_id: PILOT_TENANT_ID, idRnc: 2, seqRel: "12048592", produto: "53201-0D120", lote: "L-261014-01", qtd: 24, estoque: "Em Quarentena" }
];

const INITIAL_TREINAMENTOS: RegistroTreinamento[] = [
  { id: 1, tenant_id: PILOT_TENANT_ID, idRnc: 2, re: 30122, nomeColaborador: "Marcos Vinicius Barbosa", produto: "COROLLA (53201-0D120)", defeito: "Falta de fusão em porca M8", dataTreinamento: "2026-10-15", responsavel: "Carlos Eduardo Ferreira" },
  { id: 2, tenant_id: PILOT_TENANT_ID, idRnc: 2, re: 30123, nomeColaborador: "Felipe Almeida Castro", produto: "COROLLA (53201-0D120)", defeito: "Falta de fusão em porca M8", dataTreinamento: "2026-10-15", responsavel: "Carlos Eduardo Ferreira" }
];

const INITIAL_ALERTAS: AlertaQualidadeRegistro[] = [
  { id: 1, tenant_id: PILOT_TENANT_ID, idRnc: 2, produto: "COROLLA", componente: "53201-0D120", defeito: "Porca M8 com solda fria", dataDivulgacao: "2026-10-14", responsavel: "Carlos Eduardo Ferreira", postosDivulgados: "Posto 04, Posto 05, Célula Toyota" }
];

// ============================================================================
// HELPER INDEXEDDB ASSÍNCRONO PARA BASES VOLUMOSAS (>5MB)
// Evita bloqueio da thread UI e contorna a limitação de cota do localStorage
// ============================================================================
function openSORDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open('gestamp_sor_cache_v2', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openSORDatabase();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openSORDatabase();
    if (!db) return;
    const tx = db.transaction('store', 'readwrite');
    const store = tx.objectStore('store');
    store.put(value, key);
  } catch (e) {
    console.warn('[IDB] Erro ao salvar chave:', key, e);
  }
}

// ============================================================================
// CLASSE SINGLETON: GERENCIADOR DE DADOS SHAREPOINT
// ============================================================================
class SharePointDataStore {
  private rncs: RNCRecord[] = [];
  // Chave composta "${tenant_id}__${id}" para permitir que cada empresa tenha sua própria contagem 1, 2, 3...
  private rncMap: Map<string, RNCRecord> = new Map();
  private users: UsuarioQualidade[] = [];
  private baseAtivos: ColaboradorBaseAtivos[] = [];
  private pecas: PecaCatalogo[] = [];
  private cachedPostos: string[] = [];
  private cachedFMDS: string[] = [];
  private cachedClientes: string[] = [];
  private produtosPorClienteCache = new Map<string, PecaCatalogo[]>();
  private componentesPorProdutoCache = new Map<string, PecaCatalogo[]>();
  private rastreabilidades: RastreabilidadeItem[] = [];
  private etiquetasVivas: EtiquetaVivaParsed[] = [];
  private lotesSAP: LoteSAPParsed[] = [];
  private rastCabeceiras: RastCabeceiraParsed[] = [];
  private treinamentos: RegistroTreinamento[] = [];
  private alertas: AlertaQualidadeRegistro[] = [];
  private currentUser: UsuarioQualidade = INITIAL_USERS[0];
  private lastHeartbeat: Date = new Date();
  private lastSyncTime: number = 0;
  private connectionState: SharePointConnectionState = {
    siteUrl: localStorage.getItem('gestamp_sp_site_url') || 'https://gestamp.sharepoint.com/sites/qualidade-sor',
    accessToken: localStorage.getItem('gestamp_sp_token') || '',
    mode: (localStorage.getItem('gestamp_sp_mode') as 'local' | 'sharepoint') || 'local',
    connected: false
  };

  private listFiltersState: ListFiltersState = {
    tipoFilter: 'Tudo',
    statusFilter: 'Todas',
    setorFilter: 'Todos',
    tipoRncFilter: 'Todos',
    clienteFilter: 'Todos',
    areaFilter: 'Todas',
    searchInput: '',
    viewMode: 'grid',
    currentPage: 1
  };

  constructor() {
    this.loadFromStorage();
  }

  private getRncCompositeKey(tenantId: string | undefined, rncId: number | string): string {
    return `${tenantId || PILOT_TENANT_ID}__${Number(rncId)}`;
  }

  public getListFiltersState(): ListFiltersState {
    return { ...this.listFiltersState };
  }

  public setListFiltersState(state: Partial<ListFiltersState>) {
    this.listFiltersState = { ...this.listFiltersState, ...state };
  }

  private indexRNCs() {
    this.rncs = this.rncs.map(normalizeRncRecordCasing);
    this.rncs.sort((a, b) => b.id - a.id);
    this.rncMap.clear();
    for (let i = 0; i < this.rncs.length; i++) {
      const r = this.rncs[i];
      const tId = r.tenant_id || PILOT_TENANT_ID;
      r.tenant_id = tId;
      this.rncMap.set(this.getRncCompositeKey(tId, r.id), r);
      (r as any)._searchStr = `${r.id} ${r.field1 || ''} ${r.cliente || ''} ${r.produto || ''} ${r.componente || ''} ${r.codigoRastreabilidade || ''} ${r.descricaoProblema || ''} ${r.participantesAtendimento || ''} ${r.setorDeteccao || ''}`.toLowerCase();
    }
  }

  private indexPecas() {
    this.pecas = this.pecas.map(normalizePecaCasing);
    const postos = new Set<string>();
    const fmds = new Set<string>();
    const clientes = new Set<string>();
    for (let i = 0; i < this.pecas.length; i++) {
      const p = this.pecas[i];
      if (p.posto) postos.add(p.posto);
      if (p.fmds) fmds.add(p.fmds);
      if (p.cliente) clientes.add(p.cliente);
    }
    this.cachedPostos = Array.from(postos).sort();
    this.cachedFMDS = Array.from(fmds).sort();
    this.cachedClientes = Array.from(clientes).sort();
    this.produtosPorClienteCache.clear();
    this.componentesPorProdutoCache.clear();
  }

  /**
   * Normaliza RNCs legadas que tinham numeração global (ex: 6119..6128, 8001, 8002...)
   * para numeração individual por empresa começando de 1 em diante (1, 2, 3...).
   * Só é executado na migração inicial para v2; após migrado, respeita estritamente
   * o contador monotônico (se excluiu a 2, a próxima será 3).
   */
  private normalizeLegacyGlobalIdsToPerTenant(legacyRncs: RNCRecord[]): RNCRecord[] {
    const seedRncs = tenantService.getInitialRncsForSeed();
    const resultMap = new Map<string, RNCRecord>();

    // 1. Insere os seeds oficiais por empresa (GPM Serviços: 1..10, Metalúrgica Vale: 1)
    seedRncs.forEach(s => {
      const tId = s.tenant_id || PILOT_TENANT_ID;
      resultMap.set(this.getRncCompositeKey(tId, s.id), { ...s, tenant_id: tId });
    });

    // 2. Preserva apenas RNCs criadas em novas empresas (ou extras) re-sequenciando de 1 em diante na migração
    const customByTenant = new Map<string, RNCRecord[]>();
    legacyRncs.forEach(r => {
      const tId = r.tenant_id || PILOT_TENANT_ID;
      if (tId !== PILOT_TENANT_ID && tId !== 'tenant-metalurgica-vale') {
        const list = customByTenant.get(tId) || [];
        list.push(r);
        customByTenant.set(tId, list);
      }
    });

    customByTenant.forEach((list, tId) => {
      list.sort((a, b) => a.id - b.id);
      let seq = 0;
      const year = new Date().getFullYear();
      list.forEach(item => {
        seq += 1;
        const normalized: RNCRecord = {
          ...item,
          id: seq,
          tenant_id: tId,
          title: String(seq),
          field1: `RNC-${year}-${String(seq).padStart(4, '0')}`
        };
        resultMap.set(this.getRncCompositeKey(tId, seq), normalized);
      });
      tenantService.ensureTenantRncSequenceAtLeast(tId, seq, true);
    });

    tenantService.ensureTenantRncSequenceAtLeast(PILOT_TENANT_ID, 10);
    tenantService.ensureTenantRncSequenceAtLeast('tenant-metalurgica-vale', 1);

    return Array.from(resultMap.values());
  }

  private loadFromStorage() {
    try {
      const savedRncsV2 = localStorage.getItem('sor_saas_rncs_v2');
      if (savedRncsV2) {
        const parsed: RNCRecord[] = JSON.parse(savedRncsV2);
        this.rncs = parsed;
        // Garante que o contador monotônico de cada empresa nunca seja menor que o maior ID já existente nela
        const maxByTenant = new Map<string, number>();
        this.rncs.forEach(r => {
          const tId = r.tenant_id || PILOT_TENANT_ID;
          const prev = maxByTenant.get(tId) || 0;
          if (r.id > prev) maxByTenant.set(tId, r.id);
        });
        maxByTenant.forEach((maxId, tId) => {
          tenantService.ensureTenantRncSequenceAtLeast(tId, maxId);
        });
      } else {
        // Primeira inicialização do modelo v2 (IDs iniciando em 1 para cada empresa)
        this.rncs = this.normalizeLegacyGlobalIdsToPerTenant([]);
        localStorage.setItem('sor_saas_rncs_v2', JSON.stringify(this.rncs));

        // Se havia RNCs de empresas novas salvas no IndexedDB v1, migra-as para 1, 2, 3...
        idbGet<RNCRecord[]>('rncs').then(legacyCached => {
          if (legacyCached && legacyCached.length > 0 && !localStorage.getItem('sor_saas_idb_migrated_v2')) {
            localStorage.setItem('sor_saas_idb_migrated_v2', 'true');
            const customLegacy = legacyCached.filter(
              r => r.tenant_id && r.tenant_id !== PILOT_TENANT_ID && r.tenant_id !== 'tenant-metalurgica-vale'
            );
            if (customLegacy.length > 0) {
              this.rncs = this.normalizeLegacyGlobalIdsToPerTenant(customLegacy);
              this.indexRNCs();
              this.saveToStorage();
              tenantService.recalculateTenantStorage(this.rncs);
            }
          }
        });
      }

      this.pecas = INITIAL_PECAS;

      const storedUsers = localStorage.getItem('gestamp_sor_users');
      const rawUsers: UsuarioQualidade[] = storedUsers ? JSON.parse(storedUsers) : INITIAL_USERS;
      this.users = rawUsers.map(u => {
        if (u.id === 1 || u.reAcesso === 104235 || u.email === 'admin@gpmservicos.com.br' || u.email === 'mluca@br.gestamp.com') {
          return {
            ...u,
            email: 'mhsolucoes@adimin.com.br',
            cargo: u.cargo === 'Gerente da Qualidade Corporativa' ? 'Diretor Executivo — MH Lean & Soluções' : u.cargo
          };
        }
        return u;
      });

      const storedAtivos = localStorage.getItem('gestamp_sor_ativos');
      const loadedAtivos: ColaboradorBaseAtivos[] = storedAtivos ? JSON.parse(storedAtivos) : [];
      const mapAtivos = new Map<number, ColaboradorBaseAtivos>();
      INITIAL_BASE_ATIVOS.forEach(a => mapAtivos.set(a.numPessoal, { ...a, nome: normalizeDisplayText(a.nome) }));
      loadedAtivos.forEach(a => mapAtivos.set(a.numPessoal, { ...a, nome: normalizeDisplayText(a.nome) }));
      this.baseAtivos = Array.from(mapAtivos.values());

      const storedRast = localStorage.getItem('gestamp_sor_rast_v2');
      this.rastreabilidades = storedRast ? JSON.parse(storedRast) : [...INITIAL_RASTREABILIDADES];

      const storedTags = localStorage.getItem('gestamp_sor_tags_v2');
      this.etiquetasVivas = storedTags ? JSON.parse(storedTags) : [...INITIAL_ETIQUETAS_VIVAS];

      const storedLotes = localStorage.getItem('gestamp_sor_lotes_v2');
      this.lotesSAP = storedLotes ? JSON.parse(storedLotes) : [...INITIAL_LOTES_SAP];

      const storedCab = localStorage.getItem('gestamp_sor_cab_v2');
      this.rastCabeceiras = storedCab ? JSON.parse(storedCab) : [...INITIAL_RAST_CABECEIRAS];

      const storedTrein = localStorage.getItem('gestamp_sor_trein_v2');
      if (storedTrein) {
        this.treinamentos = JSON.parse(storedTrein);
      } else {
        const treinMap = new Map<number, RegistroTreinamento>();
        INITIAL_TREINAMENTOS.forEach(t => treinMap.set(t.id, { ...t, tenant_id: t.tenant_id || PILOT_TENANT_ID }));
        tenantService.getInitialTreinamentosForSeed().forEach(t => treinMap.set(t.id, t));
        this.treinamentos = Array.from(treinMap.values());
      }

      const storedAlertas = localStorage.getItem('gestamp_sor_alertas_v2');
      this.alertas = storedAlertas ? JSON.parse(storedAlertas) : [...INITIAL_ALERTAS];

      const storedUserRE = localStorage.getItem('gestamp_sor_current_re');
      if (storedUserRE) {
        const found = this.users.find(u => u.reAcesso === Number(storedUserRE));
        if (found) this.currentUser = found;
      }
      if (this.currentUser.id === 1 || this.currentUser.reAcesso === 104235) {
        this.currentUser = { ...this.currentUser, email: 'mhsolucoes@adimin.com.br' };
      }

      this.indexRNCs();
      this.indexPecas();
      tenantService.recalculateTenantStorage(this.rncs);

      // Caso o localStorage de RNCs tenha excedido limite de tamanho por fotos, recupera do IndexedDB v2
      idbGet<RNCRecord[]>('rncs_v2').then(cachedRncsV2 => {
        if (cachedRncsV2 && cachedRncsV2.length > 0 && !localStorage.getItem('sor_saas_rncs_v2')) {
          this.rncs = cachedRncsV2;
          this.indexRNCs();
          tenantService.recalculateTenantStorage(this.rncs);
        }
      });

      idbGet<PecaCatalogo[]>('pecas').then(cachedPecas => {
        if (cachedPecas && cachedPecas.length > 0) {
          this.pecas = cachedPecas;
          this.indexPecas();
        }
      });
    } catch (e) {
      console.warn("Erro ao restaurar dados do localStorage. Usando padrões fabris.", e);
      this.resetToDefaults();
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('sor_saas_rncs_v2', JSON.stringify(this.rncs));
    } catch (e) {
      console.warn("RNCs excederam cota de localStorage, persistindo via IndexedDB:", e);
    }

    try {
      localStorage.setItem('gestamp_sor_users', JSON.stringify(this.users));
      localStorage.setItem('gestamp_sor_ativos', JSON.stringify(this.baseAtivos));
      localStorage.setItem('gestamp_sor_rast_v2', JSON.stringify(this.rastreabilidades));
      localStorage.setItem('gestamp_sor_tags_v2', JSON.stringify(this.etiquetasVivas));
      localStorage.setItem('gestamp_sor_lotes_v2', JSON.stringify(this.lotesSAP));
      localStorage.setItem('gestamp_sor_cab_v2', JSON.stringify(this.rastCabeceiras));
      localStorage.setItem('gestamp_sor_trein_v2', JSON.stringify(this.treinamentos));
      localStorage.setItem('gestamp_sor_alertas_v2', JSON.stringify(this.alertas));
      localStorage.setItem('gestamp_sor_current_re', String(this.currentUser.reAcesso));
      localStorage.setItem('gestamp_sor_last_sync', this.connectionState.lastSync || '');
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    // Salva também no IndexedDB v2 assíncrono para suportar evidências fotográficas volumosas
    idbSet('rncs_v2', this.rncs);
    idbSet('pecas', this.pecas);
  }

  public resetToDefaults() {
    this.rncs = [...tenantService.getInitialRncsForSeed()];
    this.users = [...INITIAL_USERS];
    this.baseAtivos = [...INITIAL_BASE_ATIVOS];
    this.pecas = [...INITIAL_PECAS];
    this.rastreabilidades = [...INITIAL_RASTREABILIDADES];
    this.etiquetasVivas = [...INITIAL_ETIQUETAS_VIVAS];
    this.lotesSAP = [...INITIAL_LOTES_SAP];
    this.rastCabeceiras = [...INITIAL_RAST_CABECEIRAS];
    this.treinamentos = [...tenantService.getInitialTreinamentosForSeed()];
    this.alertas = [...INITIAL_ALERTAS];
    this.currentUser = INITIAL_USERS[0];
    this.indexRNCs();
    this.indexPecas();
    this.saveToStorage();
  }

  // ============================================================================
  // SINCRONISMO DIRETO COM SHAREPOINT ONLINE (MICROSOFT GRAPH)
  // Paginação completa: remove qualquer trava de 999 itens e carrega toda a base
  // ============================================================================
  public async syncWithSharePoint(options?: { forceRefresh?: boolean }): Promise<{ count: number; pecasCount: number; error?: string }> {
    // Se já tiver dados sincronizados recentemente (< 5 minutos) e não for refresh forçado, retorna instantaneamente do cache em memória
    if (!options?.forceRefresh && this.rncs.length > 100 && this.lastSyncTime > 0 && (Date.now() - this.lastSyncTime < 300000)) {
      return { count: this.rncs.length, pecasCount: this.pecas.length };
    }

    try {
      const status = await spDirect.checkConnection();
      if (!status.connected) {
        return { count: this.rncs.length, pecasCount: this.pecas.length, error: status.message };
      }

      const q = options?.forceRefresh ? '?refresh=true' : '';

      const [spUsers, spAtivos, spPecas, spRncs] = await Promise.all([
        spDirect.fetchUsuarios(q).catch(e => { console.warn('Erro usuarios SP:', e); return []; }),
        spDirect.fetchBaseAtivos(q).catch(e => { console.warn('Erro ativos SP:', e); return []; }),
        spDirect.fetchPecas(q).catch(e => { console.warn('Erro pecas SP:', e); return []; }),
        spDirect.fetchRNCs(q).catch(e => { console.warn('Erro rncs SP:', e); return []; })
      ]);

      if (spUsers.length > 0) this.users = spUsers;
      if (spAtivos.length > 0) this.baseAtivos = spAtivos;
      if (spPecas.length > 0) {
        this.pecas = spPecas;
        this.indexPecas();
      }
      if (spRncs.length > 0) {
        this.rncs = spRncs;
        this.indexRNCs();
      }

      this.connectionState.connected = true;
      this.connectionState.mode = 'sharepoint';
      this.connectionState.lastSync = new Date().toISOString();
      this.lastSyncTime = Date.now();
      this.saveToStorage();
      return { count: this.rncs.length, pecasCount: this.pecas.length };
    } catch (err: any) {
      return { count: this.rncs.length, pecasCount: this.pecas.length, error: err.message };
    }
  }

  // ============================================================================
  // SIMULAÇÃO DO App.OnStart DO POWER APPS
  // Replicando exatamente o que é carregado ao iniciar o aplicativo:
  // 1. Conexão direta com SharePoint Online
  // 2. varRE / varNome / Varperfil (LookUp em 'Usuários ocorrências qualidade')
  // 3. varPessoas (ClearCollect de 'BASE_ATIVOS')
  // 4. Col_Treinamentos (Filter 'Registros de treinamentos' por varRE)
  // 5. colpecasgerais_AA3 (Ascending + Descending merge bypass de 'lista_geral_peças_aa3')
  // 6. RNCs reais (Carregadas diretamente de 'Resumo dos Incidentes de qualidade')
  // ============================================================================
  public async simulateAppOnStart(
    userName?: string,
    onProgress?: (step: string, percent: number) => void
  ): Promise<{
    user: UsuarioQualidade;
    pessoasCount: number;
    pecasCount: number;
    treinamentosCount: number;
    serverLagMinutes: number;
    startScreen: 'Menu_2' | 'Verif_user';
  }> {
    const report = (msg: string, pct: number) => {
      if (onProgress) onProgress(msg, pct);
    };

    report("Conectando diretamente com o SharePoint Online (gitservices.sharepoint.com)...", 10);
    await this.syncWithSharePoint();

    // Passo 1: Usuário e Perfil em 'Usuários ocorrências qualidade'
    report("Identificando perfil em 'Usuários ocorrências qualidade'...", 25);
    const targetName = userName || this.currentUser.nome || "Matheus Henrique de Luca";
    let foundUser = this.users.find(u => u.nome.toLowerCase() === targetName.toLowerCase());
    
    if (!foundUser) {
      // Se não achar pelo nome, verifica se está em BASE_ATIVOS
      const ativo = this.baseAtivos.find(a => a.nome.toLowerCase() === targetName.toLowerCase());
      if (ativo) {
        foundUser = {
          id: Date.now(),
          nome: ativo.nome,
          reAcesso: ativo.numPessoal,
          perfil: "User",
          cargo: ativo.posicao,
          setor: ativo.unidadeOrg
        };
      } else {
        foundUser = this.users[0] || this.currentUser; // Usa primeiro usuário real do SharePoint
      }
    }
    this.currentUser = foundUser;
    await new Promise(r => setTimeout(r, 100));

    // Passo 2: Base de Ativos (varPessoas)
    report(`Carregados ${this.baseAtivos.length} colaboradores ativos da lista 'BASE_ATIVOS'...`, 50);
    const pessoasCount = this.baseAtivos.length;
    await new Promise(r => setTimeout(r, 100));

    // Passo 3: Treinamentos do Operador (Col_Treinamentos)
    report("Buscando registros de treinamentos vinculados ao RE...", 70);
    const treinamentosDoUser = this.treinamentos.filter(t => t.re === foundUser.reAcesso);
    await new Promise(r => setTimeout(r, 100));

    // Passo 4: Catálogo Geral de Peças (lista_geral_peças_aa3)
    report(`Carregadas ${this.pecas.length} peças reais de 'lista_geral_peças_aa3'...`, 85);
    const pecasCount = this.pecas.length;
    await new Promise(r => setTimeout(r, 100));

    // Passo 5: Heartbeat do Servidor (data_hora_atual_apprnc)
    report("Verificando sincronismo do servidor fabril...", 95);
    this.lastHeartbeat = new Date();
    const serverLag = 0; // sincronizado em tempo real

    const isRegistered = Boolean(this.users.find(u => u.nome.toLowerCase() === foundUser.nome.toLowerCase()));
    const startScreen: 'Menu_2' | 'Verif_user' = isRegistered ? 'Menu_2' : 'Verif_user';

    report(`Conexão direta ativa! ${this.rncs.length} ocorrências sincronizadas.`, 100);
    await new Promise(r => setTimeout(r, 100));

    return {
      user: foundUser,
      pessoasCount,
      pecasCount,
      treinamentosCount: treinamentosDoUser.length,
      serverLagMinutes: serverLag,
      startScreen
    };
  }

  // ============================================================================
  // CONEXÃO REAL SHAREPOINT ONLINE (REST API)
  // ============================================================================
  public getConnectionState(): SharePointConnectionState {
    return { ...this.connectionState };
  }

  public setConnectionState(config: Partial<SharePointConnectionState>) {
    this.connectionState = { ...this.connectionState, ...config };
    if (config.siteUrl) localStorage.setItem('gestamp_sp_site_url', config.siteUrl);
    if (config.accessToken !== undefined) localStorage.setItem('gestamp_sp_token', config.accessToken);
    if (config.mode) localStorage.setItem('gestamp_sp_mode', config.mode);
  }

  public async testSharePointConnection(siteUrl: string, token: string): Promise<{ success: boolean; message: string }> {
    if (!siteUrl) {
      return { success: false, message: "URL do site SharePoint não configurada." };
    }

    try {
      // Se não houver token, simula ou valida formato
      if (!token) {
        return { 
          success: false, 
          message: "Token de acesso ausente. Insira um Bearer Token ou mantenha em modo Local Offline." 
        };
      }

      const response = await fetch(`${siteUrl}/_api/web/lists`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json;odata=verbose'
        }
      });

      if (response.ok) {
        this.setConnectionState({ connected: true, lastSync: new Date().toISOString() });
        return { success: true, message: "Conectado com sucesso ao SharePoint da Gestamp!" };
      } else {
        return { success: false, message: `Erro ao conectar: HTTP ${response.status} - ${response.statusText}` };
      }
    } catch (e: any) {
      return { success: false, message: `Falha de rede ao conectar ao SharePoint: ${e.message}` };
    }
  }

  // ============================================================================
  // IMPORTAÇÃO E EXPORTAÇÃO CSV / EXCEL DE BASES ORIGINAIS
  // ============================================================================
  public exportTableToCSV(tableName: 'pecas' | 'ativos' | 'rncs'): string {
    if (tableName === 'pecas') {
      const headers = "Identificação;Material;Descrição;Cliente;Nesting Level;Posto;FMDS;CodCliText;Componente;CarryOver\n";
      const rows = this.pecas.map(p => 
        `${p.identificacao};${p.material};"${p.descricao}";${p.cliente};${p.nestingLevel};"${p.posto}";"${p.fmds}";${p.codCliText};"${p.componente || ''}";${p.carryOver || 'Não'}`
      ).join('\n');
      return headers + rows;
    }

    if (tableName === 'ativos') {
      const headers = "Nº pess.;Nº pessoal;UnidadeOrg;posicao\n";
      const rows = this.baseAtivos.map(a => 
        `${a.numPessoal};"${a.nome}";"${a.unidadeOrg}";"${a.posicao}"`
      ).join('\n');
      return headers + rows;
    }

    const headers = "ID;Código;Tipo;Status;Cliente;Data;Setor;Produto;Componente;Qtd;Problema;Gravidade;Posto;FMDS;Detector\n";
    const rows = this.rncs.map(r => 
      `${r.id};${r.field1};${r.tipoRnc};${r.status};${r.cliente};${r.dataOcorrencia};"${r.classificacaoSetor}";"${r.produto}";"${r.componente}";${r.quantidadeAfetada};"${r.descricaoProblema}";${r.gravidade || ''};"${r.posto || ''}";"${r.fmds || ''}";"${r.detector}"`
    ).join('\n');
    return headers + rows;
  }

  public importPecasFromCSV(csvText: string): { count: number; error?: string } {
    try {
      const lines = csvText.split('\n').filter(l => l.trim().length > 0);
      if (lines.length < 2) return { count: 0, error: "Arquivo CSV sem dados." };

      const newPecas: PecaCatalogo[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 7) {
          newPecas.push({
            identificacao: Number(cols[0]) || (1000 + i),
            material: cols[1] || "",
            descricao: cols[2] || "",
            cliente: cols[3] || DEFAULT_CLIENTE,
            cliente1: cols[3] || DEFAULT_CLIENTE,
            nestingLevel: Number(cols[4]) || 0,
            posto: cols[5] || "POSTO 01",
            fmds: cols[6] || "SOLDA GERAL",
            codCliText: cols[7] || cols[1] || "",
            componente: cols[8] || "",
            carryOver: cols[9] || "Não"
          });
        }
      }

      if (newPecas.length > 0) {
        this.pecas = newPecas;
        this.saveToStorage();
        return { count: newPecas.length };
      }
      return { count: 0, error: "Nenhuma linha válida encontrada no CSV." };
    } catch (e: any) {
      return { count: 0, error: e.message };
    }
  }

  // ============================================================================
  // MÉTODOS DE CONSULTA FAKE/REAL CONFORME O App.pa.yaml
  // ============================================================================
  public getCurrentUser(): UsuarioQualidade {
    return this.currentUser;
  }

  public setCurrentUser(user: UsuarioQualidade) {
    this.currentUser = user;
    localStorage.setItem('gestamp_sor_current_re', String(user.reAcesso));
  }

  public getColPecasGeraisAA3(): PecaCatalogo[] {
    return this.pecas;
  }

  public getPecas(): PecaCatalogo[] {
    return this.pecas;
  }

  // Filter(colpecasgerais_AA3, Cliente1 = cxcliente.Selected.Value, 'Nesting level' = 0)
  public getProdutosPorCliente(cliente: string): PecaCatalogo[] {
    const key = (cliente || '').toUpperCase();
    if (this.produtosPorClienteCache.has(key)) {
      return this.produtosPorClienteCache.get(key)!;
    }
    const res = !key 
      ? this.pecas.filter(p => p.nestingLevel === 0)
      : this.pecas.filter(p => 
          (p.cliente.toUpperCase() === key || 
           (p.cliente1 && p.cliente1.toUpperCase() === key) ||
           (key.includes('TDB') && (p.cliente.toUpperCase().includes('TOYOTA') || p.cliente.toUpperCase().includes('TDB'))) ||
           (key.includes('TOYOTA') && (p.cliente.toUpperCase().includes('TDB') || p.cliente.toUpperCase().includes('TOYOTA')))) &&
          p.nestingLevel === 0
        );
    this.produtosPorClienteCache.set(key, res);
    return res;
  }

  // Filter(colpecasgerais_AA3, Componente <> Left(cxproduto.Selected.CodCliText, 9))
  public getComponentesPorProduto(codCliText: string): PecaCatalogo[] {
    const key = (codCliText || '').toUpperCase();
    if (this.componentesPorProdutoCache.has(key)) {
      return this.componentesPorProdutoCache.get(key)!;
    }
    if (!key) {
      const res = this.pecas.filter(p => p.nestingLevel > 0);
      this.componentesPorProdutoCache.set(key, res);
      return res;
    }
    const prefix = key.substring(0, 9);
    const res = this.pecas.filter(p => {
      if (p.nestingLevel === 0) return false;
      const compPrefix = (p.componente || p.codCliText).substring(0, 9).toUpperCase();
      return compPrefix !== prefix;
    });
    this.componentesPorProdutoCache.set(key, res);
    return res;
  }

  // Distinct(colpecasgerais_AA3, Posto) + Postos do Tenant Ativo
  public getDistinctPostos(): string[] {
    const tenantPostos = tenantService
      .getMasterData('posto_trabalho')
      .filter(m => m.ativo)
      .map(m => m.nome);
    const activeTenantId = tenantService.getActiveTenantId();
    if (activeTenantId !== PILOT_TENANT_ID && tenantPostos.length > 0) {
      return Array.from(new Set(tenantPostos)).sort();
    }
    return Array.from(new Set([...tenantPostos, ...this.cachedPostos])).sort();
  }

  // Distinct(colpecasgerais_AA3, FMDS) + Áreas Fabris do Tenant Ativo
  public getDistinctFMDS(): string[] {
    const tenantAreas = tenantService
      .getMasterData('area_fabril')
      .filter(m => m.ativo)
      .map(m => m.nome);
    const activeTenantId = tenantService.getActiveTenantId();
    if (activeTenantId !== PILOT_TENANT_ID && tenantAreas.length > 0) {
      return Array.from(new Set(tenantAreas)).sort();
    }
    return Array.from(new Set([...tenantAreas, ...this.cachedFMDS])).sort();
  }

  public getDistinctClientes(): string[] {
    const tenantClientes = tenantService
      .getMasterData('cliente_montadora')
      .filter(m => m.ativo)
      .map(m => m.nome);
    const activeTenantId = tenantService.getActiveTenantId();
    if (activeTenantId !== PILOT_TENANT_ID && tenantClientes.length > 0) {
      return Array.from(new Set(tenantClientes)).sort();
    }
    return Array.from(new Set([...tenantClientes, ...this.cachedClientes])).sort();
  }

  public getDistinctDefeitos(): string[] {
    return tenantService
      .getMasterData('cat_defeito')
      .filter(m => m.ativo)
      .map(m => m.nome);
  }

  // BASE_ATIVOS (varPessoas)
  public getBaseAtivos(): ColaboradorBaseAtivos[] {
    return this.baseAtivos;
  }

  public getUsuarios(): UsuarioQualidade[] {
    const tenantUsers = tenantService.getUsersForTenant();
    if (tenantUsers.length > 0) {
      return tenantUsers;
    }
    return this.users;
  }

  // Heartbeat do Servidor: varserver = DateDiff(varhoraatualsp, varhoraatual, TimeUnit.Minutes)
  public getServerLagMinutes(): number {
    const diff = Math.floor((Date.now() - this.lastHeartbeat.getTime()) / 60000);
    return Math.max(0, diff);
  }

  public pingServerHeartbeat(): number {
    this.lastHeartbeat = new Date();
    return 0;
  }

  public getServerHeartbeat(): number {
    return this.getServerLagMinutes();
  }

  // ============================================================================
  // OPERAÇÕES RNC ('Resumo dos Incidentes de qualidade') — ISOLADAS POR TENANT_ID
  // ============================================================================
  public getRNCs(tenantIdOverride?: string): RNCRecord[] {
    const targetTenantId = tenantIdOverride || tenantService.getActiveTenantId();
    return this.rncs.filter(r => (r.tenant_id || PILOT_TENANT_ID) === targetTenantId);
  }

  public getAllRNCsGlobal(): RNCRecord[] {
    return [...this.rncs];
  }

  public getRNCById(id: number | string, tenantIdOverride?: string): RNCRecord | undefined {
    const numId = Number(id);
    const activeTenantId = tenantIdOverride || tenantService.getActiveTenantId();
    const compositeKey = this.getRncCompositeKey(activeTenantId, numId);
    const exactMatch = this.rncMap.get(compositeKey);
    if (exactMatch) {
      return exactMatch;
    }
    return this.rncs.find(
      r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId && (r.id === numId || String(r.id) === String(id))
    );
  }

  public saveRNC(rnc: Partial<RNCRecord>): RNCRecord & { success: boolean; message: string } {
    const activeTenantId = rnc.tenant_id || tenantService.getActiveTenantId();
    if (rnc.id) {
      // Edição restrita ao tenant ativo
      const idx = this.rncs.findIndex(
        r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId && r.id === Number(rnc.id)
      );
      if (idx >= 0) {
        this.rncs[idx] = {
          ...this.rncs[idx],
          ...rnc,
          tenant_id: activeTenantId
        } as RNCRecord;
        this.indexRNCs();
        this.saveToStorage();
        tenantService.recalculateTenantStorage(this.rncs, activeTenantId);
        tenantService.addHistoricoAcao(
          Number(rnc.id),
          this.currentUser.nome,
          'Atualização de RNC',
          `Status: ${this.rncs[idx].status}`
        );
        // Sincroniza diretamente no SharePoint Online via Microsoft Graph API
        spDirect.updateRNC(rnc.id, rnc).catch(err => {
          console.error("Falha ao atualizar no SharePoint:", err);
        });
        return { ...this.rncs[idx], success: true, message: "Ocorrência atualizada com sucesso!" };
      }
    }

    // Criação com contador sequencial monotônico exclusivo da empresa (1, 2, 3... nunca retrocede após exclusão)
    const tenantRncs = this.rncs.filter(r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId);
    const currentTenantMaxId = tenantRncs.reduce((max, r) => (r.id > max ? r.id : max), 0);
    const nextId = tenantService.getNextRncIdForTenant(activeTenantId, currentTenantMaxId);
    const year = new Date().getFullYear();
    const newRecord: RNCRecord = {
      id: nextId,
      tenant_id: activeTenantId,
      title: String(nextId),
      field1: `RNC-${year}-${String(nextId).padStart(4, '0')}`,
      tipoRnc: rnc.tipoRnc || "Formal",
      status: rnc.status || "Relatório Inicial",
      cliente: rnc.cliente || DEFAULT_CLIENTE,
      dataOcorrencia: rnc.dataOcorrencia || new Date().toISOString().split('T')[0],
      dataOficializacao: rnc.dataOficializacao || new Date().toISOString().split('T')[0],
      codOcorrenciaCliente: rnc.codOcorrenciaCliente || "",
      impactoCliente: rnc.impactoCliente || "",
      detalhamentoOcorrencia: rnc.detalhamentoOcorrencia || "",
      classificacaoSetor: rnc.classificacaoSetor || "SOLDA 2 - CEL. TOYOTA",
      setorDeteccao: rnc.setorDeteccao || "Linha de Montagem",
      turno: rnc.turno || "1º Turno",
      produto: rnc.produto || "",
      componente: rnc.componente || "",
      finalComponente: rnc.finalComponente || "Peça Final",
      quantidadeAfetada: rnc.quantidadeAfetada || 1,
      modoFalha: rnc.modoFalha || "",
      descricaoProblema: rnc.descricaoProblema || "",
      descricaoCompleta: rnc.descricaoCompleta || "",
      fotoPecaNg: rnc.fotoPecaNg || "",
      fotoPecaOk: rnc.fotoPecaOk || "",
      caracteristicaSeguranca: rnc.caracteristicaSeguranca || "Não",
      coProduto: rnc.coProduto || "Não",
      carryOver: rnc.carryOver || "Não",
      reincidente: rnc.reincidente || "NÃO",
      gravidade: rnc.gravidade || "Média",
      possivelDetectar: rnc.possivelDetectar || "Sim",
      posto: rnc.posto || "POSTO 01",
      fmds: rnc.fmds || "SOLDA GERAL",
      acoesContencao: rnc.acoesContencao || "",
      dataContencao: rnc.dataContencao || "",
      descricaoProblemaInterno: rnc.descricaoProblemaInterno || "",
      recomendacoesProvidencias: rnc.recomendacoesProvidencias || "",
      fotoAuxiliar: rnc.fotoAuxiliar || "",
      oQueFazer: rnc.oQueFazer || "",
      comoFazer: rnc.comoFazer || "",
      porQueFazer: rnc.porQueFazer || "",
      quemFara: rnc.quemFara || "",
      quandoFara: rnc.quandoFara || "",
      ondeFara: rnc.ondeFara || "",
      qtdInspecionada: rnc.qtdInspecionada || 0,
      qtdSuspeita: rnc.qtdSuspeita || 0,
      qtdBloqueada: rnc.qtdBloqueada || 0,
      documentoRastreabilidade: rnc.documentoRastreabilidade || "Não Informado",
      codigoRastreabilidade: rnc.codigoRastreabilidade || "",
      dataInicioRastreabilidade: rnc.dataInicioRastreabilidade || "",
      dataFimRastreabilidade: rnc.dataFimRastreabilidade || "",
      participantesAtendimento: rnc.participantesAtendimento || this.currentUser.nome,
      protcliente: rnc.protcliente || (rnc.codigoRastreabilidade ? "Sim" : "Não"),
      abrir8D: rnc.abrir8D || "Sim",
      detector: this.currentUser.nome,
      reDetector: this.currentUser.reAcesso
    };

    this.rncs.unshift(newRecord);
    this.indexRNCs();
    this.saveToStorage();
    tenantService.recalculateTenantStorage(this.rncs, activeTenantId);
    tenantService.addHistoricoAcao(
      newRecord.id,
      this.currentUser.nome,
      'Abertura de RNC',
      `${newRecord.field1} • ${newRecord.descricaoProblema}`
    );

    // Sincroniza criação diretamente no SharePoint Online via Microsoft Graph API mantendo o ID monotônico da empresa
    spDirect.createRNC(newRecord).catch(err => {
      console.error("Falha ao registrar novo item no SharePoint:", err);
    });

    return { ...newRecord, success: true, message: `Nova ocorrência ${formatOccurrenceId(newRecord.id, newRecord.codOcorrenciaCliente || newRecord.field1)} registrada com sucesso!` };
  }

  public updateRNC(id: number, rnc: Partial<RNCRecord>): RNCRecord & { success: boolean; message: string } {
    return this.saveRNC({ ...rnc, id });
  }

  public addRNC(rnc: Partial<RNCRecord>): RNCRecord & { success: boolean; message: string } {
    return this.saveRNC(rnc);
  }

  /**
   * Consulta histórico de reincidências para a peça/componente selecionado (isolado por empresa/tenant),
   * espelhando a fórmula exata do Power Apps (Registro de 8D linhas 2450 e 2636):
   */
  public getHistoricoReincidencias(
    produtoOuCodCli?: string, 
    modoFalha?: string, 
    rncAtualId?: number,
    componente?: string
  ): RNCRecord[] {
    if (!modoFalha || !modoFalha.trim()) return [];
    if (!produtoOuCodCli && !componente) return [];

    const activeTenantId = tenantService.getActiveTenantId();
    const defectTerm = modoFalha.trim().toUpperCase();
    const prodPrefix = (produtoOuCodCli || '').trim().substring(0, 9).toUpperCase();
    const compPrefix = (componente || '').trim().substring(0, 9).toUpperCase();

    return this.rncs.filter(r => {
      if ((r.tenant_id || PILOT_TENANT_ID) !== activeTenantId) return false;
      if (rncAtualId && r.id === rncAtualId) return false;

      // 1. O defeito DEVE coincidir exatamente com a classificação selecionada
      const rDefect = (r.modoFalha || r.descricaoProblema || '').trim().toUpperCase();
      const rClassif = (r.classificacaoSetor || '').trim().toUpperCase();
      const matchesDefect = rDefect === defectTerm || rDefect.includes(defectTerm) || defectTerm.includes(rDefect) || rClassif === defectTerm;
      if (!matchesDefect) return false;

      // 2. A peça ou componente deve coincidir pelo prefixo de 9 caracteres
      const rProd = (r.produto || '').trim().toUpperCase();
      const rComp = (r.componente || '').trim().toUpperCase();
      const rProdPrefix = rProd.substring(0, 9);
      const rCompPrefix = rComp.substring(0, 9);

      let matchesPeca = false;
      if (prodPrefix && prodPrefix.length >= 3) {
        if (rProdPrefix === prodPrefix || rCompPrefix === prodPrefix || rProd.includes(prodPrefix) || rComp.includes(prodPrefix)) {
          matchesPeca = true;
        }
      }
      if (!matchesPeca && compPrefix && compPrefix.length >= 3) {
        if (rProdPrefix === compPrefix || rCompPrefix === compPrefix || rProd.includes(compPrefix) || rComp.includes(compPrefix)) {
          matchesPeca = true;
        }
      }

      return matchesPeca;
    }).sort((a, b) => b.id - a.id);
  }

  // Double Closure Guard do Power Apps: BtnCocluirrnc (restrito ao tenant ativo)
  public concluirRNC(id: number, responsavel: string, obs?: string): { success: boolean; message: string } {
    const activeTenantId = tenantService.getActiveTenantId();
    const idx = this.rncs.findIndex(
      r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId && r.id === id
    );
    if (idx === -1) return { success: false, message: "Ocorrência não encontrada." };
    this.rncs[idx].status = "Concluído";
    this.rncs[idx].responsavelConclusao = responsavel;
    this.rncs[idx].dataConclusao = new Date().toISOString().split('T')[0];
    this.rncs[idx].observacoesConclusao = obs || "";
    this.indexRNCs();
    this.saveToStorage();

    // Atualiza diretamente no SharePoint
    spDirect.updateRNC(id, {
      status: "Concluído",
      responsavelConclusao: responsavel,
      dataConclusao: this.rncs[idx].dataConclusao,
      observacoesConclusao: obs || ""
    }).catch(err => {
      console.error("Erro ao concluir no SharePoint:", err);
    });

    return { success: true, message: `RNC ${this.rncs[idx].field1 || id} concluída com sucesso!` };
  }

  // Exclusão em cascata restrita à empresa ativa (NÃO decrementa o contador sequencial da empresa)
  public deleteRNCCascade(id: number): boolean {
    const activeTenantId = tenantService.getActiveTenantId();
    // Garante que o maior ID já atingido pela empresa fique registrado antes de excluir
    tenantService.ensureTenantRncSequenceAtLeast(activeTenantId, id);

    this.rncs = this.rncs.filter(
      r => !((r.tenant_id || PILOT_TENANT_ID) === activeTenantId && r.id === id)
    );
    this.rastreabilidades = this.rastreabilidades.filter(
      r => !((r.tenant_id || PILOT_TENANT_ID) === activeTenantId && r.idRnc === id)
    );
    this.treinamentos = this.treinamentos.filter(
      t => !((t.tenant_id || PILOT_TENANT_ID) === activeTenantId && t.idRnc === id)
    );
    this.alertas = this.alertas.filter(
      a => !((a.tenant_id || PILOT_TENANT_ID) === activeTenantId && a.idRnc === id)
    );
    this.indexRNCs();
    this.saveToStorage();
    tenantService.recalculateTenantStorage(this.rncs, activeTenantId);

    // Exclui diretamente no SharePoint
    spDirect.deleteRNC(id).catch(err => {
      console.error("Erro ao excluir no SharePoint:", err);
    });
    return true;
  }

  // Liquidação de Pagamento Proteção ao Cliente (isolada por tenant)
  public liquidarProtecoesCliente(ids?: number[], _responsavel?: string): number {
    const activeTenantId = tenantService.getActiveTenantId();
    let count = 0;
    const today = new Date().toISOString().split('T')[0];
    this.rncs.forEach(r => {
      if (
        (r.tenant_id || PILOT_TENANT_ID) === activeTenantId &&
        (!ids || ids.length === 0 || ids.includes(r.id)) &&
        r.protcliente !== 'Registro Pago'
      ) {
        r.protcliente = 'Registro Pago';
        r.dataPagamento = today;
        count++;
      }
    });
    this.saveToStorage();
    return count;
  }

  // --- RASTREABILIDADE (ISOLADA POR TENANT) ---
  public addRastreabilidade(item: Omit<RastreabilidadeItem, 'id'>): RastreabilidadeItem {
    const activeTenantId = tenantService.getActiveTenantId();
    const nextId = this.rastreabilidades.length > 0 ? Math.max(...this.rastreabilidades.map(r => r.id)) + 1 : 1;
    const newRast: RastreabilidadeItem = {
      id: nextId,
      tenant_id: item.tenant_id || activeTenantId,
      ...item
    };
    this.rastreabilidades.push(newRast);
    this.saveToStorage();
    return newRast;
  }

  public getRastreabilidades(idRnc?: number): RastreabilidadeItem[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const tenantItems = this.rastreabilidades.filter(
      r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId
    );
    if (idRnc) {
      const filtered = tenantItems.filter(r => r.idRnc === idRnc);
      if (filtered.length > 0) {
        return filtered;
      }

      // Síntese automática se a RNC possuir documento de rastreabilidade ou código SAP
      const rnc = this.getRNCById(idRnc, activeTenantId);
      if (rnc && (rnc.codigoRastreabilidade || rnc.documentoRastreabilidade)) {
        const prodCode = rnc.produto ? rnc.produto.split(' - ')[0].trim() : 'PROD';
        return [{
          id: idRnc * 1000 + 1,
          tenant_id: activeTenantId,
          idRnc: idRnc,
          codComp: rnc.componente ? rnc.componente.split(' - ')[0].trim() : '',
          produto: prodCode,
          tipoRastreamento: rnc.finalComponente || 'Peça Final',
          codRastreabilidade: rnc.codigoRastreabilidade || 'S/N',
          docRastreabilidade: rnc.documentoRastreabilidade || 'Etiqueta SAP',
          seqRelacionada: 1,
          comando: 'rp',
          statusGeral: 'R',
          statusVerif: 'OK',
          dataHora: rnc.dataOcorrencia || '2026-10-19',
          ocorrenciaAbrangencia: 'Ocorrência',
          observacao: '',
          bloqueado: true
        }];
      }
      return [];
    }
    return tenantItems;
  }

  public getEtiquetasVivas(idRnc?: number): EtiquetaVivaParsed[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const tenantItems = this.etiquetasVivas.filter(
      e => (e.tenant_id || PILOT_TENANT_ID) === activeTenantId
    );
    if (idRnc) {
      return tenantItems.filter(e => e.idRnc === idRnc);
    }
    return tenantItems;
  }

  public getLotesSAP(idRnc?: number): LoteSAPParsed[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const tenantItems = this.lotesSAP.filter(
      l => (l.tenant_id || PILOT_TENANT_ID) === activeTenantId
    );
    if (idRnc) {
      const filtered = tenantItems.filter(l => l.idRnc === idRnc);
      if (filtered.length > 0) {
        return filtered;
      }
      if (activeTenantId === PILOT_TENANT_ID && idRnc === 1) {
        return [{
          tenant_id: PILOT_TENANT_ID,
          idRnc: 1,
          seqRel: "1",
          produto: "U005000B6",
          lote: "28926",
          qtd: 308,
          data: "2026-10-16"
        }];
      }
      return [];
    }
    return tenantItems;
  }

  public addLoteSAP(item: LoteSAPParsed): void {
    const activeTenantId = tenantService.getActiveTenantId();
    this.lotesSAP.push({ ...item, tenant_id: item.tenant_id || activeTenantId });
    this.saveToStorage();
  }

  public getRastCabeceiras(idRnc?: number): RastCabeceiraParsed[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const tenantItems = this.rastCabeceiras.filter(
      c => (c.tenant_id || PILOT_TENANT_ID) === activeTenantId
    );
    if (idRnc) {
      return tenantItems.filter(c => c.idRnc === idRnc);
    }
    return tenantItems;
  }

  // --- TREINAMENTOS (ISOLADOS POR TENANT_ID) ---
  public getTreinamentos(idRnc?: number, tenantIdOverride?: string): RegistroTreinamento[] {
    const targetTenantId = tenantIdOverride || tenantService.getActiveTenantId();
    const tenantFiltered = this.treinamentos.filter(
      t => (t.tenant_id || PILOT_TENANT_ID) === targetTenantId
    );
    if (idRnc) {
      return tenantFiltered.filter(t => t.idRnc === idRnc);
    }
    return tenantFiltered;
  }

  public getAllTreinamentosGlobal(): RegistroTreinamento[] {
    return [...this.treinamentos];
  }

  public addTreinamento(
    idRncOrTrein: number | Omit<RegistroTreinamento, 'id'>,
    maybeRe?: number,
    maybeResp?: string
  ): { success: boolean; message: string; record?: RegistroTreinamento } {
    const activeTenantId = tenantService.getActiveTenantId();
    let item: Omit<RegistroTreinamento, 'id'>;

    if (typeof idRncOrTrein === 'object') {
      item = { ...idRncOrTrein, tenant_id: idRncOrTrein.tenant_id || activeTenantId };
    } else {
      const idRnc = idRncOrTrein;
      const re = maybeRe || 0;
      const responsavel = maybeResp || this.currentUser.nome;

      // Trava de duplicidade (Col_Treinamentos)
      const exists = this.treinamentos.some(
        t => (t.tenant_id || PILOT_TENANT_ID) === activeTenantId && t.idRnc === idRnc && t.re === re
      );
      if (exists) {
        return { success: false, message: `Colaborador com RE ${re} já possui registro de treinamento para esta RNC!` };
      }

      const pessoa = this.baseAtivos.find(a => a.numPessoal === re);
      const rnc = this.getRNCById(idRnc, activeTenantId);

      item = {
        tenant_id: activeTenantId,
        idRnc,
        re,
        nomeColaborador: pessoa ? pessoa.nome : `Colaborador RE ${re}`,
        produto: rnc?.produto || "N/A",
        defeito: rnc?.descricaoProblema || "N/A",
        dataTreinamento: new Date().toISOString().split('T')[0],
        responsavel
      };
    }

    const nextId = this.treinamentos.length > 0 ? Math.max(...this.treinamentos.map(t => t.id)) + 1 : 1;
    const newTrein: RegistroTreinamento = {
      id: nextId,
      tenant_id: activeTenantId,
      ...item
    };
    this.treinamentos.push(newTrein);
    this.saveToStorage();
    return { 
      success: true, 
      message: `Treinamento registrado com sucesso para ${newTrein.nomeColaborador} (RE: ${newTrein.re})!`, 
      record: newTrein 
    };
  }

  // --- ALERTAS DE QUALIDADE (ISOLADOS POR TENANT) ---
  public getAlertas(idRnc?: number): AlertaQualidadeRegistro[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const tenantItems = this.alertas.filter(
      a => (a.tenant_id || PILOT_TENANT_ID) === activeTenantId
    );
    if (idRnc) {
      return tenantItems.filter(a => a.idRnc === idRnc);
    }
    return tenantItems;
  }

  public addAlerta(alerta: Omit<AlertaQualidadeRegistro, 'id'>): AlertaQualidadeRegistro {
    const activeTenantId = tenantService.getActiveTenantId();
    const newAlerta: AlertaQualidadeRegistro = {
      id: Date.now(),
      tenant_id: alerta.tenant_id || activeTenantId,
      ...alerta
    };
    this.alertas.push(newAlerta);
    this.saveToStorage();
    return newAlerta;
  }

  // --- USUÁRIOS E PERMISSÕES (SINCRONIZADO COM TENANT ATIVO) ---
  public saveUsuario(user: Partial<UsuarioQualidade>): UsuarioQualidade {
    const savedInTenant = tenantService.saveUserForTenant(user);
    if (savedInTenant.user) {
      return savedInTenant.user;
    }
    if (user.id) {
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx >= 0) {
        this.users[idx] = { ...this.users[idx], ...user } as UsuarioQualidade;
        this.saveToStorage();
        return this.users[idx];
      }
    }

    const nextId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
    const newUser: UsuarioQualidade = {
      id: nextId,
      nome: user.nome || "Novo Usuário",
      reAcesso: user.reAcesso || 99999,
      perfil: user.perfil || "User",
      senha: user.senha || "",
      cargo: user.cargo || "Inspetor",
      email: user.email || ""
    };
    this.users.push(newUser);
    this.saveToStorage();
    return newUser;
  }

  public deleteUsuario(id: number): boolean {
    tenantService.deleteUserForTenant(id);
    this.users = this.users.filter(u => u.id !== id);
    this.saveToStorage();
    return true;
  }
}

export const spStore = new SharePointDataStore();
