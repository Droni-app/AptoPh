# @aptoph/landing

Landing pública de **AptoPH**: Vue 3 + Vite + Tailwind 4, **prerenderizada** en el build. Los
buscadores y las redes sociales reciben el HTML completo sin ejecutar JavaScript, y después Vue
hidrata la página para lo interactivo (menú móvil).

```bash
pnpm dev:landing                              # desde la raíz → http://localhost:5175
pnpm --filter @aptoph/landing build       # dist/ listo para un hosting estático
pnpm --filter @aptoph/landing preview
```

## Cómo se construye

1. `vite build`: build del cliente (JS, CSS y fuentes con hash).
2. `vite build --ssr src/entry-server.ts`: versión de servidor de la app.
3. `scripts/prerender.ts`: renderiza la app a HTML y lo inserta en `dist/index.html`. También
   inyecta las etiquetas `<head>`, el JSON-LD y el `preload` de fuentes, y genera
   `robots.txt` y `sitemap.xml`.

`dist/` es estático: se puede publicar en cualquier CDN (Cloudflare Pages, Netlify, S3 +
CloudFront, Nginx).

## SEO incluido

| Elemento | Dónde |
| --- | --- |
| HTML completo prerenderizado, un solo `<h1>`, `<section>` con `<h2>`, landmarks y enlace "Saltar al contenido" | `src/components/*` |
| `<title>` y meta description (de `content.ts`), `canonical` y `hreflang` es-CO | `src/seo.ts` → `headTags` |
| Open Graph y Twitter Card con imagen de 1200×630 | `public/og-image.png` (de `docs/brand`) |
| Datos estructurados: `Organization`, `WebSite`, `SoftwareApplication` y `FAQPage` | `src/seo.ts` → `structuredData` |
| `robots.txt` y `sitemap.xml` con la URL pública | `scripts/prerender.ts` |
| Favicon, apple-touch-icon y web manifest | `public/` |
| Rendimiento: fuentes propias (sin Google Fonts) con `preload`, logo SVG inline, sin imágenes pesadas, CSS en un solo archivo | `main.ts`, `prerender.ts` |
| FAQ con `<details>` nativo: funciona sin JS y las respuestas quedan en el HTML | `FaqSection.vue` |

## Contenido

Todo el texto está en **`src/content.ts`**. Los componentes y el JSON-LD de la FAQ se generan
desde ahí, así que nunca se desincronizan. Los textos describen lo que el modelo de datos ya
soporta. Las asambleas, las notificaciones push y el presupuesto aparecen como
**Próximamente**.

## Configuración

| Variable | Uso |
| --- | --- |
| `VITE_SITE_URL` | URL pública sin `/` final (canonical, sitemap, Open Graph). **Es obligatoria y debe ser el dominio real** |
| `VITE_APP_URL` | Enlace "Ingresar" (backoffice) |
| `VITE_CONTACT_EMAIL` | Correo de los botones "Solicitar demo" (`mailto:`) |

Los valores están en `.env.development` y `.env.production`. En CI o en local se pueden
sobrescribir con `.env.production.local`.

## Tests

`src/__tests__/prerender.spec.ts` comprueba que:

- el HTML renderizado contiene todos los módulos y preguntas;
- hay un único `<h1>`;
- el JSON-LD de la FAQ coincide con el contenido;
- `title` y `description` tienen una longitud adecuada para buscadores.
