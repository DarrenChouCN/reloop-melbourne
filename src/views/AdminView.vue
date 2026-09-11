<script setup>
import { ref } from 'vue'
import services from '../data/services.json'
import { getReviews, deleteReview } from '../services/reviewService'
import { currentUser, refreshSession } from '../services/authService'

const reviews = ref([])
const errorMessage = ref('')
const successMessage = ref('')

try {
  reviews.value = getReviews()
} catch {
  errorMessage.value = 'Reviews could not be loaded. Please check browser storage and try again.'
}

function serviceName(serviceId) {
  return services.find((service) => service.id === serviceId)?.name ?? 'Unknown service'
}

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
      <h1>Review Management</h1>
      <p>View user reviews and remove inappropriate content.</p>
    </header>
    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

    <template v-if="currentUser?.role === 'admin'">
      <p>{{ reviews.length }} reviews</p>
      <p v-if="!reviews.length && !errorMessage" class="muted">No reviews to manage.</p>
      <div
        v-if="reviews.length"
        class="table-container"
        role="region"
        aria-label="Review management"
        tabindex="0"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">User</th>
              <th scope="col">Rating</th>
              <th scope="col">Comment</th>
              <th scope="col">Date</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="review in reviews" :key="review.id">
              <td>{{ serviceName(review.serviceId) }}</td>
              <td>{{ review.username }}</td>
              <td>{{ review.rating }} / 5</td>
              <td class="comment">{{ review.comment || 'No comment' }}</td>
              <td>
                <time :datetime="review.createdAt">{{
                  new Date(review.createdAt).toLocaleDateString('en-AU')
                }}</time>
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
