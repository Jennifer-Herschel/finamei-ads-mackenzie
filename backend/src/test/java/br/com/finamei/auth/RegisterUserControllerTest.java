package br.com.finamei.auth;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.user.UserRepository;
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
class RegisterUserControllerTest {

	private static final String CADASTRO_JSON = """
			{"name": "%s", "email": "%s", "password": "%s"}
			""";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UserRepository userRepository;

	@Test
	void deveCadastrarUsuarioERetornar201SemExporSenha() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Maria Silva", "maria.silva@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").exists())
				.andExpect(jsonPath("$.name").value("Maria Silva"))
				.andExpect(jsonPath("$.email").value("maria.silva@exemplo.com"))
				.andExpect(jsonPath("$.role").value("MEI"))
				.andExpect(jsonPath("$.active").value(true))
				.andExpect(jsonPath("$.password").doesNotExist())
				.andExpect(jsonPath("$.passwordHash").doesNotExist())
				.andExpect(content().string(not(blankOrNullString())));

		assertUsuarioPersistidoComSenhaEmHash();
	}

	private void assertUsuarioPersistidoComSenhaEmHash() {
		var usuario = userRepository.findByEmail("maria.silva@exemplo.com").orElseThrow();
		org.assertj.core.api.Assertions.assertThat(usuario.getPasswordHash()).isNotEqualTo("senha123");
		org.assertj.core.api.Assertions.assertThat(usuario.getPasswordHash()).startsWith("$2");
	}

	@Test
	void deveRejeitarCadastroComEmailJaCadastrado() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Primeiro Usuario", "duplicado@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isCreated());

		String corpoDuplicado = CADASTRO_JSON.formatted("Segundo Usuario", "duplicado@exemplo.com", "outraSenha1");

		mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpoDuplicado))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("EMAIL_ALREADY_REGISTERED"));
	}

	@Test
	void deveRejeitarCadastroComEmailInvalido() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Maria Silva", "nao-e-um-email", "senha123");

		mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.email").exists());
	}

	@Test
	void deveRejeitarCadastroComSenhaForaDaPolitica() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Maria Silva", "maria.politica@exemplo.com", "abcdefgh");

		mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.password").exists());
	}

	@Test
	void deveRejeitarCadastroComNomeEmBranco() throws Exception {
		String corpo = CADASTRO_JSON.formatted(" ", "maria.nome@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.name").exists());
	}
}
