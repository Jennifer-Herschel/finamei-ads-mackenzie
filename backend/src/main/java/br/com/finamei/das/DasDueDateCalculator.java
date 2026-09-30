package br.com.finamei.das;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.YearMonth;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * RN05: the DAS of a month is due on the 20th of the following month; when it
 * falls on a weekend or holiday, it moves to the next business day.
 */
@Component
public class DasDueDateCalculator {

	private static final int DUE_DAY = 20;

	/**
	 * Fixed national holidays, with no external calendar (docs/tech-stack.md).
	 * Movable holidays (Carnival, Good Friday, Corpus Christi) are not considered.
	 */
	private static final Set<MonthDay> NATIONAL_HOLIDAYS = Set.of(
			MonthDay.of(1, 1),
			MonthDay.of(4, 21),
			MonthDay.of(5, 1),
			MonthDay.of(9, 7),
			MonthDay.of(10, 12),
			MonthDay.of(11, 2),
			MonthDay.of(11, 15),
			MonthDay.of(11, 20),
			MonthDay.of(12, 25));

	public LocalDate dueDateOf(YearMonth competence) {
		LocalDate dueDate = competence.plusMonths(1).atDay(DUE_DAY);
		while (!isBusinessDay(dueDate)) {
			dueDate = dueDate.plusDays(1);
		}
		return dueDate;
	}

	private boolean isBusinessDay(LocalDate date) {
		DayOfWeek day = date.getDayOfWeek();
		return day != DayOfWeek.SATURDAY
				&& day != DayOfWeek.SUNDAY
				&& !NATIONAL_HOLIDAYS.contains(MonthDay.from(date));
	}
}
