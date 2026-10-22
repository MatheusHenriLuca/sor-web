// ============================================================================
// Tipos e Interfaces: Sistema SOR - Tratativa de Produto Não Conforme
// Espelha fielmente as 14 bases de dados SharePoint da Gestamp Brasil
// ============================================================================

export type UserRole = 
  | 'Admin'
  | 'Adminqual'
  | 'Liderqual'
  | 'Inspqual'
  | 'Processos'
  | 'Produção'
  | 'Adminsesmt'
  | 'User';

export type TipoRNC = 'Formal' | 'Informal' | 'Improcedente' | 'Interno';
export type StatusRNC = 'Relatório Inicial' | 'RNC Emitida' | 'Em Andamento' | 'Concluído' | 'Reprovado';
export type StatusProtecaoCliente = 'Sim' | 'Não' | 'Aprovado' | 'Reprovado' | 'Registro Pago';

export type SaaSUserRole = 'super_admin' | 'admin_empresa' | 'qualidade' | 'operador';
export type TenantStatus = 'ativo' | 'suspenso' | 'cancelado';

export interface TenantCustomizacao {
  logo_url: string;
  cor_primaria: string;
  nome_exibicao: string;
  subtitulo_relatorio?: string;
}

export interface TenantLimites {
  max_usuarios: number;
  max_storage_mb: number;
  storage_usado_mb: number;
}

export interface TenantRecord {
  id: string;
  nome: string;
  slug: string;
  cnpj_contato: string;
  status: TenantStatus;
  customizacao: TenantCustomizacao;
  limites: TenantLimites;
  ultimo_sequencial_rnc?: number;
  created_at: string;
}

export type MasterDataCategory =
  | 'cliente_montadora'
  | 'area_fabril'
  | 'posto_trabalho'
  | 'cat_defeito'
  | 'tipo_rnc'
  | 'turno'
  | 'tipo_componente'
  | 'impacto_cliente'
  | 'setor_deteccao'
  | 'doc_rastreabilidade'
  | 'acoes_contencao'
  | 'gravidade'
  | 'possivel_detectar'
  | 'abrir_8d'
  | 'status_rnc'
  | 'criticidade'
  | 'origem_fornecedor'
  | 'disposicao_lote'
  | string;

export interface MasterDataItem {
  id: string;
  tenant_id: string;
  tipo: MasterDataCategory;
  nome: string;
  codigo?: string;
  detalhe?: string;
  ativo: boolean;
}

export interface OptionCategoryMeta {
  id: MasterDataCategory;
  tenant_id: string;
  nome: string;
  descricao: string;
  usadoNoFormulario: boolean;
  campoVinculado?: string;
  isSystem?: boolean;
  // Aliases de compatibilidade
  title?: string;
  description?: string;
  usedInForm?: boolean;
  formFieldTarget?: string;
}

export type FormSectionId = 'secao_1' | 'secao_2' | 'secao_3' | 'secao_4' | 'secao_5';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'yesno'
  | 'photo';

export interface FormFieldConfig {
  id: string;
  key: string;
  fieldKey: string;
  tenant_id: string;
  label: string;
  section: FormSectionId;
  type: FormFieldType;
  required: boolean;
  visible: boolean;
  deleted?: boolean;
  order: number;
  isSystem: boolean;
  optionCategory?: MasterDataCategory;
  customOptions?: string[];
  placeholder?: string;
  helperText?: string;
  colSpan?: 1 | 2 | 3 | 4;
}

export interface HistoricoAcaoRecord {
  id: number;
  tenant_id: string;
  rnc_id: number;
  usuario_nome: string;
  acao: string;
  detalhes: string;
  created_at: string;
}

export type ActiveScreen = 
  | 'app-on-start'
  | 'verif-user'
  | 'saas-login'
  | 'super-admin'
  | 'configuracoes-empresa'
  | 'menu-2'
  | 'lista-8d'
  | 'registro-8d'
  | 'detalhes-8d'
  | 'impressao-8d'
  | 'rastreabilidade'
  | 'cadastro-usuarios';

export interface UsuarioQualidade {
  id: number;
  tenant_id?: string;
  papel?: SaaSUserRole;
  ativo?: boolean;
  nome: string;
  reAcesso: number;
  perfil: UserRole;
  senha?: string;
  email?: string;
  cargo?: string;
  setor?: string;
}

export interface ColaboradorBaseAtivos {
  numPessoal: number;
  nome: string;
  unidadeOrg: string;
  posicao: string;
}

export interface PecaCatalogo {
  identificacao: number;
  material: string;
  descricao: string;
  cliente: string;
  cliente1?: string;
  posto: string;
  fmds: string;
  nestingLevel: number;
  codCliText: string;
  componente?: string;
  carryOver?: string;
  coProduto?: 'Sim' | 'Não';
  caracteristicaSeguranca?: 'Sim' | 'Não';
}

export interface SharePointConfig {
  siteUrl: string;
  accessToken?: string;
  authMode: 'local_storage' | 'sharepoint_online';
  lastSyncTime?: string;
  listsStatus: {
    pecasCount: number;
    ativosCount: number;
    usuariosCount: number;
    rncsCount: number;
    treinamentosCount: number;
  };
}

