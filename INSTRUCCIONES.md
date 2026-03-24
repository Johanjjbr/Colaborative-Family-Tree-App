# Árbol Genealógico Colaborativo - Guía de Uso

## 🌳 Sistema Completo Implementado

Tu aplicación de árbol genealógico ahora cuenta con un backend completo de Supabase que incluye:

### ✅ Funcionalidades Implementadas

1. **Autenticación de Usuarios**
   - Registro de nuevas cuentas
   - Inicio de sesión
   - Gestión de sesiones
   - Cierre de sesión

2. **Base de Datos Persistente**
   - Todos los datos se guardan en Supabase (base de datos PostgreSQL)
   - Los datos persisten entre sesiones
   - Sincronización en tiempo real

3. **Sistema de Familias**
   - Cada usuario puede crear su propio árbol familiar
   - Los datos se organizan por familia
   - Múltiples usuarios pueden pertenecer a la misma familia

4. **Sistema de Invitaciones**
   - Envía invitaciones por email
   - Links únicos de invitación
   - Aceptación de invitaciones con validación

5. **Almacenamiento de Fotos**
   - Subida de fotos de perfil (hasta 5MB)
   - Almacenamiento seguro en Supabase Storage
   - URLs firmadas con validez de 1 año

6. **Colaboración Multi-Usuario**
   - Múltiples familiares pueden editar el mismo árbol
   - Seguimiento de actividad reciente
   - Registro de quién hizo cada cambio

---

## 🚀 Cómo Usar la Aplicación

### 1. **Primer Uso - Crear una Cuenta**

1. Abre la aplicación (serás redirigido a `/auth`)
2. Ve a la pestaña **"Registrarse"**
3. Completa:
   - Nombre
   - Apellido
   - Email
   - Contraseña (mínimo 6 caracteres)
4. Haz clic en **"Crear Cuenta"**

### 2. **Crear tu Árbol Familiar**

Después de registrarte:

1. Serás redirigido a `/setup`
2. Dale un nombre a tu árbol familiar (ej: "Familia García", "Los Pérez")
3. Haz clic en **"Crear Árbol Familiar"**
4. ¡Listo! Ahora puedes empezar a añadir familiares

### 3. **Añadir Familiares**

Desde el Dashboard o el árbol:

1. Haz clic en **"Añadir Familiar"** o en **"Ver Árbol Completo"**
2. Haz clic en un nodo existente y selecciona:
   - **Añadir Padre/Madre**: Añade un padre
   - **Añadir Hijo/a**: Añade un hijo
   - **Añadir Pareja**: Añade una pareja
3. Completa el formulario:
   - **Nombre y Apellidos** (obligatorio)
   - Género
   - Fecha y lugar de nacimiento
   - Ocupación
   - Biografía
   - **Subir foto**: Haz clic en "Subir foto" y selecciona una imagen
4. Haz clic en **"Añadir Persona"**

### 4. **Invitar Familiares**

Para que otros miembros de tu familia colaboren:

1. En el Dashboard, haz clic en **"Invitar Familia"**
2. Ingresa el **email** del familiar
3. Haz clic en **"Crear Invitación"**
4. Se generará un **link único**
5. **Copia el link** y envíaselo por email, WhatsApp, etc.

### 5. **Aceptar una Invitación**

Si recibiste un link de invitación:

1. Abre el link (ej: `https://tu-app.com/invitation/xyz123`)
2. Si no tienes cuenta:
   - Haz clic en **"Iniciar Sesión para Aceptar"**
   - Regístrate con tus datos
   - Vuelve a abrir el link de invitación
3. Si ya tienes cuenta, inicia sesión
4. Haz clic en **"Aceptar Invitación"**
5. ¡Ahora formas parte del árbol familiar!

---

## 📊 Estructura de Datos

### Dónde se Guardan los Datos

Todo se almacena en **Supabase** usando una tabla clave-valor (`kv_store_b3841c63`):

1. **Familias**: `family_XXXXX`
   - Información del árbol familiar
   - Lista de miembros
   - Fecha de creación

2. **Personas**: `person_FAMILYID_XXXXX`
   - Datos de cada familiar
   - Relaciones familiares
   - Fotos de perfil

3. **Relaciones**: `relationship_FAMILYID_XXXXX`
   - Conexiones padre-hijo
   - Conexiones de pareja

4. **Actividades**: `activity_FAMILYID_XXXXX`
   - Registro de cambios
   - Quién hizo qué

5. **Invitaciones**: `invitation_XXXXX`
   - Links de invitación
   - Estado (pendiente/aceptada)

6. **Fotos**: Bucket `make-b3841c63-family-photos`
   - Almacenamiento seguro
   - URLs firmadas con expiración

---

## 🔐 Seguridad y Privacidad

### ⚠️ IMPORTANTE - Privacidad de Datos

