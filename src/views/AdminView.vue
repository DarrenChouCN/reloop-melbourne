<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import services from '../data/services.json'
import { getReviews, deleteReview } from '../services/reviewService'
import { currentUser, refreshSession } from '../services/authService'
import { downloadCsv, downloadPdf } from '../services/exportService'
import workshop from '../data/workshop.json'
import BookingTable from '../components/BookingTable.vue'
import StatisticsPanel from '../components/StatisticsPanel.vue'
import { getBookings, cancelBooking, formatSessionDate } from '../services/bookingService'

const reviews = ref([])
const errorMessage = ref('')
const successMessage = ref('')
const columns = [
  { key: 'service', label: 'Service' },
  { key: 'username', label: 'User' },
  { key: 'rating', label: 'Rating' },
  { key: 'comment', label: 'Comment' },
  { key: 'date', label: 'Date' },
]
const columnFilters = reactive({ service: '', username: '', rating: '', comment: '', date: '' })
const sortKey = ref('date')
const sortAscending = ref(false)
const currentPage = ref(1)
const pageSize = 10
const exporting = ref(false)
const exportError = ref('')
const exportMessage = ref('')
const reviewsLoaded = ref(false)
const bookings = ref([])
const bookingsError = ref('')
const bookingMessage = ref('')
const bookingsLoading = ref(true)
const bookingsBusy = ref(false)
const bookingDate = ref('')
const bookingStatus = ref('confirmed')
const filteredBookings = computed(() =>
  bookings.value
    .filter(
      (booking) =>
        (!bookingDate.value || booking.sessionDate === bookingDate.value) &&
        (!bookingStatus.value || booking.status === bookingStatus.value),
    )
    .sort((first, second) => first.sessionDate.localeCompare(second.sessionDate)),
)

async function loadBookings() {
  bookingsLoading.value = true
  bookingsError.value = ''
  try {
    bookings.value = await getBookings()
  } catch (error) {
    bookingsError.value = error.message
  } finally {
    bookingsLoading.value = false
  }
}

function selectBookingDate(date) {
  bookingDate.value = date
  bookingStatus.value = 'confirmed'
}

async function removeBooking(booking) {
  if (
    bookingsBusy.value ||
    !window.confirm(
      `Cancel ${booking.name}'s booking on ${formatSessionDate(booking.sessionDate)}?`,
    )
  )
    return
  bookingsBusy.value = true
  bookingMessage.value = ''
  refreshSession()
  try {
    bookings.value = await cancelBooking(booking.id)
    bookingMessage.value = 'Booking cancelled. The places are available again.'
  } catch (error) {
    bookingMessage.value = error.message
  } finally {
    await loadBookings()
    bookingsBusy.value = false
  }
}

function onStorage(event) {
  if (event.key === 'reloop-bookings' || event.key === null) loadBookings()
  if (event.key === 'reloop-reviews' || event.key === null) {
    try {
      reviews.value = getReviews()
      reviewsLoaded.value = true
      errorMessage.value = ''
    } catch (error) {
      reviewsLoaded.value = false
      errorMessage.value = error.message
    }
  }
}
onMounted(() => {
  loadBookings()
  window.addEventListener('storage', onStorage)
})
onUnmounted(() => window.removeEventListener('storage', onStorage))

try {
  reviews.value = getReviews()
  reviewsLoaded.value = true
} catch {
  errorMessage.value = 'Reviews could not be loaded. Please check browser storage and try again.'
}

function serviceName(serviceId) {
  return services.find((service) => service.id === serviceId)?.name ?? 'Unknown service'
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-AU')
}

function getColumnValue(review, key) {
  if (key === 'service') return serviceName(review.serviceId)
  if (key === 'date') return formatDate(review.createdAt)
  if (key === 'comment') return review.comment || 'No comment'
  return review[key]
}

