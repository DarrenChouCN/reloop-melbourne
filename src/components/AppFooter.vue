<script setup>
import { RouterLink } from 'vue-router'

const footerLinks = [
  { label: 'About & Contact', path: '/about' },
  { label: 'Accessibility', path: '/accessibility' },
  { label: 'Privacy', path: '/privacy' },
]
</script>

<template>
  <footer class="site-footer">
    <nav class="footer-navigation" aria-label="Footer navigation">
      <RouterLink v-for="link in footerLinks" :key="link.path" :to="link.path" class="footer-link">
        {{ link.label }}
      </RouterLink>
    </nav>
  </footer>
</template>

<style scoped>
.site-footer {
  width: 100%;
  padding: 24px 20px;
  border-top: 1px solid #e2e2e2;
  background-color: #ffffff;
}

.footer-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.footer-link {
  color: #8c8c8c;
  font-size: 17px;
  text-decoration: none;
}

.footer-link:hover {
  color: #444444;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 576px) {
  .footer-navigation {
    flex-direction: column;
    gap: 14px;
  }

  .footer-link {
    font-size: 16px;
  }
}
</style>
