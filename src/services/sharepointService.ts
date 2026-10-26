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
  ListFiltersState,
  ActionPlanHeader,
  ActionPlanItem,
  EightDMetadata,
  IshikawaCauseItem,
  HenkatenRecord,
  Entrevista8DRecord,
  ActionItemStatus,
  ActionPlanStatus,
  ActionPlanPriority,
  ActionItemType,
  IshikawaM
} from '../types';
import { spDirect } from './sharepointDirectService';
import { DEFAULT_CLIENTE } from '../constants/clientes';
import { tenantService, PILOT_TENANT_ID, normalizeRncRecordCasing, createTechnicalSvgDataUrl } from './tenantService';
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
    caracteristicaSeguranca: (p.caracteristicaSeguranca ? normalizeDisplayText(p.caracteristicaSeguranca) : p.caracteristicaSeguranca) as 'Sim' | 'Não' | undefined,
    pecasComuns: p.pecasComuns,
    pecaEspelho: p.pecaEspelho,
    aspectoSeguranca: p.aspectoSeguranca
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
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Toyota Yaris Hatch (53201-0D120) / Toyota Yaris Sedan (53201-0D130)",
    pecaEspelho: "Não aplicável (Conjunto Simétrico Central)",
    aspectoSeguranca: "Absorção de Energia em Impacto Frontal e Travamento do Capô (FMEA Crítico CC)"
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
    componente: "53201-0D121 - REFORÇO SUPERIOR PAINEL DIANTEIRO", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Não",
    pecasComuns: "53201-0D120 (Painel Dianteiro Yaris) e 53205-0D080 (Conjunto Suporte Radiador)"
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
    componente: "53201-0D122 - SUPORTE FIXAÇÃO TRAVA CAPÔ C/ PORCA M8", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "53201-0D120 (Yaris) e 53201-02310 (Corolla Sedan)",
    aspectoSeguranca: "Retenção Mecânica da Trava Principal do Capô em Alta Velocidade (Torque Porca M8)"
  },
  { 
    identificacao: 27, 
    material: "10045213", 
    descricao: "TRAVESSA INFERIOR DO PAINEL FRONTAL", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 04 - SOLDA PONTO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "53201-0D123", 
    componente: "53201-0D123 - TRAVESSA INFERIOR DO PAINEL FRONTAL", 
    carryOver: "Não",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    aspectoSeguranca: "Rigidez Estrutural Inferior do Subconjunto Frontal"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não",
    pecasComuns: "53201-0D120 (Painel Dianteiro Completo) e 53205-02190 (Corolla Cross)",
    pecaEspelho: "53206-0D080 - CONJUNTO SUPORTE RADIADOR AUXILIAR RH"
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
    componente: "53205-0D081 - SUPORTE LATERAL RADIADOR LH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não",
    pecasComuns: "53205-0D080 (Yaris) e 53201-0D120 (Painel Dianteiro)",
    pecaEspelho: "53205-0D082 - SUPORTE LATERAL RADIADOR RH"
  },
  { 
    identificacao: 28, 
    material: "10045282", 
    descricao: "SUPORTE LATERAL RADIADOR RH", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "53205-0D082", 
    componente: "53205-0D082 - SUPORTE LATERAL RADIADOR RH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não",
    pecasComuns: "53205-0D080 (Yaris) e 53201-0D120 (Painel Dianteiro)",
    pecaEspelho: "53205-0D081 - SUPORTE LATERAL RADIADOR LH"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Toyota Corolla Sedan (57011-02210) e Corolla Cross (57011-02230)",
    pecaEspelho: "57012-02230 - LONGARINA DIANTEIRA COMPLETA LH (CROSS)",
    aspectoSeguranca: "Deformação Programada (Crash Box) e Absorção de Impacto Frontal (FMEA Segurança Veicular)"
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
    componente: "57011-02231 - FECHAMENTO INTERNO LONGARINA RH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "57011-02230 (Corolla Cross RH) e 57011-02210 (Corolla Sedan RH)",
    pecaEspelho: "57012-02231 - FECHAMENTO INTERNO LONGARINA LH",
    aspectoSeguranca: "Integridade de Solda Ponto na Zona de Colapso Frontal (Crash Test)"
  },
  { 
    identificacao: 29, 
    material: "10045302", 
    descricao: "REFORÇO CENTRAL DE ABSORÇÃO DE IMPACTO RH", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 07 - GEOMETRIA SOLDA TOYOTA", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "57011-02232", 
    componente: "57011-02232 - REFORÇO CENTRAL DE ABSORÇÃO DE IMPACTO RH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "57011-02230 (Corolla Cross) e 57011-02210 (Corolla Sedan)",
    pecaEspelho: "57012-02232 - REFORÇO CENTRAL DE ABSORÇÃO DE IMPACTO LH",
    aspectoSeguranca: "Ancoragem do Berço do Motor e Absorção de Impacto Frontal"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Toyota Corolla Sedan (57012-02210) e Corolla Cross (57012-02230)",
    pecaEspelho: "57011-02230 - LONGARINA DIANTEIRA COMPLETA RH (CROSS)",
    aspectoSeguranca: "Deformação Programada (Crash Box) e Absorção de Impacto Frontal (FMEA Segurança Veicular)"
  },
  { 
    identificacao: 30, 
    material: "10045311", 
    descricao: "FECHAMENTO INTERNO LONGARINA LH", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 01 - PRENSA TANDEM LINHA A", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "57012-02231", 
    componente: "57012-02231 - FECHAMENTO INTERNO LONGARINA LH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "57012-02230 (Corolla Cross LH) e 57012-02210 (Corolla Sedan LH)",
    pecaEspelho: "57011-02231 - FECHAMENTO INTERNO LONGARINA RH",
    aspectoSeguranca: "Integridade de Solda Ponto na Zona de Colapso Frontal (Crash Test)"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Toyota Corolla Sedan (61201-02380) e Corolla Cross (61201-0A010)",
    pecaEspelho: "61202-02380 - COLUNA CENTRAL B-PILLAR LH",
    aspectoSeguranca: "Proteção de Habitáculo contra Impacto Lateral e Ancoragem do Cinto de Segurança (Hot Stamping)"
  },
  { 
    identificacao: 31, 
    material: "10045401", 
    descricao: "REFORÇO INTERNO B-PILLAR (HOT STAMPING)", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 04 - SOLDA PONTO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "61201-02381", 
    componente: "61201-02381 - REFORÇO INTERNO B-PILLAR", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "61201-02380 (Corolla) e 61201-0A010 (Corolla Cross)",
    pecaEspelho: "61202-02381 - REFORÇO INTERNO B-PILLAR LH",
    aspectoSeguranca: "Resistência Ultra-Alta (1500 MPa) contra Intrusão Lateral"
  },
  { 
    identificacao: 32, 
    material: "10045402", 
    descricao: "SUPORTE ANCORAGEM DO CINTO DE SEGURANÇA B-PILLAR", 
    cliente: "TDB - SOROCABA", 
    cliente1: "TDB - SOROCABA", 
    posto: "POSTO 06 - PROJEÇÃO PORCA/PARAFUSO", 
    fmds: "SOLDA 2 - CEL. TOYOTA", 
    nestingLevel: 1, 
    codCliText: "61201-02382", 
    componente: "61201-02382 - SUPORTE ANCORAGEM CINTO B-PILLAR", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "61201-02380 (Coluna B RH) e 61202-02380 (Coluna B LH)",
    aspectoSeguranca: "Fixação Homologada de Retrator de Cinto de Segurança (Regulamentação CONTRAN/ECE)"
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
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Honda City Hatch / Honda City Sedan / Honda HR-V",
    aspectoSeguranca: "Suporte do Sensor de Impacto do Airbag Dianteiro"
  },
  { 
    identificacao: 11, 
    material: "20088101", 
    descricao: "SUPORTE CENTRAL DA BUZINA E SENSOR AIRBAG HONDA", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 1, 
    codCliText: "71101-T9A-M01", 
    componente: "71101-T9A-M01 - SUPORTE BUZINA E SENSOR", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "71101-T9A-M00 (City) e 71101-3W0-M00 (HR-V)",
    aspectoSeguranca: "Posicionamento Dimensional do Sensor de Desaceleração (Airbag SRS)"
  },
  { 
    identificacao: 33, 
    material: "20088102", 
    descricao: "CANTONEIRA DE FIXAÇÃO DO FAROL DIANTEIRO LH", 
    cliente: "HONDA", 
    cliente1: "HONDA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "SOLDA 3 - CEL. HONDA/HYUNDAI", 
    nestingLevel: 1, 
    codCliText: "71101-T9A-M02", 
    componente: "71101-T9A-M02 - CANTONEIRA FAROL LH", 
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não",
    pecaEspelho: "71101-T9A-M03 - CANTONEIRA DE FIXAÇÃO DO FAROL DIANTEIRO RH"
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
    carryOver: "Não",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    aspectoSeguranca: "Travamento da Porta do Porta-Malas e Absorção de Colisão Traseira"
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
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Não",
    pecaEspelho: "65100-3W0-M02 - GUIA LANTERNA TRASEIRA DIREITA"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Honda City Hatch / Sedan (Plataforma Global)",
    pecaEspelho: "60620-TG0-T00 - CAIXA DE RODA DIANTEIRA RH",
    aspectoSeguranca: "Torre de Ancoragem do Amortecedor Dianteiro (Geometria de Suspensão)"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Hyundai HB20 Hatch e Hyundai HB20S Sedan",
    pecaEspelho: "64520-1S000 - LONGARINA TRASEIRA COMPLETA RH (HB20)",
    aspectoSeguranca: "Integridade Estrutural do Tanque de Combustível em Colisão Traseira"
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
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "64510-1S000 (HB20) e 64510-BV000 (Creta)",
    pecaEspelho: "64520-1S001 - REFORÇO DO GANCHO DE REBOQUE RH",
    aspectoSeguranca: "Resistência à Tração de Reboque e Ancoragem Traseira"
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
    carryOver: "Não",
    coProduto: "Não",
    caracteristicaSeguranca: "Não"
  },

  // --- VOLKSWAGEN (POLO / VIRTUS / NIVUS / T-CROSS) ---
  { 
    identificacao: 18, 
    material: "40099100", 
    descricao: "CAIXA DE RODA DIANTEIRA LH (POLO/NIVUS)", 
    cliente: "VOLKSWAGEN", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 10 - GEOMETRIA SOLDA VOLKSWAGEN", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "2G0.803.101.C", 
    componente: "2G0.803.101.C - CAIXA DE RODA LH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "VW Polo, VW Virtus, VW Nivus e VW T-Cross (Plataforma MQB-A0)",
    pecaEspelho: "2G0.803.102.C - CAIXA DE RODA DIANTEIRA RH (POLO/NIVUS)",
    aspectoSeguranca: "Fixação Superior da Torre de Suspensão McPherson (FMEA Crítico)"
  },
  { 
    identificacao: 19, 
    material: "40099101", 
    descricao: "FLANGE DE LIGAÇÃO SUSPENSÃO LH", 
    cliente: "VOLKSWAGEN", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 03 - ESTAMPARIA PROGRESSIVAS", 
    fmds: "ESTAMPARIA TANDEM & PROGRESSIVA", 
    nestingLevel: 1, 
    codCliText: "2G0.803.101.01", 
    componente: "2G0.803.101.01 - FLANGE SUSP LH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "2G0.803.101.C (Polo/Nivus) e 2GP.803.101 (T-Cross)",
    pecaEspelho: "2G0.803.102.01 - FLANGE DE LIGAÇÃO SUSPENSÃO RH",
    aspectoSeguranca: "Apoio Estrutural do Rolamento da Torre de Suspensão"
  },
  { 
    identificacao: 20, 
    material: "40099200", 
    descricao: "CAIXA DE RODA DIANTEIRA RH (POLO/NIVUS)", 
    cliente: "VOLKSWAGEN", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 10 - GEOMETRIA SOLDA VOLKSWAGEN", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "2G0.803.102.C", 
    componente: "2G0.803.102.C - CAIXA DE RODA RH", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "VW Polo, VW Virtus, VW Nivus e VW T-Cross (Plataforma MQB-A0)",
    pecaEspelho: "2G0.803.101.C - CAIXA DE RODA DIANTEIRA LH (POLO/NIVUS)",
    aspectoSeguranca: "Fixação Superior da Torre de Suspensão McPherson (FMEA Crítico)"
  },
  { 
    identificacao: 21, 
    material: "40099300", 
    descricao: "PAINEL TRANSVERSAL DIANTEIRO (VIRTUS)", 
    cliente: "VOLKSWAGEN", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 01 - PRENSA TANDEM LINHA A", 
    fmds: "ESTAMPARIA TANDEM & PROGRESSIVA", 
    nestingLevel: 0, 
    codCliText: "2G0.805.591.A", 
    componente: "2G0.805.591.A - PAINEL TRANSVERSAL", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Não",
    pecasComuns: "VW Polo e VW Virtus"
  },
  { 
    identificacao: 22, 
    material: "40099400", 
    descricao: "LONGARINA TRASEIRA COMPLETA (T-CROSS)", 
    cliente: "VOLKSWAGEN", 
    cliente1: "TDB - INDAIATUBA", 
    posto: "POSTO 10 - GEOMETRIA SOLDA VOLKSWAGEN", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "2GP.803.501", 
    componente: "2GP.803.501 - LONGARINA TRAS T-CROSS", 
    carryOver: "Não",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecaEspelho: "2GP.803.502 - LONGARINA TRASEIRA COMPLETA RH (T-CROSS)",
    aspectoSeguranca: "Absorção de Energia em Colisão Traseira e Fixação do Eixo de Torção"
  },

  // --- STELLANTIS (TORO / RENEGADE / COMPASS / COMMANDER) ---
  { 
    identificacao: 23, 
    material: "50011948", 
    descricao: "TRAVESSA SUSPENSÃO TRASEIRA (TORO)", 
    cliente: "STELLANTIS", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 11 - GEOMETRIA SOLDA STELLANTIS", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "52012948", 
    componente: "52012948 - TRAVESSA SUSPENSÃO", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Fiat Toro, Jeep Compass, Jeep Renegade 4x4 e Ram Rampage (Plataforma Small Wide)",
    aspectoSeguranca: "Sustentação do Diferencial e Geometria da Suspensão Multilink Traseira"
  },
  { 
    identificacao: 24, 
    material: "50011949", 
    descricao: "BRAÇO ESTRUTURAL ESQUERDO DA SUSPENSÃO", 
    cliente: "STELLANTIS", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 05 - SOLDA MIG/MAG ROBÔ ABB CÉLULA 2", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 1, 
    codCliText: "52012949", 
    componente: "52012949 - BRAÇO ESTRUTURAL ESQUERDO DA SUSPENSÃO", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "52012948 (Travessa Toro/Compass) e 52044812 (Sub-chassi Small Wide)",
    pecaEspelho: "52012950 - BRAÇO ESTRUTURAL DIREITO DA SUSPENSÃO",
    aspectoSeguranca: "Controle de Cambagem e Sustentação Dinâmica da Roda Traseira LH"
  },
  { 
    identificacao: 25, 
    material: "50011950", 
    descricao: "BRAÇO ESTRUTURAL DIREITO DA SUSPENSÃO", 
    cliente: "STELLANTIS", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 05 - SOLDA MIG/MAG ROBÔ ABB CÉLULA 2", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 1, 
    codCliText: "52012950", 
    componente: "52012950 - BRAÇO ESTRUTURAL DIREITO DA SUSPENSÃO", 
    carryOver: "Sim",
    coProduto: "Sim",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "52012948 (Travessa Toro/Compass) e 52044812 (Sub-chassi Small Wide)",
    pecaEspelho: "52012949 - BRAÇO ESTRUTURAL ESQUERDO DA SUSPENSÃO",
    aspectoSeguranca: "Controle de Cambagem e Sustentação Dinâmica da Roda Traseira RH"
  },
  { 
    identificacao: 26, 
    material: "50012812", 
    descricao: "BERÇO MOTOR E SUB-CHASSI DIANTEIRO (COMPASS)", 
    cliente: "STELLANTIS", 
    cliente1: "KDB - SOROCABA", 
    posto: "POSTO 11 - GEOMETRIA SOLDA STELLANTIS", 
    fmds: "SOLDA 1 - ESTACIONÁRIAS", 
    nestingLevel: 0, 
    codCliText: "52044812", 
    componente: "52044812 - BERÇO MOTOR COMPASS", 
    carryOver: "Sim",
    coProduto: "Não",
    caracteristicaSeguranca: "Sim",
    pecasComuns: "Jeep Compass, Jeep Commander e Fiat Toro",
    aspectoSeguranca: "Fixação da Caixa de Direção e Bandejas Inferiores da Suspensão Dianteira"
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
    fotoPecaNg: createTechnicalSvgDataUrl('NG', 'RNC-6119', 'Peça Amassada / Ponto de Solda Fora', 'Célula Solda 3 • Robô 33'),
    fotoPecaOk: createTechnicalSvgDataUrl('OK', 'RNC-6119', 'Geometria e Ponto de Solda Validados', 'Gabarito DCO Aprovado pela Qualidade'),
    fotoAuxiliar: createTechnicalSvgDataUrl('OK', 'RNC-6119', 'Gabarito de Controle Dimensional DCO', 'Validação 100% Pós-Retrabalho'),
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
// DADOS DE SEMENTE: PLANO DE AÇÃO, 8D, ISHIKAWA E INVESTIGAÇÃO (SHAREPOINT LISTS)
// ============================================================================

const INITIAL_ACTION_PLANS: ActionPlanHeader[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
    sub1: 'Qualidade Externa',
    sub2: 'Solda Automatizada',
    posto_: 'POSTO 01',
    produto_: 'HR-V',
    setor_: 'SOLDA 2 - CEL. TOYOTA',
    prioridade: 'Alta',
    descricao_problema_oportunidade: 'Trinca na solda do suporte longitudinal detectada na linha da montadora - Calibração dos parâmetros de soldagem',
    idprograma: 'I - 1',
    id_rel1: 'guid-plano-001-pilot',
    data_abertura: '2026-10-18',
    status: 'Aberto',
    responsavel_abertura: 'Matheus Henrique de Luca'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
    sub1: 'Estamparia Pesada',
    sub2: 'Corte e Repuxo',
    posto_: 'OP-20',
    produto_: 'HB20',
    setor_: 'ESTAMPARIA LINHA 1',
    prioridade: 'Alta',
    descricao_problema_oportunidade: 'Rebarba excessiva na furação guia da coluna B - Substituição e ajuste do punção de corte',
    idprograma: 'C - 2',
    id_rel1: 'guid-plano-002-pilot',
    data_abertura: '2026-10-19',
    status: 'Aberto',
    responsavel_abertura: 'Carlos Eduardo Ferreira'
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    indicador_programa_estrategico: 'KAIZEN',
    sub1: 'Melhoria Contínua',
    sub2: 'Troca Rápida de Ferramental',
    posto_: 'PRENSA 800T',
    produto_: 'T-CROSS',
    setor_: 'ESTAMPARIA LINHA 2',
    prioridade: 'Média',
    descricao_problema_oportunidade: 'Redução do tempo de setup de ferramentas (SMED) na prensagem com acoplamentos pneumáticos rápidos',
    idprograma: 'KAIZEN-2026-01',
    id_rel1: 'guid-plano-003-kaizen',
    data_abertura: '2026-10-15',
    status: 'Aberto',
    responsavel_abertura: 'André Ferreira Santos'
  },
  {
    id: 4,
    tenant_id: PILOT_TENANT_ID,
    indicador_programa_estrategico: 'ATENDIMENTO AO CLIENTE',
    sub1: 'Qualidade Externa',
    sub2: 'Solda Hyundai',
    posto_: 'B643033 - ROBÔ 33',
    produto_: 'U005000B6 - BACK COMPLETE',
    setor_: 'SOLDA 3 - CEL. HONDA/HYUNDAI',
    prioridade: 'Alta',
    descricao_problema_oportunidade: 'Ponto de solda fora devido a peça amassada na montagem do cliente Hyundai (RNC 6119)',
    idprograma: 'I - 6119',
    id_rel1: 'guid-plano-004-hyundai',
    data_abertura: '2026-10-19',
    status: 'Aberto',
    responsavel_abertura: 'Matheus Henrique de Luca'
  }
];

