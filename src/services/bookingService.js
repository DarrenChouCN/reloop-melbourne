import {
  collection,
  doc,
  getDocsFromServer,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import workshop from '../data/workshop.json'
import { getDatabase } from './firebase'
import { getCurrentUser } from './authService'

export function todayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
}

export function formatSessionDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Bookings close the day before a session, using Melbourne's date.
export function isSessionOpen(session) {
  return Boolean(session && session.date > todayDate())
}

export async function getSessions() {
  const snapshot = await getDocsFromServer(collection(getDatabase(), 'sessions'))
  if (snapshot.empty)
    throw new Error('Workshop sessions are not set up. Run the Firestore seed script.')
  return snapshot.docs.map((entry) => entry.data()).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getBookings() {
  const user = getCurrentUser()
  if (!user) return []
  const bookings = collection(getDatabase(), 'bookings')
  const source = user.role === 'admin' ? bookings : query(bookings, where('userId', '==', user.id))
  const snapshot = await getDocsFromServer(source)
  return snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }))
}

export function getRemainingPlaces(session) {
  return Math.max(0, session.capacity - session.bookedPlaces)
}

export async function createBooking(sessionDate, form) {
  const user = getCurrentUser()
  if (!user) throw new Error('Please log in to book a workshop.')
  const name = String(form.name ?? '').trim()
  const email = String(form.email ?? '')
    .trim()
    .toLowerCase()
  if (name.length < 2 || name.length > 80)
    throw new Error('Please enter a name of 2–80 characters.')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.')
  }
  if (
    !Number.isInteger(form.numberOfPlaces) ||
    form.numberOfPlaces < 1 ||
    form.numberOfPlaces > 4
  ) {
    throw new Error('Please book between 1 and 4 places.')
  }
  if (form.agreedToTerms !== true) throw new Error('Please agree to the booking terms.')
  const db = getDatabase()
  const sessionRef = doc(db, 'sessions', sessionDate)
  const bookingRef = doc(db, 'bookings', `${sessionDate}_${user.id}`)
  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef)
    const existing = await transaction.get(bookingRef)
    const session = sessionDoc.data()
    if (!isSessionOpen(session)) throw new Error('Bookings close the day before the workshop.')
    if (existing.exists() && existing.data().status === 'confirmed') {
      throw new Error(
        'You already have a booking for this session. Cancel it before booking again.',
      )
    }
    if (form.numberOfPlaces > getRemainingPlaces(session))
      throw new Error('There are not enough places remaining. Choose fewer places or another date.')
    transaction.set(bookingRef, {
      workshopId: workshop.id,
      userId: user.id,
      sessionDate,
      time: session.time,
      location: session.location,
      name,
      email,
      numberOfPlaces: form.numberOfPlaces,
      agreedToTerms: true,
      status: 'confirmed',
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.update(sessionRef, {
      bookedPlaces: session.bookedPlaces + form.numberOfPlaces,
      lastBookingId: bookingRef.id,
    })
  })
  return { id: bookingRef.id, sessionDate }
}

export async function cancelBooking(id) {
  const user = getCurrentUser()
  if (!user) throw new Error('Please log in to cancel a booking.')
  const db = getDatabase()
  const bookingRef = doc(db, 'bookings', id)
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(bookingRef)
    if (!existing.exists())
      throw new Error('This booking no longer exists. Please refresh the page.')
    const booking = existing.data()
    if (booking.userId !== user.id && user.role !== 'admin')
      throw new Error('You can only cancel your own bookings.')
    if (booking.status !== 'confirmed') throw new Error('This booking has already been cancelled.')
    if (booking.sessionDate <= todayDate())
      throw new Error('Cancellations close the day before the workshop.')
    const sessionRef = doc(db, 'sessions', booking.sessionDate)
    const session = (await transaction.get(sessionRef)).data()
    transaction.update(bookingRef, { status: 'cancelled', updatedAt: serverTimestamp() })
    transaction.update(sessionRef, {
      bookedPlaces: session.bookedPlaces - booking.numberOfPlaces,
      lastBookingId: id,
    })
  })
}
