package br.com.finamei.revenue;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import br.com.finamei.transaction.TransactionRepository;
import br.com.finamei.transaction.TransactionType;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import java.math.BigDecimal;
import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.Optional;
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

    @Mock
    private UserRepository userRepository;

    private RevenueService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // Limite 81.000,00 | atenção a partir de 80% (64.800,00) | crítica a partir de 90% (72.900,00) | excedida a partir de 100%
        RevenueProperties properties = new RevenueProperties(
                new BigDecimal("81000.00"), new BigDecimal("80"), new BigDecimal("90"));
        service = new RevenueService(transactionRepository, userRepository, properties);
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
        assertEquals(acumulado, resposta.accumulated());
        assertEquals(new BigDecimal("81000.00"), resposta.limit());
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

        assertEquals(BigDecimal.ZERO, resposta.accumulated());
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

    @Test
    @DisplayName("sem data de abertura no ano, usa o limite anual integral (RN01)")
    void deveUsarLimiteIntegralQuandoMeiNaoFoiAbertoNoAno() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(usuarioAbertoEm(LocalDate.of(2025, 5, 10))));
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(new BigDecimal("1000.00"));

        RevenueSummaryResponse resposta = service.getAnnualSummary(userId, YEAR);

        assertEquals(new BigDecimal("81000.00"), resposta.limit());
        assertFalse(resposta.proportionalLimit());
        assertNull(resposta.activeMonths());
    }

    @Test
    @DisplayName("MEI aberto no ano tem limite proporcional aos meses de atividade, contando o mês de abertura (RN01)")
    void deveCalcularLimiteProporcionalQuandoMeiFoiAbertoNoAno() throws Exception {
        // Aberto em setembro: setembro a dezembro = 4 meses -> 81.000 / 12 * 4 = 27.000
        when(userRepository.findById(userId)).thenReturn(Optional.of(usuarioAbertoEm(LocalDate.of(YEAR, 9, 15))));
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(new BigDecimal("24300.00"));

        RevenueSummaryResponse resposta = service.getAnnualSummary(userId, YEAR);

        assertEquals(new BigDecimal("27000.00"), resposta.limit());
        assertTrue(resposta.proportionalLimit());
        assertEquals(4, resposta.activeMonths());
        assertEquals(new BigDecimal("90.00"), resposta.percentage());
        assertEquals(RevenueBand.CRITICAL, resposta.band());
    }

    @Test
    @DisplayName("MEI aberto em janeiro tem os 12 meses de atividade")
    void deveConsiderarDozeMesesQuandoAbertoEmJaneiro() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(usuarioAbertoEm(LocalDate.of(YEAR, 1, 2))));
        when(transactionRepository.sumAmountByUserAndTypeAndPeriod(userId, TransactionType.INCOME, START, END))
                .thenReturn(BigDecimal.ZERO);

        RevenueSummaryResponse resposta = service.getAnnualSummary(userId, YEAR);

        assertEquals(new BigDecimal("81000.00"), resposta.limit());
        assertEquals(12, resposta.activeMonths());
    }

    private User usuarioAbertoEm(LocalDate dataDeAbertura) throws Exception {
        User usuario = new User("Maria Silva", "maria@exemplo.com", "hash");
        Field campo = User.class.getDeclaredField("meiOpeningDate");
        campo.setAccessible(true);
        campo.set(usuario, dataDeAbertura);
        return usuario;
    }
}