const INITIAL_ACTION_ITEMS: ActionPlanItem[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 1,
    id_programa_acoes: 'I - 1',
    tipo_acao: 'CONTENÇÃO',
    etapa_8d: '3D',
    contra_medida: 'Inspeção 100% visual e ensaio de macrografia amostral em todas as peças do lote WIP e estoque expedido.',
    responsavel_acao: 'Roberto Mendes Silva',
    email: 'rmendes@br.gestamp.com',
    data_acompanhamento: '2026-10-19',
    data_planejada: '2026-10-20',
    status: 'Validado',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM',
    data_conclusao: '2026-10-20',
    comentarios_evidencia: 'Realizada contenção de 308 peças. Nenhuma trinca adicional localizada.',
    comentarios_validacao: 'Aprovado pelo auditor da qualidade em auditoria de lote bloqueado.'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 1,
    id_programa_acoes: 'I - 1',
    tipo_acao: 'CORRETIVA',
    etapa_8d: '5D',
    causa: 'Instabilidade térmica e desgaste precoce do bico de contato de cobre gerando oscilação na tensão do arco de solda.',
    contra_medida: 'Substituição do bico de contato de cobre comum por liga CuCrZr de alta durabilidade e ajuste do fluxo de gás de proteção para 16 L/min.',
    responsavel_acao: 'André Ferreira Santos',
    email: 'aferreira@br.gestamp.com',
    data_acompanhamento: '2026-10-22',
    data_planejada: '2026-10-25',
    status: 'Concluído',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM',
    data_conclusao: '2026-10-24',
    comentarios_evidencia: 'Novos bicos instalados nas células robóticas 01 e 02. Parâmetros travados no CLP.'
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 1,
    id_programa_acoes: 'I - 1',
    tipo_acao: 'PREVENTIVA',
    etapa_8d: '7D',
    causa: 'Falta de parametrização no plano de manutenção preditiva para monitoramento contínuo da corrente de solda.',
    contra_medida: 'Atualização da folha de processo FMEA e implementação de inspeção periódica com LPA diária.',
    responsavel_acao: 'Carlos Eduardo Ferreira',
    email: 'ceduardo@mhleansolucoes.com.br',
    data_acompanhamento: '2026-10-26',
    data_planejada: '2026-10-30',
    status: 'Aberto',
    oData_8d_7d: 'FMEA',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM'
  },
  {
    id: 4,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 2,
    id_programa_acoes: 'C - 2',
    tipo_acao: 'CORRETIVA',
    etapa_8d: '5D',
    causa: 'Folga excessiva na bucha guia da matriz de corte provocando rebarba na estampagem.',
    contra_medida: 'Usinagem de novas buchas temperadas e troca do conjunto na ferramentaria.',
    responsavel_acao: 'Juliana Santos Oliveira',
    email: 'jsantos@br.gestamp.com',
    data_acompanhamento: '2026-10-21',
    data_planejada: '2026-10-22',
    status: 'Atrasado',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM'
  },
  {
    id: 5,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 3,
    id_programa_acoes: 'KAIZEN-2026-01',
    tipo_acao: 'MELHORIA',
    contra_medida: 'Instalação de engates rápidos pneumáticos para mangueiras de refrigeração da prensa.',
    responsavel_acao: 'André Ferreira Santos',
    email: 'aferreira@br.gestamp.com',
    data_acompanhamento: '2026-10-28',
    data_planejada: '2026-11-05',
    status: 'Aberto',
    yokoten: 'SIM',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'NÃO',
    validacao_acao: 'NÃO'
  },
  // --- Ações do 8D da RNC 6119 (I - 6119: HYUNDAI - Deformação Painel Traseiro) vinculadas ao Plano #4 ---
  {
    id: 6,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 4,
    id_programa_acoes: 'I - 6119',
    tipo_acao: 'CONTENÇÃO',
    etapa_8d: '3D',
    contra_medida: 'Inspeção 100% no posto de trabalho B643033 e segregação de todas as peças com deformação para retrabalho.',
    responsavel_acao: 'LEANDRO APARECIDO POSSOMATO',
    email: 'leandro.possomato@br.gestamp.com',
    data_acompanhamento: '2026-10-19',
    data_planejada: '2026-10-20',
    status: 'Validado',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM',
    data_conclusao: '2026-10-20',
    comentarios_evidencia: 'Lote de 24 peças inspecionado. 1 peça segregada e retrabalhada com calibrador DCO.',
    comentarios_validacao: 'Validação de contenção aprovada pela Qualidade.'
  },
  {
    id: 7,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 4,
    id_programa_acoes: 'I - 6119',
    tipo_acao: 'CORRETIVA',
    etapa_8d: '5D',
    causa: 'Bico graxeiro entupido impediu lubrificação do canal interno do grampo 3, gerando desgaste na bucha de articulação e pressão fora de esquadro.',
    contra_medida: 'Substituição das buchas de articulação do grampo 3 por modelo sinterizado autolubrificante e desobstrução do bico graxeiro.',
    responsavel_acao: 'Matheus Henrique de Luca',
    email: 'mluca@br.gestamp.com',
    data_acompanhamento: '2026-10-22',
    data_planejada: '2026-10-26',
    status: 'Concluído',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM',
    data_conclusao: '2026-10-24',
    comentarios_evidencia: 'Conjunto do grampo substituído e calibrado na ferramentaria com ensaio dimensional DCO.'
  },
  {
    id: 8,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 4,
    id_programa_acoes: 'I - 6119',
    tipo_acao: 'CORRETIVA',
    etapa_8d: '6D',
    contra_medida: 'Avaliação de folga e alinhamento mecânico dos grampos pneumáticos nos robôs 31, 32 e 34 da linha Hyundai.',
    responsavel_acao: 'Carlos Eduardo Ferreira',
    email: 'ceduardo@mhleansolucoes.com.br',
    data_acompanhamento: '2026-10-25',
    data_planejada: '2026-10-28',
    status: 'Aberto',
    yokoten: 'SIM',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM'
  },
  {
    id: 9,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 4,
    id_programa_acoes: 'I - 6119',
    tipo_acao: 'PREVENTIVA',
    etapa_8d: '7D',
    oData_8d_7d: 'FMEA',
    contra_medida: 'Revisão do PFMEA da operação B643033 incluindo o modo de falha de folga por deficiência de lubrificação no grampo de fixação.',
    responsavel_acao: 'Carlos Eduardo Ferreira',
    email: 'ceduardo@mhleansolucoes.com.br',
    data_acompanhamento: '2026-10-26',
    data_planejada: '2026-11-02',
    status: 'Aberto',
    yokoten: 'NÃO',
    poka_yoke: 'NÃO',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM'
  },
  {
    id: 10,
    tenant_id: PILOT_TENANT_ID,
    id_rel2: 4,
    id_programa_acoes: 'I - 6119',
    tipo_acao: 'PREVENTIVA',
    etapa_8d: '7D',
    oData_8d_7d: 'Trabalho Padronizado',
    contra_medida: 'Atualização da Instrução de Trabalho SOS 044 com inclusão da checagem diária de lubrificação de graxeiros no início do turno.',
    responsavel_acao: 'Paulo Henrique Vicente',
    email: 'paulo.vicente@br.gestamp.com',
    data_acompanhamento: '2026-10-27',
    data_planejada: '2026-11-04',
    status: 'Aberto',
    evidencia_obrigatoria: 'SIM',
    validacao_acao: 'SIM'
  }
];

