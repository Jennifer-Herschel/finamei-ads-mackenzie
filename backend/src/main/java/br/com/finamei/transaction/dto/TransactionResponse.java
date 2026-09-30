package br.com.finamei.transaction.dto;

import br.com.finamei.category.Category;
import br.com.finamei.transaction.Transaction;
import br.com.finamei.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        TransactionType type,
        BigDecimal amount,
        LocalDate date,
        String description,
        CategorySummary category) {

    public record CategorySummary(UUID id, String name) {}

    public static TransactionResponse from(Transaction transaction, Category category) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getTransactionDate(),
                transaction.getDescription(),
                new CategorySummary(category.getId(), category.getName()));
    }
}
