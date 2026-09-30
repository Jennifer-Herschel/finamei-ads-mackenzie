package br.com.finamei.revenue;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.security.JwtService;
import br.com.finamei.transaction.Transaction;
import br.com.finamei.transaction.TransactionRepository;
import br.com.finamei.transaction.TransactionType;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RevenueControllerTest {

    private static final String SUMMARY_PATH = "/api/v1/revenue/summary";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private JdbcClient jdbcClient;

    private UUID categoriaId;

    @BeforeEach
    void criarCategoria() {
        // O módulo de categorias ainda não existe; a tabela vem da migration V1.
        categoriaId = UUID.randomUUID();
        jdbcClient.sql("INSERT INTO categories (id, name, type) VALUES (:id, 'Vendas', 'INCOME')")
                .param("id", categoriaId)
                .update();
    }

    @Test
    void deveSomarSomenteReceitasDoAnoDoUsuarioAutenticado() throws Exception {
        User maria = userRepository.save(new User("Maria Silva", "maria.faturamento@exemplo.com", "hash"));
        User joao = userRepository.save(new User("João Souza", "joao.faturamento@exemplo.com", "hash"));

        lancar(maria, TransactionType.INCOME, "60000.00", LocalDate.of(2026, 3, 10));
        lancar(maria, TransactionType.INCOME, "5000.00", LocalDate.of(2026, 12, 31));
        lancar(maria, TransactionType.EXPENSE, "9000.00", LocalDate.of(2026, 4, 1));
        lancar(maria, TransactionType.INCOME, "7000.00", LocalDate.of(2025, 12, 31));
        Transaction excluida = lancar(maria, TransactionType.INCOME, "3000.00", LocalDate.of(2026, 5, 1));
        excluida.markAsDeleted();
        lancar(joao, TransactionType.INCOME, "80000.00", LocalDate.of(2026, 6, 1));
        transactionRepository.flush();

        // 60.000 + 5.000 = 65.000 -> 80,25% de 81.000 (faixa de atenção)
        mockMvc.perform(get(SUMMARY_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.accumulated").value(65000.00))
                .andExpect(jsonPath("$.limit").value(81000.00))
                .andExpect(jsonPath("$.percentage").value(80.25))
                .andExpect(jsonPath("$.band").value("ATTENTION"))
                .andExpect(jsonPath("$.proportionalLimit").value(false))
                .andExpect(jsonPath("$.activeMonths").doesNotExist());
    }

    @Test
    void deveInformarAcumuladoZeroQuandoNaoHaReceitasNoAno() throws Exception {
        User maria = userRepository.save(new User("Maria Silva", "maria.sem.receitas@exemplo.com", "hash"));

        mockMvc.perform(get(SUMMARY_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accumulated").value(0))
                .andExpect(jsonPath("$.band").value("NORMAL"));
    }

    @Test
    void deveExigirAutenticacao() throws Exception {
        mockMvc.perform(get(SUMMARY_PATH).param("year", "2026"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    void deveExigirOAno() throws Exception {
        User maria = userRepository.save(new User("Maria Silva", "maria.sem.ano@exemplo.com", "hash"));

        mockMvc.perform(get(SUMMARY_PATH).header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.year").exists());
    }

    @Test
    void deveRejeitarAnoInvalido() throws Exception {
        User maria = userRepository.save(new User("Maria Silva", "maria.ano.invalido@exemplo.com", "hash"));

        mockMvc.perform(get(SUMMARY_PATH).param("year", "dois-mil").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.year").exists());
    }

    private Transaction lancar(User usuario, TransactionType tipo, String valor, LocalDate data) {
        return transactionRepository.save(
                new Transaction(usuario.getId(), categoriaId, tipo, new BigDecimal(valor), data, "Lançamento de teste"));
    }

    private String bearer(User usuario) {
        return "Bearer " + jwtService.generateToken(usuario);
    }
}
