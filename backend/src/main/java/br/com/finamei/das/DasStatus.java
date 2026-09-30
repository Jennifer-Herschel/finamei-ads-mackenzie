package br.com.finamei.das;

public enum DasStatus {
	PENDING,
	/** Not paid and past the due date (RN05). */
	OVERDUE,
	PAID
}
