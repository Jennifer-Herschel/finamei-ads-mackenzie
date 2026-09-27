package br.com.finamei.shared.error;

import java.time.OffsetDateTime;
import java.util.Map;

public record ErrorResponse(String code, String message, Map<String, String> fieldErrors, OffsetDateTime timestamp) {

	public static ErrorResponse de(String code, String message) {
		return new ErrorResponse(code, message, Map.of(), OffsetDateTime.now());
	}

	public static ErrorResponse deValidacao(String message, Map<String, String> fieldErrors) {
		return new ErrorResponse("VALIDATION_ERROR", message, fieldErrors, OffsetDateTime.now());
	}
}
