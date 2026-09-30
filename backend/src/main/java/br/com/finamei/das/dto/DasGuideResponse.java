package br.com.finamei.das.dto;

import br.com.finamei.das.DasGuide;
import br.com.finamei.das.DasStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;

/**
 * @param competence month the guide refers to, serialized as "YYYY-MM"
 * @param status situation on the given day; OVERDUE when not paid after the due date (RN05)
 */
public record DasGuideResponse(
		UUID id,
		YearMonth competence,
		LocalDate dueDate,
		BigDecimal amount,
		DasStatus status,
		LocalDate paidAt) {

	public static DasGuideResponse from(DasGuide guide, LocalDate today) {
		return new DasGuideResponse(
				guide.getId(),
				guide.getCompetence(),
				guide.getDueDate(),
				guide.getAmount(),
				guide.statusOn(today),
				guide.getPaidAt());
	}
}
