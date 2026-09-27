package br.com.finamei.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.finamei.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.lang.reflect.Field;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

	private static final String SECRET = "test-secret-key-with-at-least-32-characters-1234567890";

	private final JwtService jwtService = new JwtService(SECRET, 30);

	@Test
	void deveGerarTokenComClaimsDoUsuario() throws Exception {
		User usuario = criarUsuario("maria@exemplo.com");

		String token = jwtService.generateToken(usuario);
		Claims claims = jwtService.parseClaims(token);

		assertThat(claims.getSubject()).isEqualTo(usuario.getId().toString());
		assertThat(claims.get(JwtService.EMAIL_CLAIM, String.class)).isEqualTo("maria@exemplo.com");
		assertThat(claims.get(JwtService.ROLE_CLAIM, String.class)).isEqualTo("MEI");
	}

	@Test
	void deveRejeitarTokenExpirado() throws Exception {
		JwtService servicoComExpiracaoNoPassado = new JwtService(SECRET, -1);
		User usuario = criarUsuario("maria@exemplo.com");

		String tokenExpirado = servicoComExpiracaoNoPassado.generateToken(usuario);

		assertThatThrownBy(() -> jwtService.parseClaims(tokenExpirado))
				.isInstanceOf(ExpiredJwtException.class);
	}

	@Test
	void deveRejeitarTokenAssinadoComOutraChave() throws Exception {
		JwtService servicoComOutraChave = new JwtService("outra-chave-secreta-com-pelo-menos-32-caracteres", 30);
		User usuario = criarUsuario("maria@exemplo.com");

		String tokenComOutraAssinatura = servicoComOutraChave.generateToken(usuario);

		assertThatThrownBy(() -> jwtService.parseClaims(tokenComOutraAssinatura))
				.isInstanceOf(JwtException.class);
	}

	@Test
	void deveRejeitarTokenMalformado() {
		assertThatThrownBy(() -> jwtService.parseClaims("token-invalido"))
				.isInstanceOf(JwtException.class);
	}

	private User criarUsuario(String email) throws Exception {
		User usuario = new User("Maria Silva", email, "hash");
		Field campo = User.class.getDeclaredField("id");
		campo.setAccessible(true);
		campo.set(usuario, UUID.randomUUID());
		return usuario;
	}
}
