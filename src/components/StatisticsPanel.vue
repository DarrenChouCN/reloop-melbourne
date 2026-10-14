<script setup>
import { computed, ref } from 'vue'
import workshop from '../data/workshop.json'
import { getRatingSummary } from '../services/reviewService'
import { formatSessionDate, todayDate } from '../services/bookingService'

const props = defineProps({
  bookings: { type: Array, required: true },
  reviews: { type: Array, required: true },
  selectedDate: { type: String, default: '' },
  reviewsUnavailable: Boolean,
})
defineEmits(['selectDate'])
const metric = ref('places')
const period = ref('upcoming')
const confirmed = computed(() => props.bookings.filter((booking) => booking.status === 'confirmed'))
const upcomingPlaces = computed(() =>
  confirmed.value
    .filter((booking) => booking.sessionDate > todayDate())
    .reduce((sum, booking) => sum + booking.numberOfPlaces, 0),
)
const averageRating = computed(() => getRatingSummary(props.reviews).average ?? 'No ratings')
const chartRows = computed(() =>
  workshop.sessions
    .filter((session) => period.value === 'all' || session.date > todayDate())
    .map((session) => {
      const bookings = confirmed.value.filter((booking) => booking.sessionDate === session.date)
      return {
        date: session.date,
        value:
          metric.value === 'bookings'
            ? bookings.length
            : bookings.reduce((sum, booking) => sum + booking.numberOfPlaces, 0),
      }
    }),
)
const maximum = computed(() => Math.max(1, ...chartRows.value.map((row) => row.value)))
</script>

<template>
  <section aria-labelledby="overview-heading">
    <h2 id="overview-heading">Overview</h2>
    <dl class="summary-grid">
      <div>
        <dt>Confirmed bookings</dt>
        <dd>{{ confirmed.length }}</dd>
      </div>
      <div>
        <dt>Places in future sessions</dt>
        <dd>{{ upcomingPlaces }}</dd>
      </div>
      <div>
        <dt>Reviews</dt>
        <dd>{{ reviewsUnavailable ? 'Unavailable' : reviews.length }}</dd>
      </div>
      <div>
        <dt>Average rating</dt>
        <dd>{{ reviewsUnavailable ? 'Unavailable' : averageRating }}</dd>
      </div>
    </dl>
  </section>
  <section aria-labelledby="chart-heading">
    <h2 id="chart-heading">Workshop bookings by date</h2>
    <div class="chart-controls form-fields">
      <label
        >Measure<select v-model="metric">
          <option value="places">Places booked</option>
          <option value="bookings">Number of bookings</option>
        </select></label
      >
      <label
        >Sessions<select v-model="period">
          <option value="upcoming">Future sessions</option>
          <option value="all">All sessions</option>
        </select></label
      >
    </div>
    <p id="chart-help" class="muted">
      Confirmed bookings only. Select a bar to show that date's bookings below; select it again to
      clear the date filter.
    </p>
    <figure aria-labelledby="chart-heading" aria-describedby="chart-help">
      <figcaption role="status">
        {{ metric === 'places' ? 'Places booked' : 'Number of bookings' }} ·
        {{ period === 'upcoming' ? 'Future sessions' : 'All sessions' }}
      </figcaption>
      <p v-if="!chartRows.length" class="muted">No sessions in this period.</p>
      <button
        v-for="row in chartRows"
        :key="row.date"
        class="chart-row"
        type="button"
        :aria-pressed="selectedDate === row.date"
        :aria-label="`${formatSessionDate(row.date)}: ${row.value} ${metric}. Filter bookings by this date.`"
        @click="$emit('selectDate', selectedDate === row.date ? '' : row.date)"
      >
        <span>{{ formatSessionDate(row.date) }}</span>
        <span class="bar-track" aria-hidden="true"
          ><span :style="{ width: `${(row.value / maximum) * 100}%` }"></span
        ></span>
        <strong>{{ row.value }}</strong>
      </button>
    </figure>
  </section>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.summary-grid > div {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 10px;
}
dd {
  margin: 8px 0 0;
  font-size: 26px;
}
.chart-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.chart-controls label {
  flex: 1 1 180px;
}
figure {
  margin: 16px 0 32px;
}
figcaption {
  margin-bottom: 12px;
}
.chart-row {
  display: grid;
  grid-template-columns: 120px 1fr 30px;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px;
  border: 1px solid #ddd;
  background: white;
  color: #222;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.chart-row[aria-pressed='true'] {
  outline: 2px solid #222;
  outline-offset: -2px;
}
.bar-track {
  height: 18px;
  background: #eee;
}
.bar-track > span {
  display: block;
  height: 100%;
  background: #285b45;
}
</style>
