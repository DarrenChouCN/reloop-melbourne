import { readonly, ref } from 'vue'
import initialUsers from '../data/users.json'

const usersKey = 'reloop-users'
const sessionKey = 'reloop-session'
const passwordIterations = 600000
const sessionDuration = 8 * 60 * 60 * 1000
const userState = ref(null)
export const currentUser = readonly(userState)

function readUsers() {
  try {
    const saved = localStorage.getItem(usersKey)
    if (saved === null) {
      localStorage.setItem(usersKey, JSON.stringify(initialUsers))
      return structuredClone(initialUsers)
    }

    const users = JSON.parse(saved)
    const valid =
      Array.isArray(users) &&
      users.every(
        (user) =>
          user &&
          typeof user.id === 'string' &&
          typeof user.email === 'string' &&
          ['user', 'admin'].includes(user.role),
      )
    if (!valid) throw new Error('Invalid user data')
    return users
  } catch {
    // Do not overwrite damaged or inaccessible storage with the seed accounts.
    throw new Error('User data could not be read. Please check browser storage and try again.')
  }
}

function publicUser(user) {
  const { id, email, username, role } = user
  return { id, email, username, role }
}

function toHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure login requires HTTPS or localhost. Please use a secure address.')
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: passwordIterations, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export async function register({ username, email, password, confirmPassword }) {
  username = username.trim()
  email = email.trim().toLowerCase()
  if (username.length < 2 || username.length > 50) {
    throw new Error('Display name must contain 2–50 characters.')
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.')
  }
  if (password.length < 6 || password.length > 20) {
    throw new Error('Password must contain 6–20 characters.')
  }
  if (password !== confirmPassword) throw new Error('Passwords do not match.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordHash = await hashPassword(password, salt)
  // Read after hashing so another completed registration is not overwritten.
  const users = readUsers()
  if (users.some((user) => user.email === email)) {
    throw new Error('This email is already registered. Please log in.')
  }
  const user = {
    id: crypto.randomUUID(),
    email,
    username,
    role: 'user',
    passwordHash,
    passwordSalt: toHex(salt),
    passwordIterations,
    createdAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(usersKey, JSON.stringify([...users, user]))
  } catch {
    throw new Error('Your account could not be saved. Please check browser storage and try again.')
  }
  return publicUser(user)
}

export async function login(email, password) {
  email = email.trim().toLowerCase()
  if (!email || !password || password.length > 20) {
    throw new Error('Please enter your email and password.')
  }
  const user = readUsers().find((entry) => entry.email === email)
  // Use a dummy derivation for unknown emails as well as incorrect passwords.
  const saltHex = user?.passwordSalt ?? initialUsers[0].passwordSalt
  const salt = Uint8Array.from(saltHex.match(/.{2}/g), (pair) => parseInt(pair, 16))
  const passwordHash = await hashPassword(password, salt)
  if (!user || passwordHash !== user.passwordHash) {
    throw new Error('Email or password is incorrect.')
  }
  try {
    // Only the user ID and expiry belong in the session, never credentials or a role.
    sessionStorage.setItem(
      sessionKey,
      JSON.stringify({
        userId: user.id,
        expiresAt: Date.now() + sessionDuration,
      }),
    )
  } catch {
    throw new Error('Login could not be saved. Please allow browser storage and try again.')
  }
  userState.value = publicUser(user)
  return publicUser(user)
}

export function getCurrentUser() {
  try {
    const session = JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null')
    if (
      !session ||
      typeof session.userId !== 'string' ||
      !Number.isFinite(session.expiresAt) ||
      session.expiresAt <= Date.now()
    )
      return null
    const user = readUsers().find((entry) => entry.id === session.userId)
    return user ? publicUser(user) : null
  } catch {
    return null
  }
}

export function refreshSession() {
  userState.value = getCurrentUser()
  return userState.value
}

export function logout() {
  try {
    sessionStorage.removeItem(sessionKey)
  } catch {
    throw new Error('Logout could not be saved. Please close this tab to end the session.')
  } finally {
    userState.value = null
  }
}

// Local demo only: browser storage and front-end role checks are not trusted authorization.
refreshSession()
