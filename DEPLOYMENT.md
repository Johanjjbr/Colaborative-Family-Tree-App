# Guía de Configuración y Deployment

## Estado Actual

La aplicación está funcionando en **modo de desarrollo** usando autenticación del cliente (client-side auth) como fallback, ya que el Edge Function no está desplegado.

## 🚀 Inicio Rápido (Para Desarrollo)

Para empezar a usar la aplicación inmediatamente:

1. **Configura Supabase para deshabilitar confirmación de email:**
   - Ve a: https://supabase.com/dashboard/project/fmuxdcmrvibfhvlbavti/auth/providers
   - En **Email**, desactiva la opción **"Confirm email"**
   - Guarda los cambios

2. **¡Listo!** Ya puedes registrarte y usar la aplicación

Ver `SUPABASE_CONFIG.md` para más detalles sobre configuración de email.

---

## 📦 Deployment del Edge Function (Opcional - Para Producción)

El Edge Function proporciona funcionalidades adicionales como:
- Validaciones server-side mejoradas
- Manejo centralizado de errores
- Sistema de invitaciones
- Gestión de familias y personas

### Requisitos

- Supabase CLI instalado
- Acceso al proyecto de Supabase

### Pasos para Desplegar

1. **Instalar Supabase CLI** (si no lo tienes):
```bash
npm install -g supabase
```

2. **Login a Supabase**:
```bash
supabase login
```

3. **Link al proyecto**:
```bash
supabase link --project-ref fmuxdcmrvibfhvlbavti
```

4. **Desplegar el Edge Function**:
```bash
supabase functions deploy server
```

5. **Verificar deployment**:
```bash
supabase functions list
```

### Variables de Entorno

Las siguientes variables se configuran automáticamente:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Verificar que Funciona

Una vez desplegado, recarga la aplicación. Deberías ver **"Servidor conectado"** en verde en la pantalla de autenticación.

---

## 🔄 Cómo Funciona el Sistema de Fallback

El sistema detecta automáticamente si el Edge Function está disponible:

1. **Edge Function disponible (desplegado):**
   - Usa el servidor para crear usuarios
   - Mejor validación y seguridad
   - Soporte completo para invitaciones
   - Indicador: ✅ "Servidor conectado"

2. **Edge Function no disponible (modo desarrollo):**
   - Usa autenticación directa del cliente
   - Funcionalidad básica de registro/login
   - Indicador: ⚠️ "Modo de desarrollo"

**Ambos modos funcionan correctamente** - el usuario no necesita hacer nada especial.

---

## 🐛 Troubleshooting

### "Por favor revisa tu email para confirmar tu cuenta"

**Solución:** Desactiva la confirmación de email en Supabase (ver paso 1 arriba) o configura un proveedor de email.

### "No se puede conectar con el servidor"

**Causa:** Edge Function no está desplegado (esto es normal en desarrollo).

**Solución:** El sistema usará automáticamente el modo de desarrollo. No necesitas hacer nada.

### Errores al desplegar Edge Function

**Verifica que:**
- Tienes acceso al proyecto de Supabase
- El Supabase CLI está correctamente configurado
- Estás en el directorio raíz del proyecto

---

## 📝 Resumen

**Para desarrollo local:**
1. Configura Supabase para deshabilitar confirmación de email
2. Usa la aplicación normalmente

**Para producción:**
1. Despliega el Edge Function siguiendo los pasos arriba
2. Configura un proveedor de email en Supabase
3. (Opcional) Configura dominios personalizados y HTTPS

