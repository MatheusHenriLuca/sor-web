// ============================================================================
// Catálogo Padronizado de Modos de Falha e Defeitos - Gestamp Brasil
// Espelha Choices([@'Resumo dos Incidentes de qualidade'].classificacao_ocorrencia)
// ============================================================================

export const MODOS_FALHA_LIST = [
  'Falta / Excesso de Material',
  'Deformação',
  'Trinca (Produto)',
  'Contaminação / Respingos / Oxidação',
  'Marcas na Superfície',
  'Falta de Furação',
  'Rebarbas',
  'Solda Fora do Especificado',
  'Peças Misturadas',
  'Solda Fora de Posição',
  'Falta de Componente (V to V)',
  'V to V Deslocado / Fora de Posição',
  'V to V Fora do Especificado',
  'Falta de Componente (Produto)',
  'Produto Deslocado / Fora de Posição',
  'Falta de Operação',
  'Processos Terceiros',
  'Dimensional Fora do Especificado',
  'Peças Juntas',
  'Ruído',
  'Falta de Sealer',
  'Excesso de Sealer',
  'Múltiplo Incorreto',
  'Falta de Identificação',
  'Identificação Invertida',
  'Embalagem Danificada',
  'Embalagem Incorreta',
  'Falha Poka Yoke',
  'Gota Fria',
  'Falta de Solda'
] as const;

export const ACOES_CONTENCAO_LIST = [
  'Seleção 100% Lote Segregado',
  'Inspeção 100% no Posto de Trabalho',
  'Retrabalhar'
] as const;

export const IMPACTOS_CLIENTE_LIST = [
  'Parada de Linha (Montadora)',
  'Rejeição no Recebimento (Doca / Pátio)',
  'Alerta de Qualidade Oficial Emitido',
  'Retrabalho na Montadora',
  'Desvio Temporário Concedido',
  'Sem Impacto na Linha do Cliente'
] as const;

export const GRAVIDADE_LIST = [
  'Leve',
  'Média',
  'Grave',
  'Crítica'
] as const;
