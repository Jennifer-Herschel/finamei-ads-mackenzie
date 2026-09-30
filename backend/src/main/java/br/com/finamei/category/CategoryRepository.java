package br.com.finamei.category;

import br.com.finamei.transaction.TransactionType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findAllByOrderByTypeAscNameAsc();

    List<Category> findByTypeOrderByNameAsc(TransactionType type);
}
