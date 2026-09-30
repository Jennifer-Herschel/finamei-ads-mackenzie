package br.com.finamei.revenue;

import java.math.BigDecimal;

public record RevenueSummaryResponse(
        int year,
        BigDecimal accumulatedAmount,
        BigDecimal annualLimit,
        BigDecimal percentage,
        RevenueBand band) {}
