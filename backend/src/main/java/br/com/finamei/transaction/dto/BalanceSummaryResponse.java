package br.com.finamei.transaction.dto;

import java.math.BigDecimal;
import java.time.YearMonth;

/**
 * Resumo do painel (OF11). Despesas afetam o saldo, mas nunca o faturamento (RN04).
 *
 * @param month mês consultado, serializado como "YYYY-MM"
 * @param balance saldo atual: todas as receitas menos todas as despesas registradas
 * @param income receitas do mês
 * @param expense despesas do mês
 */
public record BalanceSummaryResponse(YearMonth month, BigDecimal balance, BigDecimal income, BigDecimal expense) {}
