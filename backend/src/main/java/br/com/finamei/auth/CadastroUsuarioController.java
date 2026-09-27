package br.com.finamei.auth;

import br.com.finamei.auth.dto.CadastroUsuarioRequest;
import br.com.finamei.auth.dto.UsuarioResponse;
import br.com.finamei.usuario.Usuario;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class CadastroUsuarioController {

	private final CadastroUsuarioService cadastroUsuarioService;

	public CadastroUsuarioController(CadastroUsuarioService cadastroUsuarioService) {
		this.cadastroUsuarioService = cadastroUsuarioService;
	}

	@PostMapping("/cadastro")
	public ResponseEntity<UsuarioResponse> cadastrar(@Valid @RequestBody CadastroUsuarioRequest request) {
		Usuario usuario = cadastroUsuarioService.cadastrar(request);
		return ResponseEntity.status(HttpStatus.CREATED).body(UsuarioResponse.de(usuario));
	}
}
