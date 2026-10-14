<script setup>
import { computed, ref, watch } from 'vue'
import { formatSessionDate, todayDate } from '../services/bookingService'

const props = defineProps({
  bookings: { type: Array, required: true },
  admin: Boolean,
  busy: Boolean,
})
defineEmits(['cancel'])
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(props.bookings.length / 10)))
const rows = computed(() => props.bookings.slice((page.value - 1) * 10, page.value * 10))
watch(
  () => props.bookings,
  () => {
    page.value = Math.min(page.value, pageCount.value)
  },
)
</script>

<template>
  <p v-if="!bookings.length" class="muted">No bookings to show.</p>
  <div v-else class="booking-table" role="region" aria-label="Workshop bookings" tabindex="0">
    <table>
      <thead>
        <tr>
          <th scope="col">Date / time</th>
          <th scope="col">Location</th>
          <th v-if="admin" scope="col">Contact</th>
          <th scope="col">Places</th>
          <th scope="col">Status</th>
          <th scope="col">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="booking in rows" :key="booking.id">
          <th scope="row">
            <time :datetime="booking.sessionDate">{{ formatSessionDate(booking.sessionDate) }}</time
            ><br />
            {{ booking.time }}<br /><small>Ref: {{ booking.id }}</small>
          </th>
          <td>{{ booking.location }}</td>
          <td v-if="admin">{{ booking.name }}<br />{{ booking.email }}</td>
          <td>{{ booking.numberOfPlaces }}</td>
          <td>{{ booking.status }}</td>
          <td>
            <button
              v-if="booking.status === 'confirmed' && booking.sessionDate > todayDate()"
              class="button secondary-button"
              type="button"
              :disabled="busy"
              :aria-label="`Cancel booking for ${booking.name} on ${formatSessionDate(booking.sessionDate)}`"
              @click="$emit('cancel', booking)"
            >
              Cancel
            </button>
            <span v-else class="muted">{{
              booking.status === 'cancelled' ? 'Cancelled' : 'Closed'
            }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <nav v-if="bookings.length > 10" class="booking-pages" aria-label="Booking pages">
    <button class="button secondary-button" type="button" :disabled="page === 1" @click="page--">
      Previous
    </button>
    <span role="status">Page {{ page }} of {{ pageCount }}</span>
    <button
      class="button secondary-button"
      type="button"
      :disabled="page === pageCount"
      @click="page++"
    >
      Next
    </button>
  </nav>
</template>

<style scoped>
.booking-table {
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
tbody th {
  font-weight: normal;
}
small {
  display: block;
  max-width: 240px;
  overflow-wrap: anywhere;
}
.booking-pages {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}
</style>
