const email = import.meta.env.VITE_CONTACT_EMAIL

export const links = {
  email,
  demo: `mailto:${email}?subject=${encodeURIComponent('Quiero una demostración de AptoPH')}`,
  login: import.meta.env.VITE_APP_URL,
  web: import.meta.env.VITE_APP_URL,
  admin: import.meta.env.VITE_ADMIN_URL,
}
