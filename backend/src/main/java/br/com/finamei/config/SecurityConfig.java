package br.com.finamei.config;

import br.com.finamei.security.JwtAuthenticationFilter;
import br.com.finamei.security.JwtService;
import br.com.finamei.security.RestAccessDeniedHandler;
import br.com.finamei.security.RestAuthenticationEntryPoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

	private static final int BCRYPT_STRENGTH = 10;

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
	}

	@Bean
	SecurityFilterChain securityFilterChain(
			HttpSecurity http,
			JwtService jwtService,
			RestAuthenticationEntryPoint authenticationEntryPoint,
			RestAccessDeniedHandler accessDeniedHandler) throws Exception {
		return http
				.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.exceptionHandling(exception -> exception
						.authenticationEntryPoint(authenticationEntryPoint)
						.accessDeniedHandler(accessDeniedHandler))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								"/error",
								"/actuator/health",
								"/v3/api-docs/**",
								"/swagger-ui.html",
								"/swagger-ui/**",
								"/api/v1/auth/**")
						.permitAll()
						.anyRequest().authenticated())
				.addFilterBefore(new JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
				.build();
	}
}
