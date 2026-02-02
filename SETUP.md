# Guía de Configuración - SubGhost

## Pasos para Configurar el Proyecto

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea una cuenta en [Supabase](https://supabase.com) si no tienes una.

2. Crea un nuevo proyecto en Supabase.

3. Ve a **SQL Editor** en el panel de Supabase y ejecuta el contenido del archivo `supabase/migrations/001_initial_schema.sql` para crear las tablas necesarias.

4. Ve a **Authentication > Providers**:
   - **Email** está habilitado por defecto; permite login con email y contraseña. Si activas "Confirm email", los usuarios deben verificar el correo antes de entrar (en desarrollo puedes dejarlo desactivado).
   - Configura los proveedores OAuth que quieras usar (Google, GitHub, etc.).

5. **Importante para OAuth:** Ve a **Authentication → URL Configuration** y añade en **Redirect URLs** la URL de callback de tu app:
   - Desarrollo: `http://localhost:3000/api/auth/callback`
   - Producción: `https://subghost.vercel.app/api/auth/callback`
   Sin esta URL, después de iniciar sesión con Google/GitHub volverás a la app sin sesión.

6. Obtén las credenciales de tu proyecto:
   - Ve a **Settings > API**
   - Copia la **Project URL**
   - Copia la **Publishable key** (nueva nomenclatura; antes era "anon key")

7. Crea el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_publishable_key
```

### 3. Generar Iconos PWA

Los iconos de la PWA deben estar en `public/icons/`. Puedes generar iconos usando:

- [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

Necesitas los siguientes tamaños:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384

### 4. Ejecutar el Proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Probar la Aplicación

1. Ve a `/login` y autentícate con email/contraseña o con Google (OAuth)
2. Agrega tus primeras suscripciones
3. Explora el dashboard y analytics
4. Prueba el modo offline desconectando tu conexión a internet

## Características Implementadas

✅ Autenticación con email/contraseña y OAuth (Google) con Supabase
✅ CRUD completo de suscripciones
✅ Dashboard con estadísticas
✅ Página de analytics con gráficos
✅ Soporte offline con IndexedDB
✅ Notificaciones push
✅ PWA configurada (instalable)
✅ Diseño responsive con Tailwind CSS

## Notas Importantes

- El servicio worker de PWA solo funciona en producción (`npm run build && npm start`)
- Las notificaciones requieren permisos del usuario
- El modo offline guarda los datos localmente y los sincroniza cuando vuelves a estar online
