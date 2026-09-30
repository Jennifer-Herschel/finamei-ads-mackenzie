package br.com.finamei.shared.error;

public class CategoryAlreadyExistsException extends RuntimeException {

	public CategoryAlreadyExistsException() {
		super("Já existe uma categoria com esse nome. Escolha outro nome.");
	}
}