const filteredReviews = computed(() => {
  const results = reviews.value.filter((review) =>
    columns.every((column) => {
      const value = getColumnValue(review, column.key)
      // Dates can be searched as displayed, or as YYYY-MM-DD.
      const text =
        column.key === 'date' ? `${value} ${review.createdAt.slice(0, 10)}` : String(value)
      return text.toLowerCase().includes(columnFilters[column.key].trim().toLowerCase())
    }),
  )
  return results.sort((first, second) => {
    let difference
    if (sortKey.value === 'date')
      difference = Date.parse(first.createdAt) - Date.parse(second.createdAt)
    else if (sortKey.value === 'rating') difference = first.rating - second.rating
    else
      difference = String(getColumnValue(first, sortKey.value)).localeCompare(
        String(getColumnValue(second, sortKey.value)),
        'en',
        { sensitivity: 'base' },
      )
    return sortAscending.value ? difference : -difference
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredReviews.value.length / pageSize)))
const pageReviews = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredReviews.value.slice(start, start + pageSize)
})

async function exportTable(format) {
  exportError.value = ''
  exportMessage.value = ''
  refreshSession()
  if (currentUser.value?.role !== 'admin') {
    exportError.value = 'Please log in as an administrator to export reviews.'
    return
  }
  const rows = filteredReviews.value.map((review) => ({
    service: serviceName(review.serviceId),
    username: review.username,
    rating: review.rating,
    comment: getColumnValue(review, 'comment'),
    date: formatDate(review.createdAt),
  }))
  if (!rows.length || exporting.value) return
  exporting.value = true
  try {
    if (format === 'csv') downloadCsv('Review Management', columns, rows)
    else await downloadPdf('Review Management', columns, rows)
    exportMessage.value = `Exported ${rows.length} reviews as ${format.toUpperCase()}.`
  } catch (error) {
    exportError.value = error.message || 'The file could not be exported. Please try again.'
  } finally {
    exporting.value = false
  }
}

function sortReviews(key) {
  sortAscending.value = sortKey.value === key ? !sortAscending.value : true
  sortKey.value = key
  currentPage.value = 1
}

function resetFilters() {
  for (const column of columns) columnFilters[column.key] = ''
  sortKey.value = 'date'
  sortAscending.value = false
  currentPage.value = 1
}

watch(columnFilters, () => {
  currentPage.value = 1
})
// Deleting the last review on a page returns to the preceding page.
watch(pageCount, (count) => {
  currentPage.value = Math.min(currentPage.value, count)
})

function removeReview(review) {
  errorMessage.value = ''
  successMessage.value = ''
  if (
    !window.confirm(`Delete the review by ${review.username} for ${serviceName(review.serviceId)}?`)
  )
    return
  refreshSession()
  try {
    reviews.value = deleteReview(review.id)
    successMessage.value = 'Review deleted. The service rating has been updated.'
  } catch (error) {
    errorMessage.value = error.message
  }
}
</script>

