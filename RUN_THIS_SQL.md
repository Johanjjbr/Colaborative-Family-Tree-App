# 🔧 ACCIÓN REQUERIDA: Ejecuta Script SQL

## ⚠️ Error Actual

Tu aplicación está mostrando este error al intentar crear una familia:

```
infinite recursion detected in policy for relation "family_members"
```

**Causa:** Las políticas de seguridad (RLS) de la base de datos tienen un error de recursión infinita.

---

## ✅ Solución en 2 Pasos

### 📋 PASO 1: Abre el SQL Editor

Ve a esta URL:
```
https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/sql/new
```

### 📝 PASO 2: Ejecuta el Script de Corrección

1. **Copia TODO el contenido** del archivo: `supabase/migrations/003_fix_rls_no_recursion.sql`

2. **Pégalo en el SQL Editor** de Supabase

3. **Haz clic en "Run"** (botón verde) o presiona `Ctrl+Enter`

4. **Espera a ver:** ✅ `Success. No rows returned`

---

## 🎯 ¿Qué Hace Este Script?

El script:
1. ✅ Elimina las políticas problemáticas que causan recursión
2. ✅ Crea nuevas políticas simplificadas sin recursión
3. ✅ Mantiene la seguridad de los datos
4. ✅ Permite crear familias correctamente

**Compromiso temporal:** Solo los dueños de familia pueden hacer operaciones (suficiente para desarrollo).

---

## 🧪 Después del Script

1. **Recarga tu aplicación** en el navegador
2. **Intenta crear tu familia nuevamente**
3. **Debería funcionar sin errores**

---

## 📚 Archivos Relacionados

- `supabase/migrations/001_initial_setup.sql` - Setup inicial de tablas (ya ejecutado)
- `supabase/migrations/003_fix_rls_no_recursion.sql` - **← EJECUTA ESTE AHORA**
- `QUICK_FIX.md` - Guía completa de solución de problemas
- `DATABASE_SETUP.md` - Documentación detallada de la base de datos

---

## 🆘 ¿Problemas?

Si después del script sigues viendo errores:

1. Verifica que el script se ejecutó completamente
2. Revisa la consola del navegador (F12) para ver el error exacto
3. Lee `QUICK_FIX.md` para más soluciones

---

## ✨ Resultado Esperado

Después de ejecutar el script correctamente, verás en la consola:

```
✓ Creating family via direct DB access...
✓ Family created in DB: { id: "...", name: "..." }
✓ Family created successfully via direct DB, reloading data...
✓ Family loaded via direct DB: Tu Familia
```

Y la aplicación navegará automáticamente al dashboard con tu árbol familiar. 🎉
