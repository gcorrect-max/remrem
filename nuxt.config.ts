export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-04-03',
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],
  css: ['~/assets/css/main.css'],

  // ── LabVIEW backend connection ───────────────────────────────────────────
  // In production the Nuxt app is served by LabVIEW Web Service.
  // All API calls go to the same host/port as the page itself (same-origin).
  // During development override these via .env file:
  //   NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.50:8080
  //   NUXT_PUBLIC_WS_URL=ws://192.168.1.50:8080/ws
  runtimeConfig: {
    public: {
      // HTTP base URL for REST API (empty = same origin)
      labviewBaseUrl: '',
      // WebSocket URL – resolved at runtime in the plugin when empty
      wsUrl: '',
      // WebSocket path appended to window.location.host when wsUrl is empty
      wsPath: '/ws',
    },
  },

  app: {
    head: {
      title: 'HASLERRail – Test Dashboard',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
  },
})
