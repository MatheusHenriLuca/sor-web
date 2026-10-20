import { RNCRecord, PecaCatalogo, ColaboradorBaseAtivos, UsuarioQualidade, StatusRNC } from '../types';

// ============================================================================
// SERVIÇO DE CONEXÃO DIRETA: MICROSOFT GRAPH / SHAREPOINT ONLINE
// Lê, cria e edita diretamente nas listas do SharePoint da Gestamp Brasil
// ============================================================================

/**
 * Converte campos de imagem modernos do SharePoint (que retornam JSON)
 * na URL direta do anexo do item para visualização no navegador.
 */
export function extractSharePointImageUrl(rawJsonOrUrl: string | undefined, itemId: number | string): string {
  if (!rawJsonOrUrl) return '';
  const trimmed = String(rawJsonOrUrl).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.fileName) {
        // Constrói a URL direta de anexo da lista do SharePoint Online
        return `https://gitservices.sharepoint.com/sites/QualityGate/Lists/Resumo%20dos%20Incidentes%20de%20qualidade/Attachments/${itemId}/${encodeURIComponent(parsed.fileName)}`;
      }
    } catch {
      // JSON inválido
    }
  }
  return '';
}

export class SharePointDirectService {
  private static instance: SharePointDirectService;

  public static getInstance(): SharePointDirectService {
    if (!SharePointDirectService.instance) {
      SharePointDirectService.instance = new SharePointDirectService();
    }
    return SharePointDirectService.instance;
  }

