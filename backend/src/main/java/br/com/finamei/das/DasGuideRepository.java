package br.com.finamei.das;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DasGuideRepository extends JpaRepository<DasGuide, UUID> {

	List<DasGuide> findByUserIdAndCompetenceBetweenOrderByCompetenceAsc(UUID userId, LocalDate start, LocalDate end);

	Optional<DasGuide> findByIdAndUserId(UUID id, UUID userId);
}
