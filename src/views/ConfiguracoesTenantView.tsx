import React, { useState, useMemo, useEffect } from 'react';
import {
  Palette,
  Upload,
  Check,
  Plus,
  Trash2,
  HardDrive,
  Sliders,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit3,
  RotateCcw,
  X,
  FileText,
  Layers,
  CheckCircle2,
  Search,
  FileSpreadsheet,
  Copy,
  Download,
  ClipboardPaste,
  AlertTriangle,
  Database,
  Columns,
  Link2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  MasterDataItem,
  ActiveScreen,
  UsuarioQualidade,
  FormFieldConfig,
  FormSectionId,
  FormModuleId,
  FormFieldType,
  OptionCategoryMeta,
  ActiveApp
} from '../types';
import { tenantService, resolveCanonicalCategory } from '../services/tenantService';
import { spStore } from '../services/sharepointService';

interface ConfiguracoesTenantViewProps {
  currentUser: UsuarioQualidade;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  onTenantUpdated?: () => void;
  initialTab?: 'form_builder' | 'options_manager' | 'plano_config' | 'fast_excel' | 'whitelabel';
  activeApp?: ActiveApp;
}

const BRAND_PRESET_COLORS = [
  { name: 'Azul Corporativo MH', hex: '#0b5796' },
  { name: 'Verde Esmeralda Lean', hex: '#0f766e' },
  { name: 'Índigo Engenharia', hex: '#3730a3' },
  { name: 'Ardósia Executivo', hex: '#1e293b' },
  { name: 'Carmesim Metalurgia', hex: '#9f1239' },
  { name: 'Âmbar Pesado', hex: '#b45309' }
];

const MODULES_META: {
  id: FormModuleId;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'rnc',
    label: '1. RNC (Não Conformidades)',
    shortLabel: '1. RNC',
    description: 'Formulário de abertura, rastreabilidade, fotos NG/OK e contenção 5W2H.'
  },
  {
    id: 'plano_acao',
    label: '2. Plano de Ação (5W2H)',
    shortLabel: '2. Plano de Ação',
    description: 'Cabeçalho estratégico de planos e tarefas de execução 5W2H.'
  },
  {
    id: 'oitod',
    label: '3. Metodologia 8D (D1 a D8)',
    shortLabel: '3. Metodologia 8D',
    description: 'Etapas de equipe 1D/2D, contenção 3D, Ishikawa/Henkaten 4D, ações 5D/6D e prevenção 7D/8D.'
  }
];

const FORM_SECTIONS_META: {
  id: FormSectionId;
  module: FormModuleId;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  // Módulo 1: RNC
  {
    id: 'secao_1',
    module: 'rnc',
    label: '1. Dados Gerais & Cliente',
    shortLabel: 'Seção 1 · Dados Gerais & Cliente',
    description: 'Cliente, Tipo de Ocorrência, Data, Turno, Detalhes do Portal e Participantes.'
  },
  {
    id: 'secao_2',
    module: 'rnc',
    label: '2. Informações do Posto e Produto',
    shortLabel: 'Seção 2 · Posto & Produto',
    description: 'Tipo de Peça Rastreada, Produto/Conjunto, Componente, Posto de Trabalho, Área Fabril e Atributos.'
  },
  {
    id: 'secao_3',
    module: 'rnc',
    label: '3. Defeito, Quantidade & Rastreabilidade',
    shortLabel: 'Seção 3 · Defeito & Lote',
    description: 'Classificação do Defeito (Modo de Falha), Quantidade Não Conforme e Documento de Rastreabilidade.'
  },
  {
    id: 'secao_4',
    module: 'rnc',
    label: '4. Evidência Fotográfica da Peça NG',
    shortLabel: 'Seção 4 · Foto NG',
    description: 'Evidência fotográfica da peça defeituosa no Relatório Inicial.'
  },
  {
    id: 'secao_5',
    module: 'rnc',
    label: '5. Contenção & Tratativa da Qualidade (5W2H)',
    shortLabel: 'Seção 5 · Contenção & 5W2H',
    description: 'Foto da Peça OK, Ações de Contenção, Recomendações, Gravidade, 5W2H e Decisão de Abertura 8D.'
  },
  // Módulo 2: Plano de Ação
  {
    id: 'plano_cabecalho',
    module: 'plano_acao',
    label: '1. Cabeçalho do Plano de Ação',
    shortLabel: 'Cabeçalho do Plano',
    description: 'Responsável, Indicador Estratégico, Subindicador, Área/Setor, Posto, Produto, Prioridade, Descrição do Problema, Foto Auxiliar e Status.'
  },
  {
    id: 'plano_acoes',
    module: 'plano_acao',
    label: '2. Tarefas, Contramedidas, Conclusão e Homologação (5W2H)',
    shortLabel: 'Ações & Tarefas 5W2H',
    description: 'Vínculo, Tipo da Ação, Causa Raiz, Contramedida, Posto, Responsável, Prazos, Yokoten, Poka-Yoke, Evidências de Conclusão e Auditoria de Eficácia.'
  },
  // Módulo 3: Metodologia 8D
  {
    id: 'oitod_equipe_2d',
    module: 'oitod',
    label: '1. Etapas 1D & 2D — Equipe e Problema',
    shortLabel: '1D & 2D · Equipe e Problema',
    description: 'Líder do 8D, Equipe Multidisciplinar 1D/2D, Posto de Trabalho e Turno da Ocorrência.'
  },
  {
    id: 'oitod_contencao_3d',
    module: 'oitod',
    label: '2. Etapa 3D — Contenção e Triagem de Lotes',
    shortLabel: '3D · Estoque e Contenção',
    description: 'Lote Verificado, Locais de Estoque / Quarentena, Quantidades Verificada / NG / OK, Responsável pela Triagem e Disposição de Lote.'
  },
  {
    id: 'oitod_causa_4d',
    module: 'oitod',
    label: '3. Etapa 4D — Gemba, Henkaten, Ishikawa 6M e 5 Porquês',
    shortLabel: '4D · Ishikawa 6M & Causa',
    description: 'Investigação Gemba (4 etapas), Henkaten 6M, Categorias 6M do Ishikawa, Hipóteses, Fornecedor de Matéria-Prima e 5 Porquês.'
  },
  {
    id: 'oitod_acoes_5d_6d',
    module: 'oitod',
    label: '4. Etapas 5D & 6D — Ações Corretivas e Eficácia',
    shortLabel: '5D & 6D · Ações Corretivas',
    description: 'Classificação das Ações, Causa Vinculada, Descrição da Contramedida, Responsável, Prazo Planejado, Abrangência Yokoten e Poka-Yoke.'
  },
  {
    id: 'oitod_prevencao_7d_8d',
    module: 'oitod',
    label: '5. Etapas 7D & 8D — Prevenção, Treinamentos e Fechamento',
    shortLabel: '7D & 8D · Prevenção & Aprovação',
    description: 'Documentos Sistêmicos 7D (FMEA, TP, LPA, PC, LPP), Colaborador e Multiplicador de Treinamento, Aprovador Técnico 8D, Decisão e Parecer Final.'
  }
];

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto Curto',
  textarea: 'Texto Longo (Múltiplas Linhas)',
  number: 'Número / Quantidade',
  date: 'Data (Calendário)',
  select: 'Lista de Seleção Única (Base de Opções)',
  multiselect: 'Múltipla Escolha (Base de Opções)',
  yesno: 'Sim / Não',
  photo: 'Upload de Foto (WebP)'
};