const INITIAL_EIGHT_D_METADATA: EightDMetadata[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 1',
    participantes_8d: 'Matheus Henrique de Luca, Carlos Eduardo Ferreira, Roberto Mendes Silva, André Ferreira Santos',
    validar_8d: 'Em Andamento',
    diretriz_yokoten: 'Aplicar validação em todas as células de solda Toyota e Honda',
    diretriz_pokayoke: 'Sensor de fluxo de gás com interlock no robô ABB instalado',
    revisado_4d: true,
    revisado_5d: false,
    revisado_6d: false,
    revisado_7d: false
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'C - 2',
    participantes_8d: 'Carlos Eduardo Ferreira, Juliana Santos Oliveira',
    validar_8d: 'Em Andamento',
    diretriz_yokoten: 'Revisar matrizes irmãs de estampagem',
    diretriz_pokayoke: 'Calibre passa/não-passa de borda'
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 3',
    participantes_8d: 'Roberto Mendes Silva, Marcos Vinicius Barbosa',
    validar_8d: 'Aprovado',
    comentarios_validacao: 'Plano 8D concluído com sucesso e eficácia comprovada após 30 dias.',
    data_aprovacao: '2026-10-21',
    aprovado_por: 'Carlos Eduardo Ferreira',
    revisado_4d: true,
    revisado_5d: true,
    revisado_6d: true,
    revisado_7d: true
  },
  {
    id: 4,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 6119',
    participantes_8d: 'Matheus Henrique de Luca, Leandro Aparecido Possomato, Paulo Henrique Vicente, Carlos Eduardo Ferreira',
    validar_8d: 'Em Andamento',
    diretriz_yokoten: 'Revisar articulações e graxeiros em todos os robôs das células Solda 3',
    diretriz_pokayoke: 'Sensor óptico de checagem de assentamento da chapa antes do disparo do arco de solda',
    revisado_4d: true,
    revisado_5d: false,
    revisado_6d: false,
    revisado_7d: false
  }
];

const INITIAL_ISHIKAWA_CAUSES: IshikawaCauseItem[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 1',
    seisms: 'Máquina',
    ocnd: 'Ocorrência',
    okng: 'NG',
    descricao_causa: 'Instabilidade térmica e oscilação de corrente na tocha de soldagem robotizada',
    umpq: 'Por que ocorreu a trinca? -> Porque houve falta de fusão na raiz do cordão de solda.',
    doispq: 'Por que faltou fusão? -> Porque a energia linear de soldagem caiu abaixo de 0.8 kJ/mm.',
    trespq: 'Por que a energia caiu? -> Porque houve oscilação na tensão do arco elétrico.',
    quatropq: 'Por que a tensão oscilou? -> Porque o bico de contato sofreu desgaste prematuro por superaquecimento.',
    cincopq: 'Por que o bico superaqueceu? -> Porque o fluxo de gás e material do bico não suportavam o regime contínuo de produção.'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 1',
    seisms: 'Método',
    ocnd: 'Não Detecção',
    okng: 'OK',
    descricao_causa: 'Frequência de inspeção visual pelo operador no posto 01',
    umpq: 'Por que não detectou no posto? -> Parâmetros estavam dentro do plano de controle amostral.'
  },
  {
    id: 3,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 1',
    seisms: 'Material',
    ocnd: 'Ocorrência',
    okng: 'OK',
    descricao_causa: 'Composição química do arame de solda ER70S-6 fora de especificação',
    umpq: 'Por que suspeitou do arame? -> Lote de arame foi analisado e certificado pelo laboratório como conforme.'
  },
  {
    id: 4,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 6119',
    seisms: 'Máquina',
    ocnd: 'Ocorrência',
    okng: 'NG',
    descricao_causa: 'Folga mecânica no grampo pneumático 3 do dispositivo de solda do robô 33',
    umpq: 'Por que o ponto de solda pegou fora? -> Porque a chapa estava com deformação na borda de apoio.',
    doispq: 'Por que a chapa deformou? -> Porque o grampo pneumático 3 aplicou pressão fora de esquadro.',
    trespq: 'Por que aplicou pressão fora de esquadro? -> Porque a bucha de articulação do grampo desgastou excessivamente.',
    quatropq: 'Por que a bucha desgastou? -> Porque a graxa não penetrava no canal interno de lubrificação.',
    cincopq: 'Por que a graxa não penetrava? -> Porque o bico graxeiro estava entupido e não havia item de checagem na rota autônoma.'
  },
  {
    id: 5,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 6119',
    seisms: 'Método',
    ocnd: 'Não Detecção',
    okng: 'OK',
    descricao_causa: 'Frequência de checagem dimensional da peça final no DCO',
    umpq: 'Por que não detectou no posto? -> Amostragem periódica de 1 peça a cada 50 não capturou o desvio transitório.'
  }
];

