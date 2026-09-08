<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="not-found-page">
    <h1>Page unavailable</h1>
    <p>This page does not exist or is not available yet.</p>
    <RouterLink to="/services">Browse repair services</RouterLink>
  </section>
</template>

<style scoped>
.not-found-page {
  max-width: 1200px;
  margin: 32px auto;
  padding: 0 20px;
}
</style>
