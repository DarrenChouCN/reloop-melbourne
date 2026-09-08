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
    review !== null &&
    typeof review === 'object' &&
    ['id', 'serviceId', 'userId', 'username'].every(
      (field) => typeof review[field] === 'string' && review[field].trim().length > 0,
    ) &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.comment === 'string' &&
    review.comment.length <= 500 &&
    typeof review.createdAt === 'string' &&
    Number.isFinite(Date.parse(review.createdAt)) &&
    typeof review.updatedAt === 'string' &&
    Number.isFinite(Date.parse(review.updatedAt))
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
