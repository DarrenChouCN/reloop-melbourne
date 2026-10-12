<script setup>
import { RouterLink } from 'vue-router'

const features = [
  {
    title: 'Repair Services',
    description: 'Find local repair and recycling options.',
    link: 'View Services',
    path: '/services',
  },
  {
    title: 'Workshops',
    description: 'View and book community workshops.',
    link: 'View Workshops',
    path: '/workshops/basic-repair',
  },
  {
    title: 'Reuse Guide',
    description: 'Learn how to handle common household items.',
    link: 'View Guide',
    path: '/reuse-guide',
  },
]
</script>

<template>
  <div class="home-page page-container">
    <header class="page-heading">
      <h1>Repair, reuse and recycle with confidence</h1>
      <p>Find local services and make better choices for unwanted household items.</p>
      <RouterLink class="button hero-link" to="/services">Find a Repair Service</RouterLink>
    </header>

    <section class="feature-grid" aria-label="Explore ReLoop Melbourne">
      <article v-for="feature in features" :key="feature.path" class="feature-card">
        <h2>{{ feature.title }}</h2>
        <p>{{ feature.description }}</p>
        <RouterLink :to="feature.path">{{ feature.link }}</RouterLink>
      </article>
    </section>

    <section class="impact-section" aria-labelledby="impact-heading">
      <h2 id="impact-heading">Community Impact</h2>
      <dl class="feature-grid">
        <div v-for="label in ['Items Repaired', 'Waste Diverted', 'Participants']" :key="label">
          <dt>{{ label }}</dt>
          <dd class="muted">—</dd>
        </div>
      </dl>
      <p class="muted">Community impact figures are not available yet.</p>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  line-height: 1.5;
}
.hero-link {
  display: inline-block;
  margin-top: 24px;
  text-decoration: none;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 32px 0;
}
.feature-card {
  padding: 24px;
  border: 1px solid #ddd;
  border-radius: 12px;
}
h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
}
.feature-card p {
  margin: 20px 0 28px;
}
.impact-section {
  padding: 28px 0;
  border-top: 1px solid #ddd;
  text-align: center;
}
dd {
  margin: 8px 0 0;
  font-size: 28px;
}
@media (max-width: 767px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
