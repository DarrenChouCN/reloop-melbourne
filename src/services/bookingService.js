import workshop from '../data/workshop.json'
import { getCurrentUser } from './authService'

const storageKey = 'reloop-bookings'

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

export function getBookings() {
  try {
    const bookings = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (
      !Array.isArray(bookings) ||
      !bookings.every(
        (booking) =>
          booking &&
          typeof booking.id === 'string' &&
          typeof booking.userId === 'string' &&
          typeof booking.name === 'string' &&
          typeof booking.email === 'string' &&
          typeof booking.time === 'string' &&
          typeof booking.location === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(booking.sessionDate) &&
          booking.workshopId === workshop.id &&
          Number.isInteger(booking.numberOfPlaces) &&
          booking.numberOfPlaces >= 1 &&
          booking.numberOfPlaces <= 4 &&
          ['confirmed', 'cancelled'].includes(booking.status),
      )
    )
      throw new Error('Invalid booking data')
    return bookings
  } catch {
    throw new Error('Bookings could not be loaded. Please check browser storage and try again.')
  }
}

function saveBookings(bookings) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(bookings))
    return bookings
  } catch {
    throw new Error('Bookings could not be saved. Please check browser storage and try again.')
  }
}

export function getRemainingPlaces(session, bookings) {
  const reserved = bookings
    .filter((booking) => booking.sessionDate === session.date && booking.status === 'confirmed')
    .reduce((total, booking) => total + booking.numberOfPlaces, 0)
  return Math.max(0, session.capacity - reserved)
}

export function createBooking(sessionDate, form) {
  const user = getCurrentUser()
  if (!user) throw new Error('Please log in to book a workshop.')
  const session = workshop.sessions.find((entry) => entry.date === sessionDate)
  if (!isSessionOpen(session)) throw new Error('Bookings close the day before the workshop.')
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
  // Read again at submission so the availability shown on the page is not trusted.
  const bookings = getBookings()
  if (
    bookings.some(
      (booking) =>
        booking.userId === user.id &&
        booking.sessionDate === sessionDate &&
        booking.status === 'confirmed',
    )
  ) {
    throw new Error('You already have a booking for this session. Cancel it before booking again.')
  }
  if (form.numberOfPlaces > getRemainingPlaces(session, bookings)) {
    throw new Error(
      'There are not enough places remaining. Please choose fewer places or another date.',
    )
  }
  const booking = {
    id: crypto.randomUUID(),
    workshopId: workshop.id,
    userId: user.id,
    sessionDate,
    time: session.time,
    location: session.location,
    name,
    email,
    numberOfPlaces: form.numberOfPlaces,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  }
  saveBookings([...bookings, booking])
  return booking
}

export function cancelBooking(id) {
  const user = getCurrentUser()
  if (!user) throw new Error('Please log in to cancel a booking.')
  const bookings = getBookings()
  const booking = bookings.find((entry) => entry.id === id)
  if (!booking) throw new Error('This booking no longer exists. Please refresh the page.')
  if (booking.userId !== user.id && user.role !== 'admin') {
    throw new Error('You can only cancel your own bookings.')
  }
  if (booking.status !== 'confirmed') throw new Error('This booking has already been cancelled.')
  if (booking.sessionDate <= todayDate())
    throw new Error('Cancellations close the day before the workshop.')
  return saveBookings(
    bookings.map((entry) =>
      entry.id === id
        ? { ...entry, status: 'cancelled', cancelledAt: new Date().toISOString() }
        : entry,
    ),
  )
}
