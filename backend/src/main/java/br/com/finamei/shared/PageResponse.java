package br.com.finamei.shared;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * Listagem paginada da API. Formato estável e explícito, em vez de serializar
 * o {@code PageImpl} do Spring Data diretamente.
 *
 * @param number índice da página, começando em zero
 */
public record PageResponse<T>(List<T> content, int number, int size, long totalElements, int totalPages) {

    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