**Figma Make no está diseñado para recopilar información personal identificable (PII) o asegurar datos sensibles.** 

Si planeas usar datos reales de tu familia:

1. **Informa a todos los usuarios** que sus datos se almacenarán en Supabase
2. **Obtén consentimiento** de los familiares antes de agregar su información
3. **No incluyas datos sensibles** como números de identificación, direcciones completas, etc.
4. **Considera las implicaciones de privacidad** para todos los miembros

### Autenticación

- Todos los endpoints están protegidos con autenticación
- Se requiere un `access_token` válido para operaciones
- Las invitaciones tienen validación de estado

### Almacenamiento

- Las fotos se almacenan en un bucket **privado**
- Se generan URLs firmadas con validez de 1 año
- Límite de 5MB por imagen

---

## 🛠️ Estructura Técnica

### Backend (Supabase Edge Functions)

**Servidor**: `/supabase/functions/server/index.tsx`

**Rutas implementadas**:

```
POST   /make-server-b3841c63/auth/signup
POST   /make-server-b3841c63/families
GET    /make-server-b3841c63/families/my-family
GET    /make-server-b3841c63/families/:familyId/persons
POST   /make-server-b3841c63/families/:familyId/persons
PUT    /make-server-b3841c63/families/:familyId/persons/:personId
DELETE /make-server-b3841c63/families/:familyId/persons/:personId
GET    /make-server-b3841c63/families/:familyId/relationships
POST   /make-server-b3841c63/families/:familyId/relationships
GET    /make-server-b3841c63/families/:familyId/activities
POST   /make-server-b3841c63/families/:familyId/invitations
GET    /make-server-b3841c63/invitations/:invitationId
POST   /make-server-b3841c63/invitations/:invitationId/accept
POST   /make-server-b3841c63/upload-photo
```

### Frontend (React)

**Contextos**:
- `AuthContext`: Gestión de autenticación
- `FamilyContext`: Gestión de datos del árbol

**Páginas**:
- `/auth`: Login y registro
- `/setup`: Crear árbol familiar
- `/`: Dashboard principal
- `/tree`: Visualización del árbol
- `/invitation/:id`: Aceptar invitación

---

## 📱 Flujo de Usuario Completo

```
1. NUEVO USUARIO
   ↓
2. /auth → Registrarse
   ↓
3. /setup → Crear Familia "Familia García"
   ↓
4. / → Dashboard
   ↓
5. Añadir personas al árbol
   ↓
6. Invitar familiares
   ↓
7. Compartir link de invitación

---

1. USUARIO INVITADO
   ↓
2. Recibe link → /invitation/xyz123
   ↓
3. /auth → Registrarse/Login
   ↓
4. /invitation/xyz123 → Aceptar
   ↓
5. / → Dashboard (mismo árbol familiar)
   ↓
6. Puede editar y añadir personas
```

---

## 🎯 Próximos Pasos Recomendados

1. **Prueba el flujo completo**:
   - Crea una cuenta
   - Crea tu familia
   - Añade algunas personas
   - Sube fotos
   - Crea una invitación

2. **Invita a un familiar**:
   - Genera un link de invitación
   - Pídele a alguien que lo abra
   - Verifica que puedan unirse y editar

3. **Personaliza según necesites**:
   - Los datos están persistiendo en Supabase
   - Puedes añadir más campos a los perfiles
   - Puedes personalizar los permisos

---

## ❓ Preguntas Frecuentes

### ¿Los datos se guardan automáticamente?

Sí, cada cambio se guarda inmediatamente en Supabase.

### ¿Puedo usar la app sin internet?

No, necesitas conexión a internet para sincronizar con Supabase.

### ¿Cuántas personas puedo añadir?

No hay límite definido, el árbol crece exponencialmente.

### ¿Puedo pertenecer a múltiples familias?

Por ahora, cada usuario solo puede pertenecer a una familia.

### ¿Qué pasa si pierdo el link de invitación?

Puedes generar un nuevo link desde el dashboard.

### ¿Cuánto tiempo son válidas las invitaciones?

Las invitaciones no expiran, pero solo se pueden usar una vez.

---

## 🎨 Características de Diseño

- **Mobile-First**: Responsive en todos los dispositivos
- **Accesible**: Diseño legible para todas las edades
- **Colores**: Verde bosque (#3D6F42) como primario
- **Zoom y Pan**: Navega por árboles grandes fácilmente
- **Minimalista**: Interfaz clara y sin complejidad

---

## 📝 Notas Técnicas

- **Autenticación**: Supabase Auth con confirmación automática de email
- **Base de datos**: KV Store con prefijos organizados por familia
- **Storage**: Bucket privado con URLs firmadas
- **Framework**: React + React Router + Tailwind CSS
- **Backend**: Deno + Hono en Supabase Edge Functions

---

¡Disfruta construyendo tu árbol genealógico colaborativo! 🌳👨‍👩‍👧‍👦
