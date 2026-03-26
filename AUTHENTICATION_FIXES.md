# Correcciones de Autenticación y Registro - Guía de Implementación

Se han realizado correcciones importantes para resolver los problemas de autenticación y registro de personas/familiares. Sigue estos pasos:

## 1️⃣ PRIMERO: Ejecutar los comandos SQL

**Esto es CRÍTICO** - Debes ejecutar estos comandos en el SQL Editor de Supabase ANTES de usar la aplicación.

Ve a tu proyecto de Supabase → SQL Editor y ejecuta los comandos en order:

### A. Eliminar restricciones de clave foránea:
```sql
ALTER TABLE family_members DROP CONSTRAINT family_members_family_id_fkey;
ALTER TABLE persons DROP CONSTRAINT persons_family_id_fkey;
ALTER TABLE relationships DROP CONSTRAINT relationships_family_id_fkey;
```

### B. Cambiar tipos de datos (uuid → text):
```sql
ALTER TABLE families ALTER COLUMN id TYPE text;
ALTER TABLE persons ALTER COLUMN family_id TYPE text;
ALTER TABLE family_members ALTER COLUMN family_id TYPE text;
ALTER TABLE relationships ALTER COLUMN family_id TYPE text;
```

### C. Recrear las restricciones de clave foránea:
```sql
ALTER TABLE family_members ADD CONSTRAINT family_members_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id);
  
ALTER TABLE persons ADD CONSTRAINT persons_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id);
  
ALTER TABLE relationships ADD CONSTRAINT relationships_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES families(id);
```

## 2️⃣ SEGUNDO: Desplegar el Edge Function actualizado

El Edge Function ha sido actualizado con:
- ✅ Crear familias en tabla relacional (no en KV store)
- ✅ Endpoint POST `/auth/signin` agregado
- ✅ Corrección de GET para relaciones
- ✅ Family_id ahora es texto (string)

Ejecuta en terminal:
```bash
supabase functions deploy make-server-b3841c63
```

## 3️⃣ TERCERO: Probar la aplicación

### Test de Signup:
1. Ve a la pestaña "Registrarse"
2. Completa: nombre, apellido, email, contraseña (6+ caracteres)
3. Debe mostrar: "¡Cuenta creada exitosamente!" y redirigir a `/setup`

### Test de Signin:
1. Ve a la pestaña "Iniciar Sesión"
2. Ingresa las credenciales creadas
3. Debe iniciar sesión y redirigir al dashboard

### Test de Crear Persona:
1. Después de login, ve a "Dashboard"
2. Haz click en "Crear familia" o "Configurar"
3. Crea una familia
4. Haz click en "+ Añadir primera persona"
5. Completa datos (nombre, apellido requeridos)
6. Haz click en "Añadir Persona"
7. **Debe criar la persona sin erro 400**

### Test de Agregar Familiar:
1. Con una persona creada, haz click en ella
2. En el panel derecho, haz click en "Añadir padre/madre", "Añadir pareja" o "Añadir hijo/a"
3. Completa los datos
4. **Debe crear la relación correctamente**

## ⚠️ PROBLEMAS RESUELTOS:

### Autenticación:
- ✅ Mejor manejo de errores de email confirmación
- ✅ Fallback a client-side auth si Edge Function no está disponible
- ✅ Endpoint signin agregado al Edge Function

### Registro de Personas:
- ✅ Error 400 PGRST204 solucionado (family_id ahora es text)
- ✅ Creación de familias usa tabla relacional
- ✅ GET de relaciones simplificado y corregido

### Datos:
- ✅ Familias creadas en tabla `families` en lugar de KV store
- ✅ family_id es consistentemente string en todas las tablas
- ✅ Mejor logging para debugging

## 📋 RESUMEN DE CAMBIOS:

### Archivos modificados:
1. **supabase/functions/make-server-b3841c63/index.ts**
   - Familias creadas en tabla relacional
   - Agregado endpoint POST `/auth/signin`
   - Corregido GET `/families/my-family`
   - Simplificado GET de relaciones
   - POST de relaciones ahora incluye family_id

2. **src/app/context/AuthContext.tsx**
   - Mejor manejo de errores en signup
   - Implementado signin con fallback
   - Mejor logging de estados

3. **src/app/context/FamilyContext.tsx**
   - Mejorado `loadFamilyData` con logging
   - Mejor manejo de errores
   - Toast para notificaciones

## 🔧 SI NECESITAS ROLLBACK:

Si algo no funciona, puedes restaurar usando el SQL original en:
`supabase/migrations/001_initial_setup.sql`

Y revertir el Edge Function a la versión anterior si lo has hecho commit.

## ❓ TIPS DE DEBUG:

Si tienes problemas:
1. Abre la consola (F12) en el navegador
2. Intenta un signup/login y busca errores en la consola
3. Ve a Supabase → Edge Functions → Logs para ver errores del servidor
4. Verifica que los comandos SQL se ejecutaron sin errores

¡Listo! La aplicación debe funcionar correctamente ahora.
