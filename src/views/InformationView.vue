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
      'This local demonstration stores account details, password hashes, service reviews and workshop bookings in this browser. Your login session is stored in the current tab and expires after eight hours.',
      'Anyone using the same browser profile may be able to inspect local data. Use test details rather than sensitive personal information. Clearing site data removes local accounts, reviews and bookings; the demo accounts and reviews are recreated when next needed.',
      'Email text and attachments are held in page memory for preview only. They are not sent or saved to browser storage. Leaving or reloading the page clears them. CSV and PDF exports remain in your downloads until you delete them.',
      'This notice describes the local version. It must be updated when cloud storage, maps and real email delivery are enabled.',
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
