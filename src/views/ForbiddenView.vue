<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="forbidden-page">
    <h1>Access denied</h1>
    <p>This page is only available to administrators.</p>
    <RouterLink to="/services">Back to repair services</RouterLink>
  </section>
</template>

<style scoped>
.forbidden-page {
  max-width: 1200px;
  margin: 32px auto;
  padding: 0 20px;
  line-height: 1.5;
}
</style>
