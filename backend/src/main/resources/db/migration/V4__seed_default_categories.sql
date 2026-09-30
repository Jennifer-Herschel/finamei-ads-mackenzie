-- Default categories offered to every MEI. Fixed ids keep them stable across
-- environments; NOT EXISTS keeps the seed idempotent against the unique
-- (name, type) constraint.
INSERT INTO categories (id, name, type)
SELECT seed.id, seed.name, seed.type
FROM (
    VALUES
        (CAST('d56eb7f3-0f0d-465b-8ba8-586faaf66bb4' AS UUID), 'Venda de produtos', 'INCOME'),
        (CAST('f9182277-98ca-42ec-919e-583616c003f7' AS UUID), 'Prestação de serviços', 'INCOME'),
        (CAST('11884849-09c4-489c-9fa5-7793003e8291' AS UUID), 'Outras receitas', 'INCOME'),
        (CAST('e2e291db-c019-472a-b011-a5593028c35e' AS UUID), 'Mercadorias e matéria-prima', 'EXPENSE'),
        (CAST('b6dabeb1-c266-428f-8ef9-f3f626ca3f3b' AS UUID), 'Aluguel', 'EXPENSE'),
        (CAST('464621aa-784a-4693-b57f-74e96b83c962' AS UUID), 'Água, luz, telefone e internet', 'EXPENSE'),
        (CAST('1b5e6be3-3232-40e4-a74d-8533ee41913c' AS UUID), 'Transporte', 'EXPENSE'),
        (CAST('531cdbd0-8e4b-4858-95b0-a32e00136851' AS UUID), 'Impostos e taxas', 'EXPENSE'),
        (CAST('f9c0cf9c-d8bc-4b33-9a02-f2e8d75acb32' AS UUID), 'Marketing e divulgação', 'EXPENSE'),
        (CAST('127f87be-c1b0-440c-96d6-cea20d8cee21' AS UUID), 'Equipamentos e manutenção', 'EXPENSE'),
        (CAST('37bf5693-40e4-4444-8f2c-685c0c341a16' AS UUID), 'Outras despesas', 'EXPENSE')
) AS seed (id, name, type)
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = seed.name AND c.type = seed.type
);
