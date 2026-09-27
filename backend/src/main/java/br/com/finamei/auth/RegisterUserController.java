package br.com.finamei.auth;

import br.com.finamei.auth.dto.RegisterUserRequest;
import br.com.finamei.auth.dto.UserResponse;
import br.com.finamei.user.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class RegisterUserController {

	private final RegisterUserService registerUserService;

	public RegisterUserController(RegisterUserService registerUserService) {
		this.registerUserService = registerUserService;
	}

	@PostMapping("/register")
	public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterUserRequest request) {
		User user = registerUserService.register(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(user));
	}
}
