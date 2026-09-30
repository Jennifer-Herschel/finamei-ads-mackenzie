package br.com.finamei.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.category.Category;
import br.com.finamei.category.CategoryRepository;
import br.com.finamei.category.CategoryService;
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
class TransactionControllerTest {

    private static final String TRANSACTIONS_PATH = "/api/v1/transactions";
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
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private User maria;

    /** Cópias das categorias padrão pertencentes à Maria. */
    private String vendaDeProdutos;
    private String aluguel;

    @BeforeEach
    void criarUsuario() {
        maria = userRepository.save(new User("Maria Silva", "maria.lancamentos@exemplo.com", "hash"));
        categoryService.createDefaultCategories(maria.getId());
        vendaDeProdutos = idDaCategoria(maria, "Venda de produtos");
        aluguel = idDaCategoria(maria, "Aluguel");
    }

    @Test
    void deveRegistrarReceitaValidaParaOUsuarioAutenticado() throws Exception {
        registrar(maria, """
                {"type": "INCOME", "amount": 1250.50, "date": "2026-09-10",
                 "categoryId": "%s", "description": "  Encomenda de doces  "}
                """.formatted(vendaDeProdutos))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.type").value("INCOME"))
                .andExpect(jsonPath("$.amount").value(1250.50))
                .andExpect(jsonPath("$.date").value("2026-09-10"))
                .andExpect(jsonPath("$.description").value("Encomenda de doces"))
                .andExpect(jsonPath("$.category.id").value(vendaDeProdutos))
                .andExpect(jsonPath("$.category.name").value("Venda de produtos"));

        assertThat(transactionRepository.findAll())
                .singleElement()
                .satisfies(lancamento -> {
                    assertThat(lancamento.getUserId()).isEqualTo(maria.getId());
                    assertThat(lancamento.getAmount()).isEqualByComparingTo("1250.50");
                });
    }

    @Test
    void deveAceitarReceitaComDataDeHoje() throws Exception {
        registrar(maria, receita("100.00", "2026-09-15", "Venda do dia"))
                .andExpect(status().isCreated());
    }

    @Test
    void deveAtualizarOFaturamentoDoAnoAoRegistrarReceita() throws Exception {
        registrar(maria, receita("64800.00", "2026-03-01", "Contrato anual")).andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/revenue/summary").param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(jsonPath("$.accumulated").value(64800.00))
                .andExpect(jsonPath("$.band").value("ATTENTION"));
    }

