package br.com.finamei.auth;

import br.com.finamei.auth.dto.LoginRequest;
import br.com.finamei.auth.dto.LoginResponse;
import br.com.finamei.security.JwtService;
import br.com.finamei.shared.error.InvalidCredentialsException;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LoginService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	public LoginService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional(readOnly = true)
	public LoginResponse login(LoginRequest request) {
		String email = request.email().trim().toLowerCase();

		User user = userRepository.findByEmail(email)
				.filter(User::isActive)
				.orElseThrow(InvalidCredentialsException::new);

		if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new InvalidCredentialsException();
		}

		String token = jwtService.generateToken(user);
		return LoginResponse.of(token, jwtService.getExpirationSeconds());
	}
}
