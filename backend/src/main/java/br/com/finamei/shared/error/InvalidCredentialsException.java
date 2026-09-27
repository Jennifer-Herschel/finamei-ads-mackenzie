package br.com.finamei.shared.error;

public class InvalidCredentialsException extends RuntimeException {

	public InvalidCredentialsException() {
		super("E-mail ou senha inválidos.");
	}
}
