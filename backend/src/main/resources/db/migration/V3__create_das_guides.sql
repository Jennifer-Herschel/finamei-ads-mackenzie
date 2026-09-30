CREATE TABLE das_guides (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id),
    competence      DATE NOT NULL,
    due_date        DATE NOT NULL,
    amount          NUMERIC(10, 2) NOT NULL,
    paid_at         DATE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uk_das_guides_user_competence UNIQUE (user_id, competence),
    CONSTRAINT ck_das_guides_competence_first_day CHECK (EXTRACT(DAY FROM competence) = 1),
    CONSTRAINT ck_das_guides_amount_positive CHECK (amount > 0)
);

CREATE INDEX ix_das_guides_user_id ON das_guides (user_id);
