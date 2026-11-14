export const config = {
  apiUrl: import.meta.env.VITE_API_URL.replace(/\/$/, ''),
  oauth: {
    clientId: import.meta.env.VITE_OAUTH_CLIENT_ID,
    redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI,
    postLogoutRedirectUri: import.meta.env.VITE_OAUTH_POST_LOGOUT_REDIRECT_URI,
  },
} as const
