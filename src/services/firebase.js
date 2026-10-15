import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export let auth = null
let db = null
export let firebaseError = ''
try {
  if (Object.values(config).some((value) => !value)) {
    throw new Error('Missing Firebase configuration')
  }
  const app = initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
} catch {
  firebaseError =
    'Firebase is not configured. Fill in .env.local and restart the development server.'
}

export function getDatabase() {
  if (!db) throw new Error(firebaseError)
  return db
}
