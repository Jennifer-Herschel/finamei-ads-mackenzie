package db.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Makes categories belong to each user (OF10, RN07).
 *
 * <p>The categories seeded by V4 stay as templates ({@code user_id} null): they
 * are copied to every user on sign up and are never shown or changed directly.
 * Existing users get their own copies here, and their transactions are moved
 * from the template to the copy.
 *
 * <p>Written in Java so the new ids are generated the same way on PostgreSQL
 * and on H2 (tests).
 */
public class V5__MakeCategoriesPerUser extends BaseJavaMigration {

    private record Template(UUID id, String name, String type, boolean active) {}

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (Statement statement = connection.createStatement()) {
            statement.execute("ALTER TABLE categories ADD COLUMN user_id UUID REFERENCES users (id)");
            statement.execute("ALTER TABLE categories DROP CONSTRAINT uk_categories_name_type");
            statement.execute(
                    "ALTER TABLE categories ADD CONSTRAINT uk_categories_user_name_type UNIQUE (user_id, name, type)");
            statement.execute("CREATE INDEX ix_categories_user_id ON categories (user_id)");
        }

        List<Template> templates = findTemplates(connection);
        for (UUID userId : findUserIds(connection)) {
            for (Template template : templates) {
                UUID copyId = UUID.randomUUID();
                insertCopy(connection, copyId, userId, template);
                moveTransactions(connection, userId, template.id(), copyId);
            }
        }
    }

    private List<Template> findTemplates(Connection connection) throws Exception {
        List<Template> templates = new ArrayList<>();
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery(
                        "SELECT id, name, type, active FROM categories WHERE user_id IS NULL")) {
            while (rows.next()) {
                templates.add(new Template(
                        rows.getObject("id", UUID.class),
                        rows.getString("name"),
                        rows.getString("type"),
                        rows.getBoolean("active")));
            }
        }
        return templates;
    }

    private List<UUID> findUserIds(Connection connection) throws Exception {
        List<UUID> userIds = new ArrayList<>();
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery("SELECT id FROM users")) {
            while (rows.next()) {
                userIds.add(rows.getObject("id", UUID.class));
            }
        }
        return userIds;
    }

    private void insertCopy(Connection connection, UUID copyId, UUID userId, Template template) throws Exception {
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO categories (id, user_id, name, type, active) VALUES (?, ?, ?, ?, ?)")) {
            insert.setObject(1, copyId);
            insert.setObject(2, userId);
            insert.setString(3, template.name());
            insert.setString(4, template.type());
            insert.setBoolean(5, template.active());
            insert.executeUpdate();
        }
    }

    private void moveTransactions(Connection connection, UUID userId, UUID templateId, UUID copyId) throws Exception {
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE transactions SET category_id = ? WHERE user_id = ? AND category_id = ?")) {
            update.setObject(1, copyId);
            update.setObject(2, userId);
            update.setObject(3, templateId);
            update.executeUpdate();
        }
    }
}
