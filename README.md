# 🌳 Árbol Genealógico Colaborativo

Aplicación web para crear y gestionar árboles genealógicos de forma colaborativa con tu familia.

## 🚀 Quick Start

### Primera Vez / No Puedes Iniciar Sesión?

**⚠️ Si ves el error "NEEDS_CONFIRMATION":**

Lee **[QUICK_FIX.md](./QUICK_FIX.md)** - Solución en 2 minutos

**📊 Si no ves las tablas en Supabase:**

Lee **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Configuración completa de base de datos

### Setup Normal

1. **Instala dependencias:**
   ```bash
   npm install
   ```

2. **Configura Supabase:**
   - Lee `DATABASE_SETUP.md` para configurar la base de datos
   - Asegúrate de desactivar "Confirm email" en Auth Settings (ver QUICK_FIX.md)

3. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

4. **Abre en el navegador:**
   ```
   http://localhost:5173
   ```

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── components/      # Componentes reutilizables
│   │   ├── ui/         # Componentes de UI básicos
│   │   ├── TreeCanvas.tsx
│   │   ├── PersonNode.tsx
│   │   ├── ProfileDrawer.tsx
│   │   └── ...
│   ├── pages/          # Páginas de la aplicación
│   │   ├── Auth.tsx    # Login/Registro
│   │   ├── Setup.tsx   # Configuración inicial
│   │   ├── Tree.tsx    # Vista del árbol
│   │   └── Dashboard.tsx
│   ├── context/        # Context API
│   │   └── AuthContext.tsx
│   └── utils/          # Utilidades
│       └── testConnection.ts
├── lib/
│   └── supabase/       # Cliente de Supabase
└── styles/
    ├── theme.css       # Tokens de diseño
    └── fonts.css       # Fuentes
```

---

## 🎨 Características

### ✅ Implementadas

- 🔐 **Autenticación de usuarios** con Supabase
- 👥 **Sistema de invitaciones** por email
- 🌳 **Canvas interactivo** con zoom y pan
- 👤 **Perfiles detallados** con fotos
- 📊 **Dashboard** con estadísticas
- 💾 **Persistencia** de datos en tiempo real
- 📱 **Responsive** - Mobile y Desktop
- 🎨 **Paleta de colores** consistente (#3D6F42)
- ♿ **Accesible** - Navegación por teclado

### 🔄 Sistema de Fallback

La aplicación detecta automáticamente si el Edge Function está disponible:

- ✅ **Con Edge Function:** Autenticación server-side segura
- ✅ **Sin Edge Function:** Fallback automático a client-side auth **y acceso directo a la base de datos**
- 📝 Mensajes informativos en consola
- 🔄 **La aplicación funciona completamente sin deployar Edge Functions**

**Funcionalidades con Fallback Directo:**
- ✅ Autenticación de usuarios
- ✅ Crear familias
- ✅ Cargar datos de familia
- ✅ Agregar/editar/eliminar personas
- ✅ Gestionar relaciones
- ✅ Ver actividades

---

## 🗄️ Base de Datos

### Tablas Principales

- `kv_store_b3841c63` - Almacenamiento clave-valor flexible
- `families` - Información de cada familia
- `family_members` - Miembros de cada familia
- `persons` - Individuos en el árbol
- `relationships` - Relaciones entre personas
- `invitations` - Sistema de invitaciones
- `activities` - Historial de actividades

### Seguridad

- ✅ Row Level Security (RLS) activado
- ✅ Políticas configuradas por tabla
- ✅ Solo miembros de familia pueden ver datos

---

## 🐛 Troubleshooting

### Error: "NEEDS_CONFIRMATION"

**Solución rápida:** Lee [QUICK_FIX.md](./QUICK_FIX.md)

**Causa:** Confirmación de email está activada en Supabase  
**Fix:** Desactiva "Confirm email" en Auth Settings

### No veo las tablas en Supabase

**Solución:** Lee [DATABASE_SETUP.md](./DATABASE_SETUP.md)

Necesitas ejecutar el script SQL en `supabase/migrations/001_initial_setup.sql`

### "Modo de desarrollo" en pantalla de login

**Esto es normal** si no has deployado el Edge Function.  
La app funciona perfectamente con el fallback de client-side auth.

Para deployment del Edge Function: Lee [DEPLOYMENT.md](./DEPLOYMENT.md)

### No puedo subir fotos

**Verifica:**
1. Bucket `make-b3841c63-family-photos` existe en Storage
2. Políticas de Storage configuradas (ver DATABASE_SETUP.md paso 3)

---

## 📚 Documentación

### Configuración y Setup
- **[RUN_THIS_SQL.md](./RUN_THIS_SQL.md)** - 🔧 **EJECUTA ESTO PRIMERO** - Corrige el error de recursión en políticas RLS
- **[QUICK_FIX.md](./QUICK_FIX.md)** - 🚨 Solución rápida para errores comunes (NEEDS_CONFIRMATION y recursión RLS)
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - 📊 Guía completa de configuración de base de datos
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - 🚀 Guía para deployar Edge Functions (opcional)
- **[SUPABASE_CONFIG.md](./SUPABASE_CONFIG.md)** - ⚙️ Configuración de Supabase y variables de entorno

---

## 🛠️ Tecnologías

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Auth + Database + Storage)
- **Routing:** React Router v7
- **UI Components:** Custom components + shadcn/ui style
- **Icons:** Lucide React
- **Canvas:** React with HTML5 Canvas API
- **Notifications:** Sonner (react toast)

---

## 🎯 Próximos Pasos

Después de configurar la base de datos:

1. ✅ **Registra tu cuenta** en /auth
2. ✅ **Configura tu familia** en /setup
3. ✅ **Agrega miembros** en el árbol
4. ✅ **Invita familiares** desde el dashboard
5. ✅ **Colabora** en el árbol genealógico

---

## 🤝 Contribuir

Este es un proyecto en desarrollo activo. Si encuentras bugs o tienes sugerencias:

1. Verifica que seguiste DATABASE_SETUP.md
2. Lee QUICK_FIX.md si hay errores de autenticación
3. Revisa la consola del navegador (F12) para errores

---

## 📄 Licencia

MIT License - Uso libre

---

## 🙏 Créditos

- **Diseño:** Paleta verde bosque (#3D6F42)
- **Icons:** Lucide React
- **UI Inspiration:** Atomic Design principles

---

**¿Problemas?** Lee primero [QUICK_FIX.md](./QUICK_FIX.md) o [DATABASE_SETUP.md](./DATABASE_SETUP.md)