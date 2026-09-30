package br.com.finamei.category;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * Aplica a V5 sobre um banco que já tem usuário e lançamento, como aconteceria
 * num ambiente existente. Usa um banco H2 próprio, separado do contexto Spring.
 */
class CategoriesPerUserMigrationTest {

    private static final String VENDA_DE_PRODUTOS = "d56eb7f3-0f0d-465b-8ba8-586faaf66bb4";

    @Test
    void deveCopiarAsCategoriasPadraoParaOsUsuariosExistentesEMoverOsLancamentos() {
        SingleConnectionDataSource dataSource = new SingleConnectionDataSource(
                "jdbc:h2:mem:migracaov5;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE", "sa", "", true);
        try {
            verificarMigracao(dataSource);
        } finally {
            dataSource.destroy();
        }
    }

    private void verificarMigracao(SingleConnectionDataSource dataSource) {
        JdbcClient jdbc = JdbcClient.create(dataSource);

        migrarAte(dataSource, "4");
        UUID maria = UUID.randomUUID();
        UUID lancamento = UUID.randomUUID();
        jdbc.sql("""
                INSERT INTO users (id, name, email, password_hash, role, active)
                VALUES (:id, 'Maria', 'maria@exemplo.com', 'hash', 'MEI', TRUE)
                """)
                .param("id", maria).update();
        jdbc.sql("""
                INSERT INTO transactions (id, user_id, category_id, type, amount, date, description)
                VALUES (:id, :user, :category, 'INCOME', 100.00, DATE '2026-09-10', 'Venda')
                """)
                .param("id", lancamento).param("user", maria).param("category", UUID.fromString(VENDA_DE_PRODUTOS))
                .update();

        migrarAte(dataSource, "5");

        assertThat(jdbc.sql("SELECT COUNT(*) FROM categories WHERE user_id = :user").param("user", maria)
                .query(Integer.class).single()).isEqualTo(11);
        assertThat(jdbc.sql("SELECT COUNT(*) FROM categories WHERE user_id IS NULL")
                .query(Integer.class).single()).isEqualTo(11);

        UUID categoriaDoLancamento = jdbc.sql("SELECT category_id FROM transactions WHERE id = :id")
                .param("id", lancamento).query(UUID.class).single();
        assertThat(jdbc.sql("SELECT user_id FROM categories WHERE id = :id").param("id", categoriaDoLancamento)
                .query(UUID.class).single()).isEqualTo(maria);
        assertThat(jdbc.sql("SELECT name FROM categories WHERE id = :id").param("id", categoriaDoLancamento)
                .query(String.class).single()).isEqualTo("Venda de produtos");
    }

    private void migrarAte(SingleConnectionDataSource dataSource, String versao) {
        Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .target(versao)
                .load()
                .migrate();
    }
}
