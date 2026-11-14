const email = import.meta.env.VITE_CONTACT_EMAIL

export const links = {
  email,
  demo: `mailto:${email}?subject=${encodeURIComponent('Quiero una demostración de AptoPH')}`,
  login: import.meta.env.VITE_APP_URL,
}
