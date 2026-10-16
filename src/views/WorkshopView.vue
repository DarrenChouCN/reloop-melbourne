<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import workshop from '../data/workshop.json'
import icons from '../assets/reuse-icons.svg?no-inline'
import BookingTable from '../components/BookingTable.vue'
import { currentUser, refreshSession } from '../services/authService'
import {
  getBookings,
  getSessions,
  createBooking,
  cancelBooking,
  getRemainingPlaces,
  isSessionOpen,
  todayDate,
  formatSessionDate,
} from '../services/bookingService'

const selectedDate = ref('')
const month = ref(new Date(`${todayDate().slice(0, 7)}-01T12:00:00`))
const monthLabel = computed(() =>
  month.value.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
)
const days = computed(() =>
  Array.from(
    { length: new Date(month.value.getFullYear(), month.value.getMonth() + 1, 0).getDate() },
    (_, index) => index + 1,
  ),
)
const blankDays = computed(() => (month.value.getDay() + 6) % 7)
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const bookings = ref([])
const sessions = ref([])
let loadId = 0
const loading = ref(true)
const busy = ref(false)
const loadError = ref('')
const errorMessage = ref('')
const successMessage = ref('')

const bookingForm = reactive({
  name: '',
  email: '',
  numberOfPlaces: 1,
  agreedToTerms: false,
})

const selectedSession = computed(() => {
  return sessions.value.find((session) => session.date === selectedDate.value)
})
const remainingPlaces = computed(() =>
  selectedSession.value ? getRemainingPlaces(selectedSession.value) : 0,
)
const myBookings = computed(() =>
  bookings.value
    .filter((booking) => booking.userId === currentUser.value?.id)
    .sort((first, second) => second.sessionDate.localeCompare(first.sessionDate)),
)
const alreadyBooked = computed(() =>
  myBookings.value.some(
    (booking) => booking.sessionDate === selectedDate.value && booking.status === 'confirmed',
  ),
)
const canBook = computed(
  () =>
    currentUser.value &&
    isSessionOpen(selectedSession.value) &&
    remainingPlaces.value > 0 &&
    !alreadyBooked.value &&
    !loading.value &&
    !loadError.value &&
    !busy.value,
)

watch(
  currentUser,
  (user) => {
    bookingForm.name = user?.username ?? ''
    bookingForm.email = user?.email ?? ''
  },
  { immediate: true },
)

async function loadBookings() {
  const requestId = ++loadId
  loading.value = true
  loadError.value = ''
  try {
    const [availableSessions, userBookings] = await Promise.all([getSessions(), getBookings()])
    if (requestId !== loadId) return
    sessions.value = availableSessions
    bookings.value = userBookings
    if (!selectedDate.value) {
      const first = sessions.value.find(
        (session) =>
          session.date.startsWith(dateFor(1).slice(0, 7)) &&
          isSessionOpen(session) &&
          getRemainingPlaces(session) > 0,
      )
      if (first) {
        selectedDate.value = first.date
        month.value = new Date(`${first.date.slice(0, 7)}-01T12:00:00`)
      }
    }
  } catch (error) {
    if (requestId === loadId) loadError.value = error.message
  } finally {
    if (requestId === loadId) loading.value = false
  }
}

watch(
  () => currentUser.value?.id,
  () => {
    bookings.value = []
    loadBookings()
  },
)
onMounted(() => {
  loadBookings()
  window.addEventListener('focus', loadBookings)
})
onUnmounted(() => {
  loadId++
  window.removeEventListener('focus', loadBookings)
})

