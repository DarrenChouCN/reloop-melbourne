<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import services from '../data/services.json'
import { getRatingSummary, getReviews, saveReview } from '../services/reviewService'
import { currentUser, refreshSession } from '../services/authService'

const selectedServiceId = ref(null)
const reviews = ref([])
const reviewError = ref('')
const submitError = ref('')
const submitMessage = ref('')
const reviewForm = reactive({ rating: '', comment: '', hasUsedService: false })
const route = useRoute()
const searchForm = reactive({ keyword: '', location: '', type: '' })
const searchFilters = reactive({ keyword: '', location: '', type: '' })
const columns = [
  { key: 'name', label: 'Service name' },
  { key: 'type', label: 'Type' },
  { key: 'suburb', label: 'Suburb' },
  { key: 'rating', label: 'Rating' },
  { key: 'reviews', label: 'Reviews' },
]
const columnFilters = reactive({ name: '', type: '', suburb: '', rating: '', reviews: '' })
const sortKey = ref('name')
const sortAscending = ref(true)
const currentPage = ref(1)
const pageSize = 10

function searchServices() {
  searchFilters.keyword = searchForm.keyword.trim().toLowerCase()
  searchFilters.location = searchForm.location.trim().toLowerCase()
  searchFilters.type = searchForm.type
  selectedServiceId.value = null
  currentPage.value = 1
}

function resetSearch() {
  searchForm.keyword = ''
  searchForm.location = ''
  searchForm.type = ''
  for (const column of columns) columnFilters[column.key] = ''
  sortKey.value = 'name'
  sortAscending.value = true
  searchServices()
}

// Apply the item name when arriving from the reuse guide, including browser back/forward.
watch(
  () => route.query.q,
  (keyword) => {
    resetSearch()
    searchForm.keyword = typeof keyword === 'string' ? keyword : ''
    searchServices()
  },
  { immediate: true },
)

try {
  reviews.value = getReviews()
} catch {
  reviewError.value = 'Reviews could not be loaded. Please check browser storage and try again.'
}

const serviceDirectory = computed(() => {
  return services
    .filter((service) => {
      const text = `${service.name} ${service.description} ${service.items.join(' ')}`.toLowerCase()
      const location = `${service.suburb} ${service.postcode}`.toLowerCase()
      return (
        text.includes(searchFilters.keyword) &&
        location.includes(searchFilters.location) &&
        (!searchFilters.type || service.type === searchFilters.type)
      )
    })
    .map((service) => ({
      ...service,
      summary: getRatingSummary(reviews.value.filter((review) => review.serviceId === service.id)),
    }))
})

function getColumnValue(service, key) {
  if (key === 'rating') {
    if (reviewError.value) return 'Unavailable'
    return service.summary.count ? service.summary.average : 'No ratings yet'
  }
  if (key === 'reviews') return reviewError.value ? 'Unavailable' : service.summary.count
  return service[key]
}

const tableResults = computed(() => {
  const results = serviceDirectory.value.filter((service) =>
    columns.every((column) => {
      return String(getColumnValue(service, column.key))
        .toLowerCase()
        .includes(columnFilters[column.key].trim().toLowerCase())
    }),
  )
  return results.sort((first, second) => {
    const firstValue = getColumnValue(first, sortKey.value)
    const secondValue = getColumnValue(second, sortKey.value)
    const difference = ['rating', 'reviews'].includes(sortKey.value)
      ? (Number(firstValue) || 0) - (Number(secondValue) || 0)
      : String(firstValue).localeCompare(String(secondValue), 'en', { sensitivity: 'base' })
    return sortAscending.value ? difference : -difference
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(tableResults.value.length / pageSize)))
const pageServices = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return tableResults.value.slice(start, start + pageSize)
})

function sortServices(key) {
  sortAscending.value = sortKey.value === key ? !sortAscending.value : true
  sortKey.value = key
  currentPage.value = 1
  selectedServiceId.value = null
}

watch(columnFilters, () => {
  currentPage.value = 1
  selectedServiceId.value = null
})
watch(currentPage, () => {
  selectedServiceId.value = null
})
// A review update can change a rating filter's result count.
watch(pageCount, (count) => {
  currentPage.value = Math.min(currentPage.value, count)
})

const selectedService = computed(() => {
  return serviceDirectory.value.find((service) => service.id === selectedServiceId.value)
})

const selectedReviews = computed(() => {
  return reviews.value
    .filter((review) => review.serviceId === selectedServiceId.value)
    .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
})

function selectService(serviceId) {
  // Select another service, or collapse the reviews for the current service.
  selectedServiceId.value = selectedServiceId.value === serviceId ? null : serviceId
}

