/**
 * Illustrations and icons of the 2026 brand (branding/), exported to WebP in src/assets/img.
 * Vite fingerprints each import, so they can be cached forever.
 */
import heroComunidad800 from './assets/img/hero-comunidad-800.webp'
import heroComunidad1200 from './assets/img/hero-comunidad-1200.webp'
import heroComunidad1920 from './assets/img/hero-comunidad-1920.webp'
import appMovil800 from './assets/img/app-movil-800.webp'
import appMovil1400 from './assets/img/app-movil-1400.webp'
import administracion800 from './assets/img/administracion-800.webp'
import administracion1400 from './assets/img/administracion-1400.webp'
import antes600 from './assets/img/antes-600.webp'
import antes1000 from './assets/img/antes-1000.webp'
import despues600 from './assets/img/despues-600.webp'
import despues1000 from './assets/img/despues-1000.webp'
import ctaNoche1200 from './assets/img/cta-noche-1200.webp'
import ctaNoche2304 from './assets/img/cta-noche-2304.webp'
import headerPagos900 from './assets/img/header-pagos-900.webp'
import headerPagos1600 from './assets/img/header-pagos-1600.webp'
import headerReservas900 from './assets/img/header-reservas-900.webp'
import headerReservas1600 from './assets/img/header-reservas-1600.webp'
import headerPorteria900 from './assets/img/header-porteria-900.webp'
import headerPorteria1600 from './assets/img/header-porteria-1600.webp'
import headerComunicados900 from './assets/img/header-comunicados-900.webp'
import headerComunicados1600 from './assets/img/header-comunicados-1600.webp'
import emptyBienvenida from './assets/img/empty-bienvenida.webp'
import emptySinResultados from './assets/img/empty-sin-resultados.webp'

/** A responsive image: `src` is the fallback, `srcset` lists every width */
export interface Picture {
  src: string
  srcset: string
  width: number
  height: number
}

function picture(sources: Record<number, string>, ratio: number): Picture {
  const widths = Object.keys(sources)
    .map(Number)
    .sort((a, b) => a - b)
  const largest = widths[widths.length - 1]!
  return {
    src: sources[largest]!,
    srcset: widths.map((w) => `${sources[w]} ${w}w`).join(', '),
    width: largest,
    height: Math.round(largest / ratio),
  }
}

export const art = {
  hero: picture(
    { 800: heroComunidad800, 1200: heroComunidad1200, 1920: heroComunidad1920 },
    16 / 9,
  ),
  appMovil: picture({ 800: appMovil800, 1400: appMovil1400 }, 16 / 9),
  administracion: picture({ 800: administracion800, 1400: administracion1400 }, 16 / 9),
  antes: picture({ 600: antes600, 1000: antes1000 }, 1.5),
  despues: picture({ 600: despues600, 1000: despues1000 }, 1.5),
  ctaNoche: picture({ 1200: ctaNoche1200, 2304: ctaNoche2304 }, 3),
  headerPagos: picture({ 900: headerPagos900, 1600: headerPagos1600 }, 3),
  headerReservas: picture({ 900: headerReservas900, 1600: headerReservas1600 }, 3),
  headerPorteria: picture({ 900: headerPorteria900, 1600: headerPorteria1600 }, 3),
  headerComunicados: picture({ 900: headerComunicados900, 1600: headerComunicados1600 }, 3),
  bienvenida: { src: emptyBienvenida, srcset: '', width: 640, height: 574 },
  sinResultados: { src: emptySinResultados, srcset: '', width: 640, height: 574 },
} satisfies Record<string, Picture>

/** Flat feature icons (128 px), by name */
const iconFiles = import.meta.glob<string>('./assets/img/icons/*.webp', {
  eager: true,
  import: 'default',
})

export function iconArt(name: string): string {
  const url = iconFiles[`./assets/img/icons/${name}.webp`]
  if (!url) throw new Error(`Missing icon art: ${name}`)
  return url
}
