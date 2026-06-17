/**
 * Coeficiente único de conversão semanal -> mensal usado em TODO cálculo macro
 * mensal (renda semanal, compromisso recorrente semanal, serviço de dívida).
 * 52 semanas / 12 meses = 4.333...; arredondado para 4.33 por convenção do
 * produto. Ponto de verdade: qualquer fórmula `valor * semanas/mês` importa
 * daqui em vez de redeclarar a constante.
 *
 * Os engines de simulador (`hourly-rate`, `build-prescription`) usam `52 / 12`
 * exato e são isolados de propósito; não importam daqui para não mudar números
 * já validados nesses fluxos.
 */
export const WEEKS_PER_MONTH = 4.33;
