package br.com.finamei.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.finamei.category.Category;
import br.com.finamei.category.CategoryRepository;
import br.com.finamei.user.User;
import br.com.finamei.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TransactionPersistenceTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    void devePersistirLancamentoComTipoExplicitoEValorDecimal() {
        User maria = userRepository.save(new User("Maria Silva", "maria.persistencia@exemplo.com", "hash"));
        Category vendas = categoryRepository.save(new Category("Vendas no atacado", TransactionType.INCOME));

        Transaction salvo = transactionRepository.saveAndFlush(new Transaction(
                maria.getId(), vendas.getId(), TransactionType.INCOME,
                new BigDecimal("1250.50"), LocalDate.of(2026, 9, 10), "Encomenda de doces"));
        entityManager.clear();

        Transaction lido = transactionRepository.findById(salvo.getId()).orElseThrow();
        assertThat(lido.getUserId()).isEqualTo(maria.getId());
        assertThat(lido.getCategoryId()).isEqualTo(vendas.getId());
        assertThat(lido.getType()).isEqualTo(TransactionType.INCOME);
        assertThat(lido.getAmount()).isEqualByComparingTo("1250.50");
        assertThat(lido.getTransactionDate()).isEqualTo(LocalDate.of(2026, 9, 10));
        assertThat(lido.getDescription()).isEqualTo("Encomenda de doces");
        assertThat(lido.isDeleted()).isFalse();
        assertThat(lido.getCreatedAt()).isNotNull();
    }

    @Test
    void devePersistirCategoriaEASuaInativacao() {
        Category categoria = categoryRepository.saveAndFlush(new Category("Frete", TransactionType.EXPENSE));
        categoria.deactivate();
        categoryRepository.flush();
        entityManager.clear();

        Category lida = categoryRepository.findById(categoria.getId()).orElseThrow();
        assertThat(lida.getName()).isEqualTo("Frete");
        assertThat(lida.getType()).isEqualTo(TransactionType.EXPENSE);
        assertThat(lida.isActive()).isFalse();
        assertThat(lida.acceptsNewTransactionOf(TransactionType.EXPENSE)).isFalse();
    }

    @Test
    void oBancoDeveRecusarValorNaoPositivoMesmoSemValidacaoDaAplicacao() {
        User maria = userRepository.save(new User("Maria Silva", "maria.valor.zero@exemplo.com", "hash"));
        Category vendas = categoryRepository.save(new Category("Vendas avulsas", TransactionType.INCOME));

        assertThatThrownBy(() -> transactionRepository.saveAndFlush(new Transaction(
                maria.getId(), vendas.getId(), TransactionType.INCOME,
                BigDecimal.ZERO, LocalDate.of(2026, 9, 10), "Valor zerado")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void oBancoDeveRecusarCategoriaInexistente() {
        User maria = userRepository.save(new User("Maria Silva", "maria.sem.categoria@exemplo.com", "hash"));

        assertThatThrownBy(() -> transactionRepository.saveAndFlush(new Transaction(
                maria.getId(), UUID.randomUUID(), TransactionType.EXPENSE,
                BigDecimal.TEN, LocalDate.of(2026, 9, 10), "Sem categoria")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
