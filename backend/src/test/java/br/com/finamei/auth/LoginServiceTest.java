package br.com.finamei.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import br.com.finamei.auth.dto.LoginRequest;
import br.com.finamei.security.JwtService;
import br.com.finamei.shared.error.InvalidCredentialsException;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class LoginServiceTest {

	@Mock
	private UserRepository userRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	@Mock
	private JwtService jwtService;

	@InjectMocks
	private LoginService loginService;

	@Test
	void deveAutenticarEGerarTokenComCredenciaisCorretas() throws Exception {
		User usuario = criarUsuario("maria@exemplo.com", "hash-armazenado", true);
		when(userRepository.findByEmail("maria@exemplo.com")).thenReturn(Optional.of(usuario));
		when(passwordEncoder.matches("senha123", "hash-armazenado")).thenReturn(true);
		when(jwtService.generateToken(usuario)).thenReturn("token-gerado");
		when(jwtService.getExpirationSeconds()).thenReturn(1800L);

		var resposta = loginService.login(new LoginRequest(" Maria@Exemplo.com ", "senha123"));

		assertThat(resposta.token()).isEqualTo("token-gerado");
		assertThat(resposta.tokenType()).isEqualTo("Bearer");
		assertThat(resposta.expiresInSeconds()).isEqualTo(1800L);
	}

	@Test
	void deveRejeitarQuandoEmailNaoExiste() {
		when(userRepository.findByEmail("inexistente@exemplo.com")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> loginService.login(new LoginRequest("inexistente@exemplo.com", "senha123")))
				.isInstanceOf(InvalidCredentialsException.class);
	}

	@Test
	void deveRejeitarQuandoSenhaEstaIncorreta() throws Exception {
		User usuario = criarUsuario("maria@exemplo.com", "hash-armazenado", true);
		when(userRepository.findByEmail("maria@exemplo.com")).thenReturn(Optional.of(usuario));
		when(passwordEncoder.matches("senhaErrada", "hash-armazenado")).thenReturn(false);

		assertThatThrownBy(() -> loginService.login(new LoginRequest("maria@exemplo.com", "senhaErrada")))
				.isInstanceOf(InvalidCredentialsException.class);
	}

	@Test
	void deveRejeitarQuandoUsuarioEstaInativo() throws Exception {
		User usuario = criarUsuario("maria@exemplo.com", "hash-armazenado", false);
		when(userRepository.findByEmail("maria@exemplo.com")).thenReturn(Optional.of(usuario));

		assertThatThrownBy(() -> loginService.login(new LoginRequest("maria@exemplo.com", "senha123")))
				.isInstanceOf(InvalidCredentialsException.class);
	}

	private User criarUsuario(String email, String senhaHash, boolean ativo) throws Exception {
		User usuario = new User("Maria Silva", email, senhaHash);
		Field campoId = User.class.getDeclaredField("id");
		campoId.setAccessible(true);
		campoId.set(usuario, UUID.randomUUID());

		if (!ativo) {
			Field campoAtivo = User.class.getDeclaredField("active");
			campoAtivo.setAccessible(true);
			campoAtivo.set(usuario, false);
		}

		return usuario;
	}
}