<template>
  <section class="admin-page page-container">
    <header class="page-heading">
      <h1>Admin Dashboard</h1>
      <p>Manage workshop bookings, explore activity and review user feedback.</p>
    </header>
    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>
    <p v-if="exportError" class="error-message" role="alert">{{ exportError }}</p>

    <template v-if="currentUser?.role === 'admin'">
      <StatisticsPanel
        v-if="!bookingsLoading && !bookingsError"
        :bookings="bookings"
        :reviews="reviews"
        :reviews-unavailable="!reviewsLoaded"
        :selected-date="bookingDate"
        @select-date="selectBookingDate"
      />
      <section aria-labelledby="booking-management-heading">
        <h2 id="booking-management-heading">Booking Management</h2>
        <div class="table-controls form-fields">
          <label
            >Session date<select v-model="bookingDate">
              <option value="">All dates</option>
              <option
                v-for="session in workshop.sessions"
                :key="session.date"
                :value="session.date"
              >
                {{ formatSessionDate(session.date) }}
              </option>
            </select></label
          >
          <label
            >Status<select v-model="bookingStatus">
              <option value="">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select></label
          >
          <button
            class="button secondary-button"
            type="button"
            :disabled="bookingsLoading || bookingsBusy"
            @click="loadBookings"
          >
            Refresh bookings
          </button>
        </div>
        <p v-if="bookingsLoading" role="status">Loading bookings…</p>
        <p v-if="bookingsError" class="error-message" role="alert">{{ bookingsError }}</p>
        <p v-if="bookingMessage" role="status">{{ bookingMessage }}</p>
        <template v-if="!bookingsLoading && !bookingsError">
          <p role="status">{{ filteredBookings.length }} bookings</p>
          <BookingTable
            :bookings="filteredBookings"
            admin
            :busy="bookingsBusy"
            @cancel="removeBooking"
          />
        </template>
      </section>
      <h2>Review Management</h2>
      <p role="status">{{ filteredReviews.length }} of {{ reviews.length }} reviews</p>
      <p>
        <button
          class="button secondary-button"
          type="button"
          :disabled="exporting || !filteredReviews.length"
          @click="exportTable('csv')"
        >
          Export CSV
        </button>
        <button
          class="button secondary-button"
          type="button"
          :disabled="exporting || !filteredReviews.length"
          @click="exportTable('pdf')"
        >
          Export PDF
        </button>
      </p>
      <p class="muted">
        Exports include all filtered results across every page, in the current sort order.
      </p>
      <p v-if="exporting" role="status">Preparing your file…</p>
      <p v-if="exportMessage" class="success-message" role="status">{{ exportMessage }}</p>
      <p class="muted">
        Click a column heading to sort, or type below it to filter. Dates also accept YYYY-MM-DD.
      </p>
      <p v-if="!reviews.length && !errorMessage" class="muted">No reviews to manage.</p>
      <div
        v-if="reviews.length"
        class="table-container form-fields"
        role="region"
        aria-label="Review management"
        tabindex="0"
      >
        <table>
          <thead>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                :aria-sort="
                  sortKey === column.key ? (sortAscending ? 'ascending' : 'descending') : 'none'
                "
              >
                <button
                  class="button secondary-button"
                  type="button"
                  @click="sortReviews(column.key)"
                >
                  {{ column.label }}
                  <span v-if="sortKey === column.key" aria-hidden="true">{{
                    sortAscending ? '↑' : '↓'
                  }}</span>
                </button>
              </th>
              <th scope="col">Action</th>
            </tr>
            <tr>
              <td v-for="column in columns" :key="column.key">
                <input
                  v-model="columnFilters[column.key]"
                  type="search"
                  :aria-label="`Filter by ${column.label.toLowerCase()}`"
                  :placeholder="`Filter ${column.label.toLowerCase()}`"
                />
              </td>
              <td>
                <button class="button secondary-button" type="button" @click="resetFilters">
                  Reset
                </button>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredReviews.length">
              <td colspan="6">
                No reviews match these filters. Try another search or reset the filters.
              </td>
            </tr>
            <tr v-for="review in pageReviews" :key="review.id">
              <td>{{ serviceName(review.serviceId) }}</td>
              <td>{{ review.username }}</td>
              <td>{{ review.rating }} / 5</td>
              <td class="comment">{{ review.comment || 'No comment' }}</td>
              <td>
                <time :datetime="review.createdAt">{{ formatDate(review.createdAt) }}</time>
              </td>
              <td>
                <button
                  class="button secondary-button"
                  type="button"
                  :aria-label="`Delete review by ${review.username} for ${serviceName(review.serviceId)}`"
                  @click="removeReview(review)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="reviews.length" class="table-controls" aria-label="Review management pages">
        <button
          class="button secondary-button"
          type="button"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Previous
        </button>
        <p role="status">Page {{ currentPage }} of {{ pageCount }} · 10 per page</p>
        <button
          class="button secondary-button"
          type="button"
          :disabled="currentPage === pageCount"
          @click="currentPage++"
        >
          Next
        </button>
      </nav>
    </template>
    <p v-else>Please log in as an administrator to manage reviews.</p>
  </section>
</template>

<style scoped>
.admin-page {
  line-height: 1.5;
}
.table-container {
  overflow-x: auto;
}
.table-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
  vertical-align: top;
}
.comment {
  min-width: 180px;
  max-width: 360px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
