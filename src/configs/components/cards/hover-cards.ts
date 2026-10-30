export const hoverCards = {
  type: 'cards',
  ver: 2,
  width: 248,
  height: 360,
  size: 36,
  color: 'bright-grey',
  children: [
    {
      type: 'hover-card',
      backgroundImage: '/images/theme_4/bus-on-road.jpg',
      hoverImage: '/images/theme_4/driwer.jpg',
      children: [
        {
          type: 'card',
          icon: 'mdi-security',
          size: 48,
          color: 'white',
          content: 'Безпека та захист',
          class: 'text-20-600 text-white text-center text-shadow',
        },
        {
          type: 'card',
          icon: 'mdi-shield-car',
          size: 64,
          color: 'white',
          content: 'Професійні водії та регулярні перевірки безпеки',
          class: 'default-text text-medium text-white text-center text-shadow',
        },
      ],
    },
    {
      type: 'hover-card',
      backgroundImage: '/images/theme_4/city-light.jpg',
      hoverImage: '/images/theme_4/mobile.jpg',
      children: [
        {
          type: 'card',
          icon: 'mdi-clock-time-four',
          color: 'white',
          content: 'Гарантія вчасності text-shadow',
          class: 'text-20-600 text-white text-center',
        },
        {
          type: 'card',
          icon: 'mdi-clock-time-four-outline',
          size: 64,
          color: 'white',
          content: '99% пунктуальність з відстеженням в режимі реального часу',
          class: 'default-text text-medium text-white text-center text-shadow',
        },
      ],
    },
    {
      type: 'hover-card',
      backgroundImage: '/images/theme_4/best-price.jpg',
      hoverImage: '/images/theme_4/best-price.webp',
      opacity: 1,
      children: [
        {
          type: 'card',
          icon: 'mdi-currency-usd',
          color: 'white',
          content: 'Найкращі ціни',
          class: 'text-20-600 text-white text-center text-shadow',
        },
        {
          type: 'card',
          icon: 'mdi-currency-usd',
          color: 'white',
          content: 'Конкурентні тарифи без прихованих комісій',
          class: 'default-text text-medium text-white text-center text-shadow',
        },
      ],
    },
    {
      type: 'hover-card',
      backgroundImage: '/images/theme_4/client-serve.webp',
      hoverImage: '/images/theme_4/client-serve-1.jpg',
      children: [
        {
          type: 'card',
          icon: 'mdi-headphones',
          color: 'white',
          content: 'Підтримка 24/7',
          class: 'text-20-600 text-white text-center text-shadow',
        },
        {
          type: 'card',
          icon: 'mdi-headphones',
          color: 'white',
          content: 'Цілодобова підтримка клієнтів',
          class: 'default-text text-medium text-white text-center text-shadow',
        },
      ],
    },
  ],
}