function dateFor(day) {
  return `${month.value.getFullYear()}-${String(month.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function hasWorkshop(day) {
  return sessions.value.find((session) => session.date === dateFor(day))
}
function availableDay(day) {
  const session = hasWorkshop(day)
  return (
    !loading.value && !loadError.value && isSessionOpen(session) && getRemainingPlaces(session) > 0
  )
}
function changeMonth(offset) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1, 12)
  selectedDate.value = ''
  bookingForm.agreedToTerms = false
  errorMessage.value = ''
  successMessage.value = ''
}

function selectDay(day) {
  if (!availableDay(day)) return
  selectedDate.value = dateFor(day)
  bookingForm.numberOfPlaces = 1
  bookingForm.agreedToTerms = false
  errorMessage.value = ''
  successMessage.value = ''
}

async function submitBooking() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  refreshSession()
  try {
    const booking = await createBooking(selectedDate.value, bookingForm)
    successMessage.value = `Booking confirmed for ${formatSessionDate(booking.sessionDate)}. Reference: ${booking.id}`
    bookingForm.agreedToTerms = false
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    await loadBookings()
    busy.value = false
  }
}

async function removeBooking(booking) {
  if (
    busy.value ||
    !window.confirm(`Cancel your booking on ${formatSessionDate(booking.sessionDate)}?`)
  )
    return
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  refreshSession()
  try {
    await cancelBooking(booking.id)
    successMessage.value = 'Booking cancelled. The places are available again.'
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    await loadBookings()
    busy.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <header class="page-heading">
      <h1>{{ workshop.title }}</h1>
      <p>{{ workshop.subtitle }}</p>
    </header>

    <div class="workshop-layout">
      <section class="workshop-details">
        <!-- Switch between the workshop details and the unavailable state. -->
        <template v-if="selectedSession">
          <div class="workshop-image" aria-hidden="true">
            <svg class="illustration" viewBox="0 0 64 64" focusable="false">
              <use :href="`${icons}#workshop`" />
            </svg>
          </div>

          <div class="session-information">
            <div>
              <span>Date</span>
              <p>{{ formatSessionDate(selectedSession.date) }}</p>
            </div>
            <div>
              <span>Time</span>
              <p>{{ selectedSession.time }}</p>
            </div>
            <div>
              <span>Location</span>
              <p>{{ selectedSession.location }}</p>
            </div>
            <div>
              <span>Places</span>
              <p>{{ loading || loadError ? 'Unavailable' : `${remainingPlaces} remaining` }}</p>
            </div>
          </div>

          <div class="description">
            <h2>About this workshop</h2>
            <p>{{ workshop.description }}</p>

            <h2>What to bring</h2>
            <ul>
              <li v-for="item in workshop.whatToBring" :key="item">
                {{ item }}
              </li>
            </ul>
          </div>
        </template>

        <div v-else class="unavailable">
          <h2>No workshop available</h2>
          <p>Choose an available date marked with a dot. You can move to another month.</p>
        </div>
      </section>

      <aside class="booking-section">
        <h2>Book this workshop</h2>

        <div class="calendar">
          <div class="calendar-heading">
            <button
              class="button secondary-button"
              type="button"
              aria-label="Previous month"
              @click="changeMonth(-1)"
            >
              ‹
            </button>
            <h3 aria-live="polite">{{ monthLabel }}</h3>
            <button
              class="button secondary-button"
              type="button"
              aria-label="Next month"
              @click="changeMonth(1)"
            >
              ›
            </button>
          </div>

          <div class="calendar-grid week-days">
            <span v-for="(weekDay, index) in weekDays" :key="index">
              {{ weekDay }}
            </span>
          </div>

          <div class="calendar-grid">
            <span v-for="blank in blankDays" :key="`blank-${blank}`"></span>

            <button
              v-for="day in days"
              :key="day"
              type="button"
              class="calendar-day"
              :class="{ selected: selectedDate === dateFor(day) }"
              :disabled="!availableDay(day) || busy"
              :aria-pressed="selectedDate === dateFor(day)"
              :aria-label="`${formatSessionDate(dateFor(day))}: ${availableDay(day) ? 'available' : 'unavailable'}`"
              @click="selectDay(day)"
            >
              {{ day }}
              <i v-if="hasWorkshop(day)" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <p class="muted">
          Up to 4 places per booking. Booking and cancellation close the day before the workshop
          (Melbourne time). Unavailable and full dates are disabled.
        </p>
        <p v-if="!currentUser">
          Please
          <RouterLink :to="{ path: '/login', query: { redirect: '/workshops/basic-repair' } }"
            >log in</RouterLink
          >
          to book.
        </p>
        <p v-if="alreadyBooked" role="status">
          You already have a booking for this date. See My bookings below.
        </p>
        <p v-if="loadError" class="error-message" role="alert">{{ loadError }}</p>
        <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

        <!-- Use native validation for required fields, email format and booking limits. -->
        <form class="booking-form form-fields" @submit.prevent="submitBooking">
          <label>
            Name
            <input
              v-model="bookingForm.name"
              type="text"
              placeholder="Your name"
              minlength="2"
              maxlength="80"
              required
              :disabled="!canBook"
            />
          </label>

          <label>
            Email
            <input
              v-model="bookingForm.email"
              type="email"
              placeholder="name@example.com"
              maxlength="254"
              required
              :disabled="!canBook"
            />
          </label>

          <label class="places-field">
            Number of places
            <input
              v-model.number="bookingForm.numberOfPlaces"
              type="number"
              min="1"
              :max="Math.min(4, remainingPlaces)"
              required
              :disabled="!canBook"
            />
          </label>

          <label class="terms-field">
            <input
              v-model="bookingForm.agreedToTerms"
              type="checkbox"
              required
              :disabled="!canBook"
            />
            I agree to the booking terms.
          </label>

          <button class="button" type="submit" :disabled="!canBook">
            {{ busy ? 'Saving…' : 'Book Workshop' }}
          </button>
        </form>
      </aside>
    </div>
    <section class="my-bookings" aria-labelledby="my-bookings-heading">
      <h2 id="my-bookings-heading">My bookings</h2>
      <button
        class="button secondary-button"
        type="button"
        :disabled="loading || busy"
        @click="loadBookings"
      >
        Refresh bookings
      </button>
      <p v-if="loading" role="status">Loading bookings…</p>
      <p v-else-if="!currentUser">Log in to see your bookings.</p>
      <BookingTable
        v-else-if="!loadError"
        :bookings="myBookings"
        :busy="busy"
        @cancel="removeBooking"
      />
    </section>
  </div>
</template>

<style scoped>
.calendar-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}
.calendar-heading h3 {
  margin: 0;
}
.calendar-day:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.my-bookings {
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}
.workshop-layout {
  display: grid;
  grid-template-columns: 1.15fr 0.9fr;
  margin-top: 20px;
}

