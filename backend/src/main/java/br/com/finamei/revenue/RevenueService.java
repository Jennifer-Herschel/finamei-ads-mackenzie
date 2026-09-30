package br.com.finamei.revenue;

import br.com.finamei.transaction.TransactionRepository;
import br.com.finamei.transaction.TransactionType;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RevenueService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final int MONTHS_IN_YEAR = 12;

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final RevenueProperties properties;

    public RevenueService(
            TransactionRepository transactionRepository,
            UserRepository userRepository,
            RevenueProperties properties) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.properties = properties;
    }

    /** O userId deve vir da identidade autenticada, nunca do corpo/parâmetro da requisição. */
    @Transactional(readOnly = true)
    public RevenueSummaryResponse getAnnualSummary(UUID userId, int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        BigDecimal accumulated = transactionRepository.sumAmountByUserAndTypeAndPeriod(
                userId, TransactionType.INCOME, start, end);
        if (accumulated == null) {
            accumulated = BigDecimal.ZERO;
        }

        Integer activeMonths = activeMonthsInYear(userId, year);
        BigDecimal limit = activeMonths == null ? properties.annualLimit() : proportionalLimit(activeMonths);
        return new RevenueSummaryResponse(
                year,
                accumulated,
                limit,
                percentageOf(accumulated, limit),
                classify(accumulated, limit),
                activeMonths != null,
                activeMonths);
    }

    // RN01: MEI aberto durante o ano tem limite proporcional aos meses de atividade,
    // incluindo o mês de abertura. Retorna null quando o limite integral se aplica.
    private Integer activeMonthsInYear(UUID userId, int year) {
        LocalDate openingDate = userRepository.findById(userId)
                .map(User::getMeiOpeningDate)
                .orElse(null);
        if (openingDate == null || openingDate.getYear() != year) {
            return null;
        }
        return MONTHS_IN_YEAR - openingDate.getMonthValue() + 1;
    }

    private BigDecimal proportionalLimit(int activeMonths) {
        return properties.annualLimit()
                .multiply(BigDecimal.valueOf(activeMonths))
                .divide(BigDecimal.valueOf(MONTHS_IN_YEAR), 2, RoundingMode.HALF_UP);
    }

    // RN02: normal < 80% | atenção 80% a 89,99% | crítica 90% a 99,99% | excedida >= 100%.
    // Compara valores exatos (não o percentual arredondado) para que as fronteiras sejam precisas.
    RevenueBand classify(BigDecimal accumulated, BigDecimal limit) {
        if (accumulated.compareTo(limit) >= 0) {
            return RevenueBand.EXCEEDED;
        }
        if (accumulated.compareTo(thresholdAmount(limit, properties.criticalPercent())) >= 0) {
            return RevenueBand.CRITICAL;
        }
        if (accumulated.compareTo(thresholdAmount(limit, properties.attentionPercent())) >= 0) {
            return RevenueBand.ATTENTION;
        }
        return RevenueBand.NORMAL;
    }

    private BigDecimal thresholdAmount(BigDecimal limit, BigDecimal percent) {
        return limit.multiply(percent).divide(ONE_HUNDRED);
    }

    private BigDecimal percentageOf(BigDecimal accumulated, BigDecimal limit) {
        return accumulated.multiply(ONE_HUNDRED).divide(limit, 2, RoundingMode.HALF_UP);
    }
}
