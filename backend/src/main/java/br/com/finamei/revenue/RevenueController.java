package br.com.finamei.revenue;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/revenue")
public class RevenueController {

    private final RevenueService revenueService;

    public RevenueController(RevenueService revenueService) {
        this.revenueService = revenueService;
    }

    /** O usuário vem do token (ONF05); o cliente nunca informa de quem é o faturamento. */
    @GetMapping("/summary")
    public ResponseEntity<RevenueSummaryResponse> getSummary(
            @AuthenticationPrincipal UUID userId,
            @RequestParam int year) {
        return ResponseEntity.ok(revenueService.getAnnualSummary(userId, year));
    }
}
