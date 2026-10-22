import React, { useState, useMemo } from 'react';
import {
  Palette,
  Upload,
  Check,
  Plus,
  Trash2,
  HardDrive,
  Users,
  Sliders,
  ListChecks,
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
  Search
} from 'lucide-react';
import {
  MasterDataItem,
  ActiveScreen,
  UsuarioQualidade,
  FormFieldConfig,
  FormSectionId,
  FormFieldType,
  OptionCategoryMeta
} from '../types';
import { tenantService } from '../services/tenantService';

interface ConfiguracoesTenantViewProps {
  currentUser: UsuarioQualidade;
  onNavigate: (screen: ActiveScreen, params?: any) => void;
  onTenantUpdated?: () => void;
}

const BRAND_PRESET_COLORS = [
  { name: 'Azul Corporativo MH', hex: '#0b5796' },
  { name: 'Verde Esmeralda Lean', hex: '#0f766e' },
  { name: 'Índigo Engenharia', hex: '#3730a3' },
  { name: 'Ardósia Executivo', hex: '#1e293b' },
  { name: 'Carmesim Metalurgia', hex: '#9f1239' },
  { name: 'Âmbar Pesado', hex: '#b45309' }
];

const FORM_SECTIONS_META: { id: FormSectionId; label: string; shortLabel: string; description: string }[] = [
  {
    id: 'secao_1',
    label: '1. Dados Gerais & Montadora',
    shortLabel: 'Seção 1 · Dados Gerais',
    description: 'Cliente/Montadora, Tipo de Ocorrência, Data, Turno, Dados do Portal e Participantes.'
  },
  {
    id: 'secao_2',
    label: '2. Peça, Posto & FMDS (Autopreenchimento)',
    shortLabel: 'Seção 2 · Peça & Posto',
    description: 'Tipo de Peça Rastreada, Produto/Conjunto, Componente, Posto de Trabalho e Área FMDS.'
  },
  {
    id: 'secao_3',
    label: '3. Defeito, Quantidade & Rastreabilidade',
    shortLabel: 'Seção 3 · Defeito & Lote',
    description: 'Modo de Falha, Detalhamento Técnico, Quantidade Não Conforme e Rastreabilidade.'
  },
  {
    id: 'secao_4',
    label: '4. Evidência Fotográfica da Peça NG',
    shortLabel: 'Seção 4 · Foto NG',
    description: 'Evidência fotográfica da peça defeituosa no Relatório Inicial.'
  },
  {
    id: 'secao_5',
    label: '5. Contenção & Tratativa da Qualidade (5W2H)',
    shortLabel: 'Seção 5 · Contenção & 5W2H',
    description: 'Foto OK, Ações de Contenção, Recomendações, Gravidade, 5W2H e Abertura 8D.'
  }
];

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: 'Texto Curto',
  textarea: 'Texto Longo (Múltiplas Linhas)',
  number: 'Número / Quantidade',
  date: 'Data (Calendário)',
  select: 'Lista de Seleção Única (Opções)',
  multiselect: 'Múltipla Escolha (Chips / Opções)',
  yesno: 'Sim / Não',
  photo: 'Upload de Foto (WebP)'
};

