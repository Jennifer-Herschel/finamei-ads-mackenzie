package br.com.finamei.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.category.CategoryService;
import br.com.finamei.category.CategoryRepository;
import br.com.finamei.security.JwtService;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ExpenseAndBalanceTest {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");


    /** "Hoje" fixo em 15/09/2026. */
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(LocalDate.of(2026, 9, 15).atTime(10, 0).atZone(FUSO).toInstant(), FUSO);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private User maria;

    /** Cópias das categorias padrão pertencentes à Maria. */
    private String vendaDeProdutos;
    private String aluguel;

    @BeforeEach
    void criarUsuario() {
        maria = userRepository.save(new User("Maria Silva", "maria.despesas@exemplo.com", "hash"));
        categoryService.createDefaultCategories(maria.getId());
        vendaDeProdutos = idDaCategoria(maria, "Venda de produtos");
        aluguel = idDaCategoria(maria, "Aluguel");
    }

    @Test
    void deveRegistrarDespesaValida() throws Exception {
        registrar(despesa("800.00", "2026-09-05", "Aluguel da cozinha"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("EXPENSE"))
                .andExpect(jsonPath("$.amount").value(800.00))
                .andExpect(jsonPath("$.category.name").value("Aluguel"));

        assertThat(transactionRepository.findAll())
                .singleElement()
                .satisfies(lancamento -> {
                    assertThat(lancamento.getType()).isEqualTo(TransactionType.EXPENSE);
                    assertThat(lancamento.getUserId()).isEqualTo(maria.getId());
                });
    }

    @Test
    void deveRecusarDespesaComValorNaoPositivo() throws Exception {
        registrar(despesa("-10.00", "2026-09-05", "Estorno"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").value("O valor deve ser maior que zero."));
    }

    @Test
    void deveRecusarDespesaComDataFutura() throws Exception {
        registrar(despesa("80.00", "2026-10-01", "Conta de outubro"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.date").value("A data não pode ser futura."));
    }

    @Test
    void deveRecusarDespesaComDescricaoInvalida() throws Exception {
        registrar(despesa("80.00", "2026-09-05", "a".repeat(121)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.description").value("A descrição deve ter no máximo 120 caracteres."));
    }

    @Test
    void deveRecusarDespesaComCategoriaDeReceita() throws Exception {
        registrar("""
                {"type": "EXPENSE", "amount": 80, "date": "2026-09-05",
                 "categoryId": "%s", "description": "Compra"}
                """.formatted(vendaDeProdutos))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.categoryId")
                        .value("A categoria selecionada não corresponde ao tipo do lançamento."));
    }

    @Test
    void despesaNaoDeveAumentarOFaturamentoAnual() throws Exception {
        lancar(TransactionType.INCOME, vendaDeProdutos, "10000.00", LocalDate.of(2026, 8, 1));
        transactionRepository.flush();

        registrar(despesa("5000.00", "2026-09-05", "Compra de mercadorias")).andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/revenue/summary").param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(jsonPath("$.accumulated").value(10000.00));
    }

    @Test
    void deveResumirSaldoAtualEEntradasESaidasDoMes() throws Exception {
        lancar(TransactionType.INCOME, vendaDeProdutos, "10000.00", LocalDate.of(2026, 8, 20));
        lancar(TransactionType.EXPENSE, aluguel, "1500.00", LocalDate.of(2026, 8, 25));
        lancar(TransactionType.INCOME, vendaDeProdutos, "6900.00", LocalDate.of(2026, 9, 3));
        lancar(TransactionType.EXPENSE, aluguel, "2150.00", LocalDate.of(2026, 9, 10));
        lancar(TransactionType.EXPENSE, aluguel, "999.00", LocalDate.of(2026, 9, 11)).markAsDeleted();
        User joao = userRepository.save(new User("João Souza", "joao.saldo@exemplo.com", "hash"));
        transactionRepository.save(new Transaction(joao.getId(), UUID.fromString(vendaDeProdutos),
                TransactionType.INCOME, new BigDecimal("50000.00"), LocalDate.of(2026, 9, 1), "Outro usuário"));
        transactionRepository.flush();

        // Saldo: (10.000 + 6.900) - (1.500 + 2.150) = 13.250
        mockMvc.perform(get("/api/v1/transactions/summary").param("month", "2026-09").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value("2026-09"))
                .andExpect(jsonPath("$.balance").value(13250.00))
                .andExpect(jsonPath("$.income").value(6900.00))
                .andExpect(jsonPath("$.expense").value(2150.00));
    }

    @Test
    void deveMostrarSaldoNegativoQuandoAsDespesasSuperamAsReceitas() throws Exception {
        lancar(TransactionType.EXPENSE, aluguel, "300.00", LocalDate.of(2026, 9, 2));
        transactionRepository.flush();

        mockMvc.perform(get("/api/v1/transactions/summary").param("month", "2026-09").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(jsonPath("$.balance").value(-300.00))
                .andExpect(jsonPath("$.income").value(0))
                .andExpect(jsonPath("$.expense").value(300.00));
    }

    @Test
    void deveRejeitarMesInvalidoNoResumo() throws Exception {
        mockMvc.perform(get("/api/v1/transactions/summary").param("month", "setembro").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.month").exists());
    }

    private ResultActions registrar(String corpo) throws Exception {
        return mockMvc.perform(post("/api/v1/transactions")
                .header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo));
    }

    private String despesa(String valor, String data, String descricao) {
        return """
                {"type": "EXPENSE", "amount": %s, "date": "%s", "categoryId": "%s", "description": "%s"}
                """.formatted(valor, data, aluguel, descricao);
    }

    private Transaction lancar(TransactionType tipo, String categoria, String valor, LocalDate data) {
        return transactionRepository.save(new Transaction(
                maria.getId(), UUID.fromString(categoria), tipo, new BigDecimal(valor), data, "Lançamento de teste"));
    }

    private String bearer() {
        return "Bearer " + jwtService.generateToken(maria);
    }

    private String idDaCategoria(User usuario, String nome) {
        return categoryRepository.findByUserIdOrderByTypeAscNameAsc(usuario.getId()).stream()
                .filter(categoria -> categoria.getName().equals(nome))
                .findFirst().orElseThrow().getId().toString();
    }
}
