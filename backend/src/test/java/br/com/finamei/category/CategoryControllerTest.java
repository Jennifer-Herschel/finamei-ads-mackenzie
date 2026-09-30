package br.com.finamei.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.security.JwtService;
import br.com.finamei.transaction.TransactionType;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
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
class CategoryControllerTest {

    private static final String CATEGORIES_PATH = "/api/v1/categories";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private JdbcClient jdbcClient;

    private String token;

    @BeforeEach
    void autenticar() {
        User maria = userRepository.save(new User("Maria Silva", "maria.categorias@exemplo.com", "hash"));
        token = "Bearer " + jwtService.generateToken(maria);
    }

    @Test
    void deveCriarAsCategoriasPadraoPelaMigrationSemDuplicar() {
        Integer duplicadas = jdbcClient.sql("""
                SELECT COUNT(*) FROM (
                    SELECT name, type FROM categories GROUP BY name, type HAVING COUNT(*) > 1
                ) repetidas
                """)
                .query(Integer.class)
                .single();

        assertThat(duplicadas).isZero();
        assertThat(categoryRepository.findByTypeOrderByNameAsc(TransactionType.INCOME)).hasSize(3);
        assertThat(categoryRepository.findByTypeOrderByNameAsc(TransactionType.EXPENSE)).hasSize(8);
    }

    @Test
    void deveListarAsCategoriasDoTipoInformadoEmOrdemAlfabetica() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH).param("type", "INCOME").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].type", everyItem(is("INCOME"))))
                .andExpect(jsonPath("$[0].name").value("Outras receitas"))
                .andExpect(jsonPath("$[1].name").value("Prestação de serviços"))
                .andExpect(jsonPath("$[2].name").value("Venda de produtos"))
                .andExpect(jsonPath("$[0].id").isNotEmpty())
                .andExpect(jsonPath("$[0].active").value(true));
    }

    @Test
    void deveListarTodasAsCategoriasQuandoOTipoNaoEInformado() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH).header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(11)));
    }

    @Test
    void deveInformarCategoriasInativasParaOClienteNaoOferecelas() throws Exception {
        Category antiga = categoryRepository.save(new Category("Categoria antiga", TransactionType.EXPENSE));
        antiga.deactivate();
        categoryRepository.flush();

        mockMvc.perform(get(CATEGORIES_PATH).param("type", "EXPENSE").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Categoria antiga')].active", hasItem(false)))
                .andExpect(jsonPath("$[?(@.name == 'Aluguel')].active", hasItem(true)))
                .andExpect(jsonPath("$[*].type", not(hasItem("INCOME"))));
    }

    @Test
    void deveRejeitarTipoInvalido() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH).param("type", "OUTRO").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.type").exists());
    }

    @Test
    void deveExigirAutenticacao() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH))
                .andExpect(status().isUnauthorized());
    }
}
