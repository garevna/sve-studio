import { textPlaceholder } from '../defaults/text-placeholder'

export function sectionWithTwoCards () {
  return {
    type: 'section',
    children: [
      {
        type: 'section',
        children: [
          {
            type: 'title',
            class: 'mb-5',
            content: textPlaceholder(),
          },
          {
            type: 'text',
            class: 'default-text text-bold text-black',
            content: '(+380) 99 555 45 14',
          },
          {
            type: 'text',
            class: 'default-text text-bold text-black',
            content: textPlaceholder(),
          },
          {
            type: 'title',
            class: 'text-primary mt-12 mb-5',
            content: textPlaceholder(),
          },
          {
            type: 'text-with-icon',
            class: 'mt-5',
            icon: 'mdi-email-fast',
            size: 20,
            color: 'blue-dark',
            content: textPlaceholder(),
            text: 'default-text text-medium',
          },
        ],
      },
      {
        type: 'section',
        children: [
          {
            type: 'title',
            class: 'text-primary mb-5',
            content: textPlaceholder(),
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-bold text-black',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-medium text-black',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-bold text-black mt-5',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-medium text-black',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-bold text-black mt-5',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-medium text-black',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-bold text-black mt-5',
          },
          {
            type: 'text',
            content: textPlaceholder(),
            class: 'default-text text-medium text-black',
          },
        ],
      },
    ],
  }
}
