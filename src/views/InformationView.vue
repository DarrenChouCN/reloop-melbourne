<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const pages = {
  about: {
    title: 'About & Contact',
    paragraphs: [
      'ReLoop Melbourne is a student project that helps people explore repair and recycling options, read reuse guidance and try workshop bookings.',
      'Service listings, reviews and workshop sessions are demonstration data. Check details with a real provider before visiting. Demo bookings do not reserve a place at a real event.',
      'A public contact address is not available in this local version. For coursework feedback, contact the student through the course submission channel.',
    ],
  },
  accessibility: {
    title: 'Accessibility',
    paragraphs: [
      'Use Tab and Shift + Tab to move between links and controls. Use Enter to follow links and Enter or Space to activate buttons. The first link skips navigation and moves to the main content.',
      'Forms have text labels, focus is visible, and errors and updates are announced. Table regions can receive keyboard focus so you can scroll wide tables. Charts also show their values as text.',
      'You can zoom using your browser controls. If you encounter a barrier, record the page, browser and steps and share them through the course submission channel. A full accessibility review is still required before public release.',
    ],
  },
  privacy: {
    title: 'Privacy',
    paragraphs: [
      'Firebase Authentication manages your account, display name and sign-in credentials. Firebase stores the login session in this browser tab; refreshing keeps you signed in, while closing the tab ends the session. Firestore stores your reviews and workshop bookings. Reviews and display names are public; booking contact details are accessible to the account owner and administrators.',
      'Use test details for this coursework demonstration. Clearing browser data signs you out but does not delete your Firebase account, cloud reviews or bookings. Older local accounts, reviews and bookings are no longer read or automatically uploaded.',
      'Administrators can send emails and attachments through Firebase Cloud Functions and SendGrid. Workshop emails use contact addresses from confirmed bookings. Recipients receive separate messages. Drafts remain in page memory until sent or cleared; leaving or reloading the page clears the draft. SendGrid processes sent content and recipient addresses for delivery.',
      'Firestore keeps email request identifiers, administrator IDs, recipient counts, content hashes, timestamps and provider acceptance results to prevent duplicate sends. It does not store email bodies or attachment files. CSV and PDF exports remain in your downloads until you delete them. Map integration is not enabled yet.',
    ],
  },
}
const page = computed(() => pages[route.name])
</script>

<template>
  <section class="page-container information-page">
    <header class="page-heading">
      <h1>{{ page.title }}</h1>
    </header>
    <p v-for="paragraph in page.paragraphs" :key="paragraph">{{ paragraph }}</p>
    <RouterLink to="/">Back to Home</RouterLink>
  </section>
</template>

<style scoped>
.information-page {
  max-width: 800px;
  line-height: 1.6;
}
</style>
