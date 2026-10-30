import { defaultImage } from '../../defaults/default-image'
import { textPlaceholder } from '../../defaults/text-placeholder'

export const hoverCard = {
  type: 'hover-card',
  backgroundImage: defaultImage(),
  hoverImage: defaultImage(),
  children: [
    {
      type: 'card',
      icon: 'mdi-headphones',
      color: 'white',
      content: textPlaceholder(),
      class: 'h5 text-bold text-white text-center text-shadow',
    },
    {
      type: 'card',
      icon: 'mdi-headphones',
      color: 'white',
      content: textPlaceholder(),
      class: 'default-text text-medium text-white text-center text-shadow',
    },
  ],
}
