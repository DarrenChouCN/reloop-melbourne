<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import workshop from '../data/workshop.json'
import { formatSessionDate } from '../services/bookingService'
import { refreshSession } from '../services/authService'
import {
  getRecipients,
  prepareEmail,
  sendEmail,
  validateAttachments,
} from '../services/mailService'

const props = defineProps({
  bookings: { type: Array, default: () => [] },
  bookingsUnavailable: Boolean,
})
const form = reactive({
  recipientMode: 'manual',
  to: '',
  sessionDate: '',
  subject: '',
  message: '',
})
const files = ref([])
const fileInput = ref(null)
const preview = ref(null)
const previewHeading = ref(null)
const busy = ref(false)
const attempted = ref(false)
const sendResult = ref(null)
const errorMessage = ref('')
const attachmentError = ref('')
const recipients = computed(() => {
  if (form.recipientMode === 'session' && props.bookingsUnavailable) return []
  try {
    return getRecipients(form, props.bookings)
  } catch {
    return []
  }
})

// Editing the message or attachments requires a new preview before sending.
watch(
  [form, files],
  () => {
    preview.value = null
    attempted.value = false
    sendResult.value = null
    errorMessage.value = ''
  },
  { deep: true },
)

function chooseAttachments(event) {
  preview.value = null
  attachmentError.value = ''
  files.value = []
  try {
    const selected = Array.from(event.target.files)
    validateAttachments(selected)
    files.value = selected
  } catch (error) {
    attachmentError.value = error.message
    event.target.value = ''
  }
}

function clearForm() {
  Object.assign(form, {
    recipientMode: 'manual',
    to: '',
    sessionDate: '',
    subject: '',
    message: '',
  })
  files.value = []
  fileInput.value.value = ''
  preview.value = null
  attachmentError.value = ''
  errorMessage.value = ''
}

async function previewEmail() {
  if (busy.value || attachmentError.value) return
  busy.value = true
  errorMessage.value = ''
  preview.value = null
  attempted.value = false
  sendResult.value = null
  try {
    refreshSession()
    preview.value = await prepareEmail({ ...form }, files.value)
    await nextTick()
    previewHeading.value?.focus()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    busy.value = false
  }
}

