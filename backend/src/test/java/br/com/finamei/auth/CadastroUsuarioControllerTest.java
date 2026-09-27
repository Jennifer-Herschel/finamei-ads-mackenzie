package br.com.finamei.auth;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.finamei.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CadastroUsuarioControllerTest {

	private static final String CADASTRO_JSON = """
			{"nome": "%s", "email": "%s", "senha": "%s"}
			""";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private UsuarioRepository usuarioRepository;

	@Test
	void deveCadastrarUsuarioERetornar201SemExporSenha() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Maria Silva", "maria.silva@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").exists())
				.andExpect(jsonPath("$.nome").value("Maria Silva"))
				.andExpect(jsonPath("$.email").value("maria.silva@exemplo.com"))
				.andExpect(jsonPath("$.papel").value("MEI"))
				.andExpect(jsonPath("$.ativo").value(true))
				.andExpect(jsonPath("$.senha").doesNotExist())
				.andExpect(jsonPath("$.senhaHash").doesNotExist())
				.andExpect(content().string(not(blankOrNullString())));

		assertUsuarioPersistidoComSenhaEmHash();
	}

	private void assertUsuarioPersistidoComSenhaEmHash() {
		var usuario = usuarioRepository.findByEmail("maria.silva@exemplo.com").orElseThrow();
		org.assertj.core.api.Assertions.assertThat(usuario.getSenhaHash()).isNotEqualTo("senha123");
		org.assertj.core.api.Assertions.assertThat(usuario.getSenhaHash()).startsWith("$2");
	}

	@Test
	void deveRejeitarCadastroComEmailJaCadastrado() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Primeiro Usuario", "duplicado@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isCreated());

		String corpoDuplicado = CADASTRO_JSON.formatted("Segundo Usuario", "duplicado@exemplo.com", "outraSenha1");

		mockMvc.perform(post("/api/v1/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpoDuplicado))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("EMAIL_JA_CADASTRADO"));
	}

	@Test
	void deveRejeitarCadastroComEmailInvalido() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Maria Silva", "nao-e-um-email", "senha123");

		mockMvc.perform(post("/api/v1/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.email").exists());
	}

	@Test
	void deveRejeitarCadastroComSenhaForaDaPolitica() throws Exception {
		String corpo = CADASTRO_JSON.formatted("Maria Silva", "maria.politica@exemplo.com", "abcdefgh");

		mockMvc.perform(post("/api/v1/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.senha").exists());
	}

	@Test
	void deveRejeitarCadastroComNomeEmBranco() throws Exception {
		String corpo = CADASTRO_JSON.formatted(" ", "maria.nome@exemplo.com", "senha123");

		mockMvc.perform(post("/api/v1/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.fieldErrors.nome").exists());
	}
}
