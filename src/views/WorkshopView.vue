<script setup>
import { computed, reactive, ref } from 'vue'
// Use local JSON to simulate workshop data returned by a backend API.
import workshop from '../data/workshop.json'

const selectedDate = ref('2026-08-22')
const days = Array.from({ length: 31 }, (_, index) => index + 1)
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const bookingForm = reactive({
  name: '',
  email: '',
  numberOfPlaces: 1,
  agreedToTerms: false,
})

// Match the selected calendar date with a workshop session from the JSON data.
const selectedSession = computed(() => {
  return workshop.sessions.find((session) => session.date === selectedDate.value)
})

function dateFor(day) {
  return `2026-08-${String(day).padStart(2, '0')}`
}

// Check whether a date has an available session so the calendar can show a dot.
function hasWorkshop(day) {
  return workshop.sessions.some((session) => session.date === dateFor(day))
}

function selectDay(day) {
  selectedDate.value = dateFor(day)
}

function submitBooking() {
  alert(`Booking confirmed for ${selectedSession.value.displayDate}.`)
}
</script>

<template>
  <main class="workshop-page">
    <header class="page-heading">
      <h1>{{ workshop.title }}</h1>
      <p>{{ workshop.subtitle }}</p>
    </header>

    <div class="workshop-layout">
      <section class="workshop-details">
        <!-- Switch between the workshop details and the unavailable state. -->
        <template v-if="selectedSession">
          <div class="workshop-image">Workshop Image</div>

          <div class="session-information">
            <div>
              <span>Date</span>
              <p>{{ selectedSession.displayDate }}</p>
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
              <p>{{ selectedSession.remainingPlaces }} remaining</p>
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
          <p>Please choose a date marked with a dot.</p>
        </div>
      </section>

      <aside class="booking-section">
        <h2>Book this workshop</h2>

        <div class="calendar">
          <h3>August 2026</h3>

          <div class="calendar-grid week-days">
            <span v-for="(weekDay, index) in weekDays" :key="index">
              {{ weekDay }}
            </span>
          </div>

          <div class="calendar-grid">
            <span v-for="blank in 5" :key="`blank-${blank}`"></span>

            <button
              v-for="day in days"
              :key="day"
              type="button"
              class="calendar-day"
              :class="{ selected: selectedDate === dateFor(day) }"
              @click="selectDay(day)"
            >
              {{ day }}
              <i v-if="hasWorkshop(day)"></i>
            </button>
          </div>
        </div>

        <!-- Use native validation for required fields, email format and booking limits. -->
        <form class="booking-form" @submit.prevent="submitBooking">
          <label>
            Name
            <input
              v-model="bookingForm.name"
              type="text"
              placeholder="Your name"
              required
              :disabled="!selectedSession"
            />
          </label>

          <label>
            Email
            <input
              v-model="bookingForm.email"
              type="email"
              placeholder="name@example.com"
              required
              :disabled="!selectedSession"
            />
          </label>

          <label class="places-field">
            Number of places
            <input
              v-model.number="bookingForm.numberOfPlaces"
              type="number"
              min="1"
              :max="selectedSession ? selectedSession.remainingPlaces : 1"
              required
              :disabled="!selectedSession"
            />
          </label>

          <label class="terms-field">
            <input
              v-model="bookingForm.agreedToTerms"
              type="checkbox"
              required
              :disabled="!selectedSession"
            />
            I agree to the booking terms.
          </label>

          <button type="submit" :disabled="!selectedSession">Book Workshop</button>
        </form>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.workshop-page {
  width: calc(100% - 56px);
  max-width: 1200px;
  margin: auto;
  padding: 26px 0 34px;
  color: #222;
}

.page-heading {
  padding-bottom: 24px;
  border-bottom: 1px solid #ddd;
}

.page-heading h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 500;
}

.page-heading p {
  margin: 12px 0 0;
  color: #888;
  font-size: 20px;
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
  background: #e4e4e4;
  color: #929292;
  font-size: 21px;
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
  color: #888;
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
  line-height: 1.5;
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
  color: #777;
}

.calendar {
  padding: 16px 18px 18px;
  border: 1px solid #ddd;
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
  color: #888;
}

.calendar-day {
  position: relative;
  width: 38px;
  height: 38px;
  margin: auto;
  padding: 0 0 5px;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.calendar-day:hover {
  background: #eee;
}

.calendar-day.selected {
  background: #111;
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

.booking-form input:not([type='checkbox']) {
  width: 100%;
  min-height: 46px;
  margin-top: 6px;
  padding: 10px 13px;
  border: 1px solid #ddd;
  border-radius: 12px;
  font: inherit;
}

.places-field {
  max-width: 210px;
}

.terms-field {
  margin: 34px 0 24px;
  display: flex;
  gap: 8px;
}

.booking-form button {
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  background: #111;
  color: white;
  font: inherit;
  cursor: pointer;
}

.booking-form button:disabled,
.booking-form input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (min-width: 1400px) {
  .workshop-page {
    max-width: 1320px;
  }
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

@media (max-width: 767px) {
  .workshop-page {
    width: calc(100% - 40px);
  }

  .page-heading h1 {
    font-size: 27px;
  }
}

@media (max-width: 575px) {
  .workshop-page {
    width: calc(100% - 32px);
  }

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
