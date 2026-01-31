# SubTracker - PWA Detector de Suscripciones Olvidadas

Una Progressive Web App (PWA) para gestionar y detectar suscripciones olvidadas, construida con Next.js, Tailwind CSS y Supabase.

## Características

- 🔐 Autenticación OAuth con Supabase
- 📊 Dashboard con estadísticas y gráficos
- 🔔 Notificaciones push para recordatorios
- 📱 Funciona offline (PWA)
- 🎨 Diseño moderno con Tailwind CSS
- 📈 Analytics de gastos

## Configuración

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno:
Copia `.env.local.example` a `.env.local` y completa con tus credenciales de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima
```

3. Configura Supabase:
- Crea un proyecto en [Supabase](https://supabase.com)
- Ejecuta el SQL de migración para crear las tablas (ver `supabase/migrations/`)
- Configura los proveedores OAuth en Authentication > Providers

4. Ejecuta el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

- `app/` - Rutas y páginas de Next.js App Router
- `components/` - Componentes React reutilizables
- `lib/` - Utilidades y clientes (Supabase, hooks)
- `types/` - Definiciones TypeScript
- `public/` - Archivos estáticos y manifest PWA

## Tecnologías

- Next.js 14+ (App Router)
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- React Hook Form + Zod
- date-fns
- Lucide React
- Recharts
- next-pwa
