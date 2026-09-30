package br.com.finamei.revenue;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Parâmetros locais do faturamento (RN01) */
@ConfigurationProperties(prefix = "finamei.revenue")
public record RevenueProperties(
        BigDecimal annualLimit,
        BigDecimal attentionPercent,
        BigDecimal criticalPercent) {}