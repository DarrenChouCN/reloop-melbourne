<script setup>
import { nextTick, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'

const route = useRoute()
const mainContent = ref(null)
watch(
  () => route.path,
  async () => {
    await nextTick()
    mainContent.value?.focus()
  },
)
</script>

<template>
  <div class="app">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <AppHeader />

    <main id="main-content" ref="mainContent" class="main-content" tabindex="-1">
      <!-- Display the page component that matches the current route. -->
      <RouterView />
    </main>

    <AppFooter />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #222;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>
