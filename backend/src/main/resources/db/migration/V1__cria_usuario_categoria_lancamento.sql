CREATE TABLE usuario (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(120) NOT NULL,
    email           VARCHAR(180) NOT NULL,
    senha_hash      VARCHAR(100) NOT NULL,
    papel           VARCHAR(20) NOT NULL DEFAULT 'MEI',
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uk_usuario_email UNIQUE (email),
    CONSTRAINT ck_usuario_papel CHECK (papel IN ('MEI', 'CONTADOR', 'ADMIN'))
);

CREATE TABLE categoria (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(60) NOT NULL,
    tipo            VARCHAR(10) NOT NULL,
    ativa           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uk_categoria_nome_tipo UNIQUE (nome, tipo),
    CONSTRAINT ck_categoria_tipo CHECK (tipo IN ('RECEITA', 'DESPESA'))
);

CREATE TABLE lancamento (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuario (id),
    categoria_id    BIGINT NOT NULL REFERENCES categoria (id),
    tipo            VARCHAR(10) NOT NULL,
    valor           NUMERIC(12, 2) NOT NULL,
    data            DATE NOT NULL,
    descricao       VARCHAR(120) NOT NULL,
    excluido        BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT ck_lancamento_tipo CHECK (tipo IN ('RECEITA', 'DESPESA')),
    CONSTRAINT ck_lancamento_valor_positivo CHECK (valor > 0)
);

CREATE INDEX ix_lancamento_usuario_id ON lancamento (usuario_id);
CREATE INDEX ix_lancamento_categoria_id ON lancamento (categoria_id);
CREATE INDEX ix_lancamento_usuario_data ON lancamento (usuario_id, data);
