const email = import.meta.env.VITE_CONTACT_EMAIL

export const links = {
  email,
  demo: `mailto:${email}?subject=${encodeURIComponent('Quiero una demostración de AptoPH')}`,
  login: import.meta.env.VITE_APP_URL,
  web: import.meta.env.VITE_APP_URL,
  admin: import.meta.env.VITE_ADMIN_URL,
  signup: signupUrl(),
  enterprise: `mailto:${email}?subject=${encodeURIComponent('Plan Empresarial de AptoPH')}`,
}

/** Sign-up page with the plan and units preselected */
export function signupUrl(params: { plan?: string; units?: number } = {}) {
  const query = new URLSearchParams()
  if (params.plan) query.set('plan', params.plan)
  if (params.units) query.set('unidades', String(params.units))
  const base = import.meta.env.VITE_SIGNUP_URL ?? '/registro'
  return query.size ? `${base}?${query}` : base
}
