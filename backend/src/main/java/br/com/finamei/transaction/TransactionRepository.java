package br.com.finamei.transaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /** Lançamentos ativos (não excluídos, RN08) do usuário. */
    Page<Transaction> findByUserIdAndDeletedFalse(UUID userId, Pageable pageable);

    /** Soma de todos os lançamentos ativos de um usuário e tipo. Retorna {@code null} quando não há lançamentos. */
    @Query("""
            select sum(t.amount)
            from Transaction t
            where t.userId = :userId
              and t.type = :type
              and t.deleted = false
            """)
    BigDecimal sumAmountByUserAndType(@Param("userId") UUID userId, @Param("type") TransactionType type);

    /**
     * Soma os valores dos lançamentos ativos (não excluídos) de um usuário, de um tipo,
     * dentro do período informado (inclusive). Retorna {@code null} quando não há lançamentos.
     */
    @Query("""
            select sum(t.amount)
            from Transaction t
            where t.userId = :userId
              and t.type = :type
              and t.transactionDate between :start and :end
              and t.deleted = false
            """)
    BigDecimal sumAmountByUserAndTypeAndPeriod(
            @Param("userId") UUID userId,
            @Param("type") TransactionType type,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);
}