const myReview = computed(() => {
  return selectedReviews.value.find((review) => review.userId === currentUser.value?.id)
})

// Restore this user's existing review, or start a blank form for another service.
watch([selectedServiceId, () => currentUser.value?.id], () => {
  reviewForm.rating = myReview.value?.rating ?? ''
  reviewForm.comment = myReview.value?.comment ?? ''
  reviewForm.hasUsedService = false
  submitError.value = ''
  submitMessage.value = ''
})

function submitReview() {
  submitError.value = ''
  submitMessage.value = ''
  refreshSession()
  const updating = Boolean(myReview.value)
  try {
    reviews.value = saveReview(selectedServiceId.value, reviewForm)
    reviewForm.comment = myReview.value.comment
    reviewForm.hasUsedService = false
    submitMessage.value = updating
      ? 'Your review has been updated.'
      : 'Your review has been submitted.'
  } catch (error) {
    submitError.value = error.message
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="services-page page-container">
    <header class="page-heading">
      <h1>Find a Repair Service</h1>
      <p>Search for local repair and recycling services near you.</p>
    </header>

    <section class="search-section" aria-label="Search for services">
      <form class="search-fields form-fields" @submit.prevent="searchServices">
        <label>
          Item or service
          <input v-model="searchForm.keyword" type="search" placeholder="e.g. toaster" />
        </label>
        <label>
          Location
          <input v-model="searchForm.location" type="text" placeholder="Suburb or postcode" />
        </label>
        <label>
          Service type
          <select v-model="searchForm.type">
            <option value="">All types</option>
            <option>Repair</option>
            <option>Recycling</option>
          </select>
        </label>
        <button class="button" type="submit">Search</button>
        <button class="button secondary-button" type="button" @click="resetSearch">Reset</button>
        <button class="button secondary-button" type="button" disabled>Use My Location</button>
      </form>
      <p class="muted">
        Search by item, service name, suburb or postcode. Location detection is not available yet.
      </p>
    </section>

    <div class="services-layout">
      <div class="directory-column">
        <section class="directory-section" aria-labelledby="directory-heading">
          <div class="section-heading">
            <h2 id="directory-heading">Service Directory</h2>
            <span class="muted" role="status"
              >{{ tableResults.length }}
              {{ tableResults.length === 1 ? 'service' : 'services' }}</span
            >
          </div>
          <p class="muted">
            Sample services and reviews for demonstration. Click a column heading to sort, or type
            below it to filter.
          </p>
          <p v-if="reviewError" class="error-message" role="alert">{{ reviewError }}</p>

          <div
            class="table-container form-fields"
            role="region"
            aria-label="Service directory"
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
                      class="button view-button"
                      type="button"
                      :disabled="Boolean(reviewError) && ['rating', 'reviews'].includes(column.key)"
                      @click="sortServices(column.key)"
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
                      :disabled="Boolean(reviewError) && ['rating', 'reviews'].includes(column.key)"
                    />
                  </td>
                  <td>
                    <button class="button secondary-button" type="button" @click="resetSearch">
                      Reset
                    </button>
                  </td>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!tableResults.length">
                  <td colspan="6">No services found. Try another search or reset the filters.</td>
                </tr>
                <tr
                  v-for="service in pageServices"
                  :key="service.id"
                  :class="{ 'selected-row': selectedServiceId === service.id }"
                >
                  <th scope="row">{{ service.name }}</th>
                  <td>{{ service.type }}</td>
                  <td>{{ service.suburb }}</td>
                  <td>
                    <template v-if="reviewError">Unavailable</template>
                    <template v-else-if="service.summary.count"
                      >{{ service.summary.average }} / 5</template
                    >
                    <template v-else>No ratings yet</template>
                  </td>
                  <td>{{ reviewError ? '—' : service.summary.count }}</td>
                  <td>
                    <button
                      class="button view-button"
                      type="button"
                      :aria-label="`${selectedServiceId === service.id ? 'Hide' : 'View'} reviews for ${service.name}`"
                      :aria-expanded="selectedServiceId === service.id"
                      aria-controls="service-reviews"
                      @click="selectService(service.id)"
                    >
                      {{ selectedServiceId === service.id ? 'Hide' : 'View' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <nav class="section-heading" aria-label="Service directory pages">
            <button
              class="button secondary-button"
              type="button"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              Previous
            </button>
            <p role="status">
              Page {{ currentPage }} of {{ pageCount }} · {{ tableResults.length }} services · 10
              per page
            </p>
            <button
              class="button secondary-button"
              type="button"
              :disabled="currentPage === pageCount"
              @click="currentPage++"
            >
              Next
            </button>
          </nav>
        </section>

        <section
          v-show="selectedService"
          id="service-reviews"
          class="reviews-section"
          aria-labelledby="reviews-heading"
        >
          <template v-if="selectedService">
            <h2 id="reviews-heading">{{ selectedService.name }}</h2>
            <p>{{ selectedService.description }}</p>
            <p v-if="!reviewError" class="rating-summary" aria-live="polite">
              <template v-if="selectedService.summary.count">
                {{ selectedService.summary.average }} / 5 · {{ selectedService.summary.count }}
                {{ selectedService.summary.count === 1 ? 'review' : 'reviews' }}
              </template>
              <template v-else>No ratings yet</template>
            </p>

            <h3>User reviews</h3>
            <p v-if="reviewError">Reviews are currently unavailable.</p>
            <p v-else-if="selectedReviews.length === 0" class="muted">
              No reviews yet for this service.
            </p>
            <ul v-else class="review-list">
              <li v-for="review in selectedReviews" :key="review.id">
                <div class="section-heading">
                  <strong>{{ review.username }}</strong>
                  <span>{{ review.rating }} / 5</span>
                </div>
                <time class="muted" :datetime="review.createdAt">{{
                  formatDate(review.createdAt)
                }}</time>
                <!-- Vue displays user comments as plain text, never as HTML. -->
                <p v-if="review.comment" class="review-comment">{{ review.comment }}</p>
              </li>
            </ul>

            <h3>Review this service</h3>
            <p id="login-note">
              <template v-if="currentUser">
                Signed in as {{ currentUser.username }}.
                <span v-if="myReview">You can update your existing review below.</span>
              </template>
              <template v-else>
                Please <RouterLink to="/login">log in</RouterLink> to submit a review.
              </template>
            </p>
            <p v-if="submitError" class="error-message" role="alert">{{ submitError }}</p>
            <p v-if="submitMessage" class="success-message" role="status">{{ submitMessage }}</p>
            <form class="review-form form-fields" @submit.prevent="submitReview">
              <fieldset
                :disabled="!currentUser || Boolean(reviewError)"
                aria-describedby="login-note"
              >
                <legend class="visually-hidden">Your review</legend>
                <label>
                  Rating
                  <select v-model.number="reviewForm.rating" required>
                    <option disabled value="">Select a rating</option>
                    <option v-for="score in 5" :key="score" :value="score">{{ score }} / 5</option>
                  </select>
                </label>
                <label>
                  Comment (optional, up to 500 characters)
                  <textarea v-model="reviewForm.comment" rows="4" maxlength="500"></textarea>
                </label>
                <label class="terms-field">
                  <input v-model="reviewForm.hasUsedService" type="checkbox" required />
                  I have used this service.
                </label>
                <button class="button" type="submit">
                  {{ myReview ? 'Update review' : 'Submit review' }}
                </button>
              </fieldset>
            </form>
          </template>
        </section>
      </div>

      <aside class="map-section" aria-labelledby="map-heading">
        <h2 id="map-heading">Service Map</h2>
        <div class="map-placeholder">Map coming soon</div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.services-page {
  line-height: 1.5;
}

.search-section,
.directory-section {
  padding-bottom: 24px;
  border-bottom: 1px solid #ddd;
}

.search-section,
.directory-section,
.reviews-section,
.map-section {
  padding-top: 24px;
}

.services-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
  gap: 28px;
}

.directory-column {
  min-width: 0;
}

.map-placeholder {
  min-height: 320px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  background: #e4e4e4;
  color: #666;
}

.search-fields {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
}

.search-fields label {
  flex: 1 1 180px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 20px;
}

h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
}

h3 {
  margin: 24px 0 12px;
  font-size: 22px;
  font-weight: 500;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 14px 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

tbody th {
  font-weight: 400;
}

.selected-row {
  background: #f5f5f5;
}

.view-button {
  border: 0;
  background: transparent;
  color: #0969b5;
  text-decoration: underline;
}

.view-button:hover {
  background: #e8e8e8;
}

.rating-summary {
  font-weight: 600;
}

.review-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.review-list li {
  padding: 16px 0;
  border-bottom: 1px solid #ddd;
  overflow-wrap: anywhere;
}

.review-comment {
  white-space: pre-wrap;
}

.review-form {
  max-width: 640px;
}

.review-form label {
  margin-bottom: 16px;
}

@media (max-width: 991px) {
  .services-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .map-placeholder {
    min-height: 220px;
  }
}

@media (max-width: 767px) {
  .search-fields label {
    flex-basis: 100%;
  }

  th,
  td {
    padding: 12px 8px;
  }
}
</style>
