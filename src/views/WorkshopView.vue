<script setup>
import { computed, reactive, ref } from 'vue'
import workshop from '../data/workshop.json'

const selectedDate = ref('2026-08-22')

const bookingForm = reactive({
  name: '',
  email: '',
  numberOfPlaces: 1,
  agreedToTerms: false,
})

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// August 2026 starts on Saturday.
// Since the calendar starts on Monday, five empty cells are required.
const leadingBlankDays = 5
const daysInAugust = 31

const calendarDays = Array.from({ length: daysInAugust }, (_, index) => {
  const day = index + 1

  return {
    day,
    date: `2026-08-${String(day).padStart(2, '0')}`,
  }
})

const availableDates = computed(() => {
  return new Set(workshop.sessions.map((session) => session.date))
})

const selectedSession = computed(() => {
  return workshop.sessions.find((session) => session.date === selectedDate.value) ?? null
})

function selectDate(date) {
  selectedDate.value = date
}

function isAvailable(date) {
  return availableDates.value.has(date)
}
</script>

<template>
  <div class="workshop-page">
    <section class="page-heading">
      <h1>{{ workshop.title }}</h1>
      <p>{{ workshop.subtitle }}</p>
    </section>

    <div class="workshop-layout">
      <section class="workshop-details">
        <template v-if="selectedSession">
          <div class="workshop-image" role="img" aria-label="Basic household item repair workshop">
            Workshop Image
          </div>

          <dl class="session-information">
            <div class="information-item">
              <dt>Date</dt>
              <dd>{{ selectedSession.displayDate }}</dd>
            </div>

            <div class="information-item">
              <dt>Time</dt>
              <dd>{{ selectedSession.time }}</dd>
            </div>

            <div class="information-item">
              <dt>Location</dt>
              <dd>{{ selectedSession.location }}</dd>
            </div>

            <div class="information-item">
              <dt>Places</dt>
              <dd>{{ selectedSession.remainingPlaces }} remaining</dd>
            </div>
          </dl>

          <div class="workshop-description">
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

        <div v-else class="unavailable-state">
          <div class="unavailable-icon" aria-hidden="true">×</div>

          <h2>No workshop available</h2>

          <p>
            There are no workshop sessions available on the selected date. Please choose a date
            marked with a dot.
          </p>
        </div>
      </section>

      <aside class="booking-section">
        <h2>Book this workshop</h2>

        <section class="calendar" aria-label="Workshop calendar">
          <h3>August 2026</h3>

          <div class="calendar-grid calendar-weekdays">
            <span v-for="(weekDay, index) in weekDays" :key="`${weekDay}-${index}`">
              {{ weekDay }}
            </span>
          </div>

          <div class="calendar-grid calendar-dates">
            <span
              v-for="blank in leadingBlankDays"
              :key="`blank-${blank}`"
              class="calendar-spacer"
            />

            <button
              v-for="calendarDay in calendarDays"
              :key="calendarDay.date"
              type="button"
              class="calendar-day"
              :class="{
                selected: selectedDate === calendarDay.date,
                available: isAvailable(calendarDay.date),
              }"
              :aria-label="`August ${calendarDay.day}, 2026`"
              :aria-pressed="selectedDate === calendarDay.date"
              @click="selectDate(calendarDay.date)"
            >
              <span>{{ calendarDay.day }}</span>

              <span
                v-if="isAvailable(calendarDay.date)"
                class="availability-dot"
                aria-label="Workshop available"
              />
            </button>
          </div>
        </section>

        <form class="booking-form" @submit.prevent>
          <div class="form-field">
            <label for="booking-name">Name</label>

            <input
              id="booking-name"
              v-model="bookingForm.name"
              type="text"
              placeholder="Your name"
              :disabled="!selectedSession"
            />
          </div>

          <div class="form-field">
            <label for="booking-email">Email</label>

            <input
              id="booking-email"
              v-model="bookingForm.email"
              type="email"
              placeholder="name@example.com"
              :disabled="!selectedSession"
            />
          </div>

          <div class="form-field places-field">
            <label for="number-of-places">Number of places</label>

            <input
              id="number-of-places"
              v-model.number="bookingForm.numberOfPlaces"
              type="number"
              min="1"
              :max="selectedSession ? selectedSession.remainingPlaces : 1"
              :disabled="!selectedSession"
            />
          </div>

          <label class="terms-field">
            <input
              v-model="bookingForm.agreedToTerms"
              type="checkbox"
              :disabled="!selectedSession"
            />

            <span>I agree to the booking terms.</span>
          </label>

          <button type="submit" class="booking-button" :disabled="!selectedSession">
            Book Workshop
          </button>
        </form>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.workshop-page {
  width: calc(100% - 56px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 26px 0 34px;
}

.page-heading {
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e2e2;
}

.page-heading h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 500;
}

