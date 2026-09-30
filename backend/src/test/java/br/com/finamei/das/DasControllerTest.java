package br.com.finamei.das;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.security.JwtService;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DasControllerTest {

	private static final String DAS_PATH = "/api/v1/das";
	private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

	/** "Hoje" fixo em 15/09/2026 para as situações das guias serem previsíveis. */
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
	private DasGuideRepository dasGuideRepository;

	@Test
	void deveListarAsDozeCompetenciasDoAnoEmOrdemComVencimentoValorESituacao() throws Exception {
		User maria = criarUsuario("maria.das@exemplo.com");

		mockMvc.perform(get(DAS_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(12)))
				.andExpect(jsonPath("$[0].competence").value("2026-01"))
				.andExpect(jsonPath("$[0].dueDate").value("2026-02-20"))
				.andExpect(jsonPath("$[0].amount").value(76.90))
				.andExpect(jsonPath("$[0].paidAt").doesNotExist())
				.andExpect(jsonPath("$[11].competence").value("2026-12"))
				.andExpect(jsonPath("$[11].dueDate").value("2027-01-20"))
				// Julho venceu em 20/08 e não foi pago; agosto vence em 21/09 (dia 20 é domingo)
				.andExpect(jsonPath("$[6].status").value("OVERDUE"))
				.andExpect(jsonPath("$[7].dueDate").value("2026-09-21"))
				.andExpect(jsonPath("$[7].status").value("PENDING"));
	}

	@Test
	void naoDeveDuplicarGuiasEmConsultasRepetidas() throws Exception {
		User maria = criarUsuario("maria.das.repetida@exemplo.com");

		for (int consulta = 0; consulta < 2; consulta++) {
			mockMvc.perform(get(DAS_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$", hasSize(12)));
		}

		assertThat(dasGuideRepository.count()).isEqualTo(12);
	}

	@Test
	void naoDeveGerarGuiasParaOutrosAnos() throws Exception {
		User maria = criarUsuario("maria.das.outro.ano@exemplo.com");

		mockMvc.perform(get(DAS_PATH).param("year", "2025").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void deveRegistrarPagamentoComDataESituacao() throws Exception {
		User maria = criarUsuario("maria.das.pagamento@exemplo.com");
		String julho = idDaGuia(maria, 6);

		mockMvc.perform(post(DAS_PATH + "/" + julho + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(maria))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"paidAt\": \"2026-09-10\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.competence").value("2026-07"))
				.andExpect(jsonPath("$.status").value("PAID"))
				.andExpect(jsonPath("$.paidAt").value("2026-09-10"));

		mockMvc.perform(get(DAS_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(jsonPath("$[6].status").value("PAID"))
				.andExpect(jsonPath("$[6].paidAt").value("2026-09-10"));
	}

	@Test
	void deveRecusarDataDePagamentoFutura() throws Exception {
		User maria = criarUsuario("maria.das.futura@exemplo.com");
		String agosto = idDaGuia(maria, 7);

		mockMvc.perform(post(DAS_PATH + "/" + agosto + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(maria))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"paidAt\": \"2026-09-16\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.paidAt").value("A data do pagamento não pode ser futura."));
	}

	@Test
	void deveExigirADataDoPagamento() throws Exception {
		User maria = criarUsuario("maria.das.sem.data@exemplo.com");
		String agosto = idDaGuia(maria, 7);

		mockMvc.perform(post(DAS_PATH + "/" + agosto + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(maria))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fieldErrors.paidAt").value("Informe a data do pagamento."));
	}

	@Test
	void deveRecusarPagamentoDeGuiaJaPaga() throws Exception {
		User maria = criarUsuario("maria.das.ja.paga@exemplo.com");
		String julho = idDaGuia(maria, 6);
		pagar(maria, julho, "2026-09-10");

		mockMvc.perform(post(DAS_PATH + "/" + julho + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(maria))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"paidAt\": \"2026-09-12\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DAS_ALREADY_PAID"));
	}

	@Test
	void naoDevePermitirAlterarGuiaDeOutroUsuario() throws Exception {
		User maria = criarUsuario("maria.das.dona@exemplo.com");
		User joao = criarUsuario("joao.das.intruso@exemplo.com");
		String guiaDaMaria = idDaGuia(maria, 6);

		mockMvc.perform(post(DAS_PATH + "/" + guiaDaMaria + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(joao))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"paidAt\": \"2026-09-10\"}"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("NOT_FOUND"));

		mockMvc.perform(get(DAS_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(jsonPath("$[6].status").value("OVERDUE"));
	}

	@Test
	void deveDesfazerPagamentoLancadoPorEngano() throws Exception {
		User maria = criarUsuario("maria.das.desfazer@exemplo.com");
		String julho = idDaGuia(maria, 6);
		pagar(maria, julho, "2026-09-10");

		mockMvc.perform(delete(DAS_PATH + "/" + julho + "/payment").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("OVERDUE"))
				.andExpect(jsonPath("$.paidAt").doesNotExist());

		mockMvc.perform(get(DAS_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(jsonPath("$[6].status").value("OVERDUE"));
	}

	@Test
	void deveRecusarDesfazerPagamentoDeGuiaPendente() throws Exception {
		User maria = criarUsuario("maria.das.desfazer.pendente@exemplo.com");

		mockMvc.perform(delete(DAS_PATH + "/" + idDaGuia(maria, 7) + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("DAS_NOT_PAID"));
	}

	@Test
	void naoDevePermitirDesfazerPagamentoDeOutroUsuario() throws Exception {
		User maria = criarUsuario("maria.das.desfazer.dona@exemplo.com");
		User joao = criarUsuario("joao.das.desfazer.intruso@exemplo.com");
		String julho = idDaGuia(maria, 6);
		pagar(maria, julho, "2026-09-10");

		mockMvc.perform(delete(DAS_PATH + "/" + julho + "/payment").header(HttpHeaders.AUTHORIZATION, bearer(joao)))
				.andExpect(status().isNotFound());

		mockMvc.perform(get(DAS_PATH).param("year", "2026").header(HttpHeaders.AUTHORIZATION, bearer(maria)))
				.andExpect(jsonPath("$[6].status").value("PAID"));
	}

	@Test
	void deveExigirAutenticacao() throws Exception {
		mockMvc.perform(get(DAS_PATH).param("year", "2026"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
	}

	private User criarUsuario(String email) {
		return userRepository.save(new User("Usuário de teste", email, "hash"));
	}

	private String idDaGuia(User usuario, int indice) throws Exception {
		String corpo = mockMvc.perform(get(DAS_PATH).param("year", "2026")
						.header(HttpHeaders.AUTHORIZATION, bearer(usuario)))
				.andExpect(status().isOk())
				.andReturn().getResponse().getContentAsString();
		return JsonPath.read(corpo, "$[" + indice + "].id");
	}

	private void pagar(User usuario, String idDaGuia, String data) throws Exception {
		mockMvc.perform(post(DAS_PATH + "/" + idDaGuia + "/payment")
						.header(HttpHeaders.AUTHORIZATION, bearer(usuario))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"paidAt\": \"" + data + "\"}"))
				.andExpect(status().isOk());
	}

	private String bearer(User usuario) {
		return "Bearer " + jwtService.generateToken(usuario);
	}
}
