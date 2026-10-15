<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { authError, currentUser, login, register } from '../services/authService'

const router = useRouter()
const route = useRoute()
const isRegister = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const passwordError = ref('')
const form = reactive({ username: '', email: '', password: '', confirmPassword: '' })

function changeMode(registerMode) {
  isRegister.value = registerMode
  errorMessage.value = ''
  passwordError.value = ''
  form.password = ''
  form.confirmPassword = ''
}

async function submitForm() {
  if (busy.value) return
  errorMessage.value = ''
  passwordError.value = ''
  if (isRegister.value && form.password !== form.confirmPassword) {
    passwordError.value = 'Passwords do not match.'
    return
  }
  busy.value = true
  try {
    const user = isRegister.value ? await register(form) : await login(form.email, form.password)
    form.password = ''
    form.confirmPassword = ''
    // Accept only known app destinations, never an external redirect URL.
    const destinations = ['/services', '/workshops/basic-repair', '/admin']
    const requested = route.query.redirect
    let destination = user.role === 'admin' ? '/admin' : '/services'
    if (destinations.includes(requested)) destination = requested
    await router.replace(destination)
  } catch (error) {
    errorMessage.value = error.message
    form.password = ''
    form.confirmPassword = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <p v-if="errorMessage || authError" class="error-message" role="alert">
      {{ errorMessage || authError }}
    </p>
    <template v-if="currentUser && !busy">
      <h1>Your account</h1>
      <p>
        Signed in as <strong>{{ currentUser.username }}</strong
        >.
      </p>
      <p>{{ currentUser.email }}</p>
      <RouterLink to="/services">Browse repair services</RouterLink>
    </template>
    <template v-else>
      <h1>{{ isRegister ? 'Create an account' : 'Log in' }}</h1>
      <p class="muted">
        {{ isRegister ? 'Join ReLoop Melbourne.' : 'Welcome back to ReLoop Melbourne.' }}
      </p>
      <div class="mode-buttons" aria-label="Choose login or registration">
        <button
          class="button secondary-button"
          type="button"
          :aria-pressed="!isRegister"
          :disabled="busy"
          @click="changeMode(false)"
        >
          Login
        </button>
        <button
          class="button secondary-button"
          type="button"
          :aria-pressed="isRegister"
          :disabled="busy"
          @click="changeMode(true)"
        >
          Register
        </button>
      </div>
      <form class="form-fields" @submit.prevent="submitForm" :aria-busy="busy">
        <fieldset :disabled="busy">
          <template v-if="isRegister">
            <label for="username">Display name</label>
            <input
              id="username"
              v-model="form.username"
              name="username"
              type="text"
              autocomplete="nickname"
              minlength="2"
              maxlength="50"
              required
            />
          </template>

          <label for="email">Email</label>
          <input
            id="email"
            v-model.trim="form.email"
            name="email"
            type="email"
            autocomplete="username"
            maxlength="254"
            required
          />

          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            name="password"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            :minlength="isRegister ? 6 : undefined"
            maxlength="20"
            :aria-describedby="isRegister ? 'password-hint' : undefined"
            required
          />
          <p v-if="isRegister" id="password-hint" class="hint muted">Use 6–20 characters.</p>

          <template v-if="isRegister">
            <label for="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              v-model="form.confirmPassword"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              minlength="6"
              maxlength="20"
              :aria-invalid="Boolean(passwordError)"
              :aria-describedby="passwordError ? 'password-error' : undefined"
              required
              @input="passwordError = ''"
            />
            <p v-if="passwordError" id="password-error" class="error-message" role="alert">
              {{ passwordError }}
            </p>
          </template>

          <button class="button submit-button" type="submit">
            {{ busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in' }}
          </button>
        </fieldset>
      </form>
    </template>
  </section>
</template>

<style scoped>
.login-page {
  width: calc(100% - 32px);
  max-width: 480px;
  margin: 36px auto;
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 500;
}
.mode-buttons {
  display: flex;
  gap: 12px;
  margin: 24px 0;
}
.mode-buttons button {
  flex: 1;
}
.mode-buttons button[aria-pressed='true'] {
  background: #111;
  border-color: #111;
  color: white;
}
label {
  margin-top: 16px;
}
.hint {
  margin: 6px 0 0;
  font-size: 14px;
}
.submit-button {
  width: 100%;
  margin-top: 24px;
}
@media (max-width: 575px) {
  .login-page {
    padding: 20px;
    margin: 24px auto;
  }
}
</style>
