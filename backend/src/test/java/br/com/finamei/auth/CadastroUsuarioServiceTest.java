package br.com.finamei.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.finamei.auth.dto.CadastroUsuarioRequest;
import br.com.finamei.shared.error.EmailJaCadastradoException;
import br.com.finamei.usuario.Usuario;
import br.com.finamei.usuario.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class CadastroUsuarioServiceTest {

	@Mock
	private UsuarioRepository usuarioRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	@InjectMocks
	private CadastroUsuarioService cadastroUsuarioService;

	@Test
	void deveCadastrarUsuarioComEmailNormalizadoESenhaComHash() {
		CadastroUsuarioRequest request = new CadastroUsuarioRequest("Maria Silva", " Maria@Exemplo.com ", "senha123");
		when(usuarioRepository.existsByEmail("maria@exemplo.com")).thenReturn(false);
		when(passwordEncoder.encode("senha123")).thenReturn("hash-gerado");
		when(usuarioRepository.save(any(Usuario.class))).thenAnswer(chamada -> chamada.getArgument(0));

		Usuario usuario = cadastroUsuarioService.cadastrar(request);

		assertThat(usuario.getNome()).isEqualTo("Maria Silva");
		assertThat(usuario.getEmail()).isEqualTo("maria@exemplo.com");
		assertThat(usuario.getSenhaHash()).isEqualTo("hash-gerado");
		verify(usuarioRepository).save(any(Usuario.class));
	}

	@Test
	void deveRejeitarCadastroQuandoEmailJaExiste() {
		CadastroUsuarioRequest request = new CadastroUsuarioRequest("Maria Silva", "maria@exemplo.com", "senha123");
		when(usuarioRepository.existsByEmail("maria@exemplo.com")).thenReturn(true);

		assertThatThrownBy(() -> cadastroUsuarioService.cadastrar(request))
				.isInstanceOf(EmailJaCadastradoException.class);
	}

	@Test
	void deveRejeitarCadastroQuandoBancoRecusaEmailDuplicadoConcorrente() {
		CadastroUsuarioRequest request = new CadastroUsuarioRequest("Maria Silva", "maria@exemplo.com", "senha123");
		when(usuarioRepository.existsByEmail("maria@exemplo.com")).thenReturn(false);
		when(passwordEncoder.encode("senha123")).thenReturn("hash-gerado");
		when(usuarioRepository.save(any(Usuario.class))).thenThrow(new DataIntegrityViolationException("email duplicado"));

		assertThatThrownBy(() -> cadastroUsuarioService.cadastrar(request))
				.isInstanceOf(EmailJaCadastradoException.class);
	}
}
