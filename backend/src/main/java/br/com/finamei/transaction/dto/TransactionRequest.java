package br.com.finamei.transaction.dto;

import br.com.finamei.transaction.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Cadastro ou edição de receita (OF05, OF06) ou despesa (OF07, OF08), com as regras da RN06. A data
 * não futura e a categoria ativa são validadas no serviço.
 */
public record TransactionRequest(

        @NotNull(message = "Informe se é uma receita ou uma despesa.")
        TransactionType type,

        @NotNull(message = "Informe o valor.")
        @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero.")
        @Digits(integer = 10, fraction = 2, message = "O valor deve ter no máximo duas casas decimais.")
        BigDecimal amount,

        @NotNull(message = "Informe a data.")
        LocalDate date,

        @NotNull(message = "Selecione uma categoria.")
        UUID categoryId,

        @NotBlank(message = "Informe a descrição.")
        @Size(max = 120, message = "A descrição deve ter no máximo 120 caracteres.")
        String description) {}
