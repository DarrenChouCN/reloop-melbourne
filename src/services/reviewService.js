import sampleReviews from '../data/reviews.json'

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

// Both the directory and the selected service use the same calculation.
export function getRatingSummary(reviews) {
  const count = reviews.length
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)

  return {
    count,
    average: count === 0 ? null : (total / count).toFixed(1),
  }
}
