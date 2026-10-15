import {
  collection,
  doc,
  getDocsFromServer,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import services from '../data/services.json'
import { getDatabase } from './firebase'
import { getCurrentUser } from './authService'

export async function getReviews() {
  const snapshot = await getDocsFromServer(collection(getDatabase(), 'reviews'))
  return snapshot.docs.map((entry) => ({
    ...entry.data(),
    id: entry.id,
    createdAt: entry.data().createdAt.toDate().toISOString(),
  }))
}

export async function saveReview(serviceId, { rating, comment, hasUsedService }) {
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

  const db = getDatabase()
  const reference = doc(db, 'reviews', `${serviceId}_${user.id}`)
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference)
    transaction.set(reference, {
      serviceId,
      userId: user.id,
      username: user.username,
      rating,
      comment: comment.trim(),
      hasUsedService: true,
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
}

export async function deleteReview(reviewId) {
  if (getCurrentUser()?.role !== 'admin') throw new Error('Only administrators can delete reviews.')
  await deleteDoc(doc(getDatabase(), 'reviews', reviewId))
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
