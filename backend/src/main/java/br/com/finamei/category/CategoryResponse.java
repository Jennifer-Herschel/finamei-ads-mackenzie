package br.com.finamei.category;

import br.com.finamei.transaction.TransactionType;
import java.util.UUID;

public record CategoryResponse(UUID id, String name, TransactionType type, boolean active) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getType(), category.isActive());
    }
}
