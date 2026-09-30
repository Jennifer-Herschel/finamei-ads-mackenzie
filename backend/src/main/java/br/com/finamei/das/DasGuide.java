package br.com.finamei.das;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.UUID;

/** Monthly DAS guide of a MEI (OF14, RN05). */
@Entity
@Table(name = "das_guides")
public class DasGuide {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	/** First day of the month the guide refers to. */
	@Column(nullable = false)
	private LocalDate competence;

	@Column(name = "due_date", nullable = false)
	private LocalDate dueDate;

	@Column(nullable = false, precision = 10, scale = 2)
	private BigDecimal amount;

	@Column(name = "paid_at")
	private LocalDate paidAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private OffsetDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private OffsetDateTime updatedAt;

	protected DasGuide() {
	}

	public DasGuide(UUID userId, YearMonth competence, LocalDate dueDate, BigDecimal amount) {
		this.userId = userId;
		this.competence = competence.atDay(1);
		this.dueDate = dueDate;
		this.amount = amount;
	}

	@PrePersist
	private void onCreate() {
		OffsetDateTime now = OffsetDateTime.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	@PreUpdate
	private void onUpdate() {
		this.updatedAt = OffsetDateTime.now();
	}

	public void markAsPaid(LocalDate paymentDate) {
		this.paidAt = paymentDate;
	}

	public boolean isPaid() {
		return paidAt != null;
	}

	/** A guide not paid after its due date is shown as overdue (RN05). */
	public DasStatus statusOn(LocalDate today) {
		if (isPaid()) {
			return DasStatus.PAID;
		}
		return today.isAfter(dueDate) ? DasStatus.OVERDUE : DasStatus.PENDING;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public YearMonth getCompetence() {
		return YearMonth.from(competence);
	}

	public LocalDate getDueDate() {
		return dueDate;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public LocalDate getPaidAt() {
		return paidAt;
	}
}
