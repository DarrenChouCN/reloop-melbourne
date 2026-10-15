/* global process */
import { readFileSync } from 'node:fs'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Run locally once. Never put the service account JSON in src or public.
const [keyPath, email] = process.argv.slice(2)
try {
  if (!keyPath || !email)
    throw new Error('Usage: node set-admin.mjs <service-account.json path> <registered email>')
  const key = JSON.parse(readFileSync(keyPath, 'utf8'))
  initializeApp({ credential: cert(key), projectId: key.project_id })
  const auth = getAuth()
  const user = await auth.getUserByEmail(email.trim().toLowerCase())
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true })
  const updated = await auth.getUser(user.uid)
  if (updated.customClaims?.admin !== true) throw new Error('Admin claim was not saved.')
  console.log(`Admin enabled for ${updated.email} in ${key.project_id}. Log out and log in again.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