export const ConfiguracoesTenantView: React.FC<ConfiguracoesTenantViewProps> = ({
  onNavigate,
  onTenantUpdated
}) => {
  const activeTenant = tenantService.getActiveTenant();

  // Três grandes áreas: 1) Campos do Formulário, 2) Listas de Opções (Usadas e Não Usadas no Form), 3) Identidade Visual
  const [mainSection, setMainSection] = useState<'form_builder' | 'options_manager' | 'whitelabel'>('form_builder');

  // Estado White-Label
  const [nomeExibicao, setNomeExibicao] = useState(
    activeTenant.customizacao.nome_exibicao || activeTenant.nome
  );
  const [subtituloRelatorio, setSubtituloRelatorio] = useState(
    activeTenant.customizacao.subtitulo_relatorio || ''
  );
  const [corPrimaria, setCorPrimaria] = useState(activeTenant.customizacao.cor_primaria || '#0b5796');
  const [logoUrl, setLogoUrl] = useState(activeTenant.customizacao.logo_url || '');
  const [cnpjContato, setCnpjContato] = useState(activeTenant.cnpj_contato || '');

  // Estado Gerenciador de Opções (Todas as Categorias)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'form' | 'non_form'>('all');
  const [selectedOptionCategory, setSelectedOptionCategory] = useState<string>('cliente_montadora');
  const [optionSearch, setOptionSearch] = useState('');

  // Campos para Incluir ou Editar item de Opção
  const [editingOptionItem, setEditingOptionItem] = useState<MasterDataItem | null>(null);
  const [novoNomeMestre, setNovoNomeMestre] = useState('');
  const [novoCodigoMestre, setNovoCodigoMestre] = useState('');
  const [novoDetalheMestre, setNovoDetalheMestre] = useState('');

  // Modal de Criar Nova Lista de Opções
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatUsedInForm, setNewCatUsedInForm] = useState(false);
  const [newCatFormTarget, setNewCatFormTarget] = useState('');

  // Estado Construtor do Formulário
  const [selectedFormSection, setSelectedFormSection] = useState<FormSectionId | 'all'>('secao_1');
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldConfig | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldHelperText, setFieldHelperText] = useState('');
  const [fieldSection, setFieldSection] = useState<FormSectionId>('secao_1');
  const [fieldType, setFieldType] = useState<FormFieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldVisible, setFieldVisible] = useState(true);
  const [fieldColSpan, setFieldColSpan] = useState<1 | 2 | 3 | 4>(1);
  const [fieldOrderInput, setFieldOrderInput] = useState<number>(1);
  const [fieldOptionCategory, setFieldOptionCategory] = useState<string>('');
  const [fieldCustomOptionsText, setFieldCustomOptionsText] = useState<string>('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
    if (onTenantUpdated) onTenantUpdated();
  };

  // Dados carregados do tenantService
  const allOptionCategories = useMemo(
    () => tenantService.getOptionCategories(activeTenant.id),
    [activeTenant.id, refreshKey]
  );

  const filteredOptionCategories = useMemo(() => {
    if (selectedCategoryFilter === 'form') return allOptionCategories.filter(c => c.usedInForm);
    if (selectedCategoryFilter === 'non_form') return allOptionCategories.filter(c => !c.usedInForm);
    return allOptionCategories;
  }, [allOptionCategories, selectedCategoryFilter]);

  const currentCategoryMeta: OptionCategoryMeta | undefined = useMemo(
    () => allOptionCategories.find(c => c.id === selectedOptionCategory) || allOptionCategories[0],
    [allOptionCategories, selectedOptionCategory]
  );

  const masterItems = useMemo(() => {
    if (!currentCategoryMeta) return [];
    const list = tenantService.getMasterData(currentCategoryMeta.id, activeTenant.id);
    if (!optionSearch.trim()) return list;
    const q = optionSearch.toLowerCase();
    return list.filter(
      item =>
        item.nome.toLowerCase().includes(q) ||
        (item.codigo || '').toLowerCase().includes(q) ||
        (item.detalhe || '').toLowerCase().includes(q)
    );
  }, [currentCategoryMeta, activeTenant.id, optionSearch, refreshKey]);

  const allFormFields = useMemo(
    () => tenantService.getFormFields(activeTenant.id, true),
    [activeTenant.id, refreshKey]
  );

  const activeFormFields = useMemo(
    () => allFormFields.filter(f => !f.deleted),
    [allFormFields]
  );

  const deletedFormFields = useMemo(
    () => allFormFields.filter(f => f.deleted),
    [allFormFields]
  );

  // Handlers White-Label
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const processed = await tenantService.processAndStoreImage(file, {
      rncId: 'branding',
      slot: 'logo'
    });

    if (processed.success && processed.result) {
      setLogoUrl(processed.result.dataUrl);
      notify(
        `Logotipo convertido para WebP (${processed.result.compressedSizeKB} KB • redução de ${processed.result.reductionPercent}%)!`
      );
    } else {
      notify(processed.message);
    }
  };

  const handleSaveWhiteLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const res = tenantService.updateTenant(activeTenant.id, {
      cnpj_contato: cnpjContato,
      customizacao: {
        logo_url: logoUrl,
        cor_primaria: corPrimaria,
        nome_exibicao: nomeExibicao,
        subtitulo_relatorio: subtituloRelatorio
      }
    });
    triggerRefresh();
    notify(res.message);
  };

  // Handlers Gerenciador de Opções (Incluir, Editar, Excluir)
  const handleSaveMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategoryMeta || !novoNomeMestre.trim()) return;

    if (editingOptionItem) {
      tenantService.saveMasterDataItem({
        id: editingOptionItem.id,
        tenant_id: activeTenant.id,
        tipo: currentCategoryMeta.id,
        nome: novoNomeMestre.trim(),
        codigo: novoCodigoMestre.trim(),
        detalhe: novoDetalheMestre.trim(),
        ativo: editingOptionItem.ativo
      });
      setEditingOptionItem(null);
      notify(`Opção "${novoNomeMestre.trim()}" atualizada com sucesso!`);
    } else {
      tenantService.saveMasterDataItem({
        tenant_id: activeTenant.id,
        tipo: currentCategoryMeta.id,
        nome: novoNomeMestre.trim(),
        codigo: novoCodigoMestre.trim(),
        detalhe: novoDetalheMestre.trim(),
        ativo: true
      });
      notify(`Nova opção "${novoNomeMestre.trim()}" incluída em "${currentCategoryMeta.title}"!`);
    }

    setNovoNomeMestre('');
    setNovoCodigoMestre('');
    setNovoDetalheMestre('');
    triggerRefresh();
  };

  const handleStartEditOption = (item: MasterDataItem) => {
    setEditingOptionItem(item);
    setNovoNomeMestre(item.nome);
    setNovoCodigoMestre(item.codigo || '');
    setNovoDetalheMestre(item.detalhe || '');
  };

  const handleCancelEditOption = () => {
    setEditingOptionItem(null);
    setNovoNomeMestre('');
    setNovoCodigoMestre('');
    setNovoDetalheMestre('');
  };

  const handleToggleMasterAtivo = (item: MasterDataItem) => {
    tenantService.saveMasterDataItem({
      ...item,
      ativo: !item.ativo
    });
    triggerRefresh();
    notify(`Opção "${item.nome}" marcada como ${!item.ativo ? 'Ativa' : 'Inativa'}.`);
  };

  const handleDeleteMaster = (item: MasterDataItem) => {
    tenantService.deleteMasterDataItem(item.id);
    if (editingOptionItem?.id === item.id) {
      handleCancelEditOption();
    }
    triggerRefresh();
    notify(`Opção "${item.nome}" excluída da lista "${currentCategoryMeta?.title}".`);
  };

  const handleCreateOptionCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) return;
    const created = tenantService.saveOptionCategory({
      tenant_id: activeTenant.id,
      title: newCatTitle.trim(),
      description: newCatDesc.trim() || 'Lista personalizada de opções criada pelo administrador da empresa.',
      usedInForm: newCatUsedInForm,
      formFieldTarget: newCatFormTarget.trim() || (newCatUsedInForm ? 'Campo Personalizado do Formulário' : 'Uso Geral / Fora do Formulário')
    });
    setNewCategoryModalOpen(false);
    setNewCatTitle('');
    setNewCatDesc('');
    setNewCatUsedInForm(false);
    setNewCatFormTarget('');
    setSelectedOptionCategory(created.id);
    triggerRefresh();
    notify(`Nova lista de opções "${created.title}" criada com sucesso!`);
  };

  // Handlers Construtor de Campos do Formulário
  const handleOpenCreateFieldModal = (defaultSection?: FormSectionId) => {
    const targetSec: FormSectionId =
      defaultSection || (selectedFormSection === 'all' ? 'secao_1' : selectedFormSection);
    const secFields = activeFormFields.filter(f => f.section === targetSec);
    setEditingField(null);
    setFieldLabel('');
    setFieldPlaceholder('');
    setFieldHelperText('');
    setFieldSection(targetSec);
    setFieldType('text');
    setFieldRequired(false);
    setFieldVisible(true);
    setFieldColSpan(1);
    setFieldOrderInput(secFields.length + 1);
    setFieldOptionCategory('');
    setFieldCustomOptionsText('');
    setFieldModalOpen(true);
  };

  const handleOpenEditFieldModal = (field: FormFieldConfig) => {
    setEditingField(field);
    setFieldLabel(field.label);
    setFieldPlaceholder(field.placeholder || '');
    setFieldHelperText(field.helperText || '');
    setFieldSection(field.section);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldVisible(field.visible);
    setFieldColSpan(field.colSpan || 1);
    setFieldOrderInput(field.order);
    setFieldOptionCategory(field.optionCategory || '');
    setFieldCustomOptionsText((field.customOptions || []).join(', '));
    setFieldModalOpen(true);
  };

  const handleSaveFieldModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return;

    const customOptionsList = fieldCustomOptionsText
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const saved = tenantService.saveFormField({
      id: editingField?.id,
      tenant_id: activeTenant.id,
      fieldKey: editingField?.fieldKey,
      label: fieldLabel.trim(),
      placeholder: fieldPlaceholder.trim(),
      helperText: fieldHelperText.trim(),
      section: fieldSection,
      type: fieldType,
      required: fieldRequired,
      visible: fieldVisible,
      order: Math.max(1, Number(fieldOrderInput) || 1),
      isSystem: editingField?.isSystem ?? false,
      optionCategory: fieldOptionCategory || undefined,
      customOptions: customOptionsList.length > 0 ? customOptionsList : undefined,
      colSpan: fieldColSpan
    });

    // Ajusta a sequência caso o admin tenha alterado o número de ordem
    if (fieldOrderInput && fieldOrderInput >= 1) {
      tenantService.setFormFieldSequenceNumber(saved.id, Number(fieldOrderInput), activeTenant.id);
    }

    setFieldModalOpen(false);
    triggerRefresh();
    notify(
      editingField
        ? `Campo "${saved.label}" atualizado com sucesso!`
        : `Novo campo "${saved.label}" adicionado ao formulário!`
    );
  };

  const handleToggleVisibility = (field: FormFieldConfig) => {
    tenantService.toggleFormFieldVisibility(field.id, activeTenant.id);
    triggerRefresh();
    notify(`Campo "${field.label}" agora está ${!field.visible ? 'VISÍVEL' : 'OCULTO'} no formulário.`);
  };

  const handleToggleRequired = (field: FormFieldConfig) => {
    tenantService.toggleFormFieldRequired(field.id, activeTenant.id);
    triggerRefresh();
    notify(`Campo "${field.label}" definido como ${!field.required ? 'Obrigatório (*)' : 'Opcional'}.`);
  };

  const handleMoveField = (field: FormFieldConfig, dir: 'up' | 'down') => {
    tenantService.moveFormFieldOrder(field.id, dir, activeTenant.id);
    triggerRefresh();
  };

  const handleChangeSequenceDirect = (field: FormFieldConfig, newSeq: number) => {
    if (!newSeq || isNaN(newSeq) || newSeq < 1) return;
    tenantService.setFormFieldSequenceNumber(field.id, newSeq, activeTenant.id);
    triggerRefresh();
    notify(`Sequência do campo "${field.label}" alterada para #${newSeq}.`);
  };

  const handleDeleteField = (field: FormFieldConfig) => {
    tenantService.deleteFormField(field.id, activeTenant.id);
    triggerRefresh();
    notify(
      field.isSystem
        ? `Campo "${field.label}" excluído do formulário (disponível para restauração abaixo).`
        : `Campo personalizado "${field.label}" excluído permanentemente.`
    );
  };

  const handleRestoreField = (field: FormFieldConfig) => {
    tenantService.restoreFormField(field.id, activeTenant.id);
    triggerRefresh();
    notify(`Campo "${field.label}" restaurado ao formulário!`);
  };

  const handleResetAllFields = () => {
    tenantService.resetFormFieldsToDefault(activeTenant.id);
    triggerRefresh();
    notify('Todos os campos e sequências do formulário foram restaurados ao padrão original!');
  };

  const storagePercent = Math.min(
    100,
    Math.round((activeTenant.limites.storage_usado_mb / activeTenant.limites.max_storage_mb) * 100)
  );
  const tenantUsersCount = tenantService.getUsersForTenant(activeTenant.id).length;

  const sectionsToRender =
    selectedFormSection === 'all'
      ? FORM_SECTIONS_META
      : FORM_SECTIONS_META.filter(s => s.id === selectedFormSection);

  return (
    <div className="space-y-6 pb-16">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div>
          <div className="text-xs font-mono text-slate-500">
            /{activeTenant.slug}/configuracoes · Painel do Administrador da Empresa ({activeTenant.nome})
          </div>
          <h1 className="text-xl font-display font-bold text-slate-900 tracking-tight mt-0.5">
            Controle de Campos do Formulário, Opções do Sistema &amp; Marca — {activeTenant.nome}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Adicione, edite, oculte, exclua ou mude a sequência de qualquer campo do formulário e gerencie todas as listas de opções do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('registro-8d', { edicao: false })}
            className="btn-secondary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-[#0b5796]" />
            <span>Ver Formulário RNC</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cadastro-usuarios')}
            className="btn-secondary h-9 px-3.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Equipe ({tenantUsersCount}/{activeTenant.limites.max_usuarios})</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button type="button" onClick={() => setToastMsg(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Abas Principais de Administração */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/75 rounded-xl">
        <button
          type="button"
          onClick={() => setMainSection('form_builder')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            mainSection === 'form_builder'
              ? 'bg-white text-[#0b5796] shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>1. Campos e Sequência do Formulário ({activeFormFields.length} campos)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainSection('options_manager')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            mainSection === 'options_manager'
              ? 'bg-white text-[#0b5796] shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>2. Listas e Campos de Opções ({allOptionCategories.length} listas)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainSection('whitelabel')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            mainSection === 'whitelabel'
              ? 'bg-white text-[#0b5796] shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>3. Identidade Visual (White-Label)</span>
        </button>
      </div>

      {/* =========================================================================
          ABA 1: CONSTRUTOR DE CAMPOS E SEQUÊNCIA DO FORMULÁRIO RNC
          ========================================================================= */}
      {mainSection === 'form_builder' && (
        <div className="space-y-5">
          {/* Barra de Controle Superior do Construtor */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedFormSection('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  selectedFormSection === 'all'
                    ? 'bg-[#0b5796] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todas as Seções ({activeFormFields.length})
              </button>
              {FORM_SECTIONS_META.map(sec => {
                const count = activeFormFields.filter(f => f.section === sec.id).length;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedFormSection(sec.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      selectedFormSection === sec.id
                        ? 'bg-[#0b5796] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {sec.shortLabel} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetAllFields}
                className="btn-secondary h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                title="Restaurar todos os campos padrão e ordem de fábrica"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenCreateFieldModal()}
                className="btn-primary h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Criar Novo Campo</span>
              </button>
            </div>
          </div>

          {/* Lista de Seções e Campos */}
          {sectionsToRender.map(sec => {
            const fieldsInSec = activeFormFields
              .filter(f => f.section === sec.id)
              .sort((a, b) => a.order - b.order);

            return (
              <div key={sec.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-display font-bold text-slate-900">{sec.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{sec.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateFieldModal(sec.id)}
                    className="btn-secondary h-8 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0b5796]" />
                    <span>Adicionar Campo nesta Seção</span>
                  </button>
                </div>

                {fieldsInSec.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Nenhum campo ativo nesta seção. Clique em "Adicionar Campo nesta Seção" para criar.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-semibold text-slate-600">
                          <th className="py-2.5 px-4 w-32">Sequência</th>
                          <th className="py-2.5 px-4">Nome do Campo (Rótulo)</th>
                          <th className="py-2.5 px-4">Tipo &amp; Lista de Opções</th>
                          <th className="py-2.5 px-4">Obrigatório</th>
                          <th className="py-2.5 px-4">Visibilidade</th>
                          <th className="py-2.5 px-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {fieldsInSec.map((field, idx) => {
                          const linkedCat = field.optionCategory
                            ? allOptionCategories.find(c => c.id === field.optionCategory)
                            : undefined;

                          return (
                            <tr
                              key={field.id}
                              className={`transition-colors ${
                                !field.visible ? 'bg-slate-50/80 text-slate-400' : 'hover:bg-slate-50/70'
                              }`}
                            >
                              {/* Controle de Sequência (Setas + Número Direto) */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={fieldsInSec.length}
                                    value={field.order}
                                    onChange={e =>
                                      handleChangeSequenceDirect(field, parseInt(e.target.value, 10))
                                    }
                                    className="w-12 h-7 px-1.5 text-center font-mono font-bold text-xs rounded border border-slate-300 bg-white text-slate-900"
                                    title="Digite a posição na sequência"
                                  />
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveField(field, 'up')}
                                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                    title="Subir na sequência"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5 text-slate-700" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === fieldsInSec.length - 1}
                                    onClick={() => handleMoveField(field, 'down')}
                                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                                    title="Descer na sequência"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5 text-slate-700" />
                                  </button>
                                </div>
                              </td>

                              {/* Nome do Campo */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-bold ${
                                      field.visible ? 'text-slate-900' : 'text-slate-400 line-through'
                                    }`}
                                  >
                                    {field.label}
                                  </span>
                                  {!field.isSystem && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Campo Novo
                                    </span>
                                  )}
                                </div>
                                {field.placeholder && (
                                  <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                    Placeholder: {field.placeholder}
                                  </div>
                                )}
                              </td>

                              {/* Tipo e Vínculo com Lista de Opções */}
                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-700">
                                  {FIELD_TYPE_LABELS[field.type] || field.type}
                                </div>
                                {linkedCat && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOptionCategory(linkedCat.id);
                                      setMainSection('options_manager');
                                    }}
                                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0b5796] hover:underline cursor-pointer"
                                  >
                                    <ListChecks className="w-3 h-3" />
                                    <span>Editar Opções: {linkedCat.title}</span>
                                  </button>
                                )}
                                {!linkedCat && field.customOptions && field.customOptions.length > 0 && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Opções: {field.customOptions.join(', ')}
                                  </div>
                                )}
                              </td>

                              {/* Obrigatório / Opcional */}
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRequired(field)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
                                    field.required
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  {field.required ? 'Obrigatório *' : 'Opcional'}
                                </button>
                              </td>

                              {/* Ocultar / Exibir */}
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleToggleVisibility(field)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                                    field.visible
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-50 text-amber-900 border-amber-300'
                                  }`}
                                >
                                  {field.visible ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Visível</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Oculto</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Ações: Editar / Excluir */}
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditFieldModal(field)}
                                    className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b5796] hover:bg-blue-50 transition-colors cursor-pointer"
                                    title="Editar campo, nome, sequência ou opções"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteField(field)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Excluir campo do formulário"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Painel de Campos Excluídos para Restauração Rápida */}
          {deletedFormFields.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display font-bold text-amber-950">
                    Campos Excluídos do Formulário ({deletedFormFields.length})
                  </h3>
                  <p className="text-xs text-amber-800">
                    Você pode restaurar qualquer campo padrão excluído a qualquer momento com 1 clique.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {deletedFormFields.map(df => (
                  <div
                    key={df.id}
                    className="px-3 py-1.5 bg-white rounded-lg border border-amber-300 flex items-center gap-2 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{df.label}</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreField(df)}
                      className="text-[#0b5796] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restaurar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2: GERENCIADOR DE TODAS AS LISTAS DE OPÇÕES (USADAS E NÃO USADAS NO FORMULÁRIO)
          ========================================================================= */}
      {mainSection === 'options_manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Todas as Listas de Opções */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-display font-bold text-slate-900">
                  Listas de Opções do Sistema
                </h2>
                <p className="text-[11px] text-slate-500">
                  Inclua, edite ou exclua opções de qualquer lista
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewCategoryModalOpen(true)}
                className="btn-primary h-8 px-2.5 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Lista</span>
              </button>
            </div>

            {/* Filtro: Todas / Usadas no Formulário / Fora do Formulário */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`py-1.5 rounded-md cursor-pointer ${
                  selectedCategoryFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Todas ({allOptionCategories.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('form')}
                className={`py-1.5 rounded-md cursor-pointer ${
                  selectedCategoryFilter === 'form' ? 'bg-white text-[#0b5796] shadow-2xs' : 'text-slate-600'
                }`}
              >
                No Form ({allOptionCategories.filter(c => c.usedInForm).length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('non_form')}
                className={`py-1.5 rounded-md cursor-pointer ${
                  selectedCategoryFilter === 'non_form' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Outras ({allOptionCategories.filter(c => !c.usedInForm).length})
              </button>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredOptionCategories.map(cat => {
                const count = tenantService.getMasterData(cat.id, activeTenant.id).length;
                const isSelected = currentCategoryMeta?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedOptionCategory(cat.id);
                      handleCancelEditOption();
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-blue-50/70 border-[#0b5796] shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{cat.title}</span>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {count} opções
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          cat.usedInForm
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {cat.usedInForm ? 'Usado no Formulário' : 'Fora do Formulário / Auxiliar'}
                      </span>
                      {cat.formFieldTarget && (
                        <span className="text-[10px] text-slate-400 truncate">{cat.formFieldTarget}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Inclusão, Edição e Exclusão de Opções da Lista Selecionada */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
            {currentCategoryMeta && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-display font-bold text-slate-900">
                        {currentCategoryMeta.title}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          currentCategoryMeta.usedInForm
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {currentCategoryMeta.usedInForm
                          ? 'Campo do Formulário'
                          : 'Campo de Opções Auxiliar (Não Usado no Formulário)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{currentCategoryMeta.description}</p>
                  </div>

                  {!currentCategoryMeta.isSystem && (
                    <button
                      type="button"
                      onClick={() => {
                        tenantService.deleteOptionCategory(currentCategoryMeta.id, activeTenant.id);
                        setSelectedOptionCategory('cliente_montadora');
                        triggerRefresh();
                        notify(`Lista "${currentCategoryMeta.title}" excluída.`);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Lista</span>
                    </button>
                  )}
                </div>

                {/* Formulário de Incluir / Editar Opção */}
                <form
                  onSubmit={handleSaveMasterItem}
                  className={`p-4 rounded-xl border space-y-3 ${
                    editingOptionItem
                      ? 'bg-amber-50/60 border-amber-300'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {editingOptionItem
                        ? `Editando Opção: "${editingOptionItem.nome}"`
                        : `Incluir Nova Opção em ${currentCategoryMeta.title}`}
                    </span>
                    {editingOptionItem && (
                      <button
                        type="button"
                        onClick={handleCancelEditOption}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nome / Valor da Opção <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={novoNomeMestre}
                        onChange={e => setNovoNomeMestre(e.target.value)}
                        placeholder="Digite o nome da opção..."
                        className="form-input w-full text-xs bg-white"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Código / Sigla
                      </label>
                      <input
                        type="text"
                        value={novoCodigoMestre}
                        onChange={e => setNovoCodigoMestre(e.target.value)}
                        placeholder="Ex: COD-01"
                        className="form-input w-full text-xs font-mono bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Detalhe / Descrição
                      </label>
                      <input
                        type="text"
                        value={novoDetalheMestre}
                        onChange={e => setNovoDetalheMestre(e.target.value)}
                        placeholder="Opcional"
                        className="form-input w-full text-xs bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="btn-primary w-full h-9.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {editingOptionItem ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Salvar</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Incluir</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Barra de Pesquisa de Opções */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={optionSearch}
                      onChange={e => setOptionSearch(e.target.value)}
                      placeholder={`Pesquisar opção em ${currentCategoryMeta.title}...`}
                      className="form-input !pl-9 w-full text-xs"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {masterItems.length} registro(s)
                  </span>
                </div>

                {/* Tabela de Opções com Editar, Ativar/Inativar e Excluir */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-4">Opção / Descrição</th>
                        <th className="py-2.5 px-4">Código / Sigla</th>
                        <th className="py-2.5 px-4">Detalhe</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Ações (Editar / Excluir)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {masterItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            Nenhuma opção cadastrada nesta lista. Use o formulário acima para incluir.
                          </td>
                        </tr>
                      ) : (
                        masterItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-900">{item.nome}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{item.codigo || '—'}</td>
                            <td className="py-3 px-4 text-slate-600">{item.detalhe || '—'}</td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleMasterAtivo(item)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                                  item.ativo
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {item.ativo ? 'Ativo' : 'Inativo'}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditOption(item)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-[#0b5796] hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Editar esta opção"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMaster(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Excluir esta opção"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ABA 3: IDENTIDADE VISUAL (WHITE-LABEL)
          ========================================================================= */}
      {mainSection === 'whitelabel' && (
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
                    Cota de Armazenamento de Fotos (WebP)
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
                As evidências fotográficas (Peça OK, Peça NG e Auxiliar) são comprimidas automaticamente no navegador em Full HD WebP (~250 KB/foto), reduzindo 95% do uso de disco.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CRIAR OU EDITAR CAMPO DO FORMULÁRIO
          ========================================================================= */}
      {fieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFieldModal}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  {editingField ? `Editar Campo: ${editingField.label}` : 'Criar Novo Campo no Formulário'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure o nome, seção, sequência, obrigatoriedade e opções do campo.
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
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome / Rótulo do Campo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldLabel}
                  onChange={e => setFieldLabel(e.target.value)}
                  placeholder="Ex: Número do Lote Fornecedor, Nível de Criticidade, Auditor..."
                  className="form-input w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seção do Formulário
                </label>
                <select
                  value={fieldSection}
                  onChange={e => setFieldSection(e.target.value as FormSectionId)}
                  className="form-input w-full text-xs"
                >
                  {FORM_SECTIONS_META.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Campo
                </label>
                <select
                  value={fieldType}
                  onChange={e => setFieldType(e.target.value as FormFieldType)}
                  className="form-input w-full text-xs"
                >
                  {(Object.keys(FIELD_TYPE_LABELS) as FormFieldType[]).map(t => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Posição na Sequência (Ordem)
                </label>
                <input
                  type="number"
                  min={1}
                  value={fieldOrderInput}
                  onChange={e => setFieldOrderInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="form-input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Largura do Campo na Grade (Colunas)
                </label>
                <select
                  value={fieldColSpan}
                  onChange={e => setFieldColSpan(Number(e.target.value) as 1 | 2 | 3 | 4)}
                  className="form-input w-full text-xs"
                >
                  <option value={1}>1 Coluna (25% / Padrão)</option>
                  <option value={2}>2 Colunas (50% / Médio)</option>
                  <option value={3}>3 Colunas (75% / Largo)</option>
                  <option value={4}>4 Colunas (100% / Linha Inteira)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Texto de Exemplo (Placeholder)
                </label>
                <input
                  type="text"
                  value={fieldPlaceholder}
                  onChange={e => setFieldPlaceholder(e.target.value)}
                  placeholder="Ex: Digite ou selecione uma opção..."
                  className="form-input w-full text-xs"
                />
              </div>

              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vincular a uma Lista de Opções do Sistema (Opcional)
                    </label>
                    <select
                      value={fieldOptionCategory}
                      onChange={e => setFieldOptionCategory(e.target.value)}
                      className="form-input w-full text-xs"
                    >
                      <option value="">-- Usar opções manuais abaixo --</option>
                      {allOptionCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.title} ({cat.usedInForm ? 'Formulário' : 'Lista Auxiliar'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!fieldOptionCategory && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Opções do Campo (separadas por vírgula)
                      </label>
                      <input
                        type="text"
                        value={fieldCustomOptionsText}
                        onChange={e => setFieldCustomOptionsText(e.target.value)}
                        placeholder="Ex: Opção A, Opção B, Opção C"
                        className="form-input w-full text-xs"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
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
                <span>{editingField ? 'Salvar Alterações do Campo' : 'Adicionar Campo ao Formulário'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL: CRIAR NOVA LISTA DE OPÇÕES DO SISTEMA
          ========================================================================= */}
      {newCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOptionCategory}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900">
                  Criar Nova Lista de Opções
                </h3>
                <p className="text-xs text-slate-500">
                  Crie listas de opções para campos do formulário ou listas auxiliares do sistema.
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
                Nome da Lista de Opções <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newCatTitle}
                onChange={e => setNewCatTitle(e.target.value)}
                placeholder="Ex: Transportadoras, Motivos de Parada, Auditores..."
                className="form-input w-full text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição da Lista
              </label>
              <input
                type="text"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="Para que serve esta lista de opções..."
                className="form-input w-full text-xs"
              />
            </div>

            <div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCatUsedInForm}
                  onChange={e => setNewCatUsedInForm(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span>Esta lista é utilizada em um campo do formulário RNC</span>
              </label>
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
                className="btn-primary h-9 px-5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Lista de Opções</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ConfiguracoesTenantView;

