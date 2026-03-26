# SQL Fixes - Cambiar tipos de datos

Ejecuta estos comandos **en orden** en el SQL Editor de Supabase:

## 1. Eliminar restricciones de clave foránea

```sql
ALTER TABLE family_members DROP CONSTRAINT family_members_family_id_fkey;
ALTER TABLE persons DROP CONSTRAINT persons_family_id_fkey;
ALTER TABLE relationships DROP CONSTRAINT relationships_family_id_fkey;
```

## 2. Cambiar tipos de datos

```sql
ALTER TABLE families ALTER COLUMN id TYPE text;
ALTER TABLE persons ALTER COLUMN family_id TYPE text;
ALTER TABLE family_members ALTER COLUMN family_id TYPE text;
ALTER TABLE relationships ALTER COLUMN family_id TYPE text;
```

## 3. Recrear restricciones de clave foránea

```sql
ALTER TABLE family_members ADD CONSTRAINT family_members_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id);
  
ALTER TABLE persons ADD CONSTRAINT persons_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id);
  
ALTER TABLE relationships ADD CONSTRAINT relationships_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id);
```

**Importante**: Ejecuta estos comandos ahora en el SQL Editor de Supabase antes de usar la aplicación.
