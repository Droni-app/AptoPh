/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the landing, without trailing slash (canonical, sitemap, Open Graph) */
  readonly VITE_SITE_URL: string
  /** Back-office login URL ("Ingresar") */
  readonly VITE_APP_URL: string
  /** Sales contact email for the demo CTA */
  readonly VITE_CONTACT_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
