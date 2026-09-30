package br.com.finamei.shared.error;

public class DasAlreadyPaidException extends RuntimeException {

	public DasAlreadyPaidException() {
		super("Esta guia do DAS já está registrada como paga.");
	}
}