export interface RNCRecord {
  id: number;
  tenant_id?: string;
  title: string; // Sequencial
  field1?: string; // Código Ocorrência (ex: RNC-2026-0042)
  tipoRnc: TipoRNC;
  status: StatusRNC;
  cliente: string;
  dataOcorrencia: string; // ISO Date YYYY-MM-DD
  dataOficializacao?: string;
  codOcorrenciaCliente?: string; // Código Ocorrência Montadora (Portal Cliente)
  impactoCliente?: string; // Impacto na Linha da Montadora
  detalhamentoOcorrencia?: string; // Detalhes adicionais do cliente
  classificacaoSetor: string; // ex: SOLDA 1 - ESTACIONÁRIAS
  setorDeteccao: string;
  turno: '1º Turno' | '2º Turno' | '3º Turno' | 'Central' | string;
  produto: string; // Veículo / Projeto
  componente: string; // Peça estampada / montada
  subcomponente?: string;
  finalComponente?: 'Peça Final' | 'Componente' | 'Peça Final + Componente' | 'SubComponente + Componente' | string;
  quantidadeAfetada: number;
  modoFalha?: string; // Modo de Falha / Classificação Padronizada
  descricaoProblema: string;
  descricaoCompleta?: string;
  
  // Fotos de Evidência
  fotoPecaNg?: string; // Base64 ou URL
  fotoPecaOk?: string; // Base64 ou URL
  fotoAuxiliar?: string; // Base64 ou URL
  
  // Análise e Severidade
  caracteristicaSeguranca: 'Sim' | 'Não' | string;
  coProduto: 'Sim' | 'Não' | string;
  carryOver: 'Sim' | 'Não' | string;
  reincidente: 'SIM' | 'NÃO' | string;
  dataReincidente?: string;
  gravidade?: string;
  possivelDetectar?: string;
  tipoDeteccao?: string;
  
  // Contenção e Triagem (Foto 4 do Power Apps)
  posto?: string;
  fmds?: string;
  descricaoProblemaInterno?: string; // Card 36: field_17 (Descrição do problema interno)
  acoesContencao?: string; // Card 37: Ações de contenção (Chips / Escolha)
  recomendacoesProvidencias?: string; // Card 38: Recomendações / Providências
  dataContencao?: string; // Card 50: Data Final de Contenção
  qtdInspecionada?: number;
  qtdSuspeita?: number;
  qtdBloqueada?: number;
  
  // Disposição e 5W2H (Cards 40 a 45 - Foto 4)
  oQueFazer?: string;
  comoFazer?: string;
  porQueFazer?: string;
  quemFara?: string;
  quandoFara?: string;
  ondeFara?: string;
  
  // Participantes do Atendimento (Lista BASE_ATIVOS concatenada com ';')
  participantesAtendimento?: string;
  
  // Rastreabilidade e Proteção ao Cliente
  documentoRastreabilidade?: 'Não Informado' | 'Etiqueta SAP' | 'Order Cliente' | 'NF' | string;
  codigoRastreabilidade?: string;
  dataInicioRastreabilidade?: string;
  dataFimRastreabilidade?: string;
  protcliente?: StatusProtecaoCliente;
  dataPagamento?: string;
  abrir8D?: 'Sim' | 'Não' | string;
  local8d?: string;
  
  // Avaliação da Qualidade (Produção / Cliente)
  criticidade?: 'A' | 'B' | 'C' | string;
  abrirRnc?: string; // "Sim - Realizar Análise / Contenção / Rastreabilidade" | "Não - Não realizar Análise / Contenção / Rastreabilidade"
  comentarioGestor?: string;

  // Campos Personalizados configurados pelo Admin da Empresa
  camposPersonalizados?: Record<string, any>;

  // Responsáveis e Auditoria
  detector: string;
  reDetector?: number;
  responsavelConclusao?: string;
  dataConclusao?: string;
  observacoesConclusao?: string;
}

export interface RastreabilidadeItem {
  id: number;
  tenant_id?: string;
  idRnc: number;
  codComp: string;
  codRastreabilidade: string;
  docRastreabilidade: string;
  seqRelacionada: number;
  comando?: string; // "rp", "vp", "bp"
  statusGeral?: 'E' | 'R' | 'P'; // E = Erro, R = Realizado, P = Pendente
  statusVerif?: 'NR' | 'E' | 'OK'; // NR = Não Realizado, E = Em Espera, OK = Verificado
  dataHora: string;
  produto?: string;
  tipoRastreamento?: string;
  ocorrenciaAbrangencia?: string;
  observacao?: string;
  bloqueado?: boolean;
}

export interface LoteSAPParsed {
  tenant_id?: string;
  idRnc: number;
  seqRel: string;
  produto: string;
  lote: string;
  qtd: number;
  data: string;
}

export interface EtiquetaVivaParsed {
  tenant_id?: string;
  idRnc: number;
  seqRel: string;
  produto: string;
  etiquetasap: string;
  lote: string;
  qtd: number;
  deposito: string;
  data: string;
  bloqueio: string;
  statusBloqueio: 'bloq' | 'desbloq';
}

export interface RastCabeceiraParsed {
  tenant_id?: string;
  idRnc: number;
  seqRel: string;
  produto: string;
  lote: string;
  qtd: number;
  estoque: string;
}

export interface RegistroTreinamento {
  id: number;
  tenant_id?: string;
  idRnc: number;
  re: number;
  nomeColaborador: string;
  produto: string;
  defeito: string;
  dataTreinamento: string;
  responsavel: string;
}

export interface AlertaQualidadeRegistro {
  id: number;
  tenant_id?: string;
  idRnc: number;
  produto: string;
  componente: string;
  defeito: string;
  dataDivulgacao: string;
  responsavel: string;
  postosDivulgados: string;
}


export interface Abrir8DRecord {
  id: number;
  idRnc: number;
  abrir8D: 'Sim' | 'Não';
  motivoNaoAbertura?: string;
  responsavel: string;
  dataAbertura: string;
}

export interface ListFiltersState {
  tipoFilter: string;
  statusFilter: string;
  setorFilter: string;
  tipoRncFilter: string;
  clienteFilter: string;
  areaFilter: string;
  searchInput: string;
  viewMode: 'grid' | 'list';
  currentPage: number;
}
