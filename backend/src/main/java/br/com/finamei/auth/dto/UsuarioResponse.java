package br.com.finamei.auth.dto;

import br.com.finamei.usuario.Papel;
import br.com.finamei.usuario.Usuario;
import java.time.OffsetDateTime;

public record UsuarioResponse(Long id, String nome, String email, Papel papel, boolean ativo, OffsetDateTime criadoEm) {

	public static UsuarioResponse de(Usuario usuario) {
		return new UsuarioResponse(
				usuario.getId(),
				usuario.getNome(),
				usuario.getEmail(),
				usuario.getPapel(),
				usuario.isAtivo(),
				usuario.getCriadoEm());
	}
}
