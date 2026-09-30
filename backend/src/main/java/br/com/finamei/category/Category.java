package br.com.finamei.category;

import br.com.finamei.transaction.TransactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Classificação de receitas e despesas de um usuário (OF10). Categorias inativas
 * não entram em novos lançamentos (RN07).
 *
 * <p>Categorias sem usuário são os modelos padrão, copiados para cada MEI no cadastro.
 */
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Dono da categoria; {@code null} nos modelos padrão. */
    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Category() {
        // exigido pelo JPA
    }

    public Category(UUID userId, String name, TransactionType type) {
        this.userId = userId;
        this.name = name;
        this.type = type;
    }

    /** Cópia de um modelo padrão para o usuário. */
    static Category copyOf(Category template, UUID userId) {
        Category copy = new Category(userId, template.name, template.type);
        copy.active = template.active;
        return copy;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void rename(String newName) {
        this.name = newName;
    }

    /** Inativação (RN07): a categoria some dos novos lançamentos, mas continua nos já registrados. */
    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    /** Só categorias ativas e do mesmo tipo podem classificar um novo lançamento (RN06, RN07). */
    public boolean acceptsNewTransactionOf(TransactionType transactionType) {
        return active && type == transactionType;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public TransactionType getType() {
        return type;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
