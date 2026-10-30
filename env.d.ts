/// <reference types="vite/client" />

declare module 'vuetify/styles'

// Swiper's package.json `exports` map resolves these subpaths to real .css
// files (e.g. "swiper/css/navigation" -> "./modules/navigation.css"), but
// none of the import specifiers literally end in ".css", so Vite's ambient
// `declare module '*.css'` (from the vite/client reference above) doesn't
// match them - same situation as 'vuetify/styles' above.
declare module 'swiper/css'
declare module 'swiper/css/autoplay'
declare module 'swiper/css/navigation'
declare module 'swiper/css/pagination'
declare module 'swiper/css/thumbs'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

export {}
