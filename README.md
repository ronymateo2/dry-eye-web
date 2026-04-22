# dry-eye-web

Frontend de **NeuroEye Log (Weqe)** — PWA de salud para pacientes con ojo seco neuropático.

Construida con **React 19 + Vite 6**, instalable desde Safari (sin App Store), diseñada para uso con fotofobia — interfaz oscura sin modo claro.

## Stack

- [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [TanStack Query v5](https://tanstack.com/query) — estado servidor
- [idb-keyval](https://github.com/jakearchibald/idb-keyval) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — offline
- Deploy en [Cloudflare Pages](https://pages.cloudflare.com/)

## Requisitos

- Node.js 18+
- API corriendo localmente (ver [dry_eye_api](https://github.com/ronymateo2/dry_eye_api))

## Setup local

1. Clona el repo e instala dependencias:
   ```bash
   npm install
   ```

2. Levanta el servidor de desarrollo:
   ```bash
   npm run dev
   # → http://localhost:5173
   ```

   El `vite.config.ts` proxea `/api` → `http://localhost:8787` automáticamente.

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en puerto 5173 |
| `npm run build` | Build de producción (`dist/`) |
| `npm run preview` | Preview del build local |
| `npm run deploy` | Build + deploy a Cloudflare Pages |

## Pantallas

| Ruta | Descripción |
|---|---|
| `/register` | Registro diario de dolor (5 zonas), check-in principal |
| `/history` | Historial cronológico de registros |
| `/dashboard` | Analytics y correlaciones Spearman sueño↔dolor |
| `/report` | Generación de reporte PDF para el médico |
| `/profile` | Perfil y configuración |
| `/drop-types` | Gestión de tipos de gotas personalizados |
| `/auth/callback` | Callback de Google OAuth |

## Diseño

Paleta amber sobre carbón oscuro caliente — basada en evidencia clínica para fotofobia. Ver [DESIGN.md](./DESIGN.md) para el sistema de diseño completo, incluyendo variables CSS, tipografía, espaciado y componentes clave.

**No hay modo claro.** La fotofobia hace que una UI brillante sea físicamente dolorosa para los usuarios objetivo.

## Estrategia offline

Solo las **gotas** (`/drops`) se encolan en IndexedDB cuando no hay conexión. Al recuperar conectividad, `useOfflineSync` sincroniza automáticamente la cola.

## Deploy

```bash
# Configura la URL de la API en .env.production
VITE_API_URL=https://tu-worker.workers.dev/api

# Deploy a Cloudflare Pages
npm run deploy
```

## API

El backend que alimenta esta app vive en [dry_eye_api](https://github.com/ronymateo2/dry_eye_api).
