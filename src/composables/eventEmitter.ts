import { ConfirmEvents } from '@/enums/ConfirmEvents'
import { InfoEvents } from '@/enums/InfoEvents'

// eslint-disable-next-line unicorn/prefer-set-has
const events: string[] = [
  ...Object.values(InfoEvents).map(event => `${event}-error`),
  ...Object.values(InfoEvents).map(event => `${event}-success`),
  ...Object.values(ConfirmEvents).map(event => `confirm-${event}`),
  ...Object.values(ConfirmEvents).map(event => `${event}-confirmation`),
  'show-trip-details',
  'show-common-popup',
  'show-input-popup',
  'show-call-popup',
  'ask-for-transfer',
  'scroll-by-ref',
  'scroll-to-switcher',
  'cancel-reservation-request',
  'cancel-reservation-response',
]

function srollByRef (event: Event) {
  const customEvent = event as CustomEvent
  const { ref } = customEvent.detail
  if (typeof ref === 'string') {
    // eslint-disable-next-line unicorn/prefer-query-selector
    const section = document.getElementById(ref)
    if (section) {
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 500)
    }
  }
}

const callbacks: { [key: string]: EventListener } = {}

export function setScrollListener () {
  window.addEventListener('scroll-by-ref', srollByRef)
}

export function setListener (eventName: string, callback: EventListener) {
  if (!events.includes(eventName)) {
    throw new Error(`Event ${eventName} is not supported`)
  }
  if (typeof callback !== 'function') {
    throw new TypeError(`Callback for event ${eventName} is not a function`)
  }
  if (!window) {
    throw new Error('Error accessing window object')
  }

  if (callbacks[eventName]) {
    window.removeEventListener(eventName, callbacks[eventName])
  }

  window.addEventListener(eventName, callback)
  callbacks[eventName] = callback
}

export function removeListener (eventName: string) {
  if (!events.includes(eventName)) {
    throw new Error(`Event ${eventName} is not supported`)
  }
  if (!callbacks[eventName]) {
    throw new Error(`No callback found for event ${eventName}`)
  }
  window.removeEventListener(eventName, callbacks[eventName])
}

export function dispatch (eventName: string, detail: object) {
  if (!events.includes(eventName)) {
    throw new Error(`Event ${eventName} is not supported`)
  }
  const name = eventName
  const event = new CustomEvent(name, { detail })
  window.dispatchEvent(event)
}
