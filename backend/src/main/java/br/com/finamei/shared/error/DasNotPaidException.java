package br.com.finamei.shared.error;

public class DasNotPaidException extends RuntimeException {

	public DasNotPaidException() {
		super("Esta guia do DAS já está pendente.");
	}
}
