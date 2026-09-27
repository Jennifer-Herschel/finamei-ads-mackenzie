package br.com.finamei.security;

import br.com.finamei.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

	static final String ROLE_CLAIM = "role";
	static final String EMAIL_CLAIM = "email";

	private final SecretKey key;
	private final Duration expiration;

	public JwtService(
			@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.expiration = Duration.ofMinutes(expirationMinutes);
	}

	public String generateToken(User user) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(user.getId().toString())
				.claim(EMAIL_CLAIM, user.getEmail())
				.claim(ROLE_CLAIM, user.getRole().name())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plus(expiration)))
				.signWith(key)
				.compact();
	}

	public long getExpirationSeconds() {
		return expiration.toSeconds();
	}

	public Claims parseClaims(String token) {
		return Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}
}
