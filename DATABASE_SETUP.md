# 🗄️ Configuración de Base de Datos

## Problema Actual
No puedes iniciar sesión y no ves las tablas en Supabase porque **la base de datos no está configurada**.

## 🚀 Solución Rápida (5 minutos)

### Paso 1: Ejecutar el Script SQL

1. **Ve al SQL Editor de Supabase:**
   ```
   https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/sql/new
   ```

2. **Copia TODO el contenido del archivo:**
   ```
   /tmp/sandbox/supabase/migrations/001_initial_setup.sql
   ```

3. **Pega el SQL en el editor**

4. **Haz clic en "Run"** (botón verde en la esquina inferior derecha)

5. **Verifica que se ejecutó correctamente:**
   - Deberías ver un mensaje de éxito
   - Si hay errores, léelos cuidadosamente

### Paso 2: Crear el Storage Bucket para Fotos

1. **Ve a Storage:**
   ```
   https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/storage/buckets
   ```

2. **Haz clic en "New bucket"**

3. **Configura el bucket:**
   - **Name:** `make-b3841c63-family-photos`
   - **Public:** ❌ Desactivado (OFF)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `image/*`

4. **Haz clic en "Create bucket"**

### Paso 3: Configurar Políticas de Storage

1. **En el bucket recién creado, ve a "Policies"**

2. **Agrega esta política para permitir uploads:**
   - Policy name: `Allow authenticated uploads`
   - Target roles: `authenticated`
   - Operation: `INSERT`
   - Policy definition:
   ```sql
   (bucket_id = 'make-b3841c63-family-photos' AND auth.role() = 'authenticated')
   ```

3. **Agrega política para lectura:**
   - Policy name: `Allow authenticated reads`
   - Target roles: `authenticated`
   - Operation: `SELECT`
   - Policy definition:
   ```sql
   (bucket_id = 'make-b3841c63-family-photos' AND auth.role() = 'authenticated')
   ```

### Paso 4: Desactivar Confirmación de Email (para desarrollo)

**⚠️ PASO CRÍTICO - No lo omitas**

1. **Ve a Authentication Settings:**
   ```
   https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/auth/providers
   ```

2. **Scroll hasta encontrar la sección "Email"**

3. **En la sección "Email Auth Provider":**
   - Busca la opción **"Confirm email"**
   - **DESACTÍVALO** (el toggle debe estar en OFF/gris)
   - Haz clic en **"Save"** (botón verde en la parte inferior)

4. **Verificación:**
   - Después de guardar, recarga la página
   - Verifica que el toggle de "Confirm email" esté en OFF

**¿Por qué es necesario?**
- Sin este paso, los usuarios necesitarán confirmar su email antes de poder usar la app
- En desarrollo, esto es molesto y ralentiza las pruebas
- El error "NEEDS_CONFIRMATION" aparece cuando este setting está activado

**Alternativa para producción:**
- Si quieres requerir confirmación de email en producción, déjalo activado
- Los usuarios recibirán un email de confirmación automáticamente
- El código maneja este flujo correctamente

### Paso 5: ¡Prueba la Aplicación!

1. **Recarga la aplicación** en tu navegador

2. **Intenta registrarte con un nuevo email:**
   - Usa un email diferente al que intentaste antes
   - Elige una contraseña de al menos 6 caracteres

3. **Deberías poder:**
   - Registrarte exitosamente
   - Entrar automáticamente
   - Ver la pantalla de configuración de familia

---

## ✅ Verificar que Todo Funcionó

### Verificar las Tablas

1. Ve al **Table Editor**:
   ```
   https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/editor
   ```

2. Deberías ver estas tablas:
   - ✅ `kv_store_b3841c63`
   - ✅ `families`
   - ✅ `family_members`
   - ✅ `persons`
   - ✅ `relationships`
   - ✅ `invitations`
   - ✅ `activities`

### Verificar el Storage Bucket

1. Ve a **Storage**:
   ```
   https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/storage/buckets
   ```

2. Deberías ver el bucket:
   - ✅ `make-b3841c63-family-photos`

---

## 🐛 Troubleshooting

### "Error ejecutando el SQL"

**Posibles causas:**
- Ya ejecutaste el script antes (algunas tablas ya existen)
- No tienes permisos suficientes

**Solución:**
Si el error dice "already exists", está bien. Las tablas ya fueron creadas. Solo verifica que todas las tablas estén presentes en el Table Editor.

### "No puedo crear el bucket"

**Solución:**
- Verifica que el nombre sea exactamente: `make-b3841c63-family-photos`
- Si ya existe, simplemente configura las políticas

### "Sigo sin poder iniciar sesión"

**Verifica:**
1. ¿Desactivaste la confirmación de email?
2. ¿Estás usando un email nuevo (no uno que intentaste registrar antes)?
3. ¿La contraseña tiene al menos 6 caracteres?

**Si aún no funciona:**
- Abre la consola del navegador (F12)
- Intenta iniciar sesión
- Copia cualquier error que veas en rojo
- Compártelo para ayudarte más

---

## 📊 ¿Qué Hace el Script SQL?

El script crea:

1. **Tabla KV Store** - Almacenamiento flexible clave-valor
2. **Tabla Families** - Árbol genealógico de cada familia
3. **Tabla Family Members** - Miembros que pertenecen a cada familia
4. **Tabla Persons** - Individuos en el árbol genealógico
5. **Tabla Relationships** - Relaciones entre personas
6. **Tabla Invitations** - Sistema de invitaciones
7. **Tabla Activities** - Historial de actividades
8. **Políticas de Seguridad (RLS)** - Protección de datos
9. **Índices** - Para consultas rápidas
10. **Triggers** - Para actualizar timestamps automáticamente

---

## 🎯 Resumen

**Pasos mínimos para que funcione:**
1. ✅ Ejecutar el SQL en Supabase
2. ✅ Crear el bucket de storage
3. ✅ Desactivar confirmación de email
4. ✅ Registrarte con un nuevo email

**Después de estos pasos, la aplicación funcionará completamente.**