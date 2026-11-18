/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the landing, without trailing slash (canonical, sitemap, Open Graph) */
  readonly VITE_SITE_URL: string
  /** Resident web app ("Ingresar" and the resident demo) */
  readonly VITE_APP_URL: string
  /** Back office (administration demo) */
  readonly VITE_ADMIN_URL: string
  /** Self-service sign-up page hosted by the API (30-day trial) */
  readonly VITE_SIGNUP_URL: string
  /** Sales contact email for the demo CTA */
  readonly VITE_CONTACT_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