  // Verifica status da conexão direta
  public async checkConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const res = await fetch('/api/sp/status');
      if (!res.ok) {
        return { connected: false, message: `Status HTTP ${res.status}` };
      }
      return await res.json();
    } catch (e: any) {
      return { connected: false, message: e.message };
    }
  }

  // ==========================================================================
  // RNCs / OCORRÊNCIAS: 'Resumo dos Incidentes de qualidade'
  // ==========================================================================

  // 1. LEITURA DIRETA DO SHAREPOINT (GET - PAGINAÇÃO INTEGRAL SEM LIMITES)
  public async fetchRNCs(query = ''): Promise<RNCRecord[]> {
    const res = await fetch(`/api/sp/rncs${query}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar RNCs do SharePoint: HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = data.value || [];

    return items.map((item: any) => {
      const f = item.fields || {};
      const idNum = Number(item.id) || Number(f.id) || Date.now();
      return {
        id: idNum,
        title: f.Title || String(idNum),
        field1: f.field_1 || `RNC-${idNum}`,
        tipoRnc: f.Tipo_x0020_de_x0020_RNC || 'Interno',
        status: (f.Status || 'Relatório Inicial') as StatusRNC,
        cliente: f.field_6 || f.cliente_res || 'OUTROS',
        dataOcorrencia: f.field_2 ? f.field_2.split('T')[0] : (f.Created ? f.Created.split('T')[0] : new Date().toISOString().split('T')[0]),
        dataOficializacao: f.data_oficializacao ? f.data_oficializacao.split('T')[0] : '',
        classificacaoSetor: f.field_18 || '',
        setorDeteccao: f.Origem_x0020_do_x0020_8D_x0020_i || '',
        turno: f.field_11 || '1º Turno',
        produto: f.Produto1 || '',
        componente: f.Componente || '',
        finalComponente: f.final_componente || 'Peça Final',
        quantidadeAfetada: Number(f.field_10) || 1,
        descricaoProblema: f.field_17 || f.field_16 || f.field_12 || '',
        descricaoCompleta: f.DETALHAMENTO_x0020_DA_x0020_OCOR || f.field_17 || '',
        fotoPecaNg: extractSharePointImageUrl(f.Foto_x0020_da_x0020_pe_x00e7_a_x, idNum),
        fotoPecaOk: extractSharePointImageUrl(f.Foto_x0020_pe_x00e7_a_x0020_OK, idNum),
        fotoAuxiliar: extractSharePointImageUrl(f.Foto_x0020_auxiliar_x0020__x0028, idNum),
        caracteristicaSeguranca: f.field_13 || 'Não',
        coProduto: f.Co_x002d_Produto1_x003f_ || f.co_x002d_produto || 'Não',
        carryOver: f.A_x0020_pe_x00e7_a_x0020__x00e9_ || 'Não',
        reincidente: f.field_8 || 'NÃO',
        dataReincidente: f.data_reinc || '',
        qtdInspecionada: Number(f.Conten_x00e7__x00e3_o_x0020_de_x) || 0,
        qtdSuspeita: Number(f.Conten_x00e7__x00e3_o_x0020_de_x0) || 0,
        abrir8D: f.Abrir_x0020_8D_x003f_ || 'Não',
        protcliente: f.protcliente || 'Não',
        detector: f.Participantes_x0020_do_x0020_ate || f.detector || '',
        responsavelConclusao: f.responsavel_concluir || '',
        gravidade: f.gravidade || 'Média',
        posto: f.Posto1 || f.posto || '',
        fmds: f.fmds || '',
        acoesContencao: Array.isArray(f.A_x00e7__x00f5_es_x0020_de_x0020) ? f.A_x00e7__x00f5_es_x0020_de_x0020.join('; ') : (f.A_x00e7__x00f5_es_x0020_de_x0020 || ''),
        dataContencao: f.data_contencao ? f.data_contencao.split('T')[0] : '',
        oQueFazer: f.O_x0020_que_x0020_fazer_x003f_ || '',
        comoFazer: f.Como_x0020_fazer_x003f_ || '',
        porQueFazer: f.Porque_x0020_fazer_x003f_ || f.Por_x0020_que_x0020_fazer_x003f_ || '',
        quandoFara: f.Quando_x0020_fazer_x003f_ ? f.Quando_x0020_fazer_x003f_.split('T')[0] : '',
        ondeFara: f.Onde_x0020_fazer_x003f_ || '',
        quemFara: f.Quem_x0020_vai_x0020_fazer_x003f || '',
        documentoRastreabilidade: f.Tipo_x0020_de_x0020_documento_x0 || 'Etiqueta SAP',
        codigoRastreabilidade: f.Rastreabilidade_x0020_da_x0020_e || ''
      } as RNCRecord;
    });
  }

  // 2. CRIAÇÃO DIRETA NO SHAREPOINT (POST)
  public async createRNC(rnc: Partial<RNCRecord>): Promise<RNCRecord> {
    const fieldsPayload: Record<string, any> = {
      Title: rnc.title || `RNC-${Date.now()}`,
      Tipo_x0020_de_x0020_RNC: rnc.tipoRnc || 'Interno',
      Status: rnc.status || 'Relatório Inicial',
      field_6: rnc.cliente || 'OUTROS',
      field_2: rnc.dataOcorrencia ? `${rnc.dataOcorrencia}T00:00:00Z` : new Date().toISOString(),
      field_18: rnc.classificacaoSetor || 'Qualidade',
      Origem_x0020_do_x0020_8D_x0020_i: rnc.setorDeteccao || '',
      field_11: rnc.turno || '1º',
      Produto1: rnc.produto || '',
      Componente: rnc.componente || '',
      final_componente: rnc.finalComponente || 'Peça Final',
      field_10: rnc.quantidadeAfetada || 1,
      field_17: rnc.descricaoProblema || '',
      DETALHAMENTO_x0020_DA_x0020_OCOR: rnc.descricaoCompleta || rnc.descricaoProblema || '',
      field_13: rnc.caracteristicaSeguranca || 'Não',
      Co_x002d_Produto1_x003f_: rnc.coProduto || 'Não',
      A_x0020_pe_x00e7_a_x0020__x00e9_: rnc.carryOver || 'Não',
      field_8: rnc.reincidente || 'NÃO',
      Abrir_x0020_8D_x003f_: rnc.abrir8D || 'Não',
      protcliente: rnc.protcliente || 'Não',
      Participantes_x0020_do_x0020_ate: rnc.detector || '',
      gravidade: rnc.gravidade || 'Média',
      Posto1: rnc.posto || '',
      fmds: rnc.fmds || '',
      Tipo_x0020_de_x0020_documento_x0: rnc.documentoRastreabilidade || 'Etiqueta SAP',
      Rastreabilidade_x0020_da_x0020_e: rnc.codigoRastreabilidade || '',
      O_x0020_que_x0020_fazer_x003f_: rnc.oQueFazer || '',
      Como_x0020_fazer_x003f_: rnc.comoFazer || '',
      Porque_x0020_fazer_x003f_: rnc.porQueFazer || '',
      Quando_x0020_fazer_x003f_: rnc.quandoFara ? `${rnc.quandoFara}T00:00:00Z` : undefined,
      Onde_x0020_fazer_x003f_: rnc.ondeFara || '',
      Quem_x0020_vai_x0020_fazer_x003f: rnc.quemFara || ''
    };

    // Remove undefined
    Object.keys(fieldsPayload).forEach(k => {
      if (fieldsPayload[k] === undefined) delete fieldsPayload[k];
    });

    const res = await fetch('/api/sp/rncs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldsPayload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ao criar RNC no SharePoint: HTTP ${res.status} - ${err}`);
    }

    const created = await res.json();
    return {
      ...rnc,
      id: Number(created.id) || Date.now(),
      title: created.fields?.Title || rnc.title || `RNC-${created.id}`,
      field1: `RNC-${created.id}`
    } as RNCRecord;
  }

  // 3. EDIÇÃO DIRETA NO SHAREPOINT (PATCH)
  public async updateRNC(id: number | string, fields: Partial<RNCRecord>): Promise<void> {
    const fieldsPayload: Record<string, any> = {};

    if (fields.status) fieldsPayload.Status = fields.status;
    if (fields.tipoRnc) fieldsPayload.Tipo_x0020_de_x0020_RNC = fields.tipoRnc;
    if (fields.cliente) fieldsPayload.field_6 = fields.cliente;
    if (fields.descricaoProblema) fieldsPayload.field_17 = fields.descricaoProblema;
    if (fields.descricaoCompleta) fieldsPayload.DETALHAMENTO_x0020_DA_x0020_OCOR = fields.descricaoCompleta;
    if (fields.quantidadeAfetada !== undefined) fieldsPayload.field_10 = fields.quantidadeAfetada;
    if (fields.responsavelConclusao) fieldsPayload.responsavel_concluir = fields.responsavelConclusao;
    if (fields.protcliente) fieldsPayload.protcliente = fields.protcliente;
    if (fields.qtdInspecionada !== undefined) fieldsPayload.Conten_x00e7__x00e3_o_x0020_de_x = fields.qtdInspecionada;
    if (fields.qtdSuspeita !== undefined) fieldsPayload.Conten_x00e7__x00e3_o_x0020_de_x0 = fields.qtdSuspeita;
    if (fields.oQueFazer) fieldsPayload.O_x0020_que_x0020_fazer_x003f_ = fields.oQueFazer;
    if (fields.comoFazer) fieldsPayload.Como_x0020_fazer_x003f_ = fields.comoFazer;
    if (fields.porQueFazer) fieldsPayload.Porque_x0020_fazer_x003f_ = fields.porQueFazer;
    if (fields.quandoFara) fieldsPayload.Quando_x0020_fazer_x003f_ = `${fields.quandoFara}T00:00:00Z`;
    if (fields.ondeFara) fieldsPayload.Onde_x0020_fazer_x003f_ = fields.ondeFara;
    if (fields.quemFara) fieldsPayload.Quem_x0020_vai_x0020_fazer_x003f = fields.quemFara;
    if (fields.abrir8D) fieldsPayload.Abrir_x0020_8D_x003f_ = fields.abrir8D;

    const res = await fetch(`/api/sp/rncs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldsPayload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Erro ao atualizar RNC no SharePoint: HTTP ${res.status} - ${err}`);
    }
  }

  // 4. EXCLUSÃO NO SHAREPOINT (DELETE)
  public async deleteRNC(id: number | string): Promise<void> {
    const res = await fetch(`/api/sp/rncs/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`Erro ao excluir RNC no SharePoint: HTTP ${res.status}`);
    }
  }

  // ==========================================================================
  // PEÇAS: 'lista_geral_peças_aa3' (PAGINAÇÃO COMPLETA SEM LIMITE DE 999)
  // ==========================================================================
  public async fetchPecas(query = ''): Promise<PecaCatalogo[]> {
    const res = await fetch(`/api/sp/pecas${query}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar catálogo de peças do SharePoint: HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = data.value || [];

    return items.map((item: any, idx: number) => {
      const f = item.fields || {};
      return {
        identificacao: Number(item.id || f.Identificacao || idx + 1),
        material: String(f.Material || f.Title || ''),
        descricao: String(f.Texto_x0020_breve_x0020_de_x0020 || f.CodCliText || f.Descricao || ''),
        cliente: String(f.Cliente1 || f.Cliente || 'OUTROS'),
        cliente1: String(f.Cliente1 || f.Cliente || 'OUTROS'),
        posto: String(f.Posto || ''),
        fmds: String(f.FMDS || ''),
        nestingLevel: Number(f.Nesting_x0020_level || 0),
        codCliText: String(f.CodCliText || ''),
        componente: String(f.Componente || ''),
        carryOver: String(f.CarryOver_x003f_ || 'Não')
      } as PecaCatalogo;
    });
  }

  // ==========================================================================
  // COLABORADORES: 'BASE_ATIVOS' (PAGINAÇÃO COMPLETA)
  // ==========================================================================
  public async fetchBaseAtivos(query = ''): Promise<ColaboradorBaseAtivos[]> {
    const res = await fetch(`/api/sp/ativos${query}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar colaboradores ativos do SharePoint: HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = data.value || [];

    return items.map((item: any) => {
      const f = item.fields || {};
      return {
        numPessoal: Number(f.Title || f.N_x00ba__x0020_pess_x002e_ || 0),
        nome: String(f.field_1 || f.Nome || f.Title || ''),
        unidadeOrg: String(f.UnidadeOrg || f.field_2 || ''),
        posicao: String(f.posicao || f.field_10 || '')
      } as ColaboradorBaseAtivos;
    });
  }

  // ==========================================================================
  // USUÁRIOS: 'Usuários ocorrências qualidade' (PAGINAÇÃO COMPLETA)
  // ==========================================================================
  public async fetchUsuarios(query = ''): Promise<UsuarioQualidade[]> {
    const res = await fetch(`/api/sp/usuarios${query}`);
    if (!res.ok) {
      throw new Error(`Erro ao buscar usuários do SharePoint: HTTP ${res.status}`);
    }
    const data = await res.json();
    const items = data.value || [];

    return items.map((item: any, idx: number) => {
      const f = item.fields || {};
      return {
        id: Number(item.id) || idx + 1,
        nome: String(f.nome || f.Title || ''),
        reAcesso: Number(f.RE_Acesso || f.re || 0),
        perfil: String(f.Title || 'User') as any,
        senha: String(f.Senha || ''),
        email: String(f.email || ''),
        cargo: String(f.cargo || ''),
        setor: String(f.setor || '')
      } as UsuarioQualidade;
    });
  }
}

export const spDirect = SharePointDirectService.getInstance();