    @Test
    void deveRecusarDadosQueViolamARn06ComErrosPorCampo() throws Exception {
        registrar(maria, """
                {"type": "INCOME", "amount": 0, "categoryId": "%s", "description": "%s"}
                """.formatted(vendaDeProdutos, "a".repeat(121)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.amount").value("O valor deve ser maior que zero."))
                .andExpect(jsonPath("$.fieldErrors.date").value("Informe a data."))
                .andExpect(jsonPath("$.fieldErrors.description").value("A descrição deve ter no máximo 120 caracteres."));

        assertThat(transactionRepository.count()).isZero();
    }

    @Test
    void deveRecusarValorComMaisDeDuasCasasDecimais() throws Exception {
        registrar(maria, receita("10.999", "2026-09-10", "Venda"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").value("O valor deve ter no máximo duas casas decimais."));
    }

    @Test
    void deveRecusarDataFutura() throws Exception {
        registrar(maria, receita("100.00", "2026-09-16", "Venda futura"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.date").value("A data não pode ser futura."));
    }

    @Test
    void deveRecusarDescricaoEmBranco() throws Exception {
        registrar(maria, receita("100.00", "2026-09-10", "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.description").value("Informe a descrição."));
    }

    @Test
    void deveRecusarCategoriaInexistente() throws Exception {
        registrar(maria, """
                {"type": "INCOME", "amount": 100, "date": "2026-09-10",
                 "categoryId": "%s", "description": "Venda"}
                """.formatted(UUID.randomUUID()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.categoryId").value("Selecione uma categoria válida."));
    }

    @Test
    void deveRecusarCategoriaInativa() throws Exception {
        Category antiga = categoryRepository.save(new Category(maria.getId(), "Vendas antigas", TransactionType.INCOME));
        antiga.deactivate();
        categoryRepository.flush();

        registrar(maria, """
                {"type": "INCOME", "amount": 100, "date": "2026-09-10",
                 "categoryId": "%s", "description": "Venda"}
                """.formatted(antiga.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.categoryId")
                        .value("A categoria selecionada está inativa. Escolha outra categoria."));
    }

    @Test
    void deveRecusarCategoriaDeOutroTipo() throws Exception {
        registrar(maria, """
                {"type": "INCOME", "amount": 100, "date": "2026-09-10",
                 "categoryId": "%s", "description": "Venda"}
                """.formatted(aluguel))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.categoryId")
                        .value("A categoria selecionada não corresponde ao tipo do lançamento."));
    }

    @Test
    void deveRecusarCategoriaDeOutroUsuario() throws Exception {
        User joao = userRepository.save(new User("João Souza", "joao.categoria@exemplo.com", "hash"));
        categoryService.createDefaultCategories(joao.getId());

        registrar(maria, """
                {"type": "INCOME", "amount": 100, "date": "2026-09-10",
                 "categoryId": "%s", "description": "Venda"}
                """.formatted(idDaCategoria(joao, "Venda de produtos")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.categoryId").value("Selecione uma categoria válida."));
    }

    @Test
    void deveIgnorarQualquerDonoInformadoPeloCliente() throws Exception {
        User joao = userRepository.save(new User("João Souza", "joao.lancamentos@exemplo.com", "hash"));

        registrar(maria, """
                {"type": "INCOME", "amount": 100, "date": "2026-09-10", "userId": "%s",
                 "categoryId": "%s", "description": "Venda"}
                """.formatted(joao.getId(), vendaDeProdutos))
                .andExpect(status().isCreated());

        assertThat(transactionRepository.findAll())
                .singleElement()
                .extracting(Transaction::getUserId)
                .isEqualTo(maria.getId());
    }

    @Test
    void deveListarSomenteOsLancamentosAtivosDoUsuarioDoMaisRecenteParaOMaisAntigo() throws Exception {
        User joao = userRepository.save(new User("João Souza", "joao.lista@exemplo.com", "hash"));
        lancar(maria, "500.00", LocalDate.of(2026, 9, 1), "Primeira venda");
        lancar(maria, "800.00", LocalDate.of(2026, 9, 12), "Venda mais recente");
        lancar(maria, "300.00", LocalDate.of(2026, 9, 5), "Venda do meio");
        lancar(maria, "999.00", LocalDate.of(2026, 9, 14), "Venda excluída").markAsDeleted();
        lancar(joao, "700.00", LocalDate.of(2026, 9, 13), "Venda do João");
        transactionRepository.flush();

        mockMvc.perform(get(TRANSACTIONS_PATH).header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.content[0].description").value("Venda mais recente"))
                .andExpect(jsonPath("$.content[0].category.name").value("Venda de produtos"))
                .andExpect(jsonPath("$.content[1].description").value("Venda do meio"))
                .andExpect(jsonPath("$.content[2].description").value("Primeira venda"))
                .andExpect(jsonPath("$.number").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void devePaginarALista() throws Exception {
        for (int dia = 1; dia <= 3; dia++) {
            lancar(maria, "100.00", LocalDate.of(2026, 9, dia), "Venda do dia " + dia);
        }
        transactionRepository.flush();

        mockMvc.perform(get(TRANSACTIONS_PATH).param("page", "1").param("size", "2")
                        .header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].description").value("Venda do dia 1"))
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void deveExigirAutenticacao() throws Exception {
        mockMvc.perform(get(TRANSACTIONS_PATH))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post(TRANSACTIONS_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content(receita("100.00", "2026-09-10", "Venda")))
                .andExpect(status().isUnauthorized());
    }

    private ResultActions registrar(User usuario, String corpo) throws Exception {
        return mockMvc.perform(post(TRANSACTIONS_PATH)
                .header(HttpHeaders.AUTHORIZATION, bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo));
    }

    private String receita(String valor, String data, String descricao) {
        return """
                {"type": "INCOME", "amount": %s, "date": "%s", "categoryId": "%s", "description": "%s"}
                """.formatted(valor, data, vendaDeProdutos, descricao);
    }

    private Transaction lancar(User usuario, String valor, LocalDate data, String descricao) {
        return transactionRepository.save(new Transaction(
                usuario.getId(), UUID.fromString(vendaDeProdutos), TransactionType.INCOME,
                new BigDecimal(valor), data, descricao));
    }

    private String bearer(User usuario) {
        return "Bearer " + jwtService.generateToken(usuario);
    }

    private String idDaCategoria(User usuario, String nome) {
        return categoryRepository.findByUserIdOrderByTypeAscNameAsc(usuario.getId()).stream()
                .filter(categoria -> categoria.getName().equals(nome))
                .findFirst().orElseThrow().getId().toString();
    }
}
