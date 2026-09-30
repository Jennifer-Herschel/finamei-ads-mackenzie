package br.com.finamei.revenue;

import java.math.BigDecimal;

/**
 * Faturamento acumulado do ano em relação ao limite do MEI (GET /api/v1/revenue/summary).
 *
 * @param accumulated receitas do ano-calendário; despesas não entram (RN03, RN04)
 * @param limit limite anual vigente, já proporcional quando for o caso (RN01)
 * @param percentage percentual do limite atingido, com duas casas decimais
 * @param proportionalLimit indica que o MEI foi aberto no ano e o limite é proporcional (RN01)
 * @param activeMonths meses de atividade usados no limite proporcional, ou {@code null}
 */
public record RevenueSummaryResponse(
        int year,
        BigDecimal accumulated,
        BigDecimal limit,
        BigDecimal percentage,
        RevenueBand band,
        boolean proportionalLimit,
        Integer activeMonths) {}
