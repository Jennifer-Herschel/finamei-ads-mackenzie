package br.com.finamei.revenue;

/** Faixa de consumo do limite anual do MEI (RN02 a RN04). */
public enum RevenueBand {
    NORMAL,
    ATTENTION,
    CRITICAL,
    EXCEEDED
}