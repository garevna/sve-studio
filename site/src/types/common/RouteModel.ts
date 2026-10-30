enum AvailableRoutes {
  AUTH = 'auth',
  DASH = 'user-dashboard',
  DYNAMIC = 'dynamic-page',
  // FEEDBACK = 'feedback',
  DIRECT_ROUTE_VARIANTS = 'direct-route-variants',
  BACK_ROUTE_VARIANTS = 'back-route-variants',
  DIRECT_TRIP = 'direct-trip',
  BACK_TRIP = 'back-trip',
  BIYER = 'buyer',
  PASSENGERS = 'passengers',
  CONFIRM_BOOKING = 'confirm-booking',
  GEO = 'geolocation',
}

export type RouteModel = `${AvailableRoutes}`
