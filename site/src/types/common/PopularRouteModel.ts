export type PopularRouteModel = {
  id: number
  parentId: number
  isSegment: boolean
  slug: string
  link: string
  cityFrom: string
  cityTo: string
  price: number
  priceCurrency: string
  minPrice: number
  currency: string
  duration: number
  distance: number
  metaTitle: string
  metaDescription: string
  bannerImageId: number
  tags: string
}
