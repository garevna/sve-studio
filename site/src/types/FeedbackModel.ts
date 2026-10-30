export type FeedbackModel = {
  ratingOverall: 0 | 1 | 2 | 3 | 4 | 5
  ratingBus: 1 | 2 | 3 | 4 | 5
  ratingDriver: 1 | 2 | 3 | 4 | 5
  commentText: string
  busId: number | null
  tripId: number | null
}

export type ClientMessageModel = {
  subject: string
  name: string
  phone: string
  email: string
  company: string
  message: string
}
