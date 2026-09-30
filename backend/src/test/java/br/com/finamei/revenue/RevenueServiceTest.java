package br.com.finamei.revenue;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import br.com.finamei.transaction.TransactionRepository;
import br.com.finamei.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RevenueServiceTest {

    private static final int YEAR = 2026;
    private static final LocalDate START = LocalDate.of(YEAR, 1, 1);
    private static final LocalDate END = LocalDate.of(YEAR, 12, 31);

    @Mock
    private TransactionRepository transactionRepository;

    private RevenueService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // Limite 81.000,00 | atenção a partir de 80% (64.800,00) | crítica a partir de 90% (72.900,00) | excedida a partir de 100%
        RevenueProperties properties = new RevenueProperties(
                new BigDecimal("81000.00"), new BigDecimal("80"), new BigDecimal("90"));
        service = new RevenueService(transactionRepository, properties);
    }

    @ParameterizedTest(name = "acumulado {0} -> faixa {1}")
    @CsvSource({
        "0.00, NORMAL",
        "64799.99, NORMAL",
        "64800.00, ATTENTION",
        "72899.99, ATTENTION",
        "72900.00, CRITICAL",
        "80999.99, CRITICAL",
        "81000.00, EXCEEDED",
        "81000.01, EXCEEDED"
    })
    @DisplayName("classifica a faixa respeitando as fronteiras de cada limite")
    void deveClassificarFaixaNasFronteiras(BigDecimal acumulado, RevenueBand faixaEsperada) {
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(acumulado);

        RevenueSummaryResponse resposta = service.getAnnualSummary(userId, YEAR);

        assertEquals(faixaEsperada, resposta.band());
        assertEquals(acumulado, resposta.accumulatedAmount());
        assertEquals(new BigDecimal("81000.00"), resposta.annualLimit());
    }

    @Test
    @DisplayName("calcula o percentual do limite com duas casas decimais")
    void deveCalcularPercentualDoLimite() {
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(new BigDecimal("40500.00"));

        RevenueSummaryResponse resposta = service.getAnnualSummary(userId, YEAR);

        assertEquals(new BigDecimal("50.00"), resposta.percentage());
    }

    @Test
    @DisplayName("sem receitas no ano, o acumulado é zero e a faixa é normal")
    void deveRetornarZeroQuandoNaoHaReceitas() {
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(null);

        RevenueSummaryResponse resposta = service.getAnnualSummary(userId, YEAR);

        assertEquals(BigDecimal.ZERO, resposta.accumulatedAmount());
        assertEquals(RevenueBand.NORMAL, resposta.band());
    }

    @Test
    @DisplayName("somente receitas do usuário autenticado entram no faturamento; despesas ficam de fora")
    void deveConsultarApenasReceitasDoUsuario() {
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(new BigDecimal("1000.00"));

        service.getAnnualSummary(userId, YEAR);

        verify(transactionRepository).sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END);
        verifyNoMoreInteractions(transactionRepository);
    }
}
