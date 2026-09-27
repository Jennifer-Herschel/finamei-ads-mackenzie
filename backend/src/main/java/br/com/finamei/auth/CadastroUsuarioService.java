package br.com.finamei.auth;

import br.com.finamei.auth.dto.CadastroUsuarioRequest;
import br.com.finamei.shared.error.EmailJaCadastradoException;
import br.com.finamei.usuario.Usuario;
import br.com.finamei.usuario.UsuarioRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CadastroUsuarioService {

	private final UsuarioRepository usuarioRepository;
	private final PasswordEncoder passwordEncoder;

	public CadastroUsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
		this.usuarioRepository = usuarioRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public Usuario cadastrar(CadastroUsuarioRequest request) {
		String email = request.email().trim().toLowerCase();

		if (usuarioRepository.existsByEmail(email)) {
			throw new EmailJaCadastradoException();
		}

		Usuario usuario = new Usuario(request.nome().trim(), email, passwordEncoder.encode(request.senha()));

		try {
			return usuarioRepository.save(usuario);
		} catch (DataIntegrityViolationException ex) {
			throw new EmailJaCadastradoException();
		}
	}
}
