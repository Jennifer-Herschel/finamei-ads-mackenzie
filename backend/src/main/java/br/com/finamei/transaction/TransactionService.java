package br.com.finamei.transaction;

import br.com.finamei.category.Category;
import br.com.finamei.category.CategoryRepository;
import br.com.finamei.shared.PageResponse;
import br.com.finamei.shared.error.FieldValidationException;
import br.com.finamei.transaction.dto.BalanceSummaryResponse;
import br.com.finamei.transaction.dto.CreateTransactionRequest;
import br.com.finamei.transaction.dto.TransactionResponse;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {

    static final int MAX_PAGE_SIZE = 100;

    // Mais recentes primeiro; no mesmo dia, o último registrado aparece antes.
    private static final Sort NEWEST_FIRST = Sort.by(
            Sort.Order.desc("transactionDate"), Sort.Order.desc("createdAt"));

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final Clock clock;

    public TransactionService(
            TransactionRepository transactionRepository,
            CategoryRepository categoryRepository,
            Clock clock) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.clock = clock;
    }

    /** O userId vem da identidade autenticada; o cliente nunca informa o dono do lançamento. */
    @Transactional
    public TransactionResponse create(UUID userId, CreateTransactionRequest request) {
        if (request.date().isAfter(LocalDate.now(clock))) {
            throw new FieldValidationException("date", "A data não pode ser futura.");
        }
        Category category = validCategoryFor(userId, request);

        Transaction transaction = transactionRepository.save(new Transaction(
                userId,
                category.getId(),
                request.type(),
                request.amount(),
                request.date(),
                request.description().trim()));
        return TransactionResponse.from(transaction, category);
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> list(UUID userId, int page, int size) {
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), NEWEST_FIRST);
        Page<Transaction> transactions = transactionRepository.findByUserIdAndDeletedFalse(userId, pageRequest);

        Set<UUID> categoryIds = transactions.stream().map(Transaction::getCategoryId).collect(Collectors.toSet());
        Map<UUID, Category> categories = categoryRepository.findAllById(categoryIds).stream()
                .collect(Collectors.toMap(Category::getId, Function.identity()));

        return PageResponse.from(transactions, t -> TransactionResponse.from(t, categories.get(t.getCategoryId())));
    }

    /** Saldo atual e entradas e saídas do mês. Despesas reduzem o saldo, mas não o faturamento (RN04). */
    @Transactional(readOnly = true)
    public BalanceSummaryResponse summary(UUID userId, YearMonth month) {
        BigDecimal totalIncome = sum(transactionRepository.sumAmountByUserAndType(userId, TransactionType.INCOME));
        BigDecimal totalExpense = sum(transactionRepository.sumAmountByUserAndType(userId, TransactionType.EXPENSE));
        return new BalanceSummaryResponse(
                month,
                totalIncome.subtract(totalExpense),
                sumOfMonth(userId, TransactionType.INCOME, month),
                sumOfMonth(userId, TransactionType.EXPENSE, month));
    }

    private BigDecimal sumOfMonth(UUID userId, TransactionType type, YearMonth month) {
        return sum(transactionRepository.sumAmountByUserAndTypeAndPeriod(
                userId, type, month.atDay(1), month.atEndOfMonth()));
    }

    private static BigDecimal sum(BigDecimal value) {
        return Objects.requireNonNullElse(value, BigDecimal.ZERO);
    }

    // RN06 e RN07: a categoria precisa ser do usuário, estar ativa e ser do tipo do lançamento.
    // Categoria de outro usuário é tratada como inexistente (ONF05).
    private Category validCategoryFor(UUID userId, CreateTransactionRequest request) {
        Category category = categoryRepository.findByIdAndUserId(request.categoryId(), userId)
                .orElseThrow(() -> new FieldValidationException("categoryId", "Selecione uma categoria válida."));
        if (!category.isActive()) {
            throw new FieldValidationException(
                    "categoryId", "A categoria selecionada está inativa. Escolha outra categoria.");
        }
        if (!category.acceptsNewTransactionOf(request.type())) {
            throw new FieldValidationException(
                    "categoryId", "A categoria selecionada não corresponde ao tipo do lançamento.");
        }
        return category;
    }
}
