package br.com.finamei.das.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record PayDasRequest(

		@NotNull(message = "Informe a data do pagamento.")
		LocalDate paidAt) {
}
