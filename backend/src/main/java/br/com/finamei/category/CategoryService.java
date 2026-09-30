package br.com.finamei.category;

import br.com.finamei.transaction.TransactionType;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    /**
     * Categorias do tipo informado (ou de todos, quando {@code null}), incluindo as
     * inativas: o cliente usa o campo {@code active} para decidir o que oferecer.
     */
    @Transactional(readOnly = true)
    public List<CategoryResponse> list(TransactionType type) {
        List<Category> categories = type == null
                ? categoryRepository.findAllByOrderByTypeAscNameAsc()
                : categoryRepository.findByTypeOrderByNameAsc(type);
        return categories.stream().map(CategoryResponse::from).toList();
    }
}
