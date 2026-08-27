<script setup>
import { RouterLink } from 'vue-router'

const navigationItems = [
  { label: 'Home', path: '/' },
  { label: 'Repair Services', path: '/services' },
  { label: 'Workshops', path: '/workshops/basic-repair' },
  { label: 'Reuse Guide', path: '/reuse-guide' },
  { label: 'Login', path: '/login' },
]
</script>

<template>
  <header class="site-header">
    <div class="header-content">
      <RouterLink class="brand" to="/"> ReLoop Melbourne </RouterLink>

      <nav class="navigation" aria-label="Main navigation">
        <RouterLink
          v-for="item in navigationItems"
          :key="item.path"
          :to="item.path"
          class="navigation-link"
          exact-active-class="active-link"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  border-bottom: 1px solid #e2e2e2;
  background-color: #ffffff;
}

.header-content {
  width: 100%;
  max-width: 1200px;
  min-height: 72px;
  margin: 0 auto;
  padding: 0 28px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.brand {
  color: #222222;
  font-size: 21px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.navigation {
  display: flex;
  align-items: center;
  gap: 30px;
}

.navigation-link {
  padding: 4px 0;
  color: #222222;
  font-size: 18px;
  text-decoration: none;
  white-space: nowrap;
}

.navigation-link:hover {
  color: #555555;
}

.navigation-link.active-link {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

@media (max-width: 768px) {
  .header-content {
    padding: 16px 20px;
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
  }

  .navigation {
    width: 100%;
    flex-wrap: wrap;
    gap: 12px 20px;
  }

  .navigation-link {
    font-size: 16px;
  }
}
</style>
