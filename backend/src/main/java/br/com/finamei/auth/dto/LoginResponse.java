package br.com.finamei.auth.dto;

public record LoginResponse(String token, String tokenType, long expiresInSeconds) {

	public static LoginResponse of(String token, long expiresInSeconds) {
		return new LoginResponse(token, "Bearer", expiresInSeconds);
	}
}