const INITIAL_HENKATEN: HenkatenRecord[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 1',
    maqhkt: 'Sim',
    maq_comentarios: 'Troca da tocha robótica ocorrida 2 turnos antes do evento',
    mohkt: 'Não',
    mo_comentarios: 'Operador qualificado com certificação válida',
    methkt: 'Não',
    met_comentarios: 'Folha de processo revisada e aprovada',
    mathkt: 'Não',
    mat_comentarios: 'Matéria-prima de fornecedor homologado',
    medhkt: 'Não',
    med_comentarios: 'Dispositivo CMM calibrado',
    mambhkt: 'Não',
    mamb_comentarios: 'Temperatura e umidade dentro dos limites operacionais'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 6119',
    maqhkt: 'Sim',
    maq_comentarios: 'Substituição do atuador pneumático do grampo 3 ocorrida 24h antes do desvio',
    mohkt: 'Não',
    mo_comentarios: 'Operador com treinamento de solda em dia',
    methkt: 'Não',
    met_comentarios: 'Folha de processo mantida sem alteração',
    mathkt: 'Não',
    mat_comentarios: 'Lote de chapas estampadas aprovado na inspeção de entrada',
    medhkt: 'Não',
    med_comentarios: 'Gabarito DCO com certificado de calibração válido',
    mambhkt: 'Não',
    mamb_comentarios: 'Sem oscilação térmica relevante no galpão'
  }
];

