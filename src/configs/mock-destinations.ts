// The sample routes both "Популярні напрямки" variants draw.
//
// Production reads this from a live API (commonStore.popularRoutes, filled
// by /marshrut/routes/popular). The editor has no equivalent - and a route
// list is a control's CONTENT, not the control itself, so it has to look
// like real routes rather than lorem - so the same four routes stand in for
// it everywhere. Shared, not duplicated per variant, so switching variants
// shows the same journeys rather than a different set.
export interface MockDestination {
  cityFrom: string
  cityTo: string
  price: number
  // Hours as a fraction, exactly as the real API returns it - the sample has
  // to exercise the same formatting production does.
  duration: number
  // Whole kilometres, as the API returns them. Only variant 3 shows it, but
  // it belongs to the route rather than to a variant.
  distance: number
}

export const MOCK_DESTINATIONS: MockDestination[] = [
  { cityFrom: 'Київ', cityTo: 'Варшава', price: 45, duration: 12.5, distance: 790 },
  { cityFrom: 'Львів', cityTo: 'Прага', price: 38, duration: 10, distance: 1010 },
  { cityFrom: 'Одеса', cityTo: 'Будапешт', price: 52, duration: 18.25, distance: 1160 },
  { cityFrom: 'Харків', cityTo: 'Братислава', price: 60, duration: 23.75, distance: 1670 },
]
