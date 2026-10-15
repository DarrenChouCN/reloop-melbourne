import { getCurrentUser } from './authService'
import { getBookings } from './bookingService'
import { callCloud } from './firebase'
import workshop from '../data/workshop.json'

const maxAttachmentBytes = 5 * 1024 * 1024
const attachmentTypes = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

export function getRecipients(form, bookings) {
  let addresses
  if (form.recipientMode === 'session') {
    if (!workshop.sessions.some((session) => session.date === form.sessionDate)) {
      throw new Error('Please choose a workshop session.')
    }
    addresses = bookings
      .filter(
        (booking) => booking.sessionDate === form.sessionDate && booking.status === 'confirmed',
      )
      .map((booking) => booking.email)
  } else if (form.recipientMode === 'manual') {
    addresses = String(form.to ?? '').split(/[,;\n]/)
  } else {
    throw new Error('Please choose how to select recipients.')
  }
  const recipients = [
    ...new Set(addresses.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ]
  if (!recipients.length)
    throw new Error('No recipients. Enter an email or choose a session with confirmed bookings.')
  if (recipients.length > 100) throw new Error('Please select no more than 100 recipients.')
  if (
    recipients.some(
      (email) => email.length > 254 || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email),
    )
  ) {
    throw new Error('Please check every recipient email address.')
  }
  return recipients
}

export function validateAttachments(files) {
  if (files.length > 3) throw new Error('Please choose no more than 3 attachments.')
  let total = 0
  for (const file of files) {
    if (
      file.name.length > 120 ||
      /[/\\]/.test(file.name) ||
      Array.from(file.name).some((character) => character.charCodeAt(0) < 32)
    )
      throw new Error(
        'Use attachment filenames of 120 characters or less, without control characters.',
      )
    const extension = file.name.split('.').pop().toLowerCase()
    if (!Object.hasOwn(attachmentTypes, extension))
      throw new Error('Attachments must be PDF, CSV, TXT, PNG or JPG files.')
    if (!file.size) throw new Error('Empty files cannot be attached.')
    total += file.size
  }
  if (total > maxAttachmentBytes) throw new Error('Attachments must total 5 MB or less.')
}

function readAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        filename: file.name,
        contentType: attachmentTypes[file.name.split('.').pop().toLowerCase()],
        content: reader.result.split(',')[1],
        size: file.size,
      })
    reader.onerror = reader.onabort = () =>
      reject(new Error('An attachment could not be read. Please select it again.'))
    reader.readAsDataURL(file)
  })
}

// Preview locally first; the cloud function validates everything again before sending.
export async function prepareEmail(form, files = []) {
  if (getCurrentUser()?.role !== 'admin') throw new Error('Please log in as an administrator.')
  const recipients = getRecipients(
    form,
    form.recipientMode === 'session' ? await getBookings() : [],
  )
  const subject = String(form.subject ?? '').trim()
  const message = String(form.message ?? '').trim()
  if (!subject || subject.length > 150 || /[\r\n]/.test(subject)) {
    throw new Error('Please enter a subject of 1–150 characters on one line.')
  }
  if (!message || message.length > 5000)
    throw new Error('Please enter a message of 1–5000 characters.')
  validateAttachments(files)
  const attachments = []
  for (const file of files) attachments.push(await readAttachment(file))
  if (getCurrentUser()?.role !== 'admin')
    throw new Error('Your administrator session has expired. Please log in again.')
  return {
    requestId: crypto.randomUUID(),
    recipientMode: form.recipientMode,
    sessionDate: form.recipientMode === 'session' ? form.sessionDate : '',
    recipients,
    subject,
    message,
    attachments,
  }
}

export async function sendEmail(preview) {
  if (getCurrentUser()?.role !== 'admin') throw new Error('Please log in as an administrator.')
  return callCloud('sendEmail', preview)
}
