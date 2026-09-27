package br.com.finamei.auth;

import br.com.finamei.auth.dto.RegisterUserRequest;
import br.com.finamei.shared.error.EmailAlreadyRegisteredException;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegisterUserService {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	public RegisterUserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public User register(RegisterUserRequest request) {
		String email = request.email().trim().toLowerCase();

		if (userRepository.existsByEmail(email)) {
			throw new EmailAlreadyRegisteredException();
		}

		User user = new User(request.name().trim(), email, passwordEncoder.encode(request.password()));

		try {
			return userRepository.save(user);
		} catch (DataIntegrityViolationException ex) {
			throw new EmailAlreadyRegisteredException();
		}
	}
}
