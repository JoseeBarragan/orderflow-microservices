-- Seed de la tabla products (tabla de inventory).
-- Limpia products en cascade (tambien vacia stock_reservations por la FK)
-- e inserta 50 productos con datos aleatorios.

BEGIN;

TRUNCATE TABLE products CASCADE;

INSERT INTO products (name, available_stock, reserved_stock)
SELECT
  category[1 + ((gs - 1) % array_length(category, 1))]
    || ' ' || (adjectives[1 + ((gs * 7) % array_length(adjectives, 1))])
    || ' #' || gs,
  available,
  (floor(random() * (available + 1) * 0.3))::int AS reserved_stock
FROM (
  SELECT
    gs,
    (floor(random() * 1001))::int AS available
  FROM generate_series(1, 50) AS gs
) AS base
CROSS JOIN (
  SELECT ARRAY[
    'Laptop', 'Monitor', 'Teclado', 'Mouse', 'Auriculares',
    'Webcam', 'Silla', 'Escritorio', 'Hub USB', 'Disco SSD',
    'Cable HDMI', 'Mousepad', 'Microfono', 'Bocina', 'Tablet'
  ] AS category
) AS c
CROSS JOIN (
  SELECT ARRAY[
    'Pro', 'Lite', 'Max', 'Ultra', 'Plus',
    'Air', 'Gaming', 'Office', 'Plus', 'X'
  ] AS adjectives
) AS a;

COMMIT;
