package br.com.finamei.shared.error;

/**
 * The resource does not exist or belongs to another user. Both cases answer
 * 404, so a user cannot discover other users' resources (ONF05).
 */
public class ResourceNotFoundException extends RuntimeException {

	public ResourceNotFoundException(String message) {
		super(message);
	}
}
