import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

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

export async function callCloud(name, data = {}) {
  if (!auth) throw new Error(firebaseError)
  try {
    // Use the same region as the deployed Cloud Functions.
    const functions = getFunctions(auth.app, 'australia-southeast2')
    return (await httpsCallable(functions, name, { timeout: 60000 })(data)).data
  } catch (error) {
    const messages = {
      'functions/not-found':
        'Cloud Functions are not deployed yet. Complete the email setup first.',
      'functions/internal':
        'The server result could not be confirmed. Check the result again before creating another email.',
      'functions/unavailable': 'Cannot reach the server. Check your connection and try again.',
      'functions/deadline-exceeded':
        'The request timed out. Check the result again before creating another email.',
    }
    throw new Error(messages[error.code] || error.message, { cause: error })
  }
}
