package br.com.finamei.category.dto;

import jakarta.validation.constraints.NotNull;

/** Ativa ou inativa a categoria. Categorias nunca são excluídas (RN07). */
public record UpdateCategoryStatusRequest(

        @NotNull(message = "Informe se a categoria deve ficar ativa.")
        Boolean active) {}
