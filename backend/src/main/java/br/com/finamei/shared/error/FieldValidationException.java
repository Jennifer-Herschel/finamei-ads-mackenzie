package br.com.finamei.shared.error;

/** Business validation of a single field, answered like a Bean Validation error (400). */
public class FieldValidationException extends RuntimeException {

	private final String field;

	public FieldValidationException(String field, String message) {
		super(message);
		this.field = field;
	}

	public String getField() {
		return field;
	}
}
