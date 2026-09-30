package br.com.finamei.transaction;

import java.util.Locale;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

/** Consulta dos lançamentos ativos de um usuário com os filtros opcionais da OF09. */
final class TransactionSpecifications {

    private static final char LIKE_ESCAPE = '\\';

    private TransactionSpecifications() {
    }

    static Specification<Transaction> activeOfUser(UUID userId, TransactionFilter filter) {
        Specification<Transaction> specification = (root, query, cb) -> cb.and(
                cb.equal(root.get("userId"), userId),
                cb.isFalse(root.get("deleted")));

        if (filter.from() != null) {
            specification = specification.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("transactionDate"), filter.from()));
        }
        if (filter.to() != null) {
            specification = specification.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("transactionDate"), filter.to()));
        }
        if (filter.type() != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("type"), filter.type()));
        }
        if (filter.categoryId() != null) {
            specification = specification.and((root, query, cb) ->
                    cb.equal(root.get("categoryId"), filter.categoryId()));
        }
        if (filter.description() != null && !filter.description().isBlank()) {
            String pattern = "%" + escapeLike(filter.description().trim().toLowerCase(Locale.ROOT)) + "%";
            specification = specification.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("description")), pattern, LIKE_ESCAPE));
        }
        return specification;
    }

    // "%" e "_" digitados pelo usuário são procurados literalmente.
    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
