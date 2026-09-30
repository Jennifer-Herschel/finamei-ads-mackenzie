package br.com.finamei.category;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.security.JwtService;
import br.com.finamei.transaction.TransactionType;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
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
    private CategoryService categoryService;

    @Autowired
    private JdbcClient jdbcClient;

    private User maria;

    @BeforeEach
    void criarUsuarioComCategoriasPadrao() {
        maria = criarUsuario("maria.categorias@exemplo.com");
    }

    @Test
    void oSeedDeveCriarOsModelosPadraoSemDuplicar() {
        Integer duplicados = jdbcClient.sql("""
                SELECT COUNT(*) FROM (
                    SELECT name, type FROM categories WHERE user_id IS NULL
                    GROUP BY name, type HAVING COUNT(*) > 1
                ) repetidos
                """)
                .query(Integer.class)
                .single();

        assertThat(duplicados).isZero();
        assertThat(categoryRepository.findByUserIdIsNull()).hasSize(11);
    }

    @Test
    void oCadastroPelaApiDeveDarAoNovoUsuarioAsCategoriasPadrao() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Ana Lima", "email": "ana.categorias@exemplo.com", "password": "senha123"}
                                """))
                .andExpect(status().isCreated());
        User ana = userRepository.findByEmail("ana.categorias@exemplo.com").orElseThrow();

        assertThat(categoryRepository.findByUserIdAndTypeOrderByNameAsc(ana.getId(), TransactionType.INCOME)).hasSize(3);
        assertThat(categoryRepository.findByUserIdAndTypeOrderByNameAsc(ana.getId(), TransactionType.EXPENSE)).hasSize(8);
    }

    @Test
    void deveListarAsCategoriasDoTipoEmOrdemAlfabetica() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH).param("type", "INCOME").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].type", everyItem(is("INCOME"))))
                .andExpect(jsonPath("$[0].name").value("Outras receitas"))
                .andExpect(jsonPath("$[1].name").value("Prestação de serviços"))
                .andExpect(jsonPath("$[2].name").value("Venda de produtos"))
                .andExpect(jsonPath("$[0].active").value(true));
    }

    @Test
    void deveListarTodasAsCategoriasDoUsuarioQuandoOTipoNaoEInformado() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH).header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(11)));
    }

    @Test
    void naoDeveMostrarCategoriasDeOutroUsuarioNemOsModelosPadrao() throws Exception {
        User joao = criarUsuario("joao.categorias@exemplo.com");
        criar(joao, "Consultoria", "INCOME").andExpect(status().isCreated());

        mockMvc.perform(get(CATEGORIES_PATH).header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(jsonPath("$", hasSize(11)))
                .andExpect(jsonPath("$[*].name", not(hasItem("Consultoria"))));
    }

    @Test
    void deveCriarCategoriaParaOUsuario() throws Exception {
        criar(maria, "  Encomendas  ", "INCOME")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Encomendas"))
                .andExpect(jsonPath("$.type").value("INCOME"))
                .andExpect(jsonPath("$.active").value(true));

        mockMvc.perform(get(CATEGORIES_PATH).param("type", "INCOME").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(jsonPath("$[*].name", hasItem("Encomendas")));
    }

    @Test
    void deveRecusarNomeRepetidoNoMesmoTipoSemDiferenciarMaiusculas() throws Exception {
        criar(maria, "aluguel", "EXPENSE")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CATEGORY_ALREADY_EXISTS"));
    }

    @Test
    void devePermitirOMesmoNomeEmOutroTipoOuParaOutroUsuario() throws Exception {
        criar(maria, "Aluguel", "INCOME").andExpect(status().isCreated());

        User joao = criarUsuario("joao.mesmo.nome@exemplo.com");
        criar(joao, "Encomendas", "INCOME").andExpect(status().isCreated());
        criar(maria, "Encomendas", "INCOME").andExpect(status().isCreated());
    }

    @Test
    void deveValidarOsDadosDaNovaCategoria() throws Exception {
        mockMvc.perform(post(CATEGORIES_PATH)
                        .header(HttpHeaders.AUTHORIZATION, bearer(maria))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"%s\"}".formatted("a".repeat(61))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").value("O nome deve ter no máximo 60 caracteres."))
                .andExpect(jsonPath("$.fieldErrors.type").exists());
    }

    @Test
    void deveRenomearCategoria() throws Exception {
        String aluguel = idDaCategoria(maria, "Aluguel");

        renomear(maria, aluguel, "Aluguel do ponto")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Aluguel do ponto"))
                .andExpect(jsonPath("$.type").value("EXPENSE"));
    }

    @Test
    void devePermitirMudarSoAsMaiusculasDoProprioNome() throws Exception {
        renomear(maria, idDaCategoria(maria, "Aluguel"), "ALUGUEL").andExpect(status().isOk());
    }

    @Test
    void deveRecusarRenomearParaUmNomeJaUsado() throws Exception {
        renomear(maria, idDaCategoria(maria, "Aluguel"), "Transporte")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CATEGORY_ALREADY_EXISTS"));
    }

    @Test
    void deveInativarEReativarCategoria() throws Exception {
        String aluguel = idDaCategoria(maria, "Aluguel");

        alterarSituacao(maria, aluguel, false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
        mockMvc.perform(get(CATEGORIES_PATH).param("type", "EXPENSE").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(jsonPath("$[?(@.name == 'Aluguel')].active", hasItem(false)));

        alterarSituacao(maria, aluguel, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void deveExigirASituacaoAoAtivarOuInativar() throws Exception {
        mockMvc.perform(patch(CATEGORIES_PATH + "/" + idDaCategoria(maria, "Aluguel"))
                        .header(HttpHeaders.AUTHORIZATION, bearer(maria))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.active").exists());
    }

    @Test
    void naoDevePermitirAlterarCategoriaDeOutroUsuario() throws Exception {
        User joao = criarUsuario("joao.intruso@exemplo.com");
        String aluguelDaMaria = idDaCategoria(maria, "Aluguel");

        renomear(joao, aluguelDaMaria, "Invadido")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        alterarSituacao(joao, aluguelDaMaria, false).andExpect(status().isNotFound());
        renomear(maria, UUID.randomUUID().toString(), "Inexistente").andExpect(status().isNotFound());

        assertThat(categoryRepository.findById(UUID.fromString(aluguelDaMaria)).orElseThrow())
                .satisfies(categoria -> {
                    assertThat(categoria.getName()).isEqualTo("Aluguel");
                    assertThat(categoria.isActive()).isTrue();
                });
    }

    @Test
    void deveRejeitarTipoInvalido() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH).param("type", "OUTRO").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.type").exists());
    }

    @Test
    void deveExigirAutenticacao() throws Exception {
        mockMvc.perform(get(CATEGORIES_PATH)).andExpect(status().isUnauthorized());
        mockMvc.perform(post(CATEGORIES_PATH).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"X\", \"type\": \"INCOME\"}"))
                .andExpect(status().isUnauthorized());
    }

    private User criarUsuario(String email) {
        User usuario = userRepository.save(new User("Usuário de teste", email, "hash"));
        categoryService.createDefaultCategories(usuario.getId());
        return usuario;
    }

    private String idDaCategoria(User usuario, String nome) throws Exception {
        String corpo = mockMvc.perform(get(CATEGORIES_PATH).header(HttpHeaders.AUTHORIZATION, bearer(usuario)))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.<List<String>>read(corpo, "$[?(@.name == '" + nome + "')].id").getFirst();
    }

    private ResultActions criar(User usuario, String nome, String tipo)
            throws Exception {
        return mockMvc.perform(post(CATEGORIES_PATH)
                .header(HttpHeaders.AUTHORIZATION, bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"%s\", \"type\": \"%s\"}".formatted(nome, tipo)));
    }

    private ResultActions renomear(User usuario, String id, String nome)
            throws Exception {
        return mockMvc.perform(put(CATEGORIES_PATH + "/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\": \"%s\"}".formatted(nome)));
    }

    private ResultActions alterarSituacao(User usuario, String id, boolean ativa)
            throws Exception {
        return mockMvc.perform(patch(CATEGORIES_PATH + "/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer(usuario))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"active\": %s}".formatted(ativa)));
    }

    private String bearer(User usuario) {
        return "Bearer " + jwtService.generateToken(usuario);
    }
}