.page-heading p {
  margin: 12px 0 0;
  color: #909090;
  font-size: 20px;
}

.workshop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(350px, 0.9fr);
  margin-top: 20px;
}

.workshop-details {
  min-width: 0;
  padding: 12px 28px 0 0;
}

.booking-section {
  min-width: 0;
  padding-left: 28px;
  border-left: 1px solid #e2e2e2;
}

.booking-section > h2 {
  margin: 4px 0 18px;
  font-size: 26px;
  font-weight: 500;
}

.workshop-image {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e4e4e4;
  color: #929292;
  font-size: 21px;
}

.session-information {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 36px;
  margin: 24px 0;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e2e2;
}

.information-item dt {
  margin-bottom: 5px;
  color: #909090;
  font-size: 16px;
}

.information-item dd {
  margin: 0;
  font-size: 19px;
}

.workshop-description h2 {
  margin: 24px 0 10px;
  font-size: 22px;
  font-weight: 500;
}

.workshop-description p {
  margin: 0;
  font-size: 18px;
  line-height: 1.5;
}

.workshop-description ul {
  margin: 8px 0 0;
  font-size: 18px;
  line-height: 1.7;
}

.unavailable-state {
  min-height: 520px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  text-align: center;
}

.unavailable-icon {
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #999999;
  border-radius: 50%;
  color: #777777;
  font-size: 30px;
}

.unavailable-state h2 {
  margin: 20px 0 10px;
  font-size: 23px;
  font-weight: 500;
}

.unavailable-state p {
  max-width: 390px;
  margin: 0;
  color: #777777;
  font-size: 17px;
  line-height: 1.5;
}

.calendar {
  padding: 16px 18px 18px;
  border: 1px solid #dddddd;
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
}

.calendar-weekdays {
  margin-bottom: 8px;
  color: #888888;
  text-align: center;
  font-size: 14px;
}

.calendar-dates {
  row-gap: 3px;
}

.calendar-day {
  position: relative;
  width: 38px;
  height: 38px;
  margin: 0 auto;
  padding: 0 0 5px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #222222;
  font: inherit;
  cursor: pointer;
}

.calendar-day:hover {
  background-color: #eeeeee;
}

.calendar-day.selected {
  background-color: #111111;
  color: #ffffff;
}

.availability-dot {
  position: absolute;
  bottom: 5px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #222222;
  transform: translateX(-50%);
}

.calendar-day.selected .availability-dot {
  background-color: #ffffff;
}

.booking-form {
  margin-top: 14px;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 17px;
}

.form-field input {
  width: 100%;
  min-height: 46px;
  padding: 10px 13px;
  border: 1px solid #dddddd;
  border-radius: 12px;
  background-color: #ffffff;
  color: #222222;
  font: inherit;
}

.form-field input::placeholder {
  color: #999999;
}

.form-field input:disabled {
  background-color: #f4f4f4;
  cursor: not-allowed;
}

.places-field {
  max-width: 210px;
}

.terms-field {
  margin: 34px 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.booking-button {
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  background-color: #111111;
  color: #ffffff;
  font: inherit;
  cursor: pointer;
}

.booking-button:disabled {
  background-color: #aaaaaa;
  cursor: not-allowed;
}

@media (min-width: 1400px) {
  .workshop-page {
    max-width: 1320px;
  }
}

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
    border-top: 1px solid #e2e2e2;
    border-left: 0;
  }
}

@media (max-width: 767px) {
  .workshop-page {
    width: calc(100% - 40px);
    padding-top: 22px;
  }

  .page-heading h1 {
    font-size: 27px;
  }

  .page-heading p {
    font-size: 17px;
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
    padding-right: 8px;
    padding-left: 8px;
  }

  .calendar-day {
    width: 35px;
    height: 35px;
  }

  .unavailable-state {
    min-height: 360px;
    padding: 24px;
  }
}
</style>
