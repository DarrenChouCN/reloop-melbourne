import sampleReviews from '../data/reviews.json'
import services from '../data/services.json'
import { getCurrentUser } from './authService'

const storageKey = 'reloop-reviews'

// Seed once. An empty saved array means the reviews were removed, not a first visit.
export function getReviews() {
  const savedReviews = localStorage.getItem(storageKey)

  if (savedReviews === null) {
    localStorage.setItem(storageKey, JSON.stringify(sampleReviews))
    return structuredClone(sampleReviews)
  }

  const reviews = JSON.parse(savedReviews)
  if (!Array.isArray(reviews) || !reviews.every(isValidReview)) {
    throw new Error('Saved reviews could not be read.')
  }

  return reviews
}

function isValidReview(review) {
  return (
    review &&
    typeof review.id === 'string' &&
    typeof review.serviceId === 'string' &&
    typeof review.userId === 'string' &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.comment === 'string'
  )
}

function saveReviews(reviews) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(reviews))
    return reviews
  } catch {
    throw new Error('Changes could not be saved. Please check browser storage and try again.')
  }
}

export function saveReview(serviceId, { rating, comment, hasUsedService }) {
  const user = getCurrentUser()
  if (!user) throw new Error('Please log in to submit a review.')
  if (!services.some((service) => service.id === serviceId)) {
    throw new Error('This service is not available.')
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Please choose a rating from 1 to 5.')
  }
  if (typeof comment !== 'string' || comment.length > 500) {
    throw new Error('Comments must contain no more than 500 characters.')
  }
  if (hasUsedService !== true) throw new Error('Please confirm that you have used this service.')

  const reviews = getReviews()
  const existing = reviews.find(
    (review) => review.serviceId === serviceId && review.userId === user.id,
  )
  const now = new Date().toISOString()
  // Identity comes from the current account, never from the submitted form.
  const review = {
    id: existing ? existing.id : crypto.randomUUID(),
    serviceId,
    userId: user.id,
    username: user.username,
    rating,
    comment: comment.trim(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  }
  if (existing) Object.assign(existing, review)
  else reviews.push(review)
  return saveReviews(reviews)
}

export function deleteReview(reviewId) {
  if (getCurrentUser()?.role !== 'admin') {
    throw new Error('Only administrators can delete reviews.')
  }
  const reviews = getReviews()
  if (!reviews.some((review) => review.id === reviewId)) {
    throw new Error('This review no longer exists. Please refresh the page.')
  }
  return saveReviews(reviews.filter((review) => review.id !== reviewId))
}

// Both the directory and the selected service use the same calculation.
export function getRatingSummary(reviews) {
  const count = reviews.length
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)

  return {
    count,
    average: count === 0 ? null : (total / count).toFixed(1),
  }
}
