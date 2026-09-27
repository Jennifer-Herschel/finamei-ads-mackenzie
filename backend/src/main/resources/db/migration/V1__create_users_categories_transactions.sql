CREATE TABLE users (
    id              UUID PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(180) NOT NULL,
    password_hash   VARCHAR(100) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'MEI',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('MEI', 'ACCOUNTANT', 'ADMIN'))
);

CREATE TABLE categories (
    id              UUID PRIMARY KEY,
    name            VARCHAR(60) NOT NULL,
    type            VARCHAR(10) NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uk_categories_name_type UNIQUE (name, type),
    CONSTRAINT ck_categories_type CHECK (type IN ('INCOME', 'EXPENSE'))
);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id),
    category_id     UUID NOT NULL REFERENCES categories (id),
    type            VARCHAR(10) NOT NULL,
    amount          NUMERIC(12, 2) NOT NULL,
    date            DATE NOT NULL,
    description     VARCHAR(120) NOT NULL,
    deleted         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT ck_transactions_type CHECK (type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT ck_transactions_amount_positive CHECK (amount > 0)
);

CREATE INDEX ix_transactions_user_id ON transactions (user_id);
CREATE INDEX ix_transactions_category_id ON transactions (category_id);
CREATE INDEX ix_transactions_user_date ON transactions (user_id, date);
