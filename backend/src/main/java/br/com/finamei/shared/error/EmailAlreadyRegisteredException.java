package br.com.finamei.shared.error;

public class EmailAlreadyRegisteredException extends RuntimeException {

	public EmailAlreadyRegisteredException() {
		super("O e-mail informado já está cadastrado.");
	}
}
