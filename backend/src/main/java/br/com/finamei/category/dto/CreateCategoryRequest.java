package br.com.finamei.category.dto;

import br.com.finamei.transaction.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(

        @NotBlank(message = "Informe o nome da categoria.")
        @Size(max = 60, message = "O nome deve ter no máximo 60 caracteres.")
        String name,

        @NotNull(message = "Informe se a categoria é de receita ou de despesa.")
        TransactionType type) {}