const INITIAL_ENTREVISTAS: Entrevista8DRecord[] = [
  {
    id: 1,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 1',
    gemba: 'Avaliado o posto de solda 01 em operação real com medição de temperatura superficial.',
    rastreabilidade: 'Lotes de peças brutas estampadas confirmados com rastreabilidade SAP 28926.',
    entrevista: 'Operador relatou que nos últimos 30 min antes da parada o som do arco estava intermitente.',
    simulacao: 'Reproduzido o cordão com bico novo e o defeito cessou imediatamente.'
  },
  {
    id: 2,
    tenant_id: PILOT_TENANT_ID,
    id8d: 'I - 6119',
    gemba: 'Avaliado o ciclo do robô 33 no posto B643033 durante soldagem do painel traseiro completo.',
    rastreabilidade: 'Lotes do produto U005000B6 identificados e rastreados sem extravio nos racks.',
    entrevista: 'Operador relatou que nos últimos 2 turnos o grampo 3 apresentava ruído atípico ao travar.',
    simulacao: 'Confirmado desvio de 2.1mm no ponto de solda quando o grampo atuava com folga angular.'
  }
];

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
  private actionPlans: ActionPlanHeader[] = [];
  private actionItems: ActionPlanItem[] = [];
  private eightDMetadataList: EightDMetadata[] = [];
  private ishikawaCauses: IshikawaCauseItem[] = [];
  private henkatenList: HenkatenRecord[] = [];
  private entrevistaList: Entrevista8DRecord[] = [];
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
    const deduped: RNCRecord[] = [];
    for (let i = 0; i < this.rncs.length; i++) {
      const r = this.rncs[i];
      const tId = r.tenant_id || PILOT_TENANT_ID;
      r.tenant_id = tId;
      const compKey = this.getRncCompositeKey(tId, r.id);
      if (!this.rncMap.has(compKey)) {
        (r as any)._searchStr = `${r.id} ${r.field1 || ''} ${r.cliente || ''} ${r.produto || ''} ${r.componente || ''} ${r.codigoRastreabilidade || ''} ${r.descricaoProblema || ''} ${r.participantesAtendimento || ''} ${r.setorDeteccao || ''}`.toLowerCase();
        this.rncMap.set(compKey, r);
        deduped.push(r);
      }
    }
    this.rncs = deduped;
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
        // Sanitiza eventuais URLs legadas do SharePoint (Reserved_ImageAttachment / sharepoint.com) e remove IDs globais legados > 5000 se já houver seeds v2
        const hasV2Seeds = parsed.some(r => r.id >= 1 && r.id <= 50);
        this.rncs = parsed
          .filter(r => !(hasV2Seeds && (r.id === 6119 || r.id === 5970 || r.id === 5507 || r.id === 5470 || r.id === 5400)))
          .map(r => {
            const cleanR = { ...r };
            if (cleanR.fotoPecaNg && (cleanR.fotoPecaNg.includes('sharepoint.com') || cleanR.fotoPecaNg.includes('Reserved_ImageAttachment'))) {
              cleanR.fotoPecaNg = createTechnicalSvgDataUrl('NG', cleanR.field1 || `RNC-${cleanR.id}`, cleanR.modoFalha || 'Evidência Não Conforme (NG)', cleanR.posto || cleanR.fmds || 'Inspeção de Qualidade');
            }
            if (cleanR.fotoPecaOk && (cleanR.fotoPecaOk.includes('sharepoint.com') || cleanR.fotoPecaOk.includes('Reserved_ImageAttachment'))) {
              cleanR.fotoPecaOk = createTechnicalSvgDataUrl('OK', cleanR.field1 || `RNC-${cleanR.id}`, 'Padrão Homologado (OK)', cleanR.posto || cleanR.fmds || 'Conformidade Validada');
            }
            if (cleanR.fotoAuxiliar && (cleanR.fotoAuxiliar.includes('sharepoint.com') || cleanR.fotoAuxiliar.includes('Reserved_ImageAttachment'))) {
              cleanR.fotoAuxiliar = '';
            }
            return cleanR;
          });

        // Garante que o contador monotônico de cada empresa nunca seja menor que o maior ID válido já existente nela
        const maxByTenant = new Map<string, number>();
        this.rncs.forEach(r => {
          if (r.id < 5000) {
            const tId = r.tenant_id || PILOT_TENANT_ID;
            const prev = maxByTenant.get(tId) || 0;
            if (r.id > prev) maxByTenant.set(tId, r.id);
          }
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

      const storedActionPlans = localStorage.getItem('gestamp_sor_action_plans');
      const loadedPlans: ActionPlanHeader[] = storedActionPlans ? JSON.parse(storedActionPlans) : [];
      const planMap = new Map<number, ActionPlanHeader>();
      INITIAL_ACTION_PLANS.forEach(p => planMap.set(p.id, p));
      loadedPlans.forEach(p => planMap.set(p.id, p));
      this.actionPlans = Array.from(planMap.values());

      const storedActionItems = localStorage.getItem('gestamp_sor_action_items');
      const loadedItems: ActionPlanItem[] = storedActionItems ? JSON.parse(storedActionItems) : [];
      const itemMap = new Map<number, ActionPlanItem>();
      INITIAL_ACTION_ITEMS.forEach(i => itemMap.set(i.id, i));
      loadedItems.forEach(i => itemMap.set(i.id, i));
      this.actionItems = Array.from(itemMap.values());

      const stored8DMeta = localStorage.getItem('gestamp_sor_8d_meta');
      const loadedMeta: EightDMetadata[] = stored8DMeta ? JSON.parse(stored8DMeta) : [];
      const metaMap = new Map<string, EightDMetadata>();
      INITIAL_EIGHT_D_METADATA.forEach(m => metaMap.set(m.id8d, m));
      loadedMeta.forEach(m => metaMap.set(m.id8d, m));
      this.eightDMetadataList = Array.from(metaMap.values());

      const storedIshikawa = localStorage.getItem('gestamp_sor_ishikawa');
      const loadedIsh: IshikawaCauseItem[] = storedIshikawa ? JSON.parse(storedIshikawa) : [];
      const ishMap = new Map<number, IshikawaCauseItem>();
      INITIAL_ISHIKAWA_CAUSES.forEach(c => ishMap.set(c.id, c));
      loadedIsh.forEach(c => ishMap.set(c.id, c));
      this.ishikawaCauses = Array.from(ishMap.values());

      const storedHenkaten = localStorage.getItem('gestamp_sor_henkaten');
      const loadedHenk: HenkatenRecord[] = storedHenkaten ? JSON.parse(storedHenkaten) : [];
      const henkMap = new Map<string, HenkatenRecord>();
      INITIAL_HENKATEN.forEach(h => henkMap.set(h.id8d, h));
      loadedHenk.forEach(h => henkMap.set(h.id8d, h));
      this.henkatenList = Array.from(henkMap.values());

      const storedEntrevista = localStorage.getItem('gestamp_sor_entrevista');
      const loadedEntr: Entrevista8DRecord[] = storedEntrevista ? JSON.parse(storedEntrevista) : [];
      const entrMap = new Map<string, Entrevista8DRecord>();
      INITIAL_ENTREVISTAS.forEach(e => entrMap.set(e.id8d, e));
      loadedEntr.forEach(e => entrMap.set(e.id8d, e));
      this.entrevistaList = Array.from(entrMap.values());

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
        if (cachedRncsV2 && cachedRncsV2.length > 0 && (!localStorage.getItem('sor_saas_rncs_v2') || cachedRncsV2.length > this.rncs.length)) {
          this.rncs = cachedRncsV2;
          this.indexRNCs();
          tenantService.recalculateTenantStorage(this.rncs);
        }
        this.syncWithCloudAndSupabase('pull');
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

  private deletedRncKeys: Set<string> = new Set();
  private isSyncingCloud = false;

  public async syncWithCloudAndSupabase(mode: 'pull' | 'push' = 'pull'): Promise<void> {
    if (this.isSyncingCloud) return;
    this.isSyncingCloud = true;
    try {
      // 1. Busca registros salvos na tabela 'rncs' do Supabase (se RLS permitir)
      const supaRncs = await tenantService.fetchRncsFromSupabase();
      if (supaRncs.length > 0) {
        const map = new Map<string, RNCRecord>();
        this.rncs.forEach(r => map.set(this.getRncCompositeKey(r.tenant_id || PILOT_TENANT_ID, r.id), r));
        supaRncs.forEach(r => map.set(this.getRncCompositeKey(r.tenant_id || PILOT_TENANT_ID, r.id), r));
        this.rncs = Array.from(map.values()).sort((a, b) => b.id - a.id);
      }

      // 2. Sincroniza com o Cloud Store do Servidor (/api/cloud-sync)
      const masterSnap = tenantService.getCloudMasterStateSnapshot();
      const res =
        mode === 'push'
          ? await fetch('/api/cloud-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                rncs: this.rncs,
                actionPlans: this.actionPlans,
                actionItems: this.actionItems,
                eightDMetadataList: this.eightDMetadataList,
                ishikawaCauses: this.ishikawaCauses,
                henkatenList: this.henkatenList,
                entrevistaList: this.entrevistaList,
                lotesSAP: this.lotesSAP,
                treinamentos: this.treinamentos,
                masterData: masterSnap.masterData,
                optionCategories: masterSnap.optionCategories,
                formFields: masterSnap.formFields,
                deletedRncKeys: Array.from(this.deletedRncKeys)
              })
            })
          : await fetch('/api/cloud-sync', { method: 'GET' });

      if (res.ok) {
        const merged = await res.json();
        let updated = false;
        if (Array.isArray(merged.rncs) && merged.rncs.length > 0) {
          const prevIds = this.rncs.map(r => `${r.tenant_id || PILOT_TENANT_ID}:${r.id}:${r.status}`).join('|');
          const map = new Map<string, RNCRecord>();
          this.rncs.forEach(r => {
            const k = this.getRncCompositeKey(r.tenant_id || PILOT_TENANT_ID, r.id);
            if (!this.deletedRncKeys.has(k)) map.set(k, r);
          });
          merged.rncs.forEach((r: RNCRecord) => {
            const k = this.getRncCompositeKey(r.tenant_id || PILOT_TENANT_ID, r.id);
            if (!this.deletedRncKeys.has(k)) map.set(k, r);
          });
          this.rncs = Array.from(map.values()).sort((a: RNCRecord, b: RNCRecord) => b.id - a.id);
          const nextIds = this.rncs.map(r => `${r.tenant_id || PILOT_TENANT_ID}:${r.id}:${r.status}`).join('|');
          if (prevIds !== nextIds) updated = true;
          this.rncs.forEach(r => {
            if (r.id < 5000) {
              tenantService.ensureTenantRncSequenceAtLeast(r.tenant_id || PILOT_TENANT_ID, r.id);
            }
          });
        }
        if (Array.isArray(merged.actionPlans) && merged.actionPlans.length > 0) {
          if (merged.actionPlans.length !== this.actionPlans.length) updated = true;
          this.actionPlans = merged.actionPlans;
        }
        if (Array.isArray(merged.actionItems) && merged.actionItems.length > 0) {
          if (merged.actionItems.length !== this.actionItems.length) updated = true;
          this.actionItems = merged.actionItems;
        }
        if (Array.isArray(merged.eightDMetadataList) && merged.eightDMetadataList.length > 0) {
          this.eightDMetadataList = merged.eightDMetadataList;
        }
        if (Array.isArray(merged.ishikawaCauses) && merged.ishikawaCauses.length > 0) {
          this.ishikawaCauses = merged.ishikawaCauses;
        }
        if (Array.isArray(merged.henkatenList) && merged.henkatenList.length > 0) {
          this.henkatenList = merged.henkatenList;
        }
        if (Array.isArray(merged.entrevistaList) && merged.entrevistaList.length > 0) {
          this.entrevistaList = merged.entrevistaList;
        }
        if (Array.isArray(merged.lotesSAP) && merged.lotesSAP.length > 0) {
          this.lotesSAP = merged.lotesSAP;
        }
        if (Array.isArray(merged.treinamentos) && merged.treinamentos.length > 0) {
          this.treinamentos = merged.treinamentos;
        }
        tenantService.applyCloudMasterStateSnapshot({
          masterData: merged.masterData,
          optionCategories: merged.optionCategories,
          formFields: merged.formFields
        });

        this.indexRNCs();
        this.persistLocalOnly();
        if (updated) {
          tenantService.recalculateTenantStorage(this.rncs);
          tenantService.notifyListeners();
        }
      }
    } catch {
      // Operação offline silenciosa se sem rede
    } finally {
      this.isSyncingCloud = false;
    }
  }

  private persistLocalOnly() {
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
      localStorage.setItem('gestamp_sor_action_plans', JSON.stringify(this.actionPlans));
      localStorage.setItem('gestamp_sor_action_items', JSON.stringify(this.actionItems));
      localStorage.setItem('gestamp_sor_8d_meta', JSON.stringify(this.eightDMetadataList));
      localStorage.setItem('gestamp_sor_ishikawa', JSON.stringify(this.ishikawaCauses));
      localStorage.setItem('gestamp_sor_henkaten', JSON.stringify(this.henkatenList));
      localStorage.setItem('gestamp_sor_entrevista', JSON.stringify(this.entrevistaList));
      localStorage.setItem('gestamp_sor_current_re', String(this.currentUser.reAcesso));
      localStorage.setItem('gestamp_sor_last_sync', this.connectionState.lastSync || '');
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    idbSet('rncs_v2', this.rncs);
    idbSet('pecas', this.pecas);
  }

  private saveToStorage() {
    this.persistLocalOnly();
    this.syncWithCloudAndSupabase('push');
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
    this.actionPlans = [...INITIAL_ACTION_PLANS];
    this.actionItems = [...INITIAL_ACTION_ITEMS];
    this.eightDMetadataList = [...INITIAL_EIGHT_D_METADATA];
    this.ishikawaCauses = [...INITIAL_ISHIKAWA_CAUSES];
    this.henkatenList = [...INITIAL_HENKATEN];
    this.entrevistaList = [...INITIAL_ENTREVISTAS];
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
    const masterProds = tenantService.getActiveOptions('master_pecas_produtos');
    const existingNames = new Set(
      this.pecas.map(p => p.descricao.trim().toLowerCase())
    );
    const existingCodCli = new Set(
      this.pecas.map(p => `${p.codCliText} - ${p.descricao}`.trim().toLowerCase())
    );

    const extraPecas: PecaCatalogo[] = [];
    masterProds.forEach((m, idx) => {
      const cleanName = m.nome.trim();
      const lower = cleanName.toLowerCase();
      if (!existingNames.has(lower) && !existingCodCli.has(lower)) {
        const dashParts = cleanName.split(' - ');
        const codCli = dashParts.length > 1 ? dashParts[0].trim() : m.codigo || `PROD-${idx + 1}`;
        const desc = dashParts.length > 1 ? dashParts.slice(1).join(' - ').trim() : cleanName;
        const detParts = (m.detalhe || '').split('•').map(s => s.trim());
        extraPecas.push({
          identificacao: 9000 + idx,
          material: m.codigo || `MAT-${9000 + idx}`,
          descricao: desc,
          cliente: detParts[0] || DEFAULT_CLIENTE,
          cliente1: detParts[0] || DEFAULT_CLIENTE,
          posto: detParts[1] || 'POSTO 01 - ALIMENTAÇÃO',
          fmds: detParts[2] || 'SOLDA 2 - CEL. TOYOTA',
          nestingLevel: 0,
          codCliText: codCli,
          componente: detParts[3] || cleanName,
          carryOver: detParts[4] ? 'Sim' : 'Não',
          pecasComuns: detParts[4] || '',
          coProduto: detParts[5] ? 'Sim' : 'Não',
          pecaEspelho: detParts[5] || '',
          caracteristicaSeguranca: detParts[6] ? 'Sim' : 'Não',
          aspectoSeguranca: detParts[6] || ''
        });
      }
    });

    return [...this.pecas, ...extraPecas];
  }

  public getPecas(): PecaCatalogo[] {
    return this.getColPecasGeraisAA3();
  }

  // Filter(colpecasgerais_AA3, Cliente1 = cxcliente.Selected.Value, 'Nesting level' = 0)
  public getProdutosPorCliente(cliente: string): PecaCatalogo[] {
    const key = (cliente || '').toUpperCase();
    const allPecas = this.getColPecasGeraisAA3();
    if (!key) {
      return allPecas.filter(p => p.nestingLevel === 0);
    }
    const filtered = allPecas.filter(
      p =>
        (p.cliente.toUpperCase() === key ||
          (p.cliente1 && p.cliente1.toUpperCase() === key) ||
          p.identificacao >= 9000 ||
          (key.includes('TDB') &&
            (p.cliente.toUpperCase().includes('TOYOTA') || p.cliente.toUpperCase().includes('TDB'))) ||
          (key.includes('TOYOTA') &&
            (p.cliente.toUpperCase().includes('TDB') || p.cliente.toUpperCase().includes('TOYOTA')))) &&
        p.nestingLevel === 0
    );
    return filtered.length > 0 ? filtered : allPecas.filter(p => p.nestingLevel === 0);
  }

  // Retorna os componentes (nestingLevel > 0) vinculados ao produto final selecionado (ou todos se não filtrado)
  public getComponentesPorProduto(codCliText: string): PecaCatalogo[] {
    const key = (codCliText || '').trim().toUpperCase();
    const allComponents = this.pecas.filter(p => p.nestingLevel > 0);
    if (!key) {
      return allComponents;
    }

    // Procura o produto final correspondente para identificar família de código e cliente
    const parentProduct = this.getColPecasGeraisAA3().find(
      p => p.codCliText.toUpperCase() === key || `${p.codCliText} - ${p.descricao}`.toUpperCase() === key
    );
    const cleanCode = (parentProduct?.codCliText || key.split(' - ')[0] || key).trim().toUpperCase();
    const familyPrefix = cleanCode.substring(0, 5);

    // 1. Componentes que pertencem à mesma família de código da peça final (ex: 53201-0D120 -> 53201-0D121, 53201-0D122...)
    const byFamily = allComponents.filter(p => {
      const compCode = (p.codCliText || p.componente || '').trim().toUpperCase();
      return familyPrefix.length >= 4 && compCode.startsWith(familyPrefix);
    });

    // 2. Complementa com os demais componentes do mesmo cliente para permitir detalhar qualquer subcomponente aplicável
    if (parentProduct?.cliente) {
      const parentCli = parentProduct.cliente.toUpperCase();
      const byClient = allComponents.filter(
        p =>
          p.cliente.toUpperCase() === parentCli ||
          (p.cliente1 && p.cliente1.toUpperCase() === parentCli)
      );
      const merged = [...byFamily];
      byClient.forEach(c => {
        if (!merged.some(m => m.identificacao === c.identificacao)) {
          merged.push(c);
        }
      });
      if (merged.length > 0) {
        return merged;
      }
    }

    return byFamily.length > 0 ? byFamily : allComponents;
  }

  // Distinct(colpecasgerais_AA3, Posto) + Postos do Tenant Ativo (Master)
  public getDistinctPostos(): string[] {
    const tenantPostos = tenantService
      .getActiveOptions('posto_trabalho')
      .map(m => m.nome);
    const activeTenantId = tenantService.getActiveTenantId();
    if (activeTenantId !== PILOT_TENANT_ID && tenantPostos.length > 0) {
      return Array.from(new Set(tenantPostos)).sort();
    }
    return Array.from(new Set([...tenantPostos, ...this.cachedPostos])).sort();
  }

  // Distinct(colpecasgerais_AA3, FMDS) + Áreas Fabris do Tenant Ativo (Master)
  public getDistinctFMDS(): string[] {
    const tenantAreas = tenantService
      .getActiveOptions('area_fabril')
      .map(m => m.nome);
    const activeTenantId = tenantService.getActiveTenantId();
    if (activeTenantId !== PILOT_TENANT_ID && tenantAreas.length > 0) {
      return Array.from(new Set(tenantAreas)).sort();
    }
    return Array.from(new Set([...tenantAreas, ...this.cachedFMDS])).sort();
  }

  public getDistinctClientes(): string[] {
    const tenantClientes = tenantService
      .getActiveOptions('cliente_montadora')
      .map(m => m.nome);
    const activeTenantId = tenantService.getActiveTenantId();
    if (activeTenantId !== PILOT_TENANT_ID && tenantClientes.length > 0) {
      return Array.from(new Set(tenantClientes)).sort();
    }
    return Array.from(new Set([...tenantClientes, ...this.cachedClientes])).sort();
  }

  public getDistinctDefeitos(): string[] {
    return tenantService
      .getActiveOptions('cat_defeito')
      .map(m => m.nome);
  }

  // BASE_ATIVOS (varPessoas) sincronizado com Lista Master de Funcionários
  public getBaseAtivos(): ColaboradorBaseAtivos[] {
    const masterAtivos = tenantService.getBaseAtivosForTenant();
    if (masterAtivos.length > 0) {
      return masterAtivos;
    }
    return this.baseAtivos;
  }

  public getUsuarios(): UsuarioQualidade[] {
    const tenantUsers = tenantService.getUnifiedUsersMatrix();
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
    const cleanId = String(id).replace(/[^0-9]/g, '');
    const numId = cleanId ? Number(cleanId) : Number(id);
    const activeTenantId = tenantIdOverride || tenantService.getActiveTenantId();
    
    // 1. Tenta achar no tenant ativo por composite key
    if (!isNaN(numId)) {
      const compositeKey = this.getRncCompositeKey(activeTenantId, numId);
      const exactMatch = this.rncMap.get(compositeKey);
      if (exactMatch) {
        return exactMatch;
      }
    }

    // 2. Tenta achar no tenant ativo por id, title, field1 ou codOcorrenciaCliente
    const inTenant = this.rncs.find(
      r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId && 
           (r.id === numId || String(r.id) === String(id) || r.title === String(id) || r.field1 === String(id))
    );
    if (inTenant) {
      return inTenant;
    }

    // 3. Fallback Global: procura em qualquer tenant por ID numérico ou string
    const globalMatch = this.rncs.find(
      r => r.id === numId || String(r.id) === String(id) || r.title === String(id) || r.field1 === String(id) || r.field1 === `RNC-${id}`
    );
    if (globalMatch) {
      return globalMatch;
    }

    // 4. Fallback para itens em INITIAL_RNCS quando o ID exato existir na semente
    const seedMatch = INITIAL_RNCS.find(r => r.id === numId);
    if (seedMatch) {
      const existingSeed = this.rncs.find(
        r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId && r.id === seedMatch.id
      );
      if (existingSeed) return existingSeed;

      const cloned: RNCRecord = { ...seedMatch, tenant_id: activeTenantId };
      this.rncs.push(cloned);
      this.indexRNCs();
      this.saveToStorage();
      return cloned;
    }

    // 5. Fallback por similaridade de código de ocorrência
    const strId = String(id).trim();
    if (strId) {
      const partialMatch = this.rncs.find(r => 
        (r.field1 && r.field1.includes(strId)) || 
        (r.codOcorrenciaCliente && r.codOcorrenciaCliente.includes(strId))
      );
      if (partialMatch) return partialMatch;
    }

    return undefined;
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
        tenantService.upsertRncToSupabase(this.rncs[idx]);
        tenantService.recalculateTenantStorage(this.rncs, activeTenantId);
        tenantService.addHistoricoAcao(
          Number(rnc.id),
          this.currentUser.nome,
          'Atualização de RNC',
          `Status: ${this.rncs[idx].status}`
        );
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
      pecasComuns: rnc.pecasComuns || "",
      pecaEspelho: rnc.pecaEspelho || "",
      aspectoSeguranca: rnc.aspectoSeguranca || "",
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
      reDetector: this.currentUser.reAcesso,
      dataHoraAbertura: rnc.dataHoraAbertura || new Date().toISOString()
    };

    this.rncs.unshift(newRecord);
    this.indexRNCs();
    this.saveToStorage();
    tenantService.upsertRncToSupabase(newRecord);
    tenantService.recalculateTenantStorage(this.rncs, activeTenantId);
    tenantService.addHistoricoAcao(
      newRecord.id,
      this.currentUser.nome,
      'Abertura de RNC',
      `${newRecord.field1} • ${newRecord.descricaoProblema}`
    );

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
    tenantService.upsertRncToSupabase(this.rncs[idx]);

    return { success: true, message: `RNC ${this.rncs[idx].field1 || id} concluída com sucesso!` };
  }

  // Exclusão em cascata restrita à empresa ativa (NÃO decrementa o contador sequencial da empresa)
  public deleteRNCCascade(id: number): boolean {
    const activeTenantId = tenantService.getActiveTenantId();
    // Garante que o maior ID já atingido pela empresa fique registrado antes de excluir
    tenantService.ensureTenantRncSequenceAtLeast(activeTenantId, id);
    this.deletedRncKeys.add(`${activeTenantId}::${id}`);

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
    tenantService.deleteRncFromSupabase(id, activeTenantId);
    tenantService.recalculateTenantStorage(this.rncs, activeTenantId);
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
          id: 1,
          tenant_id: PILOT_TENANT_ID,
          idRnc: 1,
          seqRel: "1",
          produto: "U005000B6",
          lote: "28926",
          estoque: "Almoxarifado Expedição",
          qtd: 308,
          qtdVerificada: 308,
          qtdNg: 3,
          qtdOk: 305,
          data: "2026-10-16",
          responsavel: "Leandro Serafim de Lima"
        }];
      }
      return [];
    }
    return tenantItems;
  }

  public addLoteSAP(item: LoteSAPParsed): LoteSAPParsed {
    const activeTenantId = tenantService.getActiveTenantId();
    const nextId = this.lotesSAP.length > 0
      ? Math.max(...this.lotesSAP.map((l, idx) => l.id || idx + 1)) + 1
      : 1;
    const qtdVerificada = Number(item.qtdVerificada ?? item.qtd ?? 0);
    const qtdNg = Math.max(0, Number(item.qtdNg ?? 0));
    const qtdOk = item.qtdOk !== undefined ? Number(item.qtdOk) : Math.max(0, qtdVerificada - qtdNg);

    const novoLote: LoteSAPParsed = {
      ...item,
      id: item.id || nextId,
      tenant_id: item.tenant_id || activeTenantId,
      qtd: qtdVerificada,
      qtdVerificada,
      qtdNg,
      qtdOk
    };
    this.lotesSAP.push(novoLote);

    // Sincroniza os contadores de contenção da RNC
    this.syncRncContainmentCounters(item.idRnc, activeTenantId);
    this.saveToStorage();
    return novoLote;
  }

  public deleteLoteSAP(idOrIndex: number, idRnc: number): void {
    const activeTenantId = tenantService.getActiveTenantId();
    this.lotesSAP = this.lotesSAP.filter(
      (l, idx) => !((l.tenant_id || PILOT_TENANT_ID) === activeTenantId && l.idRnc === idRnc && (l.id === idOrIndex || idx === idOrIndex))
    );
    this.syncRncContainmentCounters(idRnc, activeTenantId);
    this.saveToStorage();
  }

  private syncRncContainmentCounters(idRnc: number, tenantId: string): void {
    const lotes = this.lotesSAP.filter(
      l => (l.tenant_id || PILOT_TENANT_ID) === tenantId && l.idRnc === idRnc
    );
    const rncIdx = this.rncs.findIndex(
      r => (r.tenant_id || PILOT_TENANT_ID) === tenantId && r.id === idRnc
    );
    if (rncIdx !== -1 && lotes.length > 0) {
      const totalVerificado = lotes.reduce((acc, l) => acc + Number(l.qtdVerificada ?? l.qtd ?? 0), 0);
      const totalNg = lotes.reduce((acc, l) => acc + Number(l.qtdNg ?? 0), 0);
      this.rncs[rncIdx].qtdInspecionada = totalVerificado;
      this.rncs[rncIdx].qtdBloqueada = totalNg;
      this.rncs[rncIdx].qtdSuspeita = totalVerificado;
      this.indexRNCs();
    }
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

  // ============================================================================
  // MÉTODOS DE PLANO DE AÇÃO: CABEÇALHOS ('Action plan')
  // ============================================================================
  public getActionPlans(filter?: { idprograma?: string; search?: string }): ActionPlanHeader[] {
    const activeTenantId = tenantService.getActiveTenantId();
    let result = this.actionPlans.filter(p => (p.tenant_id || PILOT_TENANT_ID) === activeTenantId);

    if (filter?.idprograma) {
      result = result.filter(p => p.idprograma === filter.idprograma);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(p => 
        (p.descricao_problema_oportunidade && p.descricao_problema_oportunidade.toLowerCase().includes(q)) ||
        (p.indicador_programa_estrategico && p.indicador_programa_estrategico.toLowerCase().includes(q)) ||
        (p.produto_ && p.produto_.toLowerCase().includes(q)) ||
        (p.posto_ && p.posto_.toLowerCase().includes(q)) ||
        (p.idprograma && p.idprograma.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => b.id - a.id);
  }

  public getActionPlanById(id: number): ActionPlanHeader | undefined {
    const activeTenantId = tenantService.getActiveTenantId();
    return (
      this.actionPlans.find(p => (p.tenant_id || PILOT_TENANT_ID) === activeTenantId && p.id === id) ||
      this.actionPlans.find(p => p.id === id)
    );
  }

  /**
   * Busca ou cria automaticamente um Cabeçalho de Plano de Ação ('Action plan') com seus campos fixos,
   * adaptando os dados do registro de origem (ex: 8D / RNC ou qualquer outro app) e salvando o ID do Plano
   * de volta no registro de origem (campo de vínculo local8d).
   */
  public getOrCreatePlanForExternalApp(idprograma: string): ActionPlanHeader | undefined {
    if (!idprograma || !idprograma.trim()) return undefined;
    const activeTenantId = tenantService.getActiveTenantId();
    const normalizedProg = idprograma.trim();

    let existing = this.actionPlans.find(
      p =>
        (p.tenant_id || PILOT_TENANT_ID) === activeTenantId &&
        p.idprograma &&
        p.idprograma.trim().toLowerCase() === normalizedProg.toLowerCase()
    );

    const digits = normalizedProg.replace(/[^0-9]/g, '');
    const rncIdNum = digits ? Number(digits) : 0;
    const rnc = rncIdNum ? this.getRNCById(rncIdNum) : undefined;

    if (!existing && rnc) {
      existing = this.saveActionPlan({
        indicador_programa_estrategico:
          rnc.tipoRnc === 'Formal' || rnc.tipoRnc === 'Informal'
            ? 'ATENDIMENTO AO CLIENTE'
            : 'FAST RESPONSE',
        setor_: rnc.classificacaoSetor || rnc.setorDeteccao || 'Qualidade',
        posto_: rnc.posto || rnc.fmds || '',
        produto_: rnc.produto || '',
        sub1: rnc.componente || '',
        sub2: rnc.subcomponente || '',
        prioridade: rnc.criticidade === 'A' || rnc.gravidade === 'Alta' ? 'Alta' : 'Média',
        descricao_problema_oportunidade: rnc.descricaoProblema || rnc.title || '',
        foto_acao: rnc.fotoPecaNg || '',
        idprograma: normalizedProg,
        status: 'Aberto',
        responsavel_abertura: rnc.detector || this.currentUser.nome
      });
    }

    if (existing && rnc && rnc.local8d !== String(existing.id)) {
      rnc.local8d = String(existing.id);
      this.saveToStorage();
    }

    return existing;
  }

  public saveActionPlan(plan: Partial<ActionPlanHeader>): ActionPlanHeader {
    const activeTenantId = tenantService.getActiveTenantId();
    let savedPlan: ActionPlanHeader;

    if (plan.id) {
      const idx = this.actionPlans.findIndex(p => p.id === plan.id && (p.tenant_id || PILOT_TENANT_ID) === activeTenantId);
      if (idx >= 0) {
        this.actionPlans[idx] = { ...this.actionPlans[idx], ...plan } as ActionPlanHeader;
        savedPlan = this.actionPlans[idx];
      } else {
        savedPlan = plan as ActionPlanHeader;
      }
    } else {
      const nextId = this.actionPlans.length > 0 ? Math.max(...this.actionPlans.map(p => p.id)) + 1 : 1;
      savedPlan = {
        id: nextId,
        tenant_id: activeTenantId,
        indicador_programa_estrategico: plan.indicador_programa_estrategico || 'ATENDIMENTO AO CLIENTE',
        sub1: plan.sub1 || '',
        sub2: plan.sub2 || '',
        posto_: plan.posto_ || '',
        produto_: plan.produto_ || '',
        setor_: plan.setor_ || 'Qualidade',
        prioridade: plan.prioridade || 'Média',
        descricao_problema_oportunidade: plan.descricao_problema_oportunidade || '',
        foto_acao: plan.foto_acao || '',
        idprograma: plan.idprograma || '',
        id_rel1: plan.id_rel1 || `guid-plan-${Date.now()}`,
        data_abertura: plan.data_abertura || new Date().toISOString().split('T')[0],
        status: plan.status || 'Aberto',
        responsavel_abertura: plan.responsavel_abertura || this.currentUser.nome
      };
      this.actionPlans.unshift(savedPlan);
    }

    // Salva o ID do Plano no registro vinculado do outro app (ex: RNC.local8d = ID do Plano)
    if (savedPlan.idprograma) {
      const digits = savedPlan.idprograma.replace(/[^0-9]/g, '');
      const rncNum = digits ? Number(digits) : 0;
      if (rncNum) {
        const linkedRnc = this.getRNCById(rncNum);
        if (linkedRnc) {
          linkedRnc.local8d = String(savedPlan.id);
        }
      }
    }

    this.saveToStorage();
    return savedPlan;
  }

  public deleteActionPlan(id: number): boolean {
    const activeTenantId = tenantService.getActiveTenantId();
    this.actionPlans = this.actionPlans.filter(p => !(p.id === id && (p.tenant_id || PILOT_TENANT_ID) === activeTenantId));
    // Remove ações filhas em cascata
    this.actionItems = this.actionItems.filter(a => !(a.id_rel2 === id && (a.tenant_id || PILOT_TENANT_ID) === activeTenantId));
    this.saveToStorage();
    return true;
  }

  // ============================================================================
  // MÉTODOS DE ITENS DE AÇÃO: DETALHES ('Action plan_acoes')
  // ============================================================================
  public getActionItems(filter?: { 
    id_rel2?: number; 
    id_programa_acoes?: string; 
    status?: string; 
    tipo_acao?: string;
    responsavel?: string;
    search?: string;
  }): ActionPlanItem[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const today = new Date().toISOString().split('T')[0];

    let result = this.actionItems.filter(a => (a.tenant_id || PILOT_TENANT_ID) === activeTenantId);

    // Atualiza status dinâmico para 'Atrasado' se data_planejada < hoje e status === 'Aberto'
    result = result.map(a => {
      if (a.status === 'Aberto' && a.data_planejada && a.data_planejada < today) {
        return { ...a, status: 'Atrasado' as ActionItemStatus };
      }
      return a;
    });

    if (filter?.id_rel2 !== undefined) {
      result = result.filter(a => a.id_rel2 === filter.id_rel2);
    }
    if (filter?.id_programa_acoes) {
      result = result.filter(a => a.id_programa_acoes === filter.id_programa_acoes);
    }
    if (filter?.status && filter.status !== 'Todos') {
      result = result.filter(a => a.status === filter.status);
    }
    if (filter?.tipo_acao && filter.tipo_acao !== 'Todos') {
      result = result.filter(a => a.tipo_acao === filter.tipo_acao);
    }
    if (filter?.responsavel) {
      result = result.filter(a => a.responsavel_acao.toLowerCase().includes(filter.responsavel!.toLowerCase()));
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(a =>
        (a.contra_medida && a.contra_medida.toLowerCase().includes(q)) ||
        (a.causa && a.causa.toLowerCase().includes(q)) ||
        (a.responsavel_acao && a.responsavel_acao.toLowerCase().includes(q)) ||
        (a.id_programa_acoes && a.id_programa_acoes.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => b.id - a.id);
  }

  public getActionItemById(id: number): ActionPlanItem | undefined {
    const activeTenantId = tenantService.getActiveTenantId();
    return this.actionItems.find(a => (a.tenant_id || PILOT_TENANT_ID) === activeTenantId && a.id === id);
  }

  public saveActionItem(item: Partial<ActionPlanItem>): ActionPlanItem {
    const activeTenantId = tenantService.getActiveTenantId();
    if (item.id) {
      const idx = this.actionItems.findIndex(a => a.id === item.id && (a.tenant_id || PILOT_TENANT_ID) === activeTenantId);
      if (idx >= 0) {
        const old = this.actionItems[idx];
        const hasDateChanged = item.data_planejada && item.data_planejada !== old.data_planejada;
        this.actionItems[idx] = {
          ...old,
          ...item,
          data_plan_anterior: hasDateChanged ? old.data_planejada : old.data_plan_anterior,
          revisao_data: hasDateChanged ? (old.revisao_data || 0) + 1 : old.revisao_data
        } as ActionPlanItem;
        this.saveToStorage();
        return this.actionItems[idx];
      }
    }

    // Se a ação veio de um 8D ou app externo (id_programa_acoes preenchido) sem id_rel2 explícito,
    // garante que o cabeçalho fixo do Plano ('Action plan') exista e vincula id_rel2 a ele
    let resolvedPlanId = item.id_rel2;
    if (!resolvedPlanId && item.id_programa_acoes) {
      const planHeader = this.getOrCreatePlanForExternalApp(item.id_programa_acoes);
      if (planHeader) {
        resolvedPlanId = planHeader.id;
      }
    }

    const nextId = this.actionItems.length > 0 ? Math.max(...this.actionItems.map(a => a.id)) + 1 : 1;
    const newItem: ActionPlanItem = {
      id: nextId,
      tenant_id: activeTenantId,
      id_rel2: resolvedPlanId || 1,
      id_programa_acoes: item.id_programa_acoes || '',
      causa: item.causa || '',
      contra_medida: item.contra_medida || '',
      comentarios_observacoes: item.comentarios_observacoes || '',
      data_acompanhamento: item.data_acompanhamento || new Date().toISOString().split('T')[0],
      data_planejada: item.data_planejada || new Date().toISOString().split('T')[0],
      responsavel_acao: item.responsavel_acao || this.currentUser.nome,
      email: item.email || this.currentUser.email || '',
      email_super: item.email_super || '',
      tipo_acao: item.tipo_acao || 'CORRETIVA',
      etapa_8d: item.etapa_8d,
      yokoten: item.yokoten || 'NÃO',
      poka_yoke: item.poka_yoke || 'NÃO',
      oData_8d_7d: item.oData_8d_7d,
      oc_nd: item.oc_nd || 'Ocorrência',
      evidencia_obrigatoria: item.evidencia_obrigatoria || 'SIM',
      validacao_acao: item.validacao_acao || 'SIM',
      status: item.status || 'Aberto'
    };
    this.actionItems.unshift(newItem);
    this.saveToStorage();
    return newItem;
  }

  public concluirActionItem(
    id: number, 
    dataConclusao: string, 
    comentarios: string, 
    anexos?: string[]
  ): ActionPlanItem {
    const activeTenantId = tenantService.getActiveTenantId();
    const idx = this.actionItems.findIndex(a => a.id === id && (a.tenant_id || PILOT_TENANT_ID) === activeTenantId);
    if (idx === -1) throw new Error('Ação não encontrada');

    const item = this.actionItems[idx];
    const newStatus: ActionItemStatus = item.validacao_acao === 'NÃO' ? 'Validado' : 'Concluído';

    this.actionItems[idx] = {
      ...item,
      status: newStatus,
      data_conclusao: dataConclusao || new Date().toISOString().split('T')[0],
      comentarios_evidencia: comentarios,
      anexos_evidencia: anexos || item.anexos_evidencia || []
    };
    this.saveToStorage();
    return this.actionItems[idx];
  }

  public validarActionItem(
    id: number, 
    status: 'Validado' | 'Aberto' | 'Atrasado', 
    comentarios: string, 
    statusRevisar?: string
  ): ActionPlanItem {
    const activeTenantId = tenantService.getActiveTenantId();
    const idx = this.actionItems.findIndex(a => a.id === id && (a.tenant_id || PILOT_TENANT_ID) === activeTenantId);
    if (idx === -1) throw new Error('Ação não encontrada');

    this.actionItems[idx] = {
      ...this.actionItems[idx],
      status: status,
      comentarios_validacao: comentarios,
      status_revisar: statusRevisar || ''
    };
    this.saveToStorage();
    return this.actionItems[idx];
  }

  public deleteActionItem(id: number): boolean {
    const activeTenantId = tenantService.getActiveTenantId();
    this.actionItems = this.actionItems.filter(a => !(a.id === id && (a.tenant_id || PILOT_TENANT_ID) === activeTenantId));
    this.saveToStorage();
    return true;
  }

  // ============================================================================
  // METADADOS DO 8D & PARTICIPANTES ('lista_participantes')
  // ============================================================================
  public getEightDMetadata(id8d: string): EightDMetadata | undefined {
    const activeTenantId = tenantService.getActiveTenantId();
    return this.eightDMetadataList.find(m => (m.tenant_id || PILOT_TENANT_ID) === activeTenantId && m.id8d === id8d);
  }

  public saveEightDMetadata(metadata: Partial<EightDMetadata>): EightDMetadata {
    const activeTenantId = tenantService.getActiveTenantId();
    const targetKey = metadata.id8d || '';
    const idx = this.eightDMetadataList.findIndex(m => m.id8d === targetKey && (m.tenant_id || PILOT_TENANT_ID) === activeTenantId);

    if (idx >= 0) {
      this.eightDMetadataList[idx] = { ...this.eightDMetadataList[idx], ...metadata } as EightDMetadata;
      this.saveToStorage();
      return this.eightDMetadataList[idx];
    }

    const nextId = this.eightDMetadataList.length > 0 ? Math.max(...this.eightDMetadataList.map(m => m.id)) + 1 : 1;
    const newMeta: EightDMetadata = {
      id: nextId,
      tenant_id: activeTenantId,
      id8d: targetKey,
      participantes_8d: metadata.participantes_8d ?? '',
      validar_8d: metadata.validar_8d || 'Em Andamento',
      diretriz_yokoten: metadata.diretriz_yokoten || '',
      diretriz_pokayoke: metadata.diretriz_pokayoke || '',
      yokoten_na: metadata.yokoten_na ?? false,
      pokayoke_na: metadata.pokayoke_na ?? false,
      comentarios_validacao: metadata.comentarios_validacao || '',
      ...metadata
    };
    this.eightDMetadataList.push(newMeta);
    this.saveToStorage();
    return newMeta;
  }

  // ============================================================================
  // CAUSAS DO ISHIKAWA & 5 PORQUÊS ('lista_ishikawa')
  // ============================================================================
  public getIshikawaCauses(id8d: string): IshikawaCauseItem[] {
    const activeTenantId = tenantService.getActiveTenantId();
    return this.ishikawaCauses
      .filter(c => (c.tenant_id || PILOT_TENANT_ID) === activeTenantId && c.id8d === id8d)
      .sort((a, b) => a.id - b.id);
  }

  public saveIshikawaCause(cause: Partial<IshikawaCauseItem>): IshikawaCauseItem {
    const activeTenantId = tenantService.getActiveTenantId();
    if (cause.id) {
      const idx = this.ishikawaCauses.findIndex(c => c.id === cause.id && (c.tenant_id || PILOT_TENANT_ID) === activeTenantId);
      if (idx >= 0) {
        this.ishikawaCauses[idx] = { ...this.ishikawaCauses[idx], ...cause } as IshikawaCauseItem;
        this.saveToStorage();
        return this.ishikawaCauses[idx];
      }
    }

    const nextId = this.ishikawaCauses.length > 0 ? Math.max(...this.ishikawaCauses.map(c => c.id)) + 1 : 1;
    const newCause: IshikawaCauseItem = {
      id: nextId,
      tenant_id: activeTenantId,
      id8d: cause.id8d || '',
      descricao_causa: cause.descricao_causa || '',
      seisms: cause.seisms || 'Máquina',
      ocnd: cause.ocnd || 'Ocorrência',
      okng: cause.okng || 'OK',
      umpq: cause.umpq || '',
      doispq: cause.doispq || '',
      trespq: cause.trespq || '',
      quatropq: cause.quatropq || '',
      cincopq: cause.cincopq || '',
      anexos: cause.anexos || []
    };
    this.ishikawaCauses.push(newCause);
    this.saveToStorage();
    return newCause;
  }

  public deleteIshikawaCause(id: number): boolean {
    const activeTenantId = tenantService.getActiveTenantId();
    this.ishikawaCauses = this.ishikawaCauses.filter(c => !(c.id === id && (c.tenant_id || PILOT_TENANT_ID) === activeTenantId));
    this.saveToStorage();
    return true;
  }

  // ============================================================================
  // HENKATEN 6M ('lista_henkaten')
  // ============================================================================
  public getHenkaten(id8d: string): HenkatenRecord | undefined {
    const activeTenantId = tenantService.getActiveTenantId();
    return this.henkatenList.find(h => (h.tenant_id || PILOT_TENANT_ID) === activeTenantId && h.id8d === id8d);
  }

  public saveHenkaten(data: Partial<HenkatenRecord>): HenkatenRecord {
    const activeTenantId = tenantService.getActiveTenantId();
    const targetKey = data.id8d || '';
    const idx = this.henkatenList.findIndex(h => h.id8d === targetKey && (h.tenant_id || PILOT_TENANT_ID) === activeTenantId);

    if (idx >= 0) {
      this.henkatenList[idx] = { ...this.henkatenList[idx], ...data } as HenkatenRecord;
      this.saveToStorage();
      return this.henkatenList[idx];
    }

    const nextId = this.henkatenList.length > 0 ? Math.max(...this.henkatenList.map(h => h.id)) + 1 : 1;
    const newHenk: HenkatenRecord = {
      id: nextId,
      tenant_id: activeTenantId,
      id8d: targetKey,
      ...data
    };
    this.henkatenList.push(newHenk);
    this.saveToStorage();
    return newHenk;
  }

  // ============================================================================
  // INVESTIGAÇÃO GEMBA & ENTREVISTAS ('lista_entrevista8d')
  // ============================================================================
  public getEntrevista8D(id8d: string): Entrevista8DRecord | undefined {
    const activeTenantId = tenantService.getActiveTenantId();
    return this.entrevistaList.find(e => (e.tenant_id || PILOT_TENANT_ID) === activeTenantId && e.id8d === id8d);
  }

  public saveEntrevista8D(data: Partial<Entrevista8DRecord>): Entrevista8DRecord {
    const activeTenantId = tenantService.getActiveTenantId();
    const targetKey = data.id8d || '';
    const idx = this.entrevistaList.findIndex(e => e.id8d === targetKey && (e.tenant_id || PILOT_TENANT_ID) === activeTenantId);

    if (idx >= 0) {
      this.entrevistaList[idx] = { ...this.entrevistaList[idx], ...data } as Entrevista8DRecord;
      this.saveToStorage();
      return this.entrevistaList[idx];
    }

    const nextId = this.entrevistaList.length > 0 ? Math.max(...this.entrevistaList.map(e => e.id)) + 1 : 1;
    const newEntr: Entrevista8DRecord = {
      id: nextId,
      tenant_id: activeTenantId,
      id8d: targetKey,
      ...data
    };
    this.entrevistaList.push(newEntr);
    this.saveToStorage();
    return newEntr;
  }

  // ============================================================================
  // REPOSITÓRIO: DOSSIÊS 8D HOMOLOGADOS E HISTÓRICO
  // ============================================================================
  public getConcluded8DDossiers(): {
    rnc: RNCRecord;
    meta?: EightDMetadata;
    causes: IshikawaCauseItem[];
    actions: ActionPlanItem[];
  }[] {
    const activeTenantId = tenantService.getActiveTenantId();
    const allRncs = this.rncs.filter(r => (r.tenant_id || PILOT_TENANT_ID) === activeTenantId);

    // Retorna apenas ocorrências que possuem 8D habilitado (abrir8D === 'Sim')
    return allRncs
      .filter(r => r.abrir8D === 'Sim')
      .map(r => {
        const id8d = `${r.tipoRnc === 'Formal' ? 'C' : 'I'} - ${r.id}`;
        const meta = this.eightDMetadataList.find(m => m.id8d === id8d && (m.tenant_id || PILOT_TENANT_ID) === activeTenantId);
        const causes = this.ishikawaCauses.filter(c => c.id8d === id8d && (c.tenant_id || PILOT_TENANT_ID) === activeTenantId);
        const actions = this.actionItems.filter(a => a.id_programa_acoes === id8d && (a.tenant_id || PILOT_TENANT_ID) === activeTenantId);
        return { rnc: r, meta, causes, actions };
      })
      .sort((a, b) => b.rnc.id - a.rnc.id);
  }
}

export const spStore = new SharePointDataStore();
