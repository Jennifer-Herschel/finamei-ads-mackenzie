package br.com.finamei.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LoginControllerTest {

	private static final String CADASTRO_JSON = """
			{"name": "%s", "email": "%s", "password": "%s"}
			""";

	private static final String LOGIN_JSON = """
			{"email": "%s", "password": "%s"}
			""";

	@Autowired
	private MockMvc mockMvc;

	@Test
	void deveAutenticarComCredenciaisValidasERetornarToken() throws Exception {
		registrarUsuario("Maria Silva", "maria.login@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(LOGIN_JSON.formatted("maria.login@exemplo.com", "senha123")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.token").isNotEmpty())
				.andExpect(jsonPath("$.tokenType").value("Bearer"))
				.andExpect(jsonPath("$.expiresInSeconds").value(1800));
	}

	@Test
	void deveRejeitarLoginComSenhaIncorretaSemRevelarDetalhe() throws Exception {
		registrarUsuario("Maria Silva", "maria.senha@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(LOGIN_JSON.formatted("maria.senha@exemplo.com", "senhaErrada1")))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
				.andExpect(jsonPath("$.message").value("E-mail ou senha inválidos."));
	}

	@Test
	void deveRejeitarLoginComEmailInexistenteComAMesmaMensagemGenerica() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(LOGIN_JSON.formatted("nao.existe@exemplo.com", "senha123")))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
				.andExpect(jsonPath("$.message").value("E-mail ou senha inválidos."));
	}

	@Test
	void deveRejeitarLoginComDadosInvalidos() throws Exception {
		mockMvc.perform(post("/api/v1/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content(LOGIN_JSON.formatted("nao-e-um-email", "")))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.email").exists())
				.andExpect(jsonPath("$.fieldErrors.password").exists());
	}

	private void registrarUsuario(String nome, String email, String senha) throws Exception {
		mockMvc.perform(post("/api/v1/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content(CADASTRO_JSON.formatted(nome, email, senha)))
				.andExpect(status().isCreated());
	}
}
