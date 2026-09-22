-- Nuevo campo en Ingresos: "Mts x rollo (aprox)". Es un dato manual,
-- aproximado, que se carga a mano por renglón junto con Nro. bultos.
alter table ingresos add column if not exists mts_por_rollo numeric;
