package br.com.finamei.das;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.YearMonth;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class DasDueDateCalculatorTest {

	private final DasDueDateCalculator calculadora = new DasDueDateCalculator();

	@ParameterizedTest(name = "competência {0} vence em {1}")
	@CsvSource({
		// Dia 20 do mês seguinte em dia útil
		"2026-01, 2026-02-20",
		"2026-07, 2026-08-20",
		// Dia 20 no sábado ou no domingo: próximo dia útil
		"2026-05, 2026-06-22",
		"2026-08, 2026-09-21",
		// 20/11 é feriado nacional (Consciência Negra)
		"2026-10, 2026-11-23",
		// Dezembro vence em janeiro do ano seguinte
		"2026-12, 2027-01-20",
		// 20/04/2025 foi domingo e 21/04 é Tiradentes: vence no dia 22
		"2025-03, 2025-04-22"
	})
	void deveVencerNoDia20DoMesSeguinteOuNoProximoDiaUtil(String competencia, String vencimentoEsperado) {
		assertThat(calculadora.dueDateOf(YearMonth.parse(competencia)))
				.isEqualTo(LocalDate.parse(vencimentoEsperado));
	}
}