.workshop-details {
  padding: 12px 28px 0 0;
}

.booking-section {
  padding-left: 28px;
  border-left: 1px solid #ddd;
}

.booking-section > h2 {
  margin: 4px 0 18px;
  font-size: 26px;
  font-weight: 500;
}

.workshop-image {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tint);
  border-radius: 12px;
}
.workshop-image .illustration {
  width: 160px;
  height: 160px;
}

.session-information {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 36px;
  margin: 24px 0;
  padding-bottom: 24px;
  border-bottom: 1px solid #ddd;
}

.session-information span {
  color: #666;
}

.session-information p {
  margin: 5px 0 0;
  font-size: 19px;
}

.description h2 {
  margin: 24px 0 10px;
  font-size: 22px;
  font-weight: 500;
}

.description p,
.description ul {
  font-size: 18px;
}

.description p {
  margin: 0;
}

.unavailable {
  min-height: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  text-align: center;
}

.unavailable h2 {
  margin-bottom: 4px;
}

.unavailable p {
  color: #666;
}

.calendar {
  padding: 16px 18px 18px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.calendar h3 {
  margin: 0 0 18px;
  text-align: center;
  font-size: 20px;
  font-weight: 500;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}

.week-days {
  margin-bottom: 8px;
  color: #666;
}

.calendar-day {
  position: relative;
  width: 38px;
  max-width: 100%;
  height: 38px;
  margin: auto;
  padding: 0 0 5px;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.calendar-day:hover {
  background: var(--tint);
}

.calendar-day.selected {
  background: var(--brand);
  color: white;
}

.calendar-day i {
  position: absolute;
  bottom: 5px;
  left: 17px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #222;
}

.calendar-day.selected i {
  background: white;
}

.booking-form {
  margin-top: 14px;
}

.booking-form > label:not(.terms-field) {
  margin-bottom: 16px;
  display: block;
  font-size: 17px;
}

.booking-form .button {
  width: 100%;
}

.places-field {
  max-width: 210px;
}

.terms-field {
  margin: 34px 0 24px;
}

/* Change the two-column layout to one column on smaller screens. */
@media (max-width: 991px) {
  .workshop-layout {
    grid-template-columns: 1fr;
  }

  .workshop-details {
    padding-right: 0;
  }

  .booking-section {
    margin-top: 32px;
    padding: 32px 0 0;
    border-top: 1px solid #ddd;
    border-left: 0;
  }
}

@media (max-width: 575px) {
  .session-information {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .calendar {
    padding: 16px 8px;
  }

  .calendar-day {
    width: 35px;
    height: 35px;
  }
}
</style>