export const ConfiguracoesTenantView: React.FC<ConfiguracoesTenantViewProps> = ({
  onTenantUpdated,
  initialTab,
  activeApp
}) => {
  const [localTick, setLocalTick] = useState(0);
  const activeTenant = useMemo(() => tenantService.getActiveTenant(), [localTick]);

  // =========================================================================
  // 1. NAVEGAÇÃO PRINCIPAL SIMPLIFICADA (2 ÁREAS PRINCIPAIS)
  // - 'central_bases_campos': Central de Bases e Campos
  // - 'identidade_armazenamento': Identidade Visual e Armazenamento
  // =========================================================================
  const [mainArea, setMainArea] = useState<'central_bases_campos' | 'identidade_armazenamento'>(
    initialTab === 'whitelabel' ? 'identidade_armazenamento' : 'central_bases_campos'
  );

  // Dois contextos integrados dentro da Central de Bases e Campos:
  // - 'bases': Gerenciamento das Bases (com planilha multi-colunas embutida)
  // - 'campos': Configuração dos Campos (RNC, Plano de Ação e 8D)
  const [centralContext, setCentralContext] = useState<'bases' | 'campos'>(
    initialTab === 'form_builder' ? 'campos' : 'bases'
  );

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
  };

  // Atualiza dados locais e sincroniza sem desmontar ou reiniciar a navegação
  const refreshLocalState = () => {
    setLocalTick(prev => prev + 1);
    onTenantUpdated?.();
  };

  // =========================================================================
  // DADOS CARREGADOS DO TENANT ATIVO
  // =========================================================================
  const optionCategories = useMemo(
    () => tenantService.getOptionCategories(activeTenant.id),
    [activeTenant.id, localTick]
  );

  const allFormFields = useMemo(
    () => tenantService.getFormFields(activeTenant.id, true),
    [activeTenant.id, localTick]
  );

  // =========================================================================
  // CONTEXTO A: GERENCIAMENTO DAS BASES (MULTI-COLUNAS, IMPORTAÇÃO, VÍNCULOS)
  // =========================================================================
  const [selectedCategory, setSelectedCategory] = useState<string>('master_funcionarios');
  const [baseListSearch, setBaseListSearch] = useState('');
  const [baseUsageFilter, setBaseUsageFilter] = useState<'all' | FormModuleId | 'unlinked'>('all');

  // Garante que a base selecionada sempre exista; se excluída, seleciona outra disponível
  useEffect(() => {
    if (optionCategories.length > 0 && !optionCategories.some(c => c.id === selectedCategory)) {
      setSelectedCategory(optionCategories[0].id);
    }
  }, [optionCategories, selectedCategory]);

  const currentCategoryMeta = useMemo(
    () => optionCategories.find(c => c.id === selectedCategory),
    [optionCategories, selectedCategory]
  );

  const currentCategoryColumns = useMemo(
    () => (selectedCategory ? tenantService.getCategoryColumns(selectedCategory, activeTenant.id) : ['Nome']),
    [selectedCategory, activeTenant.id, localTick]
  );

  const currentCategoryItems = useMemo(
    () => (selectedCategory ? tenantService.getMasterData(selectedCategory, activeTenant.id) : []),
    [selectedCategory, activeTenant.id, localTick]
  );

  const currentBaseDependencies = useMemo(
    () => (selectedCategory ? tenantService.getBaseUsageDependencies(selectedCategory, activeTenant.id) : []),
    [selectedCategory, activeTenant.id, localTick]
  );

  // Sub-modo de visualização/edição dentro da Base aberta:
  // 'spreadsheet' (Planilha Multi-Colunas) | 'import' (Importar CSV / Colar Lote) | 'text' (Texto Contínuo)
  const [baseWorkMode, setBaseWorkMode] = useState<'spreadsheet' | 'import' | 'text'>('spreadsheet');
  const [recordSearchQuery, setRecordSearchQuery] = useState('');

  // Estado para adicionar nova linha multi-colunas
  const [newRowCells, setNewRowCells] = useState<Record<string, string>>({});

  // Estado para editar uma linha existente na tabela multi-colunas
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowCells, setEditingRowCells] = useState<Record<string, string>>({});

  // Estado para gerenciar colunas da base (adicionar, renomear, excluir com confirmação)
  const [newColumnNameInput, setNewColumnNameInput] = useState('');
  const [renamingColumn, setRenamingColumn] = useState<{ oldName: string; newName: string } | null>(null);
  const [confirmDeleteColumn, setConfirmDeleteColumn] = useState<string | null>(null);

  // Confirmações destrutivas inline (sem window.confirm/alert e sem perder estado)
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);
  const [confirmClearBase, setConfirmClearBase] = useState(false);
  const [confirmDeleteBase, setConfirmDeleteBase] = useState(false);

  // Edição de metadados da Base (Nome e Descrição)
  const [editingBaseMeta, setEditingBaseMeta] = useState(false);
  const [editBaseNameInput, setEditBaseNameInput] = useState('');
  const [editBaseDescInput, setEditBaseDescInput] = useState('');

  // Importação / Colagem para a Base selecionada
  const [importRawText, setImportRawText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace_all'>('append');
  const [importHasHeader, setImportHasHeader] = useState(true);

  // Modo Texto Contínuo da Base selecionada
  const [continuousTextBuffer, setContinuousTextBuffer] = useState('');

  // Modal Criar Nova Base da Empresa
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColumnsText, setNewCatColumnsText] = useState('Nome ; Código ; Detalhe');
  const [newCatInitialItemsText, setNewCatInitialItemsText] = useState('');
  const [newCatHasHeader, setNewCatHasHeader] = useState(true);

  // Modal de Planilha Global Multi-Bases (preserva importação simultânea de várias bases do Excel)
  const [multiBaseModalOpen, setMultiBaseModalOpen] = useState(false);
  const [bulkPastedText, setBulkPastedText] = useState('');

  // Filtra a lista lateral de bases (indicando uso por módulo sem restringir seleção global)
  const filteredOptionCategories = useMemo(() => {
    const q = baseListSearch.trim().toLowerCase();
    return optionCategories.filter(cat => {
      const deps = tenantService.getBaseUsageDependencies(cat.id, activeTenant.id);
      if (baseUsageFilter === 'unlinked' && deps.length > 0) return false;
      if (
        (baseUsageFilter === 'rnc' || baseUsageFilter === 'plano_acao' || baseUsageFilter === 'oitod') &&
        !deps.some(d => d.module === baseUsageFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        cat.nome.toLowerCase().includes(q) ||
        cat.descricao.toLowerCase().includes(q) ||
        cat.id.toLowerCase().includes(q) ||
        (cat.columns || []).some(col => col.toLowerCase().includes(q))
      );
    });
  }, [optionCategories, baseListSearch, baseUsageFilter, activeTenant.id, localTick]);

  // Filtra os registros da base selecionada em todas as colunas
  const filteredCategoryItems = useMemo(() => {
    const q = recordSearchQuery.trim().toLowerCase();
    if (!q) return currentCategoryItems;
    return currentCategoryItems.filter(item => {
      const cellMap = tenantService.getItemCellMap(item, currentCategoryColumns);
      return Object.values(cellMap).some(val => (val || '').toLowerCase().includes(q));
    });
  }, [currentCategoryItems, currentCategoryColumns, recordSearchQuery]);

  // =========================================================================
  // CONTEXTO B: CONFIGURAÇÃO DOS CAMPOS (RNC, PLANO DE AÇÃO E 8D)
  // =========================================================================
  const [selectedModule, setSelectedModule] = useState<FormModuleId>(
    activeApp === 'plano_acao' ? 'plano_acao' : 'rnc'
  );
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<FormSectionId | 'todas'>('todas');
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [confirmDeleteFieldId, setConfirmDeleteFieldId] = useState<string | null>(null);
  const [confirmResetFields, setConfirmResetFields] = useState(false);

  // Modal Criar / Editar Campo
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldConfig | null>(null);
  const [fieldModule, setFieldModule] = useState<FormModuleId>('rnc');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldSection, setFieldSection] = useState<FormSectionId>('secao_1');
  const [fieldType, setFieldType] = useState<FormFieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldVisible, setFieldVisible] = useState(true);
  const [fieldColSpan, setFieldColSpan] = useState<1 | 2 | 3 | 4>(1);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldHelperText, setFieldHelperText] = useState('');
  const [fieldOptionCategory, setFieldOptionCategory] = useState<string>('master_funcionarios');
  const [fieldValueColumn, setFieldValueColumn] = useState<string>('Nome');
  const [fieldDisplayColumn, setFieldDisplayColumn] = useState<string>('Nome');

  // Sempre que mudar o módulo selecionado, reseta o filtro de seção para 'todas'
  const handleSelectModule = (mod: FormModuleId) => {
    setSelectedModule(mod);
    setSelectedSectionFilter('todas');
    setConfirmResetFields(false);
  };

  const moduleSections = useMemo(
    () => FORM_SECTIONS_META.filter(s => s.module === selectedModule),
    [selectedModule]
  );

  const activeModuleFields = useMemo(
    () =>
      allFormFields
        .filter(f => !f.deleted && (f.module || 'rnc') === selectedModule)
        .filter(f => selectedSectionFilter === 'todas' || f.section === selectedSectionFilter)
        .filter(f => {
          const q = fieldSearchQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            f.label.toLowerCase().includes(q) ||
            f.key.toLowerCase().includes(q) ||
            (f.optionCategory || '').toLowerCase().includes(q)
          );
        }),
    [allFormFields, selectedModule, selectedSectionFilter, fieldSearchQuery]
  );

  const deletedModuleFields = useMemo(
    () => allFormFields.filter(f => f.deleted && (f.module || 'rnc') === selectedModule),
    [allFormFields, selectedModule]
  );

  // =========================================================================
  // ÁREA 2: IDENTIDADE VISUAL E ARMAZENAMENTO (WHITE-LABEL)
  // =========================================================================
  const [nomeExibicao, setNomeExibicao] = useState(activeTenant.customizacao.nome_exibicao);
  const [subtituloRelatorio, setSubtituloRelatorio] = useState(activeTenant.customizacao.subtitulo_relatorio);
  const [corPrimaria, setCorPrimaria] = useState(activeTenant.customizacao.cor_primaria);
  const [logoUrl, setLogoUrl] = useState(activeTenant.customizacao.logo_url || '');
  const [cnpjContato, setCnpjContato] = useState(activeTenant.cnpj_contato);

  useEffect(() => {
    setNomeExibicao(activeTenant.customizacao.nome_exibicao);
    setSubtituloRelatorio(activeTenant.customizacao.subtitulo_relatorio);
    setCorPrimaria(activeTenant.customizacao.cor_primaria);
    setLogoUrl(activeTenant.customizacao.logo_url || '');
    setCnpjContato(activeTenant.cnpj_contato);
  }, [activeTenant.id]);

  const storagePercent = Math.min(
    100,
    Math.round((activeTenant.limites.storage_usado_mb / Math.max(1, activeTenant.limites.max_storage_mb)) * 100)
  );

  // =========================================================================
  // HANDLERS: GERENCIAMENTO DAS BASES E PLANILHA MULTI-COLUNAS
  // =========================================================================
  const handleSelectBase = (catId: string) => {
    setSelectedCategory(catId);
    setEditingRowId(null);
    setConfirmDeleteRecordId(null);
    setConfirmClearBase(false);
    setConfirmDeleteBase(false);
    setConfirmDeleteColumn(null);
    setRenamingColumn(null);
    setEditingBaseMeta(false);
    if (baseWorkMode === 'text') {
      setContinuousTextBuffer(tenantService.exportSingleCategoryText(catId, 'lines', activeTenant.id));
    }
  };

  const handleAddRecordRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    const hasAnyValue = Object.values(newRowCells).some(v => (v || '').trim().length > 0);
    if (!hasAnyValue) {
      showNotice('error', 'Preencha pelo menos a primeira coluna para adicionar um registro à base.');
      return;
    }

    tenantService.saveMasterDataItemWithColumns(
      selectedCategory,
      newRowCells,
      undefined,
      true,
      activeTenant.id
    );
    setNewRowCells({});
    refreshLocalState();
    showNotice('success', 'Registro adicionado à base com sucesso.');
  };

  const handleStartEditRow = (item: MasterDataItem) => {
    const cellMap = tenantService.getItemCellMap(item, currentCategoryColumns);
    setEditingRowId(item.id);
    setEditingRowCells(cellMap);
  };

  const handleSaveEditedRow = (item: MasterDataItem) => {
    const hasAnyValue = Object.values(editingRowCells).some(v => (v || '').trim().length > 0);
    if (!hasAnyValue) {
      showNotice('error', 'O registro não pode ficar com todas as colunas vazias.');
      return;
    }
    tenantService.saveMasterDataItemWithColumns(
      selectedCategory,
      editingRowCells,
      item.id,
      item.ativo !== false,
      activeTenant.id
    );
    setEditingRowId(null);
    setEditingRowCells({});
    refreshLocalState();
    showNotice('success', 'Registro atualizado com sucesso.');
  };

  const handleToggleRecordActive = (item: MasterDataItem) => {
    const cellMap = tenantService.getItemCellMap(item, currentCategoryColumns);
    tenantService.saveMasterDataItemWithColumns(
      selectedCategory,
      cellMap,
      item.id,
      !item.ativo,
      activeTenant.id
    );
    refreshLocalState();
  };

  const handleConfirmDeleteRecord = (id: string) => {
    tenantService.deleteMasterDataItem(id, activeTenant.id);
    setConfirmDeleteRecordId(null);
    if (editingRowId === id) {
      setEditingRowId(null);
    }
    refreshLocalState();
    showNotice('success', 'Item removido da base.');
  };

  const handleAddColumnToBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnNameInput.trim()) return;
    const res = tenantService.addCategoryColumn(selectedCategory, newColumnNameInput, activeTenant.id);
    if (!res.success) {
      showNotice('error', res.message);
      return;
    }
    setNewColumnNameInput('');
    refreshLocalState();
    showNotice('success', res.message);
  };

  const handleSaveRenameColumn = () => {
    if (!renamingColumn) return;
    const res = tenantService.renameCategoryColumn(
      selectedCategory,
      renamingColumn.oldName,
      renamingColumn.newName,
      activeTenant.id
    );
    if (!res.success) {
      showNotice('error', res.message);
      return;
    }
    setRenamingColumn(null);
    refreshLocalState();
    showNotice('success', res.message);
  };

  const handleConfirmDeleteColumn = (colName: string) => {
    const res = tenantService.deleteCategoryColumn(selectedCategory, colName, activeTenant.id);
    setConfirmDeleteColumn(null);
    if (!res.success) {
      showNotice('error', res.message);
      return;
    }
    refreshLocalState();
    showNotice('success', res.message);
  };

  const handleSaveBaseMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategoryMeta || !editBaseNameInput.trim()) return;
    tenantService.saveOptionCategory(
      {
        ...currentCategoryMeta,
        nome: editBaseNameInput.trim(),
        descricao: editBaseDescInput.trim()
      },
      activeTenant.id
    );
    setEditingBaseMeta(false);
    refreshLocalState();
    showNotice('success', 'Nome e descrição da base atualizados.');
  };

  const handleConfirmClearBase = () => {
    const count = tenantService.clearCategoryItems(selectedCategory, activeTenant.id);
    setConfirmClearBase(false);
    refreshLocalState();
    showNotice('success', `${count} registro(s) removido(s). A base permanece aberta e pronta para novos dados.`);
  };

  const handleConfirmDeleteBase = () => {
    if (!currentCategoryMeta) return;
    const targetId = currentCategoryMeta.id;
    const res = tenantService.deleteOptionCategory(targetId, activeTenant.id);
    setConfirmDeleteBase(false);
    if (!res.success) {
      showNotice('error', res.message);
      return;
    }
    const remaining = tenantService.getOptionCategories(activeTenant.id);
    setSelectedCategory(remaining[0]?.id || '');
    refreshLocalState();
    showNotice('success', res.message);
  };

  const handleExecuteImportIntoBase = () => {
    if (!importRawText.trim()) {
      showNotice('error', 'Cole os dados ou carregue um arquivo (.CSV / .TXT) antes de importar.');
      return;
    }
    const res = tenantService.importTableIntoCategory(
      selectedCategory,
      importRawText,
      importMode,
      importHasHeader,
      activeTenant.id
    );
    setImportRawText('');
    setBaseWorkMode('spreadsheet');
    refreshLocalState();
    showNotice(
      'success',
      `Importação concluída em "${currentCategoryMeta?.nome}": ${res.addedCount} novo(s), ${res.updatedCount} atualizado(s) (${res.totalAfter} registros e ${res.columns.length} colunas).`
    );
  };

  const handleFileUploadIntoBase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = String(ev.target?.result || '');
      setImportRawText(content);
      setBaseWorkMode('import');
      showNotice('success', `Arquivo "${file.name}" carregado. Revise a prévia abaixo e clique em Confirmar Importação.`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleSaveContinuousText = () => {
    const res = tenantService.importTableIntoCategory(
      selectedCategory,
      continuousTextBuffer,
      'replace_all',
      true,
      activeTenant.id
    );
    setBaseWorkMode('spreadsheet');
    refreshLocalState();
    showNotice(
      'success',
      `Base "${currentCategoryMeta?.nome}" sincronizada via edição em texto (${res.totalAfter} registros ativos).`
    );
  };

  const handleExportCategoryCsv = (catId: string, catName: string) => {
    const csvContent = tenantService.exportSingleCategoryText(catId, 'csv', activeTenant.id);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base_${catName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotice('success', `Planilha CSV da base "${catName}" exportada com todas as colunas.`);
  };

  const handleCopyCategoryTsv = (catId: string, catName: string) => {
    const tsvContent = tenantService.exportSingleCategoryText(catId, 'tsv', activeTenant.id);
    navigator.clipboard?.writeText(tsvContent);
    showNotice('success', `Tabela "${catName}" copiada! Cole diretamente no Excel (Ctrl+V).`);
  };

  const handleCreateOptionCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) {
      showNotice('error', 'Informe o nome da nova Base da Empresa.');
      return;
    }

    const parsedCols = newCatColumnsText
      .split(/[;\t,|]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const initialCols = parsedCols.length > 0 ? parsedCols : ['Nome', 'Código', 'Detalhe'];

    const saved = tenantService.saveOptionCategory(
      {
        nome: newCatTitle.trim(),
        descricao: newCatDesc.trim() || 'Base de dados corporativa disponível para todos os módulos.',
        columns: initialCols,
        usadoNoFormulario: false,
        isMasterShared: true,
        appModule: 'custom'
      },
      activeTenant.id
    );

    let importMsg = '';
    if (newCatInitialItemsText.trim()) {
      const res = tenantService.importTableIntoCategory(
        saved.id,
        newCatInitialItemsText,
        'replace_all',
        newCatHasHeader,
        activeTenant.id
      );
      importMsg = ` com ${res.totalAfter} registro(s) e ${res.columns.length} coluna(s)`;
    }

    setSelectedCategory(saved.id);
    setNewCatTitle('');
    setNewCatDesc('');
    setNewCatColumnsText('Nome ; Código ; Detalhe');
    setNewCatInitialItemsText('');
    setNewCategoryModalOpen(false);
    refreshLocalState();
    showNotice(
      'success',
      `Base "${saved.nome}" criada${importMsg}! Ela já está disponível globalmente para RNC, Plano de Ação e 8D.`
    );
  };

  // =========================================================================
  // HANDLERS: CONFIGURAÇÃO DOS CAMPOS (RNC, PLANO DE AÇÃO E 8D)
  // =========================================================================
  const handleQuickFieldBaseChange = (field: FormFieldConfig, newCategoryId: string) => {
    const catId = newCategoryId || undefined;
    const cols = catId ? tenantService.getCategoryColumns(catId, activeTenant.id) : ['Nome'];
    const nextValCol = cols[0] || 'Nome';
    const nextDispCol = cols[0] || 'Nome';

    tenantService.saveFormField(
      {
        ...field,
        optionCategory: catId,
        valueColumn: nextValCol,
        displayColumn: nextDispCol
      },
      activeTenant.id
    );
    refreshLocalState();
    const baseName = optionCategories.find(c => c.id === catId)?.nome || 'Nenhuma';
    showNotice('success', `Campo "${field.label}" vinculado à base "${baseName}".`);
  };

  const handleQuickFieldColumnChange = (
    field: FormFieldConfig,
    which: 'valueColumn' | 'displayColumn',
    colName: string
  ) => {
    tenantService.saveFormField(
      {
        ...field,
        [which]: colName
      },
      activeTenant.id
    );
    refreshLocalState();
    showNotice(
      'success',
      `Coluna de ${which === 'valueColumn' ? 'Valor' : 'Exibição'} do campo "${field.label}" alterada para "${colName}".`
    );
  };

  const openCreateFieldModal = (presetCategoryId?: string) => {
    const defaultSec =
      selectedSectionFilter !== 'todas'
        ? selectedSectionFilter
        : moduleSections[0]?.id || 'secao_1';
    const catId = presetCategoryId || selectedCategory || 'master_funcionarios';
    const cols = tenantService.getCategoryColumns(catId, activeTenant.id);

    setEditingField(null);
    setFieldModule(selectedModule);
    setFieldLabel('');
    setFieldSection(defaultSec);
    setFieldType('select');
    setFieldRequired(false);
    setFieldVisible(true);
    setFieldColSpan(1);
    setFieldPlaceholder('');
    setFieldHelperText('');
    setFieldOptionCategory(catId);
    setFieldValueColumn(cols[0] || 'Nome');
    setFieldDisplayColumn(cols[0] || 'Nome');
    setFieldModalOpen(true);
  };

  const openEditFieldModal = (field: FormFieldConfig) => {
    const mod = field.module || 'rnc';
    const catId = field.optionCategory
      ? resolveCanonicalCategory(field.optionCategory)
      : 'master_funcionarios';
    const cols = tenantService.getCategoryColumns(catId, activeTenant.id);

    setEditingField(field);
    setFieldModule(mod);
    setFieldLabel(field.label);
    setFieldSection(field.section);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldVisible(field.visible);
    setFieldColSpan(field.colSpan || 1);
    setFieldPlaceholder(field.placeholder || '');
    setFieldHelperText(field.helperText || '');
    setFieldOptionCategory(catId);
    setFieldValueColumn(field.valueColumn && cols.includes(field.valueColumn) ? field.valueColumn : cols[0] || 'Nome');
    setFieldDisplayColumn(
      field.displayColumn && cols.includes(field.displayColumn) ? field.displayColumn : cols[0] || 'Nome'
    );
    setFieldModalOpen(true);
  };

  const handleSaveFieldModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) {
      showNotice('error', 'Informe o nome (rótulo) do campo.');
      return;
    }

    const isOptionField = fieldType === 'select' || fieldType === 'multiselect';
    const saved = tenantService.saveFormField(
      {
        id: editingField?.id,
        key: editingField?.key,
        module: fieldModule,
        label: fieldLabel.trim(),
        section: fieldSection,
        type: fieldType,
        required: fieldRequired,
        visible: fieldVisible,
        colSpan: fieldColSpan,
        placeholder: fieldPlaceholder.trim(),
        helperText: fieldHelperText.trim(),
        optionCategory: isOptionField ? fieldOptionCategory : undefined,
        valueColumn: isOptionField ? fieldValueColumn : undefined,
        displayColumn: isOptionField ? fieldDisplayColumn : undefined
      },
      activeTenant.id
    );

    setFieldModalOpen(false);
    refreshLocalState();
    showNotice(
      'success',
      editingField
        ? `Configurações do campo "${saved.label}" salvas com sucesso.`
        : `Novo campo "${saved.label}" criado no módulo ${MODULES_META.find(m => m.id === fieldModule)?.shortLabel}.`
    );
  };

  // =========================================================================
  // HANDLERS: IDENTIDADE VISUAL E ARMAZENAMENTO
  // =========================================================================
  const handleSaveWhiteLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const res = tenantService.updateTenant(activeTenant.id, {
      cnpj_contato: cnpjContato,
      customizacao: {
        nome_exibicao: nomeExibicao,
        subtitulo_relatorio: subtituloRelatorio,
        cor_primaria: corPrimaria,
        logo_url: logoUrl
      }
    });
    if (res.success) {
      refreshLocalState();
      showNotice('success', res.message);
    } else {
      showNotice('error', res.message);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const processed = await tenantService.processAndStoreImage(file, { slot: 'logo' });
    if (processed.success && processed.result) {
      setLogoUrl(processed.result.dataUrl);
      showNotice('success', `Logotipo otimizado em WebP (${processed.result.compressedSizeKB} KB)!`);
    } else {
      showNotice('error', processed.message);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* =========================================================================
          CABEÇALHO E SELETOR DAS 2 ÁREAS PRINCIPAIS
          ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span>Administração da Empresa</span>
            <span>•</span>
            <span className="font-semibold text-slate-800">{activeTenant.nome}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 tracking-tight">
            Configurações do Sistema e Central de Dados
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            Gerencie todas as bases multi-colunas da empresa e configure os campos de RNC, Plano de Ação e Metodologia 8D em um fluxo único.
          </p>
        </div>

        {/* Navegação Simplificada em 2 Áreas Principais */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setMainArea('central_bases_campos')}
            className={`px-4 py-2.5 rounded-lg text-xs font-display font-bold flex items-center gap-2 cursor-pointer transition-all ${
              mainArea === 'central_bases_campos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>1. Central de Bases e Campos</span>
          </button>

          <button
            type="button"
            onClick={() => setMainArea('identidade_armazenamento')}
            className={`px-4 py-2.5 rounded-lg text-xs font-display font-bold flex items-center gap-2 cursor-pointer transition-all ${
              mainArea === 'identidade_armazenamento'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/70'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>2. Identidade Visual e Armazenamento</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          NOTIFICAÇÃO CONTEXTUAL (SEM REINICIAR NAVEGAÇÃO)
          ========================================================================= */}
      {banner && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-500 hover:text-slate-800 font-semibold ml-4 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =========================================================================
          ÁREA 1: CENTRAL DE BASES E CAMPOS (2 CONTEXTOS INTEGRADOS)
          ========================================================================= */}
      {mainArea === 'central_bases_campos' && (
        <div className="space-y-5">
          {/* Barra Integrada de Contexto + Fluxo Guiado */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCentralContext('bases')}
                className={`px-4 py-2.5 rounded-lg text-xs font-display font-bold flex items-center gap-2 cursor-pointer border transition-all ${
                  centralContext === 'bases'
                    ? 'bg-[#0b5796] text-white border-[#0b5796] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Gerenciamento das Bases ({optionCategories.length})</span>
              </button>

              <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

              <button
                type="button"
                onClick={() => setCentralContext('campos')}
                className={`px-4 py-2.5 rounded-lg text-xs font-display font-bold flex items-center gap-2 cursor-pointer border transition-all ${
                  centralContext === 'campos'
                    ? 'bg-[#0b5796] text-white border-[#0b5796] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Configuração dos Campos (RNC • Plano de Ação • 8D)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">Fluxo unificado:</span>
              <span>1. Cadastrar/Importar Base</span>
              <span>→</span>
              <span>2. Selecionar Módulo e Campo</span>
              <span>→</span>
              <span>3. Escolher Base e Colunas (Valor/Exibição)</span>
            </div>
          </div>

          {/* =====================================================================
              CONTEXTO 1: GERENCIAMENTO DAS BASES (COM PLANILHA MULTI-COLUNAS)
              ===================================================================== */}
          {centralContext === 'bases' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Coluna Esquerda: Catálogo Global de Bases da Empresa */}
              <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-display font-bold text-slate-900">
                      Bases Cadastradas na Empresa
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Disponíveis globalmente para todos os módulos
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMultiBaseModalOpen(true)}
                      title="Importar ou exportar várias bases simultaneamente via Excel"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Multi-Bases</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewCategoryModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0b5796] hover:bg-[#094679] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Base</span>
                    </button>
                  </div>
                </div>

                {/* Busca de Base */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={baseListSearch}
                    onChange={e => setBaseListSearch(e.target.value)}
                    placeholder="Buscar base por nome ou coluna..."
                    className="form-input w-full pl-8 pr-7 h-9 text-xs"
                  />
                  {baseListSearch && (
                    <button
                      type="button"
                      onClick={() => setBaseListSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro informativo por uso nos módulos (não restringe disponibilidade) */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { id: 'all', label: 'Todas' },
                    { id: 'rnc', label: 'Em uso: RNC' },
                    { id: 'plano_acao', label: 'Em uso: Plano' },
                    { id: 'oitod', label: 'Em uso: 8D' },
                    { id: 'unlinked', label: 'Sem vínculo' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setBaseUsageFilter(f.id as any)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer border transition-colors ${
                        baseUsageFilter === f.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Lista de Bases */}
                <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
                  {filteredOptionCategories.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhuma base encontrada para este filtro.
                    </div>
                  ) : (
                    filteredOptionCategories.map(cat => {
                      const active = selectedCategory === cat.id;
                      const itemsCount = tenantService.getMasterData(cat.id, activeTenant.id).length;
                      const cols = tenantService.getCategoryColumns(cat.id, activeTenant.id);
                      const deps = tenantService.getBaseUsageDependencies(cat.id, activeTenant.id);
                      const usedModules = Array.from(new Set(deps.map(d => d.moduleLabel)));

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectBase(cat.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            active
                              ? 'border-[#0b5796] bg-blue-50/50 shadow-2xs'
                              : 'border-slate-200/80 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 leading-snug">
                              {cat.nome}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0 tabular-nums">
                              {itemsCount} reg · {cols.length} col
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                            <span>Colunas: {cols.slice(0, 3).join(', ')}{cols.length > 3 ? ` +${cols.length - 3}` : ''}</span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {deps.length > 0 ? (
                              <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Vinculada a {deps.length} campo(s) ({usedModules.join(', ')})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                Disponível para todos os módulos (sem campo vinculado)
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Coluna Direita: Gerenciador e Planilha Multi-Colunas da Base Selecionada */}
              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                {!currentCategoryMeta ? (
                  <div className="py-16 text-center space-y-3">
                    <Database className="w-8 h-8 text-slate-300 mx-auto" />
                    <div className="text-sm font-bold text-slate-700">
                      Nenhuma base selecionada
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Selecione uma base na lista à esquerda ou crie uma nova base da empresa.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cabeçalho da Base Selecionada */}
                    <div className="pb-4 border-b border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          {editingBaseMeta ? (
                            <form onSubmit={handleSaveBaseMeta} className="space-y-2 max-w-lg">
                              <input
                                type="text"
                                value={editBaseNameInput}
                                onChange={e => setEditBaseNameInput(e.target.value)}
                                className="form-input w-full text-xs font-bold"
                                placeholder="Nome da Base"
                                required
                              />
                              <input
                                type="text"
                                value={editBaseDescInput}
                                onChange={e => setEditBaseDescInput(e.target.value)}
                                className="form-input w-full text-xs"
                                placeholder="Descrição da Base"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  className="px-3 py-1 rounded-lg bg-[#0b5796] text-white text-xs font-semibold cursor-pointer"
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingBaseMeta(false)}
                                  className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-display font-bold text-slate-900">
                                  {currentCategoryMeta.nome}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditBaseNameInput(currentCategoryMeta.nome);
                                    setEditBaseDescInput(currentCategoryMeta.descricao);
                                    setEditingBaseMeta(true);
                                  }}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Editar nome</span>
                                </button>
                              </div>
                              <p className="text-xs text-slate-500">{currentCategoryMeta.descricao}</p>
                            </>
                          )}
                        </div>

                        {/* Ações Rápidas da Base */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                            <Upload className="w-3.5 h-3.5 text-[#0b5796]" />
                            <span>Subir .CSV / .TXT</span>
                            <input
                              type="file"
                              accept=".csv,.txt,.tsv"
                              onChange={handleFileUploadIntoBase}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              handleExportCategoryCsv(currentCategoryMeta.id, currentCategoryMeta.nome)
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exportar CSV</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCopyCategoryTsv(currentCategoryMeta.id, currentCategoryMeta.nome)
                            }
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar p/ Excel</span>
                          </button>

                          {currentCategoryItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setConfirmClearBase(true)}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Limpar Itens</span>
                            </button>
                          )}

                          {!currentCategoryMeta.isSystem && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBase(true)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir Base</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Confirmação Inline: Limpar Todos os Registros da Base */}
                      {confirmClearBase && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="text-xs text-rose-900">
                            <strong>Confirmar limpeza:</strong> Deseja remover todos os{' '}
                            <strong>{currentCategoryItems.length}</strong> registros da base{' '}
                            <strong>{currentCategoryMeta.nome}</strong>? A estrutura de colunas e os vínculos com campos serão mantidos.
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setConfirmClearBase(false)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmClearBase}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                            >
                              Sim, Limpar Registros
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmação Inline: Excluir Base Completa (Com verificação de dependências) */}
                      {confirmDeleteBase && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                          {currentBaseDependencies.length > 0 ? (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="text-xs text-rose-900">
                                <strong>Exclusão bloqueada por dependência:</strong> A base{' '}
                                <strong>{currentCategoryMeta.nome}</strong> está vinculada a{' '}
                                <strong>{currentBaseDependencies.length} campo(s)</strong> (
                                {currentBaseDependencies
                                  .map(d => `${d.fieldLabel} em ${d.moduleLabel}`)
                                  .join(', ')}
                                ). Desvincule esses campos antes de excluir a base.
                              </div>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteBase(false)}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 self-start sm:self-auto cursor-pointer"
                              >
                                Entendi
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="text-xs text-rose-900">
                                <strong>Confirmar exclusão definitiva:</strong> Deseja excluir a base{' '}
                                <strong>{currentCategoryMeta.nome}</strong> e seus{' '}
                                {currentCategoryItems.length} registros?
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteBase(false)}
                                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={handleConfirmDeleteBase}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                                >
                                  Confirmar Exclusão
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Painel: Em quais módulos e campos esta base está sendo utilizada */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-[#0b5796]" />
                            <span>Módulos e Campos que utilizam esta Base ({currentBaseDependencies.length})</span>
                          </div>
                          {currentBaseDependencies.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              Nenhum campo vinculado no momento. Você pode selecioná-la em qualquer campo de RNC, Plano de Ação ou 8D.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {currentBaseDependencies.map(dep => (
                                <button
                                  key={`${dep.module}-${dep.fieldId}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModule(dep.module);
                                    setSelectedSectionFilter('todas');
                                    setCentralContext('campos');
                                  }}
                                  title="Clique para abrir este campo na Configuração dos Campos"
                                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#0b5796] text-[11px] text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span className="font-bold text-[#0b5796]">{dep.moduleLabel}:</span>
                                  <span className="font-semibold">{dep.fieldLabel}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    [Valor: {dep.valueColumn || currentCategoryColumns[0]} | Exibição:{' '}
                                    {dep.displayColumn || currentCategoryColumns[0]}]
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-slate-400" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCentralContext('campos');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-900 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Configurar Campos com esta Base</span>
                        </button>
                      </div>
                    </div>

                    {/* Seletor de Modo de Trabalho dentro da Base */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setBaseWorkMode('spreadsheet')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            baseWorkMode === 'spreadsheet'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Planilha Multi-Colunas ({currentCategoryItems.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBaseWorkMode('import')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            baseWorkMode === 'import'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                          <span>Importar / Colar Planilha</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setContinuousTextBuffer(
                              tenantService.exportSingleCategoryText(
                                selectedCategory,
                                'lines',
                                activeTenant.id
                              )
                            );
                            setBaseWorkMode('text');
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                            baseWorkMode === 'text'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Edição em Texto Contínuo</span>
                        </button>
                      </div>

                      {baseWorkMode === 'spreadsheet' && (
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={recordSearchQuery}
                            onChange={e => setRecordSearchQuery(e.target.value)}
                            placeholder="Filtrar registros na tabela..."
                            className="form-input w-full pl-8 pr-7 h-8 text-xs"
                          />
                          {recordSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setRecordSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ===============================================================
                        MODO 1: PLANILHA MULTI-COLUNAS DA BASE SELECIONADA
                        =============================================================== */}
                    {baseWorkMode === 'spreadsheet' && (
                      <div className="space-y-4">
                        {/* Barra de Estrutura de Colunas da Tabela */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Columns className="w-3.5 h-3.5 text-[#0b5796]" />
                              <span>
                                Colunas desta Base ({currentCategoryColumns.length}) — Personalize livremente as colunas da tabela
                              </span>
                            </div>

                            <form onSubmit={handleAddColumnToBase} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={newColumnNameInput}
                                onChange={e => setNewColumnNameInput(e.target.value)}
                                placeholder="Nome da nova coluna..."
                                className="form-input h-8 text-xs bg-white w-44"
                              />
                              <button
                                type="submit"
                                className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar Coluna</span>
                              </button>
                            </form>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {currentCategoryColumns.map((col, idx) => (
                              <div
                                key={col}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
                              >
                                <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                                {renamingColumn?.oldName === col ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={renamingColumn.newName}
                                      onChange={e =>
                                        setRenamingColumn({
                                          oldName: col,
                                          newName: e.target.value
                                        })
                                      }
                                      className="border border-slate-300 rounded px-1.5 py-0.5 text-xs w-28"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveRenameColumn}
                                      className="text-emerald-600 hover:text-emerald-800 font-bold cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRenamingColumn(null)}
                                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-semibold">{col}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRenamingColumn({ oldName: col, newName: col })
                                      }
                                      title="Renomear coluna"
                                      className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    {currentCategoryColumns.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteColumn(col)}
                                        title="Excluir coluna"
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Confirmação de Exclusão de Coluna */}
                          {confirmDeleteColumn && (
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-900">
                              <span>
                                Deseja remover a coluna <strong>{confirmDeleteColumn}</strong> desta base?
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteColumn(null)}
                                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDeleteColumn(confirmDeleteColumn)}
                                  className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold cursor-pointer"
                                >
                                  Remover Coluna
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Linha de Adição Rápida Multi-Colunas */}
                        <form
                          onSubmit={handleAddRecordRow}
                          className="p-3 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-2"
                        >
                          <div className="text-[11px] font-bold text-slate-700">
                            Adicionar Novo Registro na Planilha
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {currentCategoryColumns.map((col, idx) => (
                              <div key={col}>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                  {col} {idx === 0 && <span className="text-rose-500">*</span>}
                                </label>
                                <input
                                  type="text"
                                  value={newRowCells[col] || ''}
                                  onChange={e =>
                                    setNewRowCells(prev => ({
                                      ...prev,
                                      [col]: e.target.value
                                    }))
                                  }
                                  placeholder={`Informe ${col.toLowerCase()}...`}
                                  className="form-input w-full h-8 text-xs bg-white"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end pt-1">
                            <button
                              type="submit"
                              className="h-8 px-4 rounded-lg bg-[#0b5796] hover:bg-[#094679] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Incluir Registro na Base</span>
                            </button>
                          </div>
                        </form>

                        {/* Tabela de Registros Multi-Colunas */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                                  {currentCategoryColumns.map(col => (
                                    <th key={col} className="py-2.5 px-3 min-w-[140px]">
                                      {col}
                                    </th>
                                  ))}
                                  <th className="py-2.5 px-3 w-24 text-center">Status</th>
                                  <th className="py-2.5 px-3 w-28 text-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredCategoryItems.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={currentCategoryColumns.length + 3}
                                      className="py-10 text-center text-slate-400"
                                    >
                                      Nenhum registro encontrado nesta base.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredCategoryItems.map((item, rowIdx) => {
                                    const cellMap = tenantService.getItemCellMap(
                                      item,
                                      currentCategoryColumns
                                    );
                                    const isEditing = editingRowId === item.id;
                                    const isConfirmingDelete = confirmDeleteRecordId === item.id;

                                    return (
                                      <tr
                                        key={item.id}
                                        className={`hover:bg-slate-50/80 ${
                                          !item.ativo ? 'opacity-60 bg-slate-50/40' : ''
                                        }`}
                                      >
                                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400 tabular-nums">
                                          {rowIdx + 1}
                                        </td>

                                        {currentCategoryColumns.map(col => (
                                          <td key={col} className="py-2 px-3">
                                            {isEditing ? (
                                              <input
                                                type="text"
                                                value={editingRowCells[col] ?? ''}
                                                onChange={e =>
                                                  setEditingRowCells(prev => ({
                                                    ...prev,
                                                    [col]: e.target.value
                                                  }))
                                                }
                                                className="form-input w-full h-7 text-xs bg-white px-2"
                                              />
                                            ) : (
                                              <span className="text-slate-800 font-medium">
                                                {cellMap[col] || '—'}
                                              </span>
                                            )}
                                          </td>
                                        ))}

                                        <td className="py-2 px-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleRecordActive(item)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                              item.ativo
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                            }`}
                                          >
                                            {item.ativo ? 'Ativo' : 'Inativo'}
                                          </button>
                                        </td>

                                        <td className="py-2 px-3 text-right">
                                          {isEditing ? (
                                            <div className="inline-flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleSaveEditedRow(item)}
                                                className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                              >
                                                Salvar
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingRowId(null)}
                                                className="px-2 py-1 rounded border border-slate-200 text-slate-600 text-[11px] cursor-pointer"
                                              >
                                                Cancelar
                                              </button>
                                            </div>
                                          ) : isConfirmingDelete ? (
                                            <div className="inline-flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleConfirmDeleteRecord(item.id)}
                                                className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                              >
                                                Excluir
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setConfirmDeleteRecordId(null)}
                                                className="px-1.5 py-1 rounded border border-slate-200 text-slate-600 text-[10px] cursor-pointer"
                                              >
                                                Não
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="inline-flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleStartEditRow(item)}
                                                title="Editar linha"
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                              >
                                                <Edit3 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setConfirmDeleteRecordId(item.id)}
                                                title="Excluir linha"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ===============================================================
                        MODO 2: IMPORTAR ARQUIVO (.CSV / .TXT) OU COLAR DO EXCEL
                        =============================================================== */}
                    {baseWorkMode === 'import' && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              Importar Planilha (.CSV / .TXT) ou Colar Colunas do Excel em &ldquo;{currentCategoryMeta.nome}&rdquo;
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Aceita múltiplas colunas separadas por TAB (cópia direta do Excel), ponto-e-vírgula (;) ou vírgula (,).
                            </p>
                          </div>

                          <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start">
                            <Upload className="w-3.5 h-3.5 text-[#0b5796]" />
                            <span>Selecionar Arquivo (.CSV / .TXT)</span>
                            <input
                              type="file"
                              accept=".csv,.txt,.tsv"
                              onChange={handleFileUploadIntoBase}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <label className="inline-flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={importHasHeader}
                              onChange={e => setImportHasHeader(e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            <span>A 1ª linha contém os nomes das colunas (Cabeçalho da Planilha)</span>
                          </label>

                          <div className="flex items-center gap-3 ml-auto">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="importMode"
                                checked={importMode === 'append'}
                                onChange={() => setImportMode('append')}
                              />
                              <span className="font-medium text-slate-700">
                                Adicionar / Atualizar existentes
                              </span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="importMode"
                                checked={importMode === 'replace_all'}
                                onChange={() => setImportMode('replace_all')}
                              />
                              <span className="font-medium text-rose-700">
                                Substituir toda a base
                              </span>
                            </label>
                          </div>
                        </div>

                        <textarea
                          rows={10}
                          value={importRawText}
                          onChange={e => setImportRawText(e.target.value)}
                          placeholder={`Exemplo copiando do Excel ou CSV:\n${currentCategoryColumns.join(' ; ')}\nItem Exemplo 1 ; COD-01 ; Detalhe A\nItem Exemplo 2 ; COD-02 ; Detalhe B`}
                          className="form-input w-full font-mono text-xs bg-white p-3"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setBaseWorkMode('spreadsheet')}
                            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleExecuteImportIntoBase}
                            className="px-4 py-2 rounded-lg bg-[#0b5796] hover:bg-[#094679] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Confirmar Importação na Base</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ===============================================================
                        MODO 3: EDIÇÃO RÁPIDA EM TEXTO CONTÍNUO
                        =============================================================== */}
                    {baseWorkMode === 'text' && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              Edição Rápida em Texto Contínuo ({currentCategoryMeta.nome})
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              A 1ª linha define as colunas separadas por <code>;</code> e cada linha seguinte representa um registro.
                            </p>
                          </div>
                        </div>

                        <textarea
                          rows={12}
                          value={continuousTextBuffer}
                          onChange={e => setContinuousTextBuffer(e.target.value)}
                          className="form-input w-full font-mono text-xs bg-white p-3"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setBaseWorkMode('spreadsheet')}
                            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            Voltar para Tabela
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveContinuousText}
                            className="px-4 py-2 rounded-lg bg-[#0b5796] hover:bg-[#094679] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Salvar Alterações em Lote</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* =====================================================================
              CONTEXTO 2: CONFIGURAÇÃO DOS CAMPOS (1. RNC • 2. PLANO DE AÇÃO • 3. 8D)
              ===================================================================== */}
          {centralContext === 'campos' && (
            <div className="space-y-5">
              {/* Barra Superior de Seleção de Módulo e Ações do Módulo */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <h2 className="text-base font-display font-bold text-slate-900">
                      Configuração de Campos e Vínculo de Bases por Módulo
                    </h2>
                    <p className="text-xs text-slate-500">
                      Selecione o módulo, escolha qualquer base cadastrada na empresa como fonte de opções e defina qual coluna será gravada como Valor e qual será Exibida ao usuário.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCreateFieldModal()}
                      className="px-3.5 py-2 rounded-lg bg-[#0b5796] hover:bg-[#094679] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo Campo em {MODULES_META.find(m => m.id === selectedModule)?.shortLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmResetFields(true)}
                      className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar Padrão do Módulo</span>
                    </button>
                  </div>
                </div>

                {/* Confirmação Inline para Restaurar Padrão do Módulo */}
                {confirmResetFields && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-amber-950">
                      <strong>Restaurar campos padrão:</strong> Deseja restaurar a configuração original dos campos do módulo{' '}
                      <strong>{MODULES_META.find(m => m.id === selectedModule)?.label}</strong>?
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmResetFields(false)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          tenantService.resetFormFieldsToDefault(activeTenant.id, selectedModule);
                          setConfirmResetFields(false);
                          refreshLocalState();
                          showNotice('success', 'Campos do módulo restaurados para o padrão de fábrica.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Confirmar Restauração
                      </button>
                    </div>
                  </div>
                )}

                {/* Seletor dos 3 Módulos do Sistema */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {MODULES_META.map(mod => {
                    const active = selectedModule === mod.id;
                    const count = allFormFields.filter(
                      f => !f.deleted && (f.module || 'rnc') === mod.id
                    ).length;

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleSelectModule(mod.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-[#0b5796] bg-blue-50/50 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-display font-bold text-slate-900">
                            {mod.label}
                          </span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                            {count} campos
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{mod.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Filtro por Seção do Módulo + Busca de Campo */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSectionFilter('todas')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                        selectedSectionFilter === 'todas'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Todas as Seções ({moduleSections.length})
                    </button>
                    {moduleSections.map(sec => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSelectedSectionFilter(sec.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                          selectedSectionFilter === sec.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {sec.shortLabel}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fieldSearchQuery}
                      onChange={e => setFieldSearchQuery(e.target.value)}
                      placeholder="Buscar campo..."
                      className="form-input w-full pl-8 pr-7 h-8 text-xs"
                    />
                    {fieldSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setFieldSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Seções e Campos do Módulo Selecionado */}
              {moduleSections
                .filter(sec => selectedSectionFilter === 'todas' || sec.id === selectedSectionFilter)
                .map(sec => {
                  const sectionFields = activeModuleFields
                    .filter(f => f.section === sec.id)
                    .sort((a, b) => a.order - b.order);

                  if (sectionFields.length === 0) return null;

                  return (
                    <div
                      key={sec.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                    >
                      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-display font-bold text-slate-900">
                            {sec.label}
                          </h3>
                          <p className="text-[11px] text-slate-500">{sec.description}</p>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-600">
                          {sectionFields.length} campo(s)
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {sectionFields.map((field, idx) => {
                          const isOptionType =
                            field.type === 'select' ||
                            field.type === 'multiselect' ||
                            Boolean(field.optionCategory);
                          const linkedCat = field.optionCategory
                            ? optionCategories.find(
                                c =>
                                  c.id === field.optionCategory ||
                                  c.id === resolveCanonicalCategory(field.optionCategory!)
                              )
                            : undefined;
                          const availableCols = field.optionCategory
                            ? tenantService.getCategoryColumns(
                                field.optionCategory,
                                activeTenant.id
                              )
                            : ['Nome'];
                          const resolvedPreview = field.optionCategory
                            ? tenantService.getFieldResolvedOptions(
                                field.key,
                                selectedModule,
                                field.optionCategory,
                                activeTenant.id
                              )
                            : null;

                          return (
                            <div
                              key={field.id}
                              className={`p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 transition-colors ${
                                !field.visible ? 'bg-slate-50/70 opacity-75' : 'hover:bg-slate-50/40'
                              }`}
                            >
                              {/* Esquerda: Ordem + Rótulo + Tipo */}
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex flex-col items-center gap-1 pt-0.5">
                                  <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        tenantService.moveFormFieldOrder(
                                          field.id,
                                          'up',
                                          activeTenant.id
                                        );
                                        refreshLocalState();
                                      }}
                                      disabled={idx === 0}
                                      className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Mover para cima"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        tenantService.moveFormFieldOrder(
                                          field.id,
                                          'down',
                                          activeTenant.id
                                        );
                                        refreshLocalState();
                                      }}
                                      disabled={idx === sectionFields.length - 1}
                                      className="p-0.5 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                                      title="Mover para baixo"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                                      {field.label}
                                    </span>
                                    {field.required && (
                                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                        Obrigatório *
                                      </span>
                                    )}
                                    {!field.visible && (
                                      <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                        Oculto
                                      </span>
                                    )}
                                    {!field.isSystem && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                        Campo Personalizado
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                    <span>Tipo: {FIELD_TYPE_LABELS[field.type]}</span>
                                    <span>•</span>
                                    <span className="font-mono">Chave: {field.key}</span>
                                    <span>•</span>
                                    <span>Largura: {field.colSpan || 1}/4 col</span>
                                  </div>
                                </div>
                              </div>

                              {/* Centro: Configuração Direta de Base e Colunas (para campos de seleção) */}
                              {isOptionType && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-end gap-2.5 lg:min-w-[540px]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                      Base de Dados Vinculada (Global)
                                    </label>
                                    <select
                                      value={
                                        linkedCat?.id ||
                                        field.optionCategory ||
                                        ''
                                      }
                                      onChange={e =>
                                        handleQuickFieldBaseChange(field, e.target.value)
                                      }
                                      className="form-input w-full h-8 text-xs bg-white font-semibold"
                                    >
                                      <option value="">-- Sem Base Vinculada --</option>
                                      {optionCategories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                          {cat.nome} ({tenantService.getMasterData(cat.id, activeTenant.id).length} itens)
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {field.optionCategory && (
                                    <>
                                      <div className="w-full sm:w-36">
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                          Coluna de Valor
                                        </label>
                                        <select
                                          value={field.valueColumn || availableCols[0] || 'Nome'}
                                          onChange={e =>
                                            handleQuickFieldColumnChange(
                                              field,
                                              'valueColumn',
                                              e.target.value
                                            )
                                          }
                                          className="form-input w-full h-8 text-xs bg-white"
                                        >
                                          {availableCols.map(col => (
                                            <option key={col} value={col}>
                                              {col}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="w-full sm:w-36">
                                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                          Coluna Exibida
                                        </label>
                                        <select
                                          value={field.displayColumn || availableCols[0] || 'Nome'}
                                          onChange={e =>
                                            handleQuickFieldColumnChange(
                                              field,
                                              'displayColumn',
                                              e.target.value
                                            )
                                          }
                                          className="form-input w-full h-8 text-xs bg-white"
                                        >
                                          {availableCols.map(col => (
                                            <option key={col} value={col}>
                                              {col}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleSelectBase(
                                            linkedCat?.id || field.optionCategory!
                                          );
                                          setCentralContext('bases');
                                        }}
                                        title="Abrir e editar esta base no Gerenciamento das Bases"
                                        className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:border-[#0b5796] text-[#0b5796] text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        <Database className="w-3.5 h-3.5" />
                                        <span>Editar Base ({resolvedPreview?.options.length || 0})</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Direita: Controles de Visibilidade, Obrigatoriedade, Edição e Exclusão */}
                              <div className="flex items-center gap-1.5 self-end lg:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    tenantService.toggleFormFieldVisibility(
                                      field.id,
                                      activeTenant.id
                                    );
                                    refreshLocalState();
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                                    field.visible
                                      ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                      : 'border-amber-300 bg-amber-50 text-amber-900'
                                  }`}
                                  title={field.visible ? 'Ocultar campo' : 'Tornar campo visível'}
                                >
                                  {field.visible ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Visível</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>Oculto</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    tenantService.toggleFormFieldRequired(
                                      field.id,
                                      activeTenant.id
                                    );
                                    refreshLocalState();
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                    field.required
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {field.required ? 'Obrigatório' : 'Opcional'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openEditFieldModal(field)}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                                  title="Editar propriedades completas do campo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {confirmDeleteFieldId === field.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        tenantService.deleteFormField(field.id, activeTenant.id);
                                        setConfirmDeleteFieldId(null);
                                        refreshLocalState();
                                        showNotice('success', `Campo "${field.label}" removido do formulário.`);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteFieldId(null)}
                                      className="px-2 py-1 rounded border border-slate-200 text-slate-600 text-[10px] cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteFieldId(field.id)}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Remover campo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              {/* Campos do Sistema Ocultos / Removidos que podem ser restaurados */}
              {deletedModuleFields.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    Campos Removidos neste Módulo ({deletedModuleFields.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {deletedModuleFields.map(df => (
                      <div
                        key={df.id}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs"
                      >
                        <span className="font-medium text-slate-700">{df.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            tenantService.restoreFormField(df.id, activeTenant.id);
                            refreshLocalState();
                            showNotice('success', `Campo "${df.label}" restaurado.`);
                          }}
                          className="text-[#0b5796] font-bold hover:underline cursor-pointer"
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ÁREA 2: IDENTIDADE VISUAL E ARMAZENAMENTO (SEPARADA DE BASES E CAMPOS)
          ========================================================================= */}
      {mainArea === 'identidade_armazenamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <form
            onSubmit={handleSaveWhiteLabel}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
          >
            <h2 className="text-base font-display font-bold text-slate-900 border-b border-slate-100 pb-3">
              Marca, Logotipo e Cores do Sistema ({activeTenant.nome})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome de Exibição no Cabeçalho e Fichas 8D
                </label>
                <input
                  type="text"
                  value={nomeExibicao}
                  onChange={e => setNomeExibicao(e.target.value)}
                  className="form-input w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNPJ / E-mail de Contato Autorizado
                </label>
                <input
                  type="text"
                  value={cnpjContato}
                  onChange={e => setCnpjContato(e.target.value)}
                  className="form-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtítulo de Relatórios Impressos (A4 / Alerta da Qualidade)
              </label>
              <input
                type="text"
                value={subtituloRelatorio}
                onChange={e => setSubtituloRelatorio(e.target.value)}
                className="form-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Cor Primária da Marca (<code className="font-mono">--brand-primary</code>)
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {BRAND_PRESET_COLORS.map(preset => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => {
                      setCorPrimaria(preset.hex);
                      document.documentElement.style.setProperty('--brand-primary', preset.hex);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                      corPrimaria.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-slate-900 bg-slate-50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}

                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={e => {
                      setCorPrimaria(e.target.value);
                      document.documentElement.style.setProperty('--brand-primary', e.target.value);
                    }}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-xs text-slate-600 uppercase">{corPrimaria}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Logotipo da Empresa (Compressão Automática WebP)
              </label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="h-14 px-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Logo Empresa"
                      referrerPolicy="no-referrer"
                      className="max-h-10 max-w-[140px] object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg text-white flex items-center justify-center font-display font-bold text-base"
                    style={{ backgroundColor: corPrimaria }}
                  >
                    {nomeExibicao.substring(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="btn-secondary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Enviar Logotipo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 h-9 rounded-lg border border-slate-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="h-10 px-5 rounded-lg text-white font-display font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
                style={{ backgroundColor: corPrimaria }}
              >
                <Check className="w-4 h-4" />
                <span>Salvar Identidade Visual</span>
              </button>
            </div>
          </form>

          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-display font-bold text-slate-900">
                Pré-visualização do Cabeçalho &amp; Relatórios
              </h3>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={nomeExibicao}
                        referrerPolicy="no-referrer"
                        className="h-7 w-auto object-contain"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs"
                        style={{ backgroundColor: corPrimaria }}
                      >
                        {nomeExibicao.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">{nomeExibicao}</div>
                      <div className="text-[10px] text-slate-500">{subtituloRelatorio}</div>
                    </div>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded text-[10px] font-semibold text-white"
                    style={{ backgroundColor: corPrimaria }}
                  >
                    + Nova ocorrência
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  URL de Acesso da Empresa: <strong>/{activeTenant.slug}/login</strong>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-600" />
                  <h3 className="text-sm font-display font-bold text-slate-900">
                    Cota de Armazenamento de Fotos (WebP &amp; Cloud)
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                  {activeTenant.limites.storage_usado_mb} MB / {activeTenant.limites.max_storage_mb} MB
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(2, storagePercent)}%`,
                    backgroundColor: corPrimaria
                  }}
                />
              </div>

              <p className="text-xs text-slate-500">
                As evidências fotográficas (Peça OK e Peça NG) são comprimidas automaticamente em WebP Full HD (~180 KB/foto) e salvas no IndexedDB local de alta capacidade + bucket <code>evidencias-qualidade</code>.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    tenantService.recalculateTenantStorage(spStore.getRNCs(), activeTenant.id);
                    refreshLocalState();
                    showNotice('success', 'Armazenamento recalculado com sucesso.');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Recalcular Armazenamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CRIAR OU EDITAR CAMPO (RNC, PLANO DE AÇÃO OU 8D)
          ========================================================================= */}
      {fieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveFieldModal}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  {editingField ? `Editar Campo: ${editingField.label}` : 'Criar Novo Campo'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure o rótulo, seção, base de opções e as colunas de Valor e Exibição.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFieldModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Módulo do Sistema
                </label>
                <select
                  value={fieldModule}
                  onChange={e => {
                    const nextMod = e.target.value as FormModuleId;
                    setFieldModule(nextMod);
                    const firstSec = FORM_SECTIONS_META.find(s => s.module === nextMod);
                    if (firstSec) setFieldSection(firstSec.id);
                  }}
                  disabled={Boolean(editingField?.isSystem)}
                  className="form-input w-full text-xs"
                >
                  {MODULES_META.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seção / Etapa do Módulo
                </label>
                <select
                  value={fieldSection}
                  onChange={e => setFieldSection(e.target.value as FormSectionId)}
                  className="form-input w-full text-xs"
                >
                  {FORM_SECTIONS_META.filter(s => s.module === fieldModule).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome / Rótulo do Campo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldLabel}
                  onChange={e => setFieldLabel(e.target.value)}
                  placeholder="Ex: Fornecedor Homologado, Célula Robotizada, Turno..."
                  className="form-input w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Campo
                </label>
                <select
                  value={fieldType}
                  onChange={e => setFieldType(e.target.value as FormFieldType)}
                  disabled={Boolean(editingField?.isSystem)}
                  className="form-input w-full text-xs"
                >
                  {Object.entries(FIELD_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Largura no Grid (1 a 4 Colunas)
                </label>
                <select
                  value={fieldColSpan}
                  onChange={e => setFieldColSpan(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="form-input w-full text-xs"
                >
                  <option value={1}>1 Coluna (25%)</option>
                  <option value={2}>2 Colunas (50%)</option>
                  <option value={3}>3 Colunas (75%)</option>
                  <option value={4}>4 Colunas (100% Largura Total)</option>
                </select>
              </div>

              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-900">
                    Vínculo de Base e Colunas (Disponível em todos os módulos)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Escolher Base da Empresa
                      </label>
                      <select
                        value={fieldOptionCategory}
                        onChange={e => {
                          const nextCat = e.target.value;
                          setFieldOptionCategory(nextCat);
                          const cols = tenantService.getCategoryColumns(nextCat, activeTenant.id);
                          setFieldValueColumn(cols[0] || 'Nome');
                          setFieldDisplayColumn(cols[0] || 'Nome');
                        }}
                        className="form-input w-full text-xs bg-white font-semibold"
                      >
                        {optionCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Coluna utilizada como Valor
                      </label>
                      <select
                        value={fieldValueColumn}
                        onChange={e => setFieldValueColumn(e.target.value)}
                        className="form-input w-full text-xs bg-white"
                      >
                        {tenantService
                          .getCategoryColumns(fieldOptionCategory, activeTenant.id)
                          .map(col => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Coluna Exibida ao Usuário
                      </label>
                      <select
                        value={fieldDisplayColumn}
                        onChange={e => setFieldDisplayColumn(e.target.value)}
                        className="form-input w-full text-xs bg-white"
                      >
                        {tenantService
                          .getCategoryColumns(fieldOptionCategory, activeTenant.id)
                          .map(col => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto de Exemplo (Placeholder)
                </label>
                <input
                  type="text"
                  value={fieldPlaceholder}
                  onChange={e => setFieldPlaceholder(e.target.value)}
                  placeholder="Opcional..."
                  className="form-input w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dica / Instrução ao Usuário
                </label>
                <input
                  type="text"
                  value={fieldHelperText}
                  onChange={e => setFieldHelperText(e.target.value)}
                  placeholder="Opcional..."
                  className="form-input w-full text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldVisible}
                    onChange={e => setFieldVisible(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Campo Visível no Formulário</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={e => setFieldRequired(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Preenchimento Obrigatório (*)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFieldModalOpen(false)}
                className="btn-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary h-9 px-5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingField ? 'Salvar Alterações do Campo' : 'Criar Campo'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: CRIAR / IMPORTAR NOVA BASE MULTI-COLUNAS DA EMPRESA
          ========================================================================= */}
      {newCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateOptionCategory}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  Criar ou Importar Nova Base da Empresa
                </h3>
                <p className="text-xs text-slate-500">
                  A base ficará imediatamente disponível para seleção em RNC, Plano de Ação e 8D.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewCategoryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Base da Empresa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newCatTitle}
                onChange={e => setNewCatTitle(e.target.value)}
                placeholder="Ex: Lista de Ferramentais, Fornecedores Homologados, Células..."
                className="form-input w-full text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição da Base
              </label>
              <input
                type="text"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="Opcional..."
                className="form-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Colunas Iniciais da Base (separadas por ponto-e-vírgula)
              </label>
              <input
                type="text"
                value={newCatColumnsText}
                onChange={e => setNewCatColumnsText(e.target.value)}
                placeholder="Ex: Código ; Descrição ; Setor ; Cliente"
                className="form-input w-full text-xs font-mono"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Importar Arquivo (.CSV / .TXT) ou Colar Planilha Inicial
                </label>
                <label className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3 text-[#0b5796]" />
                  <span>Carregar .CSV / .TXT</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const txt = String(ev.target?.result || '');
                        setNewCatInitialItemsText(txt);
                        if (!newCatTitle.trim()) {
                          setNewCatTitle(file.name.replace(/\.(csv|txt|tsv)$/i, ''));
                        }
                      };
                      reader.readAsText(file, 'UTF-8');
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCatHasHeader}
                  onChange={e => setNewCatHasHeader(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>A 1ª linha dos dados colados contém os nomes das colunas</span>
              </label>

              <textarea
                rows={5}
                value={newCatInitialItemsText}
                onChange={e => setNewCatInitialItemsText(e.target.value)}
                placeholder="Cole aqui linhas do Excel ou CSV (opcional)..."
                className="form-input w-full font-mono text-xs bg-white p-2.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNewCategoryModalOpen(false)}
                className="btn-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary h-9 px-5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar e Disponibilizar Base</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: PLANILHA GLOBAL MULTI-BASES (IMPORTAÇÃO / EXPORTAÇÃO SIMULTÂNEA)
          ========================================================================= */}
      {multiBaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  Planilha Global Multi-Bases (Exportar Padrão ou Colar Várias Bases do Excel)
                </h3>
                <p className="text-xs text-slate-500">
                  Cada coluna da planilha corresponde a uma Base da Empresa pelo nome do cabeçalho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMultiBaseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const exported = tenantService.exportBulkTablePattern('all', 'csv', activeTenant.id);
                  const blob = new Blob(['\uFEFF' + exported.text], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `planilha_padrao_bases_${activeTenant.slug}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  showNotice('success', 'Planilha padrão CSV baixada com todas as bases.');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Planilha Padrão (.CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const exported = tenantService.exportBulkTablePattern('all', 'tsv', activeTenant.id);
                  navigator.clipboard?.writeText(exported.text);
                  showNotice('success', 'Planilha padrão copiada! Cole no Excel (Ctrl+V).');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Todas as Bases para Excel</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={bulkPastedText}
              onChange={e => setBulkPastedText(e.target.value)}
              placeholder="Cole aqui a tabela copiada do Excel contendo os cabeçalhos das bases na primeira linha..."
              className="form-input w-full font-mono text-xs bg-slate-50 p-3"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMultiBaseModalOpen(false)}
                className="btn-secondary h-9 px-4 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const analysis = tenantService.analyzePastedBulkTable(
                    bulkPastedText,
                    activeTenant.id
                  );
                  if (analysis.recognizedColumns.length === 0) {
                    showNotice(
                      'error',
                      'Nenhuma base reconhecida na primeira linha. Verifique os cabeçalhos das colunas.'
                    );
                    return;
                  }
                  const res = tenantService.applyBulkTableImport(
                    analysis,
                    'replace',
                    activeTenant.id
                  );
                  setBulkPastedText('');
                  setMultiBaseModalOpen(false);
                  refreshLocalState();
                  showNotice(
                    'success',
                    `Importação em lote concluída: ${res.addedCount} novo(s) e ${res.replacedCount} atualizado(s) em ${res.affectedCategoriesCount} base(s).`
                  );
                }}
                className="btn-primary h-9 px-5 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Importar Colunas Reconhecidas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesTenantView;
