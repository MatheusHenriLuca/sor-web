// ============================================================================
// Catálogo Padronizado de Modos de Falha e Defeitos - Gestamp Brasil
// Espelha Choices([@'Resumo dos Incidentes de qualidade'].classificacao_ocorrencia)
// ============================================================================

export const MODOS_FALHA_LIST = [
  'Trinca / Fissura',
  'Deformação / Amassado',
  'Falta de Solda / Ponto Desprendido',
  'Rebarba / Aresta Cortante',
  'Porosidade / Mordedura',
  'Furação Fora de Posição',
  'Dimensional Fora de Especificação',
  'Riscos / Marcas de Ferramental',
  'Falta de Componente / Elemento',
  'Material Incorreto / Mistura de Peças',
  'Oxidação / Corrosão / Manchas',
  'Respingo de Solda Excessivo',
  'Outros / Desvio de Processo'
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
