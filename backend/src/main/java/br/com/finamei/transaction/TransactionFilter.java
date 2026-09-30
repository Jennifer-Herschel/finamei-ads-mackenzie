package br.com.finamei.transaction;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Filtros da listagem de lançamentos (OF09). Campos nulos ou em branco não filtram.
 *
 * @param from data inicial, inclusive
 * @param to data final, inclusive
 * @param description trecho da descrição, sem diferenciar maiúsculas
 */
public record TransactionFilter(
        LocalDate from,
        LocalDate to,
        TransactionType type,
        UUID categoryId,
        String description) {}
