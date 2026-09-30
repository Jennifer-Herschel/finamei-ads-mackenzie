package br.com.finamei.das;

import br.com.finamei.das.dto.DasGuideResponse;
import br.com.finamei.das.dto.PayDasRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/das")
public class DasController {

	private final DasService dasService;

	public DasController(DasService dasService) {
		this.dasService = dasService;
	}

	@GetMapping
	public ResponseEntity<List<DasGuideResponse>> list(
			@AuthenticationPrincipal UUID userId,
			@RequestParam int year) {
		return ResponseEntity.ok(dasService.listGuides(userId, year));
	}

	@PostMapping("/{id}/payment")
	public ResponseEntity<DasGuideResponse> pay(
			@AuthenticationPrincipal UUID userId,
			@PathVariable UUID id,
			@Valid @RequestBody PayDasRequest request) {
		return ResponseEntity.ok(dasService.pay(userId, id, request.paidAt()));
	}
}
