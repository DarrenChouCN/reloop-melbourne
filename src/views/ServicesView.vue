<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import services from '../data/services.json'
import { getRatingSummary, getReviews, saveReview } from '../services/reviewService'
import { currentUser, refreshSession } from '../services/authService'

const selectedServiceId = ref(null)
const reviews = ref([])
const reviewError = ref('')
const submitError = ref('')
const submitMessage = ref('')
const reviewForm = reactive({ rating: '', comment: '', hasUsedService: false })

try {
  reviews.value = getReviews()
} catch {
  reviewError.value = 'Reviews could not be loaded. Please check browser storage and try again.'
}

const serviceDirectory = computed(() => {
  return services.map((service) => ({
    ...service,
    summary: getRatingSummary(reviews.value.filter((review) => review.serviceId === service.id)),
  }))
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
      <!-- Search controls are a visual placeholder for a later assignment stage. -->
      <fieldset class="search-fields form-fields" disabled aria-describedby="search-note">
        <legend class="visually-hidden">Search for services</legend>
        <label>
          Item or service
          <input type="search" placeholder="e.g. toaster" />
        </label>
        <label>
          Location
          <input type="text" placeholder="Suburb or postcode" />
        </label>
        <label>
          Service type
          <select>
            <option>All types</option>
            <option>Repair</option>
            <option>Recycling</option>
          </select>
        </label>
        <button class="button" type="button">Search</button>
        <button class="button secondary-button" type="button">Use My Location</button>
      </fieldset>
      <p id="search-note" class="muted">Search is not available yet. Browse the services below.</p>
    </section>

    <div class="services-layout">
      <div class="directory-column">
        <section class="directory-section" aria-labelledby="directory-heading">
          <div class="section-heading">
            <h2 id="directory-heading">Service Directory</h2>
            <span class="muted">{{ services.length }} services</span>
          </div>
          <p class="muted">Sample services and reviews for demonstration.</p>
          <p v-if="reviewError" class="error-message" role="alert">{{ reviewError }}</p>

          <div class="table-container" role="region" aria-label="Service directory" tabindex="0">
            <table>
              <thead>
                <tr>
                  <th scope="col">Service name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Suburb</th>
                  <th scope="col">Rating</th>
                  <th scope="col">Reviews</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="service in serviceDirectory"
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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
