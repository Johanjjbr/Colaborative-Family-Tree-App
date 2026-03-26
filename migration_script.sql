-- =====================================================
-- MIGRACIÓN: KV Store → Tablas Relacionales
-- =====================================================
-- Este script migra los datos existentes del KV store
-- a las tablas persons y relationships
-- =====================================================

-- Paso 1: Migrar personas
INSERT INTO persons (
  id, first_name, last_name, birth_date, birth_place, 
  death_date, occupation, biography, photo_url, gender, 
  family_id, created_at, updated_at
)
SELECT 
  -- Extraer ID del key (remover prefijo)
  CASE 
    WHEN key LIKE 'person_%' THEN 
      substring(key from position('_' in key) + 1)
    ELSE key 
  END as id,
  value->>'firstName' as first_name,
  value->>'lastName' as last_name,
  (value->>'birthDate')::date as birth_date,
  value->>'birthPlace' as birth_place,
  (value->>'deathDate')::date as death_date,
  value->>'occupation' as occupation,
  value->>'biography' as biography,
  value->>'photoUrl' as photo_url,
  value->>'gender' as gender,
  -- Extraer familyId del key
  CASE 
    WHEN key LIKE 'person_%' THEN 
      split_part(substring(key from position('_' in key) + 1), '_', 1)
    ELSE NULL 
  END as family_id,
  (value->>'createdAt')::timestamptz as created_at,
  now() as updated_at
FROM kv_store_b3841c63 
WHERE key LIKE 'person_%'
ON CONFLICT (id) DO NOTHING;

-- Paso 2: Migrar relaciones
INSERT INTO relationships (
  id, type, person1_id, person2_id, created_at, updated_at
)
SELECT 
  -- Extraer ID del key
  CASE 
    WHEN key LIKE 'relationship_%' THEN 
      substring(key from position('_' in key) + 1)
    ELSE key 
  END as id,
  value->>'type' as type,
  value->>'person1Id' as person1_id,
  value->>'person2Id' as person2_id,
  now() as created_at,
  now() as updated_at
FROM kv_store_b3841c63 
WHERE key LIKE 'relationship_%'
ON CONFLICT (id) DO NOTHING;

-- Paso 3: Verificar migración
SELECT 'Personas migradas:' as info, COUNT(*) as count FROM persons;
SELECT 'Relaciones migradas:' as info, COUNT(*) as count FROM relationships;

-- Opcional: Limpiar datos migrados del KV store (descomenta si quieres)
-- DELETE FROM kv_store_b3841c63 WHERE key LIKE 'person_%' OR key LIKE 'relationship_%';