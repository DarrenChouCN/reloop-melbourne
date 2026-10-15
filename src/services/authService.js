import { readonly, ref } from 'vue'
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onIdTokenChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth, callCloud, firebaseError } from './firebase'

const userState = ref(null)
export const currentUser = readonly(userState)
export const authError = ref(firebaseError)
let ready = false

function errorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'This email is already registered. Please log in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/password-does-not-meet-requirements':
      'Your password does not meet the Firebase password policy.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed':
      'Cannot connect to Firebase. Check your connection and try again.',
    'auth/operation-not-allowed': 'Enable Email/Password sign-in in Firebase Authentication.',
    'auth/invalid-api-key': 'Check the Firebase API key in .env.local and restart the server.',
  }
  return (
    messages[error.code] ||
    'Authentication failed. Check your Firebase configuration and try again.'
  )
}

async function updateUser(user) {
  const token = user ? await getIdTokenResult(user) : null
  // Ignore an older callback if the account changed while its token was loading.
  if (auth.currentUser !== user) return
  userState.value = user
    ? {
        id: user.uid,
        email: user.email,
        username: user.displayName || user.email,
        role: token.claims.admin === true ? 'admin' : 'user',
      }
    : null
  authError.value = ''
}

async function initialiseAuth() {
  if (!auth) return
  try {
    await setPersistence(auth, browserSessionPersistence)
    ready = true
    await new Promise((resolve) => {
      onIdTokenChanged(auth, async (user) => {
        try {
          await updateUser(user)
        } catch (error) {
          if (auth.currentUser === user) {
            userState.value = null
            authError.value = errorMessage(error)
          }
        } finally {
          resolve()
        }
      })
    })
  } catch (error) {
    authError.value = errorMessage(error)
  }
}

// Router waits for the saved Firebase session and its role before opening a page.
export const authReady = initialiseAuth()

export function getCurrentUser() {
  return auth?.currentUser?.uid === userState.value?.id ? userState.value : null
}

// Page actions read the cached Firebase account synchronously.
export function refreshSession() {
  userState.value = getCurrentUser()
  return userState.value
}

async function requireAuth() {
  await authReady
  if (!auth || !ready) throw new Error(authError.value || 'Firebase Authentication is unavailable.')
}

export async function refreshAdminAccess() {
  await requireAuth()
  const user = auth.currentUser
  if (!user) throw new Error('Please log in first.')
  await callCloud('refreshAdminAccess')
  if (auth.currentUser !== user) throw new Error('Your account changed. Please try again.')
  await user.getIdToken(true)
  await updateUser(user)
}

export async function register({ username, email, password, confirmPassword }) {
  username = username.trim()
  email = email.trim().toLowerCase()
  if (username.length < 2 || username.length > 50)
    throw new Error('Display name must contain 2–50 characters.')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Please enter a valid email address.')
  if (password.length < 6 || password.length > 20)
    throw new Error('Password must contain 6–20 characters.')
  if (password !== confirmPassword) throw new Error('Passwords do not match.')
  await requireAuth()
  let user
  try {
    user = (await createUserWithEmailAndPassword(auth, email, password)).user
  } catch (error) {
    throw new Error(errorMessage(error), { cause: error })
  }
  try {
    await updateProfile(user, { displayName: username })
    await updateUser(user)
    return getCurrentUser()
  } catch {
    await logout()
    throw new Error(
      'Your account was created, but the profile could not be loaded. Please log in instead of registering again.',
    )
  }
}

export async function login(email, password) {
  await requireAuth()
  try {
    const { user } = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
    await updateUser(user)
    return getCurrentUser()
  } catch (error) {
    throw new Error(errorMessage(error), { cause: error })
  }
}

export async function logout() {
  await requireAuth()
  try {
    await signOut(auth)
    userState.value = null
  } catch (error) {
    throw new Error(errorMessage(error), { cause: error })
  }
}
