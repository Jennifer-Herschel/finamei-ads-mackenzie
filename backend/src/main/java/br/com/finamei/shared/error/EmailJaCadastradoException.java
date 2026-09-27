package br.com.finamei.shared.error;

public class EmailJaCadastradoException extends RuntimeException {

	public EmailJaCadastradoException() {
		super("O e-mail informado já está cadastrado.");
	}
}