async function deliverEmail() {
  if (busy.value || !preview.value) return
  if (
    !attempted.value &&
    !window.confirm(`Send this email to ${preview.value.recipients.length} recipients now?`)
  )
    return
  busy.value = true
  attempted.value = true
  errorMessage.value = ''
  try {
    sendResult.value = await sendEmail(preview.value)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="email-panel" aria-labelledby="email-heading">
    <h2 id="email-heading">Email &amp; Bulk Email</h2>
    <p id="email-mode" class="muted">
      Preview your message before sending. Each recipient receives a separate email and cannot see
      the other addresses. Drafts and attachments are cleared when you leave or reload this page.
    </p>
    <form
      class="form-fields"
      aria-describedby="email-mode"
      :aria-busy="busy"
      @submit.prevent="previewEmail"
    >
      <fieldset :disabled="busy">
        <legend class="visually-hidden">Prepare an email</legend>
        <label
          >Recipients
          <select v-model="form.recipientMode">
            <option value="manual">Enter email addresses</option>
            <option value="session">Confirmed workshop bookings</option>
          </select>
        </label>
        <template v-if="form.recipientMode === 'manual'">
          <label for="email-recipients">Email addresses</label>
          <textarea
            id="email-recipients"
            v-model="form.to"
            rows="2"
            required
            maxlength="26000"
            aria-describedby="recipients-help"
          ></textarea>
          <p id="recipients-help" class="muted">
            Separate addresses with a comma, semicolon or new line. Maximum 100 recipients;
            duplicates are removed.
          </p>
        </template>
        <template v-else>
          <label
            >Workshop session
            <select v-model="form.sessionDate" required :disabled="bookingsUnavailable">
              <option value="" disabled>Select a session</option>
              <option
                v-for="session in workshop.sessions"
                :key="session.date"
                :value="session.date"
              >
                {{ formatSessionDate(session.date) }} · {{ session.time }}
              </option>
            </select>
          </label>
          <p v-if="bookingsUnavailable" class="error-message" role="alert">
            Bookings are unavailable. Use Refresh bookings above and try again.
          </p>
          <p v-else class="muted">
            Only confirmed bookings are included. Cancelled bookings are excluded and repeated
            addresses are counted once.
          </p>
        </template>
        <p role="status">{{ recipients.length }} valid, unique recipients</p>
        <label
          >Subject
          <input v-model="form.subject" type="text" required maxlength="150" />
        </label>
        <label
          >Message
          <textarea v-model="form.message" rows="6" required maxlength="5000"></textarea>
        </label>
        <label for="email-attachments">Attachments (optional)</label>
        <input
          id="email-attachments"
          ref="fileInput"
          type="file"
          multiple
          accept=".pdf,.csv,.txt,.png,.jpg,.jpeg"
          aria-describedby="attachments-help attachment-error"
          :aria-invalid="Boolean(attachmentError)"
          @change="chooseAttachments"
        />
        <p id="attachments-help" class="muted">
          Up to 3 files, 5 MB total. PDF, CSV, TXT, PNG or JPG. Selecting again replaces the
          previous files.
        </p>
        <p id="attachment-error" class="error-message" role="alert">{{ attachmentError }}</p>
        <ul v-if="files.length">
          <li v-for="(file, index) in files" :key="index">
            {{ file.name }} ({{ Math.ceil(file.size / 1024) }} KB)
          </li>
        </ul>
        <p class="email-actions">
          <button
            class="button"
            type="submit"
            :disabled="
              Boolean(attachmentError) || (form.recipientMode === 'session' && bookingsUnavailable)
            "
          >
            Prepare preview
          </button>
          <button class="button secondary-button" type="button" @click="clearForm">
            Clear form
          </button>
        </p>
      </fieldset>
    </form>
    <p v-if="busy" role="status">
      {{ attempted ? 'Sending or checking the result…' : 'Preparing preview…' }}
    </p>
    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <section v-if="preview" class="email-preview" aria-labelledby="email-preview-heading">
      <h3 id="email-preview-heading" ref="previewHeading" tabindex="-1">
        {{ attempted ? 'Email request' : 'Email preview — not sent' }}
      </h3>
      <p>{{ preview.recipients.length }} recipients</p>
      <ul>
        <li v-for="email in preview.recipients" :key="email">{{ email }}</li>
      </ul>
      <h4>{{ preview.subject }}</h4>
      <p class="message-text">{{ preview.message }}</p>
      <p v-if="!preview.attachments.length">No attachments.</p>
      <ul v-else>
        <li v-for="(file, index) in preview.attachments" :key="index">
          {{ file.filename }} ({{ Math.ceil(file.size / 1024) }} KB)
        </li>
      </ul>
      <p
        v-if="sendResult"
        :class="sendResult.status === 'accepted' ? 'success-message' : 'error-message'"
        role="status"
      >
        {{ sendResult.count }} recipients: {{ sendResult.message }}
      </p>
      <p v-if="attempted" class="muted">
        Reference: {{ preview.requestId }}. Checking this request will not send it twice.
      </p>
      <button
        v-if="!sendResult || sendResult.status === 'pending'"
        class="button"
        type="button"
        :disabled="busy"
        @click="deliverEmail"
      >
        {{ attempted ? 'Check send result' : 'Send email now' }}
      </button>
    </section>
  </section>
</template>

<style scoped>
.email-panel {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #ddd;
  overflow-wrap: anywhere;
}
.form-fields,
.email-preview {
  max-width: 720px;
}
.form-fields label {
  margin-top: 16px;
}
.email-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.email-preview {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
}
.message-text {
  white-space: pre-wrap;
}
</style>
