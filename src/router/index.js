import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Load the workshop booking page when this URL is selected.
    {
      path: '/workshops/basic-repair',
      name: 'basic-repair',
      component: () => import('../views/WorkshopView.vue'),
    },
  ],
})

export default router
