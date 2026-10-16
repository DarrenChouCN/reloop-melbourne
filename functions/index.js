import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'

initializeApp()
setGlobalOptions({ region: 'australia-southeast2', maxInstances: 2, timeoutSeconds: 60 })
const apiKey = defineSecret('SENDGRID_API_KEY')
const sender = defineString('MAIL_FROM', { description: 'Your verified SendGrid sender email' })
const adminUid = defineString('ADMIN_UID', {
  description: 'Your administrator UID from Firebase Authentication',
})
const db = getFirestore()
const maxBytes = 5 * 1024 * 1024
const types = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

// Only the account selected by the project owner at deployment can claim this role.
export const refreshAdminAccess = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please log in first.')
  if (request.auth.uid !== adminUid.value())
    throw new HttpsError(
      'permission-denied',
      'This account has not been assigned administrator access.',
    )
  const user = await getAuth().getUser(request.auth.uid)
  await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, admin: true })
  return { updated: true }
})

function addresses(values) {
  if (
    !Array.isArray(values) ||
    values.length > 100 ||
    values.some((value) => typeof value !== 'string')
  )
    throw new HttpsError('invalid-argument', 'Choose 1–100 email addresses.')
  const emails = [
    ...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)),
  ].sort()
  if (
    !emails.length ||
    emails.some((email) => email.length > 254 || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email))
  )
    throw new HttpsError('invalid-argument', 'Please check every recipient email address.')
  return emails
}

function attachments(files) {
  if (!Array.isArray(files) || files.length > 3)
    throw new HttpsError('invalid-argument', 'Choose no more than 3 attachments.')
  let total = 0
  return files.map((file) => {
    const name = file?.filename
    const extension = typeof name === 'string' ? name.split('.').pop().toLowerCase() : ''
    if (
      !Object.hasOwn(types, extension) ||
      name.length > 120 ||
      /[/\\]/.test(name) ||
      Array.from(name).some((character) => character.charCodeAt(0) < 32)
    )
      throw new HttpsError(
        'invalid-argument',
        'Use PDF, CSV, TXT, PNG or JPG attachments with short filenames.',
      )
    if (typeof file.content !== 'string' || file.content.length > Math.ceil(maxBytes / 3) * 4)
      throw new HttpsError('invalid-argument', 'Attachments must total 5 MB or less.')
    const bytes = Buffer.from(file.content, 'base64')
    total += bytes.length
    if (!bytes.length || bytes.toString('base64') !== file.content || total > maxBytes)
      throw new HttpsError(
        'invalid-argument',
        'An attachment is empty, invalid or over the 5 MB total limit.',
      )
    return {
      filename: name,
      type: types[extension],
      content: file.content,
      disposition: 'attachment',
    }
  })
}

function result(record) {
  return { status: record.status, count: record.count, message: record.message }
}

export const sendEmail = onCall({ secrets: [apiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Please log in first.')
  if (request.auth.token.admin !== true)
    throw new HttpsError('permission-denied', 'Only administrators can send email.')
  const data = request.data || {}
  if (typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.requestId))
    throw new HttpsError('invalid-argument', 'Prepare a new preview before sending.')
  if (!['manual', 'session'].includes(data.recipientMode))
    throw new HttpsError('invalid-argument', 'Choose how to select recipients.')
  const recipients = addresses(data.recipients)
  const subject = typeof data.subject === 'string' ? data.subject.trim() : ''
  const message = typeof data.message === 'string' ? data.message.trim() : ''
  if (
    !subject ||
    subject.length > 150 ||
    /[\r\n]/.test(subject) ||
    !message ||
    message.length > 5000
  )
    throw new HttpsError(
      'invalid-argument',
      'Enter a subject of 1–150 characters and a message of 1–5000 characters.',
    )
  const payload = {
    // Send separately so recipients cannot see each other's email addresses.
    personalizations: recipients.map((email) => ({ to: [{ email }] })),
    from: { email: sender.value(), name: 'ReLoop Melbourne' },
    subject,
    content: [{ type: 'text/plain', value: message }],
    attachments: attachments(data.attachments || []),
  }
  const hash = createHash('sha256')
    .update(JSON.stringify([payload, data.recipientMode, data.sessionDate]))
    .digest('hex')
  const reference = db.doc(`emailRequests/${request.auth.uid}_${data.requestId}`)
  function previous(snapshot) {
    if (!snapshot.exists) return null
    if (snapshot.data().hash !== hash)
      throw new HttpsError(
        'already-exists',
        'This request has different content. Prepare a new preview.',
      )
    return result(snapshot.data())
  }
  // Rechecking the same preview reads its result; it never sends it a second time.
  const saved = previous(await reference.get())
  if (saved) return saved
  if (data.recipientMode === 'session') {
    if (typeof data.sessionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.sessionDate))
      throw new HttpsError('invalid-argument', 'Choose a workshop session.')
    const bookings = await db
      .collection('bookings')
      .where('sessionDate', '==', data.sessionDate)
      .get()
    const current = addresses(
      bookings.docs
        .filter((entry) => entry.data().status === 'confirmed')
        .map((entry) => entry.data().email),
    )
    if (JSON.stringify(current) !== JSON.stringify(recipients))
      throw new HttpsError(
        'failed-precondition',
        'Bookings changed. Prepare a new preview before sending.',
      )
  }
  const rateRef = db.doc(`emailRateLimits/${request.auth.uid}`)
  // Reserve the request and rate limit together before contacting SendGrid.
  const existing = await db.runTransaction(async (transaction) => {
    const saved = previous(await transaction.get(reference))
    if (saved) return saved
    const rate = await transaction.get(rateRef)
    if (rate.exists && Date.now() - rate.data().createdAt.toMillis() < 30000)
      throw new HttpsError('resource-exhausted', 'Wait 30 seconds between email batches.')
    const createdAt = Timestamp.now()
    transaction.set(reference, {
      hash,
      userId: request.auth.uid,
      count: recipients.length,
      status: 'pending',
      message: 'Sending is in progress. Check the result shortly; do not create another copy.',
      createdAt,
    })
    transaction.set(rateRef, { createdAt })
    return null
  })
  if (existing) return existing
  let outcome
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.value()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 202) {
      outcome = {
        status: 'accepted',
        message:
          'Accepted by the email provider. Check the inbox or spam folder; acceptance does not guarantee delivery.',
      }
    } else if (response.status >= 400 && response.status < 500) {
      outcome = {
        status: 'rejected',
        message: `Email provider rejected this batch (HTTP ${response.status}). Check the API key, verified sender and account quota before preparing a new preview.`,
      }
    } else {
      outcome = {
        status: 'unknown',
        message:
          'The provider result is uncertain. Check SendGrid Email Activity before sending again.',
      }
    }
  } catch {
    outcome = {
      status: 'unknown',
      message:
        'The connection ended without a confirmed result. Check SendGrid Email Activity before sending again.',
    }
  }
  await reference.update({ ...outcome, updatedAt: Timestamp.now() })
  return result({ ...outcome, count: recipients.length })
})
